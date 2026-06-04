from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm
import tempfile
import resend
import asyncio
import pandas as pd
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Resend Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
SENDER_NAME = os.environ.get('SENDER_NAME', 'StemXplore')
REPLY_TO_EMAIL = os.environ.get('REPLY_TO_EMAIL', '')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Literal['admin', 'teacher', 'student']

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: Literal['pending', 'approved', 'rejected'] = 'pending'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class ParentBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    relationship: str
    student_ids: List[str] = []
    # Enhanced Family fields
    group_tags: List[str] = []  # Tags like "Mechatronix", "Spike Prime"
    balance: float = 0.0  # Family account balance
    prepaid_balance: float = 0.0  # Prepaid amount
    auto_invoice: bool = False  # Auto-invoice enabled
    auto_invoice_frequency: Optional[str] = None  # 'monthly', 'weekly'
    notes: Optional[str] = None

class ParentCreate(ParentBase):
    pass

class Parent(ParentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    enrollment_date: datetime
    class_type: Literal['paid', 'demo', 'free']
    fee_amount: float
    parent_id: Optional[str] = None
    class_ids: List[str] = []
    group_ids: List[str] = []  # Student Group Tags
    # Auto-invoice settings
    auto_invoice: bool = False
    invoice_frequency: Optional[str] = None  # 'monthly', 'weekly', 'custom'
    invoice_day: Optional[int] = None  # Day of month (1-31) or day of week (0-6)
    custom_invoice_date: Optional[str] = None  # Custom date for invoice
    # Discount settings
    discount_percentage: Optional[float] = 0.0
    discount_reason: Optional[str] = None
    # Credit balance
    credit_balance: float = 0.0
    credit_details: List[dict] = []  # List of {amount, reason, date, original_class_date}

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeacherBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    country_code: str = "+91"  # Default India
    subject: str
    joining_date: datetime
    fee_per_session: Optional[float] = 0.0  # Fee per class/session

class TeacherCreate(TeacherBase):
    pass

class Teacher(TeacherBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClassSchedule(BaseModel):
    days: List[str] = []  # ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    start_time: str = "09:00"  # HH:MM format
    end_time: str = "10:00"  # HH:MM format

class ClassBase(BaseModel):
    name: str
    subject: str
    class_type: Literal['paid', 'demo', 'free']
    teacher_ids: List[str]
    student_ids: List[str] = []
    schedule: str = ""  # Legacy field for display/backwards compatibility
    schedule_details: Optional[ClassSchedule] = None  # New structured schedule
    start_date: Optional[str] = None  # YYYY-MM-DD format - when the class starts
    end_date: Optional[str] = None  # YYYY-MM-DD format - when the class ends
    duration: Optional[str] = None  # e.g., "1 hour", "45 minutes" - auto-calculated
    duration_minutes: Optional[int] = None  # Duration in minutes for calculations
    standard_fee: Optional[float] = 0.0  # Standard fee for this class

class ClassCreate(ClassBase):
    pass

class ClassUpdate(ClassBase):
    effective_date: Optional[str] = None  # For schedule changes - when new schedule takes effect

class Class(ClassBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceBase(BaseModel):
    student_id: Optional[str] = None  # Optional for teacher-only attendance
    teacher_id: Optional[str] = None  # For teacher attendance tracking
    class_id: str
    event_id: Optional[str] = None  # Link to calendar event
    date: str
    status: Literal['present', 'absent', 'late', 'present_no_charge']
    no_charge_reason: Optional[str] = None  # For trial, makeup, scholarship, etc.
    attendance_type: Literal['student', 'teacher'] = 'student'  # Type of attendance record

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    marked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BulkAttendanceCreate(BaseModel):
    class_id: str
    date: str
    records: List[dict]  # List of {student_id: str, status: str, no_charge_reason: Optional[str]}

class PaymentBase(BaseModel):
    student_id: str
    amount: float
    payment_date: datetime
    payment_method: str
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceLineItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    description: str
    quantity: int = 1
    unit_price: float
    amount: float
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    tutor_name: Optional[str] = None
    duration: Optional[str] = None
    event_id: Optional[str] = None
    event_date: Optional[str] = None
    status: Optional[str] = None
    no_charge_reason: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None

class InvoiceCredit(BaseModel):
    description: str
    amount: float
    original_date: Optional[str] = None  # Date of the unattended/cancelled class
    reason: str  # e.g., "cancelled", "informed_absence", "makeup_credit"

class InvoiceBase(BaseModel):
    student_id: Optional[str] = None  # For single student invoices
    family_id: Optional[str] = None  # For family invoices
    student_ids: List[str] = []  # Multiple students for family invoices
    amount: float
    issue_date: datetime
    due_date: datetime
    description: str
    status: Literal['paid', 'pending', 'overdue', 'cancelled'] = 'pending'
    line_items: List[InvoiceLineItem] = []
    credits: List[InvoiceCredit] = []
    subtotal: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    discount_percentage: Optional[float] = 0.0
    credit_applied: Optional[float] = 0.0
    payment_terms: Optional[str] = None
    comments: Optional[str] = None
    auto_generated: bool = False
    invoice_type: Literal['student', 'family'] = 'student'

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str = Field(default_factory=lambda: f"INV-{str(uuid.uuid4())[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateInvoiceFromPreviewRequest(BaseModel):
    student_id: str
    start_date: str
    end_date: str
    subtotal: float
    discount_amount: float = 0.0
    discount_percentage: float = 0.0
    credit_applied: float = 0.0
    total_due: float
    line_items: List[dict] = []
    credits: List[dict] = []
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    comments: Optional[str] = None

class CreateFamilyInvoiceRequest(BaseModel):
    family_id: str
    student_ids: str  # comma-separated
    start_date: str
    end_date: str
    subtotal: float
    discount_amount: float = 0.0
    discount_percentage: float = 0.0
    credit_applied: float = 0.0
    total_due: float
    line_items: List[dict] = []
    credits: List[dict] = []
    description: Optional[str] = None
    payment_terms: Optional[str] = None
    comments: Optional[str] = None

# Payment/Receipt Model
class PaymentBase(BaseModel):
    invoice_id: Optional[str] = None  # Can be null for on-account payments
    student_id: Optional[str] = None
    family_id: Optional[str] = None
    amount: float
    payment_date: datetime
    payment_method: str  # Cash, Card, Bank Transfer, UPI, etc.
    reference_number: Optional[str] = None  # Transaction ID, Cheque number, etc.
    notes: Optional[str] = None
    payment_type: Literal['invoice_payment', 'on_account', 'refund'] = 'invoice_payment'

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    receipt_number: str = Field(default_factory=lambda: f"RCP-{str(uuid.uuid4())[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    email_sent: bool = False
    email_sent_at: Optional[datetime] = None

class EventBase(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    event_type: Literal['class', 'exam', 'holiday', 'meeting', 'other']
    class_id: Optional[str] = None
    participants: List[str] = []

class EventCreate(EventBase):
    pass

class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnnouncementBase(BaseModel):
    title: str
    content: str
    target_audience: Literal['all', 'students', 'teachers', 'parents']
    send_email: bool = False

class AnnouncementCreate(AnnouncementBase):
    pass

class Announcement(AnnouncementBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str = ''
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

class ReminderConfig(BaseModel):
    reminder_type: Literal['fee_due', 'class_schedule', 'event']
    days_before: int
    enabled: bool = True

# Accounting Models
class AccountType(BaseModel):
    type: Literal['asset', 'liability', 'equity', 'revenue', 'expense']
    category: str

class ChartOfAccountBase(BaseModel):
    account_code: str
    account_name: str
    account_type: Literal['asset', 'liability', 'equity', 'revenue', 'expense']
    category: str
    description: Optional[str] = None

class ChartOfAccountCreate(ChartOfAccountBase):
    pass

class ChartOfAccount(ChartOfAccountBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    balance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionBase(BaseModel):
    date: datetime
    description: str
    debit_account: str
    credit_account: str
    amount: float
    reference: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ''

class ExpenseBase(BaseModel):
    date: datetime
    category: str
    description: str
    amount: float
    payment_method: str
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ''

class StudentGroupBase(BaseModel):
    name: str
    description: str = ''
    student_ids: List[str] = []
    color: str = '#FED7AA'  # Default beach color

class StudentGroupCreate(StudentGroupBase):
    pass

class StudentGroup(StudentGroupBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ''

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_email_async(recipient: str, subject: str, html_content: str, attachments: Optional[List[dict]] = None):
    if not RESEND_API_KEY or RESEND_API_KEY == 're_placeholder_get_from_resend_dashboard':
        logging.warning(f"Email not sent (no API key): {subject} to {recipient}")
        return {"status": "skipped", "message": "Resend API key not configured"}
    
    try:
        from_address = f"{SENDER_NAME} <{SENDER_EMAIL}>" if SENDER_NAME else SENDER_EMAIL
        params = {
            "from": from_address,
            "to": [recipient],
            "subject": subject,
            "html": html_content
        }
        if REPLY_TO_EMAIL:
            params["reply_to"] = REPLY_TO_EMAIL
        if attachments:
            # Resend expects attachments as list of {filename, content}, content is base64 string
            params["attachments"] = attachments
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return {"status": "error", "message": str(e)}

# Auth Routes
@api_router.get("/health")
async def health_check():
    return {"status": "ok"}

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user (auto-approve as admin)
    user_count = await db.users.count_documents({})
    is_first_user = user_count == 0
    
    hashed_pw = hash_password(user_data.password)
    user_dict = user_data.model_dump(exclude={'password'})
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['password'] = hashed_pw
    doc['created_at'] = doc['created_at'].isoformat()
    
    # First user is auto-approved, others need admin approval
    if is_first_user:
        doc['status'] = 'approved'
        doc['role'] = 'admin'  # First user is always admin
    else:
        doc['status'] = 'pending'
    
    await db.users.insert_one(doc)
    
    user_obj.status = doc['status']
    return user_obj

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check user approval status
    user_status = user.get('status', 'approved')  # Default approved for legacy users
    if user_status == 'pending':
        raise HTTPException(status_code=403, detail="Your account is pending admin approval")
    if user_status == 'rejected':
        raise HTTPException(status_code=403, detail="Your account has been rejected")
    
    user.pop('password')
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    user.setdefault('status', 'approved')
    
    token = create_token(user['id'], user['email'], user['role'])
    return LoginResponse(token=token, user=User(**user))

# --- Forgot Password ---
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Request a password reset link. Always returns success message to avoid leaking
    which emails are registered.
    """
    user = await db.users.find_one({"email": payload.email}, {"_id": 0})
    success_msg = {"message": "If an account exists with that email, a reset link has been sent."}

    if not user:
        return success_msg

    # Generate secure token (1 hour expiry)
    reset_token = uuid.uuid4().hex + uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "email": user['email'],
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Build reset link using the request origin
    frontend_origin = os.environ.get('FRONTEND_URL', '').rstrip('/')
    if not frontend_origin:
        # Fallback: derive from CORS origins or use a relative path the email recipient
        # can copy-paste. Most users will configure FRONTEND_URL post-deploy.
        cors = (os.environ.get('CORS_ORIGINS', '') or '').split(',')
        frontend_origin = next((c.strip() for c in cors if c.strip() and c.strip() != '*'), '')
    reset_link = f"{frontend_origin}/reset-password?token={reset_token}" if frontend_origin else f"/reset-password?token={reset_token}"

    settings = await db.settings.find_one({}, {"_id": 0})
    company_name = (settings or {}).get('invoice_company_name') or (settings or {}).get('center_name') or 'StemXplore'

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E3A8A;">{company_name}</h2>
        <h3>Password Reset Request</h3>
        <p>Hi {user.get('name', 'there')},</p>
        <p>We received a request to reset your password. Click the link below to set a new password (link expires in 1 hour):</p>
        <p><a href="{reset_link}" style="background:#1E3A8A;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a></p>
        <p style="color:#666;font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all">{reset_link}</span></p>
        <p style="color:#666;">If you didn't request this, safely ignore this email.</p>
    </div>
    """
    await send_email_async(user['email'], f"Reset your {company_name} password", html)
    return success_msg

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """Use a reset token to set a new password."""
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    record = await db.password_resets.find_one({"token": payload.token}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if record.get('used'):
        raise HTTPException(status_code=400, detail="This reset link has already been used")
    expires_at = record.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link has expired")

    hashed_pw = hash_password(payload.new_password)
    await db.users.update_one({"id": record['user_id']}, {"$set": {"password": hashed_pw}})
    await db.password_resets.update_one({"token": payload.token}, {"$set": {"used": True}})

    return {"message": "Password updated successfully. You can now log in."}

# Admin User Management Routes
@api_router.get("/admin/pending-users")
async def get_pending_users():
    """Get all users pending approval (admin only)"""
    users = await db.users.find({"status": "pending"}, {"_id": 0, "password": 0}).to_list(100)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.get("/admin/all-users")
async def get_all_users():
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        user.setdefault('status', 'approved')  # Legacy users
    return users

@api_router.put("/admin/users/{user_id}/approve")
async def approve_user(user_id: str):
    """Approve a pending user (admin only)"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "approved"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User approved successfully"}

@api_router.put("/admin/users/{user_id}/reject")
async def reject_user(user_id: str):
    """Reject a pending user (admin only)"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "rejected"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User rejected"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user (admin only)"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Parent Routes
@api_router.post("/parents", response_model=Parent)
async def create_parent(parent_data: ParentCreate):
    parent_obj = Parent(**parent_data.model_dump())
    doc = parent_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.parents.insert_one(doc)
    return parent_obj

@api_router.get("/parents", response_model=List[Parent])
async def get_parents(student_id: Optional[str] = None):
    query = {}
    if student_id:
        query['student_ids'] = student_id
    parents = await db.parents.find(query, {"_id": 0}).to_list(1000)
    for parent in parents:
        if isinstance(parent['created_at'], str):
            parent['created_at'] = datetime.fromisoformat(parent['created_at'])
        # Ensure new fields exist with defaults
        parent.setdefault('group_tags', [])
        parent.setdefault('balance', 0.0)
        parent.setdefault('prepaid_balance', 0.0)
        parent.setdefault('auto_invoice', False)
        parent.setdefault('auto_invoice_frequency', None)
        parent.setdefault('notes', None)
    return parents

@api_router.get("/families/summary")
async def get_families_summary():
    """Get families with calculated balances from invoices"""
    parents = await db.parents.find({}, {"_id": 0}).to_list(1000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(10000)
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    
    # Create student to parent mapping
    student_parent_map = {}
    for parent in parents:
        for sid in parent.get('student_ids', []):
            student_parent_map[sid] = parent['id']
    
    # Calculate balance per family from invoices
    family_balances = {}
    for invoice in invoices:
        student_id = invoice.get('student_id')
        parent_id = student_parent_map.get(student_id)
        if parent_id:
            if invoice.get('status') == 'pending' or invoice.get('status') == 'overdue':
                family_balances[parent_id] = family_balances.get(parent_id, 0) + invoice.get('amount', 0)
    
    # Calculate total owed
    total_owed = sum(family_balances.values())
    total_prepaid = sum(p.get('prepaid_balance', 0) for p in parents)
    
    # Enrich parents with calculated balance
    enriched_parents = []
    for parent in parents:
        if isinstance(parent['created_at'], str):
            parent['created_at'] = datetime.fromisoformat(parent['created_at'])
        parent['calculated_balance'] = -family_balances.get(parent['id'], 0)  # Negative means they owe
        parent.setdefault('group_tags', [])
        parent.setdefault('auto_invoice', False)
        enriched_parents.append(parent)
    
    return {
        "families": enriched_parents,
        "total_owed": total_owed,
        "total_prepaid": total_prepaid,
        "as_of_date": datetime.now(timezone.utc).strftime('%Y-%m-%d')
    }

@api_router.post("/parents/{parent_id}/add-transaction")
async def add_family_transaction(parent_id: str, amount: float, description: str, transaction_type: str):
    """Add a transaction to family account (payment or charge)"""
    parent = await db.parents.find_one({"id": parent_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent/Family not found")
    
    current_balance = parent.get('balance', 0.0)
    
    if transaction_type == 'payment':
        new_balance = current_balance + amount  # Payment increases balance (reduces what they owe)
    else:  # charge
        new_balance = current_balance - amount  # Charge decreases balance
    
    await db.parents.update_one(
        {"id": parent_id},
        {"$set": {"balance": new_balance}}
    )
    
    # Log the transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "parent_id": parent_id,
        "amount": amount,
        "description": description,
        "transaction_type": transaction_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.family_transactions.insert_one(transaction)
    
    return {"message": "Transaction added", "new_balance": new_balance}

@api_router.get("/parents/{parent_id}", response_model=Parent)
async def get_parent(parent_id: str):
    parent = await db.parents.find_one({"id": parent_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    if isinstance(parent['created_at'], str):
        parent['created_at'] = datetime.fromisoformat(parent['created_at'])
    # Ensure new fields exist
    parent.setdefault('group_tags', [])
    parent.setdefault('balance', 0.0)
    parent.setdefault('prepaid_balance', 0.0)
    parent.setdefault('auto_invoice', False)
    return parent

@api_router.put("/parents/{parent_id}", response_model=Parent)
async def update_parent(parent_id: str, parent_data: ParentCreate):
    doc = parent_data.model_dump()
    result = await db.parents.update_one({"id": parent_id}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parent not found")
    return await get_parent(parent_id)

@api_router.delete("/parents/{parent_id}")
async def delete_parent(parent_id: str):
    result = await db.parents.delete_one({"id": parent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parent not found")
    return {"message": "Parent deleted successfully"}

# Student Routes
async def _sync_class_student_links(student_id: str, new_class_ids: list[str]):
    """Keep classes.student_ids in sync when a student's class_ids change.
    Adds the student to all classes in new_class_ids, and removes from any
    class that previously contained the student but is no longer in the list.
    Also syncs events.participants for every event of each affected class.
    """
    new_class_ids = list(new_class_ids or [])
    # Add to all current classes
    if new_class_ids:
        await db.classes.update_many(
            {"id": {"$in": new_class_ids}},
            {"$addToSet": {"student_ids": student_id}}
        )
    # Remove from any class that is NOT in the new list
    await db.classes.update_many(
        {"id": {"$nin": new_class_ids}, "student_ids": student_id},
        {"$pull": {"student_ids": student_id}}
    )
    # Sync events.participants for every potentially affected class
    affected = await db.classes.find(
        {"$or": [{"id": {"$in": new_class_ids}}, {"student_ids": student_id}]},
        {"_id": 0, "id": 1, "student_ids": 1, "teacher_ids": 1}
    ).to_list(2000)
    for cls in affected:
        new_participants = list(cls.get('student_ids') or []) + list(cls.get('teacher_ids') or [])
        await db.events.update_many(
            {"class_id": cls['id']},
            {"$set": {"participants": new_participants}}
        )


@api_router.post("/students", response_model=Student)
async def create_student(student_data: StudentCreate):
    student_obj = Student(**student_data.model_dump())
    doc = student_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['enrollment_date'] = doc['enrollment_date'].isoformat()
    await db.students.insert_one(doc)
    # Sync reverse link: ensure each class in class_ids contains this student id.
    await _sync_class_student_links(student_obj.id, student_obj.class_ids or [])
    return student_obj

@api_router.get("/students", response_model=List[Student])
async def get_students():
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    for student in students:
        if isinstance(student['created_at'], str):
            student['created_at'] = datetime.fromisoformat(student['created_at'])
        if isinstance(student['enrollment_date'], str):
            student['enrollment_date'] = datetime.fromisoformat(student['enrollment_date'])
    return students

@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if isinstance(student['created_at'], str):
        student['created_at'] = datetime.fromisoformat(student['created_at'])
    if isinstance(student['enrollment_date'], str):
        student['enrollment_date'] = datetime.fromisoformat(student['enrollment_date'])
    return student

@api_router.put("/students/{student_id}", response_model=Student)
async def update_student(student_id: str, student_data: StudentCreate):
    doc = student_data.model_dump()
    doc['enrollment_date'] = doc['enrollment_date'].isoformat()
    result = await db.students.update_one({"id": student_id}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    # Sync reverse link in classes.student_ids
    await _sync_class_student_links(student_id, doc.get('class_ids') or [])
    return await get_student(student_id)

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    # Remove from all classes' student_ids on deletion
    await db.classes.update_many(
        {"student_ids": student_id},
        {"$pull": {"student_ids": student_id}}
    )
    # Remove from all events' participants
    await db.events.update_many(
        {"participants": student_id},
        {"$pull": {"participants": student_id}}
    )
    return {"message": "Student deleted successfully"}

# Student Credit Routes
@api_router.post("/students/{student_id}/add-credit")
async def add_student_credit(student_id: str, amount: float, reason: str, original_class_date: Optional[str] = None):
    """Add credit to student account (for cancellations, informed absences, etc.)"""
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    credit_detail = {
        "amount": amount,
        "reason": reason,
        "date": datetime.now(timezone.utc).isoformat(),
        "original_class_date": original_class_date
    }
    
    current_balance = student.get('credit_balance', 0)
    current_details = student.get('credit_details', [])
    current_details.append(credit_detail)
    
    await db.students.update_one(
        {"id": student_id},
        {"$set": {
            "credit_balance": current_balance + amount,
            "credit_details": current_details
        }}
    )
    
    return {"message": "Credit added successfully", "new_balance": current_balance + amount}

@api_router.get("/students/{student_id}/credits")
async def get_student_credits(student_id: str):
    """Get student's credit balance and history"""
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "credit_balance": student.get('credit_balance', 0),
        "credit_details": student.get('credit_details', [])
    }

@api_router.post("/students/{student_id}/auto-invoice-settings")
async def update_auto_invoice_settings(
    student_id: str,
    auto_invoice: bool,
    invoice_frequency: Optional[str] = None,
    invoice_day: Optional[int] = None,
    custom_invoice_date: Optional[str] = None
):
    """Update student's auto-invoice settings"""
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    update_data = {
        "auto_invoice": auto_invoice,
        "invoice_frequency": invoice_frequency,
        "invoice_day": invoice_day,
        "custom_invoice_date": custom_invoice_date
    }
    
    await db.students.update_one({"id": student_id}, {"$set": update_data})
    return {"message": "Auto-invoice settings updated successfully"}

# Teacher Routes (keeping existing code)
@api_router.post("/teachers", response_model=Teacher)
async def create_teacher(teacher_data: TeacherCreate):
    teacher_obj = Teacher(**teacher_data.model_dump())
    doc = teacher_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['joining_date'] = doc['joining_date'].isoformat()
    await db.teachers.insert_one(doc)
    return teacher_obj

@api_router.get("/teachers", response_model=List[Teacher])
async def get_teachers():
    teachers = await db.teachers.find({}, {"_id": 0}).to_list(1000)
    for teacher in teachers:
        if isinstance(teacher['created_at'], str):
            teacher['created_at'] = datetime.fromisoformat(teacher['created_at'])
        if isinstance(teacher['joining_date'], str):
            teacher['joining_date'] = datetime.fromisoformat(teacher['joining_date'])
    return teachers

@api_router.get("/teachers/{teacher_id}", response_model=Teacher)
async def get_teacher(teacher_id: str):
    teacher = await db.teachers.find_one({"id": teacher_id}, {"_id": 0})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if isinstance(teacher['created_at'], str):
        teacher['created_at'] = datetime.fromisoformat(teacher['created_at'])
    if isinstance(teacher['joining_date'], str):
        teacher['joining_date'] = datetime.fromisoformat(teacher['joining_date'])
    return teacher

@api_router.put("/teachers/{teacher_id}", response_model=Teacher)
async def update_teacher(teacher_id: str, teacher_data: TeacherCreate):
    doc = teacher_data.model_dump()
    doc['joining_date'] = doc['joining_date'].isoformat()
    result = await db.teachers.update_one({"id": teacher_id}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return await get_teacher(teacher_id)

@api_router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: str):
    result = await db.teachers.delete_one({"id": teacher_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher deleted successfully"}

# Helper function to generate class events
async def generate_class_events(class_obj: dict, from_date: str = None, delete_existing: bool = True):
    """Generate calendar events for a class based on its schedule"""
    class_id = class_obj['id']
    schedule_details = class_obj.get('schedule_details')
    start_date_str = from_date or class_obj.get('start_date')
    end_date_str = class_obj.get('end_date')
    
    if not schedule_details or not start_date_str or not end_date_str:
        return {"generated": 0, "message": "Missing schedule details or dates"}
    
    days = schedule_details.get('days', [])
    start_time = schedule_details.get('start_time', '09:00')
    end_time = schedule_details.get('end_time', '10:00')
    
    if not days:
        return {"generated": 0, "message": "No days selected"}
    
    # Map day names to weekday numbers (Monday=0, Sunday=6)
    day_map = {'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6}
    selected_weekdays = [day_map[d.lower()] for d in days if d.lower() in day_map]
    
    # Delete existing future events for this class if requested
    if delete_existing:
        await db.events.delete_many({
            "class_id": class_id,
            "start_date": {"$gte": start_date_str}
        })
    
    # Parse dates
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
    
    # Parse times
    start_hour, start_min = map(int, start_time.split(':'))
    end_hour, end_min = map(int, end_time.split(':'))
    
    # Get teacher names for event title
    teacher_names = []
    if class_obj.get('teacher_ids'):
        teachers = await db.teachers.find({"id": {"$in": class_obj['teacher_ids']}}, {"_id": 0}).to_list(100)
        teacher_names = [t['name'] for t in teachers]
    
    generated_count = 0
    current_date = start_date
    
    while current_date <= end_date:
        if current_date.weekday() in selected_weekdays:
            # Create event for this day
            event_start = current_date.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
            event_end = current_date.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)
            
            event = {
                "id": str(uuid.uuid4()),
                "title": f"{class_obj['name']} - {class_obj['subject']}",
                "description": f"Class: {class_obj['name']}\nSubject: {class_obj['subject']}\nTeacher(s): {', '.join(teacher_names) if teacher_names else 'TBD'}",
                "start_date": event_start.isoformat(),
                "end_date": event_end.isoformat(),
                "event_type": "class",
                "class_id": class_id,
                "participants": class_obj.get('student_ids', []) + class_obj.get('teacher_ids', []),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.events.insert_one(event)
            generated_count += 1
        
        current_date += timedelta(days=1)
    
    return {"generated": generated_count, "message": f"Generated {generated_count} events"}

# Class Routes
@api_router.post("/classes", response_model=Class)
async def create_class(class_data: ClassCreate):
    class_obj = Class(**class_data.model_dump())
    doc = class_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Convert schedule_details to dict if it's a Pydantic model
    if doc.get('schedule_details') and hasattr(doc['schedule_details'], 'model_dump'):
        doc['schedule_details'] = doc['schedule_details'].model_dump()
    
    await db.classes.insert_one(doc)

    # Two-way sync: ensure each enrolled student has this class in their class_ids
    if doc.get('student_ids'):
        await db.students.update_many(
            {"id": {"$in": doc['student_ids']}},
            {"$addToSet": {"class_ids": class_obj.id}}
        )
    
    # Auto-generate calendar events if schedule is configured
    if doc.get('schedule_details') and doc.get('start_date') and doc.get('end_date'):
        await generate_class_events(doc, delete_existing=False)
    
    return class_obj

@api_router.get("/classes", response_model=List[Class])
async def get_classes():
    classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    for cls in classes:
        if isinstance(cls['created_at'], str):
            cls['created_at'] = datetime.fromisoformat(cls['created_at'])
        # Ensure new fields exist with defaults
        cls.setdefault('schedule_details', None)
        cls.setdefault('start_date', None)
        cls.setdefault('end_date', None)
        cls.setdefault('duration_minutes', None)
    return classes

@api_router.post("/admin/sync-student-class-links")
async def sync_student_class_links():
    """
    Backfill two-way sync of students.class_ids <-> classes.student_ids.
    Idempotent — safe to run any time. Returns count of changes.
    """
    students = await db.students.find({}, {"_id": 0}).to_list(2000)
    classes = await db.classes.find({}, {"_id": 0}).to_list(2000)

    # Build authoritative map: class_id -> set of student_ids (union of both sides)
    class_to_students = {c['id']: set(c.get('student_ids') or []) for c in classes}
    for s in students:
        for cid in (s.get('class_ids') or []):
            if cid in class_to_students:
                class_to_students[cid].add(s['id'])

    classes_updated = 0
    for c in classes:
        ids = sorted(class_to_students.get(c['id'], set()))
        if ids != sorted(c.get('student_ids') or []):
            await db.classes.update_one({"id": c['id']}, {"$set": {"student_ids": ids}})
            classes_updated += 1

    # Now build inverse and update students
    student_to_classes = {s['id']: set(s.get('class_ids') or []) for s in students}
    for cid, sids in class_to_students.items():
        for sid in sids:
            student_to_classes.setdefault(sid, set()).add(cid)

    students_updated = 0
    for s in students:
        cids = sorted(student_to_classes.get(s['id'], set()))
        if cids != sorted(s.get('class_ids') or []):
            await db.students.update_one({"id": s['id']}, {"$set": {"class_ids": cids}})
            students_updated += 1

    # Now sync events.participants for every class
    events_updated = 0
    for c in classes:
        # re-read latest student_ids
        cls_latest = await db.classes.find_one({"id": c['id']}, {"_id": 0})
        new_participants = list((cls_latest or {}).get('student_ids') or []) + list((cls_latest or {}).get('teacher_ids') or [])
        res = await db.events.update_many(
            {"class_id": c['id']},
            {"$set": {"participants": new_participants}}
        )
        events_updated += res.modified_count

    return {
        "message": "Synced",
        "classes_updated": classes_updated,
        "students_updated": students_updated,
        "events_updated": events_updated
    }


@api_router.get("/classes/{class_id}", response_model=Class)
async def get_class(class_id: str):
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if isinstance(cls['created_at'], str):
        cls['created_at'] = datetime.fromisoformat(cls['created_at'])
    # Ensure new fields exist with defaults
    cls.setdefault('schedule_details', None)
    cls.setdefault('start_date', None)
    cls.setdefault('end_date', None)
    cls.setdefault('duration_minutes', None)
    return cls

@api_router.put("/classes/{class_id}")
async def update_class(class_id: str, class_data: ClassUpdate):
    # Get existing class to check for schedule changes
    existing_class = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not existing_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    doc = class_data.model_dump(exclude={'effective_date'})
    
    # Convert schedule_details to dict if it's a Pydantic model
    if doc.get('schedule_details') and hasattr(doc['schedule_details'], 'model_dump'):
        doc['schedule_details'] = doc['schedule_details'].model_dump()
    
    result = await db.classes.update_one({"id": class_id}, {"$set": doc})

    # Two-way sync: keep students.class_ids in sync with class.student_ids
    new_student_ids = list(doc.get('student_ids') or [])
    old_student_ids = list(existing_class.get('student_ids') or [])
    added_students = [s for s in new_student_ids if s not in old_student_ids]
    removed_students = [s for s in old_student_ids if s not in new_student_ids]
    if added_students:
        await db.students.update_many(
            {"id": {"$in": added_students}},
            {"$addToSet": {"class_ids": class_id}}
        )
    if removed_students:
        await db.students.update_many(
            {"id": {"$in": removed_students}},
            {"$pull": {"class_ids": class_id}}
        )

    # Sync events.participants for every event linked to this class so Calendar &
    # Attendance reflect current enrolment automatically.
    new_participants = new_student_ids + list(doc.get('teacher_ids') or existing_class.get('teacher_ids') or [])
    await db.events.update_many(
        {"class_id": class_id},
        {"$set": {"participants": new_participants}}
    )
    
    # Check if schedule changed and regenerate events
    effective_date = class_data.effective_date
    old_schedule = existing_class.get('schedule_details')
    new_schedule = doc.get('schedule_details')
    
    schedule_changed = (
        old_schedule != new_schedule or
        existing_class.get('start_date') != doc.get('start_date') or
        existing_class.get('end_date') != doc.get('end_date')
    )
    
    if schedule_changed and new_schedule and doc.get('start_date') and doc.get('end_date'):
        # Use effective_date if provided, otherwise use class start_date
        from_date = effective_date or doc.get('start_date')
        
        # Delete events from the effective date onwards
        await db.events.delete_many({
            "class_id": class_id,
            "start_date": {"$gte": from_date}
        })
        
        # Regenerate events from effective date
        await generate_class_events({**doc, "id": class_id}, from_date=from_date, delete_existing=False)
    
    updated_class = await get_class(class_id)
    return updated_class

@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str):
    # Delete associated events first
    await db.events.delete_many({"class_id": class_id})
    
    result = await db.classes.delete_one({"id": class_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"message": "Class deleted successfully"}

@api_router.post("/classes/{class_id}/regenerate-events")
async def regenerate_class_events(class_id: str, from_date: Optional[str] = None):
    """Manually regenerate events for a class"""
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    result = await generate_class_events(cls, from_date=from_date, delete_existing=True)
    return result

# Attendance Routes (with bulk support and no-charge option)
@api_router.post("/attendance", response_model=Attendance)
async def mark_attendance(attendance_data: AttendanceCreate):
    existing = await db.attendance.find_one({
        "student_id": attendance_data.student_id,
        "class_id": attendance_data.class_id,
        "date": attendance_data.date
    }, {"_id": 0})
    
    update_data = {
        "status": attendance_data.status, 
        "marked_at": datetime.now(timezone.utc).isoformat(),
        "no_charge_reason": attendance_data.no_charge_reason
    }
    
    if existing:
        result = await db.attendance.update_one(
            {"id": existing['id']},
            {"$set": update_data}
        )
        existing['status'] = attendance_data.status
        existing['no_charge_reason'] = attendance_data.no_charge_reason
        if isinstance(existing['marked_at'], str):
            existing['marked_at'] = datetime.fromisoformat(existing['marked_at'])
        return Attendance(**existing)
    
    attendance_obj = Attendance(**attendance_data.model_dump())
    doc = attendance_obj.model_dump()
    doc['marked_at'] = doc['marked_at'].isoformat()
    await db.attendance.insert_one(doc)
    return attendance_obj

@api_router.post("/attendance/bulk")
async def bulk_mark_attendance(bulk_data: BulkAttendanceCreate):
    """Mark attendance for multiple students at once"""
    results = {"success": 0, "failed": 0, "errors": []}
    
    for record in bulk_data.records:
        try:
            student_id = record.get('student_id')
            status = record.get('status', 'present')
            no_charge_reason = record.get('no_charge_reason')
            
            if not student_id:
                results['failed'] += 1
                results['errors'].append("Missing student_id")
                continue
            
            existing = await db.attendance.find_one({
                "student_id": student_id,
                "class_id": bulk_data.class_id,
                "date": bulk_data.date
            }, {"_id": 0})
            
            update_data = {
                "status": status,
                "marked_at": datetime.now(timezone.utc).isoformat(),
                "no_charge_reason": no_charge_reason
            }
            
            if existing:
                await db.attendance.update_one(
                    {"id": existing['id']},
                    {"$set": update_data}
                )
            else:
                attendance_obj = Attendance(
                    student_id=student_id,
                    class_id=bulk_data.class_id,
                    date=bulk_data.date,
                    status=status,
                    no_charge_reason=no_charge_reason
                )
                doc = attendance_obj.model_dump()
                doc['marked_at'] = doc['marked_at'].isoformat()
                await db.attendance.insert_one(doc)
            
            results['success'] += 1
        except Exception as e:
            results['failed'] += 1
            results['errors'].append(str(e))
    
    return results

@api_router.post("/attendance/mark-all")
async def mark_all_attendance(class_id: str, date: str, status: str, no_charge_reason: Optional[str] = None):
    """Mark all students in a class with the same status"""
    # Get the class
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get all students in the class
    student_ids = cls.get('student_ids', [])
    if not student_ids:
        # If no students assigned to class, get all students
        students = await db.students.find({}, {"_id": 0, "id": 1}).to_list(1000)
        student_ids = [s['id'] for s in students]
    
    results = {"success": 0, "failed": 0}
    
    for student_id in student_ids:
        try:
            existing = await db.attendance.find_one({
                "student_id": student_id,
                "class_id": class_id,
                "date": date
            }, {"_id": 0})
            
            update_data = {
                "status": status,
                "marked_at": datetime.now(timezone.utc).isoformat(),
                "no_charge_reason": no_charge_reason
            }
            
            if existing:
                await db.attendance.update_one(
                    {"id": existing['id']},
                    {"$set": update_data}
                )
            else:
                attendance_obj = Attendance(
                    student_id=student_id,
                    class_id=class_id,
                    date=date,
                    status=status,
                    no_charge_reason=no_charge_reason
                )
                doc = attendance_obj.model_dump()
                doc['marked_at'] = doc['marked_at'].isoformat()
                await db.attendance.insert_one(doc)
            
            results['success'] += 1
        except Exception as e:
            results['failed'] += 1
    
    return results

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(date: Optional[str] = None, student_id: Optional[str] = None, class_id: Optional[str] = None):
    query = {}
    if date:
        query['date'] = date
    if student_id:
        query['student_id'] = student_id
    if class_id:
        query['class_id'] = class_id
    
    records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    for record in records:
        if isinstance(record['marked_at'], str):
            record['marked_at'] = datetime.fromisoformat(record['marked_at'])
        # Handle missing no_charge_reason field for existing records
        if 'no_charge_reason' not in record:
            record['no_charge_reason'] = None
    return records

# Invoice Routes (keeping existing + email)
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate):
    invoice_obj = Invoice(**invoice_data.model_dump())
    doc = invoice_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['issue_date'] = doc['issue_date'].isoformat()
    doc['due_date'] = doc['due_date'].isoformat()
    await db.invoices.insert_one(doc)
    
    # Send invoice email
    student = await db.students.find_one({"id": invoice_data.student_id}, {"_id": 0})
    if student:
        html = f"""
        <h2>New Invoice</h2>
        <p>Dear {student['name']},</p>
        <p>A new invoice has been generated for you.</p>
        <p>Invoice Number: {invoice_obj.invoice_number}</p>
        <p>Amount: {invoice_data.amount}</p>
        <p>Due Date: {invoice_data.due_date.strftime('%Y-%m-%d')}</p>
        <p>Description: {invoice_data.description}</p>
        <p>Please make the payment before the due date.</p>
        """
        await send_email_async(student['email'], f"Invoice {invoice_obj.invoice_number}", html)
    
    return invoice_obj

class InvoiceUpdate(BaseModel):
    amount: Optional[float] = None
    due_date: Optional[str] = None  # ISO date string
    issue_date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal['paid', 'pending', 'overdue', 'cancelled']] = None
    payment_terms: Optional[str] = None
    comments: Optional[str] = None
    discount_amount: Optional[float] = None
    discount_percentage: Optional[float] = None

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, payload: InvoiceUpdate):
    """Update editable fields of an invoice."""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_doc = {}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        if field in ('issue_date', 'due_date'):
            # Accept either ISO date or datetime — store as ISO string
            try:
                if 'T' in value:
                    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
                else:
                    parsed = datetime.fromisoformat(value)
                update_doc[field] = parsed.isoformat()
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid date format for {field}")
        else:
            update_doc[field] = value

    if not update_doc:
        return {"message": "No changes"}

    await db.invoices.update_one({"id": invoice_id}, {"$set": update_doc})
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Delete an invoice. Refunds applied credits to students and removes related payments."""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Refund applied credits back to student(s)
    credit_applied = float(invoice.get('credit_applied') or 0)
    if credit_applied > 0:
        if invoice.get('invoice_type') == 'family':
            student_ids = invoice.get('student_ids') or []
            if student_ids:
                per_student = credit_applied / len(student_ids)
                for sid in student_ids:
                    s = await db.students.find_one({"id": sid}, {"_id": 0})
                    if s:
                        await db.students.update_one(
                            {"id": sid},
                            {"$set": {"credit_balance": (s.get('credit_balance', 0) or 0) + per_student}}
                        )
        elif invoice.get('student_id'):
            sid = invoice['student_id']
            s = await db.students.find_one({"id": sid}, {"_id": 0})
            if s:
                await db.students.update_one(
                    {"id": sid},
                    {"$set": {"credit_balance": (s.get('credit_balance', 0) or 0) + credit_applied}}
                )

    # Remove payments tied to this invoice
    await db.payments.delete_many({"invoice_id": invoice_id})

    # Delete the invoice
    await db.invoices.delete_one({"id": invoice_id})
    return {"message": "Invoice deleted successfully"}

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(student_id: Optional[str] = None):
    query = {}
    if student_id:
        query['student_id'] = student_id
    
    invoices = await db.invoices.find(query, {"_id": 0}).to_list(1000)
    for invoice in invoices:
        if isinstance(invoice['created_at'], str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
        if isinstance(invoice['issue_date'], str):
            invoice['issue_date'] = datetime.fromisoformat(invoice['issue_date'])
        if isinstance(invoice['due_date'], str):
            invoice['due_date'] = datetime.fromisoformat(invoice['due_date'])
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if isinstance(invoice['created_at'], str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    if isinstance(invoice['issue_date'], str):
        invoice['issue_date'] = datetime.fromisoformat(invoice['issue_date'])
    if isinstance(invoice['due_date'], str):
        invoice['due_date'] = datetime.fromisoformat(invoice['due_date'])
    return invoice

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice_status(invoice_id: str, status: str):
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await get_invoice(invoice_id)

async def _generate_invoice_pdf_bytes(invoice_id: str) -> tuple:
    """Build invoice PDF and return (bytes, filename, invoice_number)."""
    import base64, io
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Resolve bill-to: prefer parent (for both family and student invoices).
    bill_to_name = ""
    bill_to_email = ""
    bill_to_phone = ""
    bill_to_for_line = ""  # appended "For: ..." line

    if invoice.get('invoice_type') == 'family' and invoice.get('family_id'):
        parent = await db.parents.find_one({"id": invoice['family_id']}, {"_id": 0})
        if parent:
            bill_to_name = parent.get('name', '')
            bill_to_email = parent.get('email', '')
            bill_to_phone = parent.get('phone', '')
        if invoice.get('student_ids'):
            children = await db.students.find(
                {"id": {"$in": invoice['student_ids']}}, {"_id": 0}
            ).to_list(100)
            if children:
                bill_to_for_line = "For: " + ", ".join(c.get('name', '') for c in children)
    elif invoice.get('student_id'):
        student = await db.students.find_one({"id": invoice['student_id']}, {"_id": 0})
        parent = None
        if student:
            if student.get('parent_id'):
                parent = await db.parents.find_one({"id": student['parent_id']}, {"_id": 0})
            if not parent:
                parent = await db.parents.find_one({"student_ids": invoice['student_id']}, {"_id": 0})
            if parent:
                bill_to_name = parent.get('name', '')
                bill_to_email = parent.get('email', '')
                bill_to_phone = parent.get('phone', '')
                bill_to_for_line = f"For: {student.get('name', '')}"
            else:
                # Fallback to student info if no parent linked
                bill_to_name = student.get('name', '')
                bill_to_email = student.get('email', '')
                bill_to_phone = student.get('phone', '')

    settings = await db.settings.find_one({}, {"_id": 0})
    company_name = settings.get('invoice_company_name', 'CoachCenter') if settings else 'CoachCenter'
    company_address = settings.get('invoice_address', '') if settings else ''
    invoice_logo_url = settings.get('invoice_logo_url', '') if settings else ''
    payment_terms = invoice.get('payment_terms') or (settings.get('invoice_payment_terms', '') if settings else '')

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header - Logo
    text_x = 40
    if invoice_logo_url and invoice_logo_url.startswith('data:image/'):
        try:
            _, b64data = invoice_logo_url.split(',', 1)
            img = ImageReader(io.BytesIO(base64.b64decode(b64data)))
            pdf.drawImage(img, 40, height - 90, width=60, height=60, preserveAspectRatio=True, mask='auto')
            text_x = 110
        except Exception:
            pass

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(text_x, height - 50, company_name)
    if company_address:
        pdf.setFont("Helvetica", 9)
        y_pos = height - 70
        for line in company_address.split('\n')[:3]:
            pdf.drawString(text_x, y_pos, line.strip())
            y_pos -= 12

    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(400, height - 50, "INVOICE")
    pdf.setFont("Helvetica", 10)
    invoice_num = invoice.get('invoice_number', invoice['id'][:8].upper())
    pdf.drawString(400, height - 75, f"Invoice #: {invoice_num}")
    issue_date = invoice['issue_date'][:10] if isinstance(invoice['issue_date'], str) else invoice['issue_date'].strftime('%Y-%m-%d')
    due_date = invoice['due_date'][:10] if isinstance(invoice['due_date'], str) else invoice['due_date'].strftime('%Y-%m-%d')
    pdf.drawString(400, height - 90, f"Issue Date: {issue_date}")
    pdf.drawString(400, height - 105, f"Due Date: {due_date}")

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, height - 140, "Bill To:")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, height - 158, bill_to_name or "N/A")
    bill_y = height - 172
    if bill_to_email:
        pdf.drawString(40, bill_y, bill_to_email)
        bill_y -= 14
    if bill_to_phone:
        pdf.drawString(40, bill_y, bill_to_phone)
        bill_y -= 14
    if bill_to_for_line:
        pdf.setFont("Helvetica-Oblique", 9)
        pdf.drawString(40, bill_y, bill_to_for_line)
        pdf.setFont("Helvetica", 10)

    show_class_details = settings.get('show_class_details', True) if settings else True
    show_tutor_details = settings.get('show_tutor_details', True) if settings else True
    show_session_date = settings.get('show_session_date', True) if settings else True
    show_duration = settings.get('show_duration', False) if settings else False
    show_no_charge_items = settings.get('show_no_charge_items', True) if settings else True

    y_pos = height - 230
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(40, y_pos, "Description")
    if show_session_date:
        pdf.drawString(280, y_pos, "Date")
    if show_duration:
        pdf.drawString(360, y_pos, "Duration")
    pdf.drawString(420, y_pos, "Qty")
    pdf.drawString(460, y_pos, "Rate")
    pdf.drawString(510, y_pos, "Amount")
    pdf.line(40, y_pos - 5, 560, y_pos - 5)

    y_pos -= 20
    pdf.setFont("Helvetica", 9)

    line_items = invoice.get('line_items', [])
    if line_items:
        for item in line_items:
            if not show_no_charge_items and item.get('status') == 'no_charge':
                continue
            base_desc = item.get('description', '') if show_class_details else (item.get('event_title') or '')
            desc = (base_desc or '')[:40]
            if show_tutor_details and item.get('tutor_name'):
                desc += f" ({item['tutor_name']})"
            pdf.drawString(40, y_pos, desc)
            if show_session_date:
                pdf.drawString(280, y_pos, str(item.get('event_date', '-')))
            if show_duration:
                pdf.drawString(360, y_pos, str(item.get('duration', '-')))
            pdf.drawString(420, y_pos, str(item.get('quantity', 1)))
            pdf.drawString(460, y_pos, f"{item.get('unit_price', 0):.0f}")
            pdf.drawString(510, y_pos, f"{item.get('amount', 0):.2f}")
            y_pos -= 15
    else:
        pdf.drawString(40, y_pos, (invoice.get('description') or '')[:50])
        pdf.drawString(510, y_pos, f"{invoice['amount']:.2f}")
        y_pos -= 15

    credits = invoice.get('credits', [])
    if credits:
        y_pos -= 10
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y_pos, "Credits Applied:")
        y_pos -= 15
        pdf.setFont("Helvetica", 9)
        for credit in credits:
            desc = credit.get('description', credit.get('reason', ''))
            if credit.get('original_date'):
                desc += f" (from {credit['original_date']})"
            pdf.drawString(40, y_pos, f"  - {desc}")
            pdf.drawString(510, y_pos, f"-{credit.get('amount', 0):.2f}")
            y_pos -= 12

    y_pos -= 20
    pdf.line(350, y_pos + 10, 560, y_pos + 10)

    subtotal = invoice.get('subtotal', invoice['amount'])
    discount = invoice.get('discount_amount', 0)
    credit_applied = invoice.get('credit_applied', 0)

    pdf.setFont("Helvetica", 10)
    pdf.drawString(350, y_pos, "Subtotal:")
    pdf.drawString(510, y_pos, f"{subtotal:.2f}")

    if discount > 0:
        y_pos -= 15
        disc_pct = invoice.get('discount_percentage', 0)
        pdf.drawString(350, y_pos, f"Discount ({disc_pct}%):")
        pdf.drawString(510, y_pos, f"-{discount:.2f}")

    if credit_applied > 0:
        y_pos -= 15
        pdf.drawString(350, y_pos, "Credit Applied:")
        pdf.drawString(510, y_pos, f"-{credit_applied:.2f}")

    y_pos -= 20
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(350, y_pos, "Total Due:")
    pdf.drawString(510, y_pos, f"{invoice['amount']:.2f}")

    y_pos -= 30
    pdf.setFont("Helvetica-Bold", 10)
    status_text = invoice['status'].upper()
    if status_text == 'PAID':
        pdf.setFillColorRGB(0.2, 0.6, 0.2)
    elif status_text == 'OVERDUE':
        pdf.setFillColorRGB(0.8, 0.2, 0.2)
    else:
        pdf.setFillColorRGB(0.8, 0.5, 0.2)
    pdf.drawString(40, y_pos, f"Status: {status_text}")
    pdf.setFillColorRGB(0, 0, 0)

    y_pos -= 30
    if payment_terms:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y_pos, "Payment Terms:")
        pdf.setFont("Helvetica", 9)
        y_pos -= 12
        for line in payment_terms.split('\n')[:3]:
            pdf.drawString(40, y_pos, line.strip())
            y_pos -= 10

    comments = invoice.get('comments', '')
    if comments:
        y_pos -= 15
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y_pos, "Notes:")
        pdf.setFont("Helvetica", 9)
        y_pos -= 12
        for line in comments.split('\n')[:3]:
            pdf.drawString(40, y_pos, line.strip())
            y_pos -= 10

    pdf.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes, f"Invoice_{invoice_num}.pdf", invoice_num


async def _generate_receipt_pdf_bytes(payment_id: str) -> tuple:
    """Build payment receipt PDF and return (bytes, filename, receipt_number)."""
    import base64, io
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    parent = None
    student = None
    if payment.get('family_id'):
        parent = await db.parents.find_one({"id": payment['family_id']}, {"_id": 0})
    if payment.get('student_id'):
        student = await db.students.find_one({"id": payment['student_id']}, {"_id": 0})
        if not parent and student:
            if student.get('parent_id'):
                parent = await db.parents.find_one({"id": student['parent_id']}, {"_id": 0})
            if not parent:
                parent = await db.parents.find_one({"student_ids": student['id']}, {"_id": 0})

    bill_to_name = (parent or {}).get('name') or (student or {}).get('name') or 'Customer'
    bill_to_email = (parent or {}).get('email') or (student or {}).get('email') or ''

    settings = await db.settings.find_one({}, {"_id": 0})
    company_name = (settings or {}).get('invoice_company_name') or (settings or {}).get('center_name') or 'StemXplore'
    company_address = (settings or {}).get('invoice_address') or (settings or {}).get('business_address') or ''
    invoice_logo_url = (settings or {}).get('invoice_logo_url') or ''

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    text_x = 40
    if invoice_logo_url and invoice_logo_url.startswith('data:image/'):
        try:
            _, b64data = invoice_logo_url.split(',', 1)
            img = ImageReader(io.BytesIO(base64.b64decode(b64data)))
            pdf.drawImage(img, 40, height - 90, width=60, height=60, preserveAspectRatio=True, mask='auto')
            text_x = 110
        except Exception:
            pass

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(text_x, height - 50, company_name)
    if company_address:
        pdf.setFont("Helvetica", 9)
        y_pos = height - 70
        for line in company_address.split('\n')[:3]:
            pdf.drawString(text_x, y_pos, line.strip())
            y_pos -= 12

    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(400, height - 50, "RECEIPT")
    pdf.setFont("Helvetica", 10)
    receipt_num = payment.get('receipt_number', payment['id'][:8].upper())
    pdf.drawString(400, height - 75, f"Receipt #: {receipt_num}")
    payment_date = payment['payment_date'][:10] if isinstance(payment['payment_date'], str) else payment['payment_date'].strftime('%Y-%m-%d')
    pdf.drawString(400, height - 90, f"Date: {payment_date}")

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, height - 140, "Received From:")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, height - 158, bill_to_name)
    if bill_to_email:
        pdf.drawString(40, height - 172, bill_to_email)

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, height - 220, "Payment Details")
    pdf.line(40, height - 225, 560, height - 225)

    y_pos = height - 245
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y_pos, "Payment Method:")
    pdf.drawString(180, y_pos, payment.get('payment_method', 'N/A'))
    y_pos -= 18

    if payment.get('reference_number'):
        pdf.drawString(40, y_pos, "Reference #:")
        pdf.drawString(180, y_pos, str(payment.get('reference_number')))
        y_pos -= 18

    if payment.get('invoice_id'):
        invoice = await db.invoices.find_one({"id": payment['invoice_id']}, {"_id": 0})
        if invoice:
            pdf.drawString(40, y_pos, "Against Invoice:")
            pdf.drawString(180, y_pos, invoice.get('invoice_number', invoice['id'][:8].upper()))
            y_pos -= 18

    y_pos -= 12
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y_pos, "Amount Paid:")
    pdf.drawString(180, y_pos, f"{payment.get('amount', 0):.2f}")

    y_pos -= 30
    pdf.setFont("Helvetica-Bold", 10)
    pdf.setFillColorRGB(0.2, 0.6, 0.2)
    pdf.drawString(40, y_pos, "Status: PAID")
    pdf.setFillColorRGB(0, 0, 0)

    if payment.get('notes'):
        y_pos -= 25
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y_pos, "Notes:")
        pdf.setFont("Helvetica", 9)
        y_pos -= 12
        for line in str(payment['notes']).split('\n')[:3]:
            pdf.drawString(40, y_pos, line.strip())
            y_pos -= 10

    y_pos -= 30
    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawString(40, y_pos, f"Thank you for your payment to {company_name}!")

    pdf.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes, f"Receipt_{receipt_num}.pdf", receipt_num


@api_router.get("/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: str):
    pdf_bytes, filename, _ = await _generate_invoice_pdf_bytes(invoice_id)
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_file.write(pdf_bytes)
    temp_file.close()
    return FileResponse(temp_file.name, media_type="application/pdf", filename=filename)


@api_router.get("/payments/{payment_id}/receipt-download")
async def download_receipt(payment_id: str):
    pdf_bytes, filename, _ = await _generate_receipt_pdf_bytes(payment_id)
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_file.write(pdf_bytes)
    temp_file.close()
    return FileResponse(temp_file.name, media_type="application/pdf", filename=filename)

async def _build_invoice_email_draft(invoice: dict):
    """Returns dict with recipient_email, recipient_name, subject, html for an invoice email."""
    recipient_email = None
    recipient_name = None
    student = None
    parent = None

    if invoice.get('invoice_type') == 'family' and invoice.get('family_id'):
        parent = await db.parents.find_one({"id": invoice['family_id']}, {"_id": 0})
        if parent and parent.get('email'):
            recipient_email = parent['email']
            recipient_name = parent.get('name', 'Parent')
    else:
        student = await db.students.find_one({"id": invoice.get('student_id')}, {"_id": 0})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        if student.get('parent_id'):
            parent = await db.parents.find_one({"id": student['parent_id']}, {"_id": 0})
        if not parent:
            parent = await db.parents.find_one({"student_ids": student['id']}, {"_id": 0})
        if parent and parent.get('email'):
            recipient_email = parent['email']
            recipient_name = parent.get('name', 'Parent')
        elif student.get('email'):
            recipient_email = student['email']
            recipient_name = student.get('name', 'Student')

    settings = await db.settings.find_one({}, {"_id": 0})
    company_name = (settings or {}).get('invoice_company_name') or (settings or {}).get('center_name') or 'StemXplore'

    invoice_num = invoice.get('invoice_number', invoice['id'][:8].upper())
    issue_date = invoice['issue_date'][:10] if isinstance(invoice['issue_date'], str) else invoice['issue_date'].strftime('%Y-%m-%d')
    due_date = invoice['due_date'][:10] if isinstance(invoice['due_date'], str) else invoice['due_date'].strftime('%Y-%m-%d')
    bill_to_name = student['name'] if student else (parent.get('name', '') if parent else '')

    subject = f"Invoice {invoice_num} for {bill_to_name}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E3A8A;">{company_name}</h2>
        <h3>Invoice for {bill_to_name}</h3>

        <p>Dear {recipient_name or 'there'},</p>
        <p>Please find below the invoice details for {bill_to_name}.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice #:</strong> {invoice_num}</p>
            <p><strong>Issue Date:</strong> {issue_date}</p>
            <p><strong>Due Date:</strong> {due_date}</p>
            <p><strong>Amount:</strong> {invoice['amount']:.2f}</p>
            <p><strong>Status:</strong> {invoice['status'].upper()}</p>
        </div>

        <p><strong>Description:</strong> {invoice['description']}</p>

        {f"<p><strong>Payment Terms:</strong> {invoice.get('payment_terms', '')}</p>" if invoice.get('payment_terms') else ''}

        <p>Please make the payment before the due date.</p>
        <p>Thank you for choosing {company_name}!</p>
    </div>
    """
    return {
        "recipient_email": recipient_email,
        "recipient_name": recipient_name,
        "subject": subject,
        "html": html,
    }


@api_router.get("/invoices/{invoice_id}/email-draft")
async def get_invoice_email_draft(invoice_id: str):
    """Return the editable email draft (recipient + subject + body) for an invoice."""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    draft = await _build_invoice_email_draft(invoice)
    if not draft["recipient_email"]:
        # Still return a draft so user can manually enter an email
        draft["recipient_email"] = ""
    return draft


class SendEmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html: str


@api_router.post("/invoices/{invoice_id}/send-to-parent")
async def send_invoice_to_parent(invoice_id: str, payload: Optional[SendEmailRequest] = None):
    """
    Send invoice email with PDF attachment. If payload is provided, uses the user-edited
    subject/html/recipient. Otherwise builds the default draft and sends it.
    """
    import base64 as _b64
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload:
        recipient_email = payload.recipient_email
        subject = payload.subject
        html = payload.html
    else:
        draft = await _build_invoice_email_draft(invoice)
        recipient_email = draft["recipient_email"]
        subject = draft["subject"]
        html = draft["html"]

    if not recipient_email:
        raise HTTPException(status_code=400, detail="No recipient email")

    # Generate PDF and attach
    attachments = None
    try:
        pdf_bytes, filename, _ = await _generate_invoice_pdf_bytes(invoice_id)
        attachments = [{
            "filename": filename,
            "content": _b64.b64encode(pdf_bytes).decode("ascii"),
        }]
    except Exception as e:
        logging.error(f"PDF attach failed for invoice {invoice_id}: {e}")

    result = await send_email_async(recipient_email, subject, html, attachments=attachments)

    if result.get("status") == "skipped":
        raise HTTPException(status_code=503, detail="Email service not configured. Add RESEND_API_KEY to enable sending.")
    if result.get("status") == "error":
        raise HTTPException(status_code=502, detail=f"Email send failed: {result.get('message', 'unknown error')}")

    return {"message": f"Invoice sent to {recipient_email} successfully", "recipient": recipient_email, "attached": bool(attachments)}

# Payment/Receipt Routes
@api_router.get("/payments")
async def get_payments(
    student_id: Optional[str] = None,
    family_id: Optional[str] = None,
    invoice_id: Optional[str] = None
):
    """Get all payments with optional filters"""
    query = {}
    if student_id:
        query["student_id"] = student_id
    if family_id:
        query["family_id"] = family_id
    if invoice_id:
        query["invoice_id"] = invoice_id
    
    payments = await db.payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    for payment in payments:
        if isinstance(payment.get('payment_date'), str):
            payment['payment_date'] = datetime.fromisoformat(payment['payment_date'].replace('Z', '+00:00'))
        if isinstance(payment.get('created_at'), str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'].replace('Z', '+00:00'))
    return payments

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate):
    """Record a new payment"""
    payment_obj = Payment(**payment_data.model_dump())
    doc = payment_obj.model_dump()
    doc['payment_date'] = doc['payment_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # If payment is for an invoice, update invoice status and remaining balance
    if payment_data.invoice_id:
        invoice = await db.invoices.find_one({"id": payment_data.invoice_id}, {"_id": 0})
        if invoice:
            # Calculate total paid for this invoice
            invoice_payments = await db.payments.find({"invoice_id": payment_data.invoice_id}, {"_id": 0}).to_list(1000)
            total_paid = sum(p.get('amount', 0) for p in invoice_payments)
            
            # Update invoice status if fully paid
            if total_paid >= invoice['amount']:
                await db.invoices.update_one(
                    {"id": payment_data.invoice_id},
                    {"$set": {"status": "paid"}}
                )
    
    # If on-account payment, add to student/family credit balance
    if payment_data.payment_type == 'on_account':
        if payment_data.student_id:
            student = await db.students.find_one({"id": payment_data.student_id}, {"_id": 0})
            if student:
                current_balance = student.get('credit_balance', 0)
                credit_details = student.get('credit_details', [])
                credit_details.append({
                    "amount": payment_data.amount,
                    "reason": f"On-account payment - {payment_obj.receipt_number}",
                    "date": datetime.now(timezone.utc).isoformat(),
                    "payment_id": payment_obj.id
                })
                await db.students.update_one(
                    {"id": payment_data.student_id},
                    {"$set": {
                        "credit_balance": current_balance + payment_data.amount,
                        "credit_details": credit_details
                    }}
                )
    
    return payment_obj

@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str):
    """Get a single payment"""
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

async def _build_receipt_email_draft(payment: dict):
    """Returns dict with recipient_email, recipient_name, subject, html for a payment receipt."""
    parent = None
    student = None
    recipient_email = None
    recipient_name = None

    if payment.get('family_id'):
        parent = await db.parents.find_one({"id": payment['family_id']}, {"_id": 0})
    if payment.get('student_id'):
        student = await db.students.find_one({"id": payment['student_id']}, {"_id": 0})
        if not parent and student:
            if student.get('parent_id'):
                parent = await db.parents.find_one({"id": student['parent_id']}, {"_id": 0})
            if not parent:
                parent = await db.parents.find_one({"student_ids": student['id']}, {"_id": 0})

    if parent and parent.get('email'):
        recipient_email = parent['email']
        recipient_name = parent.get('name', 'Parent')
    elif student and student.get('email'):
        recipient_email = student['email']
        recipient_name = student.get('name', 'Student')

    settings = await db.settings.find_one({}, {"_id": 0})
    company_name = (settings or {}).get('invoice_company_name') or (settings or {}).get('center_name') or 'StemXplore'

    receipt_num = payment.get('receipt_number', payment['id'][:8].upper())
    payment_date = payment['payment_date'][:10] if isinstance(payment['payment_date'], str) else payment['payment_date'].strftime('%Y-%m-%d')

    invoice_info = ""
    if payment.get('invoice_id'):
        invoice = await db.invoices.find_one({"id": payment['invoice_id']}, {"_id": 0})
        if invoice:
            invoice_info = f"<p><strong>Invoice #:</strong> {invoice.get('invoice_number', invoice['id'][:8].upper())}</p>"

    student_name = student['name'] if student else (parent.get('name', '') if parent else 'Customer')

    subject = f"Payment Receipt {receipt_num}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E3A8A;">{company_name}</h2>
        <h3>Payment Receipt</h3>

        <p>Dear {recipient_name or 'there'},</p>
        <p>Thank you for your payment. Here is your receipt:</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Receipt #:</strong> {receipt_num}</p>
            <p><strong>Date:</strong> {payment_date}</p>
            <p><strong>Amount:</strong> {payment['amount']:.2f}</p>
            <p><strong>Payment Method:</strong> {payment.get('payment_method', 'N/A')}</p>
            {f"<p><strong>Reference:</strong> {payment.get('reference_number')}</p>" if payment.get('reference_number') else ''}
            {invoice_info}
            <p><strong>For:</strong> {student_name}</p>
        </div>

        {f"<p><strong>Notes:</strong> {payment.get('notes', '')}</p>" if payment.get('notes') else ''}

        <p>Thank you for choosing {company_name}!</p>
    </div>
    """
    return {
        "recipient_email": recipient_email,
        "recipient_name": recipient_name,
        "subject": subject,
        "html": html,
    }


@api_router.get("/payments/{payment_id}/receipt-draft")
async def get_receipt_email_draft(payment_id: str):
    """Return the editable email draft (recipient + subject + body) for a payment receipt."""
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    draft = await _build_receipt_email_draft(payment)
    if not draft["recipient_email"]:
        draft["recipient_email"] = ""
    return draft


@api_router.post("/payments/{payment_id}/send-receipt")
async def send_payment_receipt(payment_id: str, payload: Optional[SendEmailRequest] = None):
    """Send payment receipt email with PDF attachment. Optional payload to override fields."""
    import base64 as _b64
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payload:
        recipient_email = payload.recipient_email
        subject = payload.subject
        html = payload.html
    else:
        draft = await _build_receipt_email_draft(payment)
        recipient_email = draft["recipient_email"]
        subject = draft["subject"]
        html = draft["html"]

    if not recipient_email:
        raise HTTPException(status_code=400, detail="No recipient email")

    # Generate receipt PDF and attach
    attachments = None
    try:
        pdf_bytes, filename, _ = await _generate_receipt_pdf_bytes(payment_id)
        attachments = [{
            "filename": filename,
            "content": _b64.b64encode(pdf_bytes).decode("ascii"),
        }]
    except Exception as e:
        logging.error(f"Receipt PDF attach failed for payment {payment_id}: {e}")

    result = await send_email_async(recipient_email, subject, html, attachments=attachments)
    if result.get("status") == "skipped":
        raise HTTPException(status_code=503, detail="Email service not configured. Add RESEND_API_KEY to enable sending.")
    if result.get("status") == "error":
        raise HTTPException(status_code=502, detail=f"Email send failed: {result.get('message', 'unknown error')}")

    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": f"Receipt sent to {recipient_email} successfully", "recipient": recipient_email, "attached": bool(attachments)}

@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    invoice_id: str,
    amount: float,
    payment_method: str,
    payment_date: str,
    reference_number: Optional[str] = None,
    notes: Optional[str] = None,
    send_receipt: bool = False
):
    """Mark invoice as paid and create payment record"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Create payment record
    payment_data = PaymentCreate(
        invoice_id=invoice_id,
        student_id=invoice.get('student_id'),
        family_id=invoice.get('family_id'),
        amount=amount,
        payment_date=datetime.fromisoformat(payment_date),
        payment_method=payment_method,
        reference_number=reference_number,
        notes=notes,
        payment_type='invoice_payment'
    )
    
    payment_obj = Payment(**payment_data.model_dump())
    doc = payment_obj.model_dump()
    doc['payment_date'] = doc['payment_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # Calculate total paid for this invoice
    invoice_payments = await db.payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(1000)
    total_paid = sum(p.get('amount', 0) for p in invoice_payments)
    
    # Update invoice status
    new_status = "paid" if total_paid >= invoice['amount'] else "pending"
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {"status": new_status}}
    )
    
    # Send receipt if requested
    if send_receipt:
        try:
            await send_payment_receipt(payment_obj.id)
        except Exception as e:
            print(f"Failed to send receipt: {e}")
    
    return {
        "message": "Payment recorded successfully",
        "payment_id": payment_obj.id,
        "receipt_number": payment_obj.receipt_number,
        "invoice_status": new_status,
        "total_paid": total_paid,
        "remaining": max(0, invoice['amount'] - total_paid)
    }

@api_router.get("/families/{family_id}/summary")
async def get_family_summary(family_id: str):
    """Get comprehensive family summary with students, invoices, payments, and balances"""
    family = await db.parents.find_one({"id": family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Get students in this family
    student_ids_from_parent = family.get('student_ids', [])
    students_query = {
        "$or": [
            {"parent_id": family_id},
            {"id": {"$in": student_ids_from_parent}}
        ]
    }
    students = await db.students.find(students_query, {"_id": 0}).to_list(100)
    student_ids = [s['id'] for s in students]
    
    # Get all invoices for these students or this family
    invoices_query = {
        "$or": [
            {"student_id": {"$in": student_ids}},
            {"family_id": family_id}
        ]
    }
    invoices = await db.invoices.find(invoices_query, {"_id": 0}).sort("issue_date", -1).to_list(1000)
    
    # Get all payments for these students or this family
    payments_query = {
        "$or": [
            {"student_id": {"$in": student_ids}},
            {"family_id": family_id}
        ]
    }
    payments = await db.payments.find(payments_query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    
    # Calculate balances - include all payments (with or without payment_type field)
    total_invoiced = sum(inv.get('amount', 0) for inv in invoices if inv.get('status') != 'cancelled')
    # Sum all payments that are either invoice_payment or have no payment_type (legacy payments)
    total_paid = sum(p.get('amount', 0) for p in payments if p.get('payment_type', 'invoice_payment') != 'on_account')
    on_account_balance = sum(p.get('amount', 0) for p in payments if p.get('payment_type') == 'on_account')
    
    # Student credit balances
    total_credit_balance = sum(s.get('credit_balance', 0) for s in students)
    
    outstanding = max(0, total_invoiced - total_paid - on_account_balance - total_credit_balance)
    
    # Summarize by status
    invoice_summary = {
        "pending": len([i for i in invoices if i.get('status') == 'pending']),
        "paid": len([i for i in invoices if i.get('status') == 'paid']),
        "overdue": len([i for i in invoices if i.get('status') == 'overdue']),
        "cancelled": len([i for i in invoices if i.get('status') == 'cancelled'])
    }
    
    # Calculate cancelled amount for display
    cancelled_amount = sum(inv.get('amount', 0) for inv in invoices if inv.get('status') == 'cancelled')
    
    return {
        "family": family,
        "students": students,
        "invoices": invoices,
        "payments": payments,
        "summary": {
            "total_students": len(students),
            "total_invoiced": total_invoiced,
            "cancelled_amount": cancelled_amount,
            "total_paid": total_paid,
            "on_account_balance": on_account_balance,
            "credit_balance": total_credit_balance,
            "outstanding_balance": outstanding,
            "invoice_summary": invoice_summary
        }
    }

@api_router.post("/payments/apply-on-account")
async def apply_on_account_to_invoice(
    student_id: str,
    invoice_id: str,
    amount: float
):
    """Apply on-account balance to an invoice"""
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    credit_balance = student.get('credit_balance', 0)
    if amount > credit_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient credit balance. Available: {credit_balance}")
    
    # Create payment record
    payment_obj = Payment(
        invoice_id=invoice_id,
        student_id=student_id,
        amount=amount,
        payment_date=datetime.now(timezone.utc),
        payment_method="Credit Balance",
        notes="Applied from on-account balance",
        payment_type='invoice_payment'
    )
    doc = payment_obj.model_dump()
    doc['payment_date'] = doc['payment_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # Deduct from student credit balance
    new_balance = credit_balance - amount
    await db.students.update_one(
        {"id": student_id},
        {"$set": {"credit_balance": new_balance}}
    )
    
    # Check if invoice is fully paid
    invoice_payments = await db.payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(1000)
    total_paid = sum(p.get('amount', 0) for p in invoice_payments)
    
    if total_paid >= invoice['amount']:
        await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"status": "paid"}}
        )
    
    return {
        "message": "Credit applied successfully",
        "amount_applied": amount,
        "remaining_credit": new_balance,
        "invoice_status": "paid" if total_paid >= invoice['amount'] else "pending"
    }

@api_router.post("/invoices/generate-auto")
async def generate_auto_invoices():
    """Generate auto-invoices for students with auto-invoice enabled"""
    students = await db.students.find({"auto_invoice": True}, {"_id": 0}).to_list(1000)
    
    today = datetime.now(timezone.utc)
    generated = 0
    
    for student in students:
        frequency = student.get('invoice_frequency', 'monthly')
        invoice_day = student.get('invoice_day', 1)
        
        should_generate = False
        
        if frequency == 'monthly' and today.day == invoice_day:
            should_generate = True
        elif frequency == 'weekly' and today.weekday() == invoice_day:
            should_generate = True
        elif frequency == 'custom':
            custom_date = student.get('custom_invoice_date')
            if custom_date and custom_date == today.strftime('%Y-%m-%d'):
                should_generate = True
        
        if should_generate:
            # Get student's classes for line items
            classes = await db.classes.find({"id": {"$in": student.get('class_ids', [])}}, {"_id": 0}).to_list(100)
            
            line_items = []
            subtotal = 0
            for cls in classes:
                teacher = None
                if cls.get('teacher_ids'):
                    teacher = await db.teachers.find_one({"id": cls['teacher_ids'][0]}, {"_id": 0})
                
                fee = cls.get('standard_fee', 0) or student.get('fee_amount', 0)
                line_items.append({
                    "description": cls['name'],
                    "class_name": cls['name'],
                    "tutor_name": teacher['name'] if teacher else '',
                    "duration": cls.get('duration', ''),
                    "quantity": 1,
                    "unit_price": fee,
                    "amount": fee
                })
                subtotal += fee
            
            # Calculate discount
            discount_pct = student.get('discount_percentage', 0)
            discount_amount = subtotal * (discount_pct / 100)
            
            # Apply credits
            credit_balance = student.get('credit_balance', 0)
            credit_applied = min(credit_balance, subtotal - discount_amount)
            
            credits = []
            if credit_applied > 0:
                for credit in student.get('credit_details', []):
                    if credit.get('amount', 0) > 0:
                        credits.append({
                            "description": credit.get('reason', 'Credit'),
                            "amount": credit.get('amount', 0),
                            "original_date": credit.get('original_class_date'),
                            "reason": credit.get('reason', '')
                        })
            
            final_amount = subtotal - discount_amount - credit_applied
            
            # Create invoice
            invoice_data = {
                "student_id": student['id'],
                "amount": max(0, final_amount),
                "issue_date": today,
                "due_date": today + timedelta(days=15),
                "description": f"Monthly Fee - {today.strftime('%B %Y')}",
                "status": "pending",
                "line_items": line_items,
                "credits": credits,
                "subtotal": subtotal,
                "discount_amount": discount_amount,
                "discount_percentage": discount_pct,
                "credit_applied": credit_applied,
                "auto_generated": True
            }
            
            invoice_obj = Invoice(**invoice_data)
            doc = invoice_obj.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['issue_date'] = doc['issue_date'].isoformat()
            doc['due_date'] = doc['due_date'].isoformat()
            await db.invoices.insert_one(doc)
            
            # Deduct credits from student
            if credit_applied > 0:
                await db.students.update_one(
                    {"id": student['id']},
                    {"$set": {
                        "credit_balance": credit_balance - credit_applied,
                        "credit_details": []
                    }}
                )
            
            generated += 1
    
    return {"message": f"Generated {generated} invoices"}

# Advanced Invoice Generation
class InvoiceGenerationRequest(BaseModel):
    student_id: Optional[str] = None  # For single student invoice
    family_id: Optional[str] = None  # For family invoice
    student_ids: List[str] = []  # Specific students to include (for family)
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    include_upcoming: bool = False  # Include future scheduled events
    apply_credits: bool = True  # Auto-apply student credits

async def generate_student_line_items(student, start_date, end_date, include_upcoming, class_map, teacher_map):
    """Helper function to generate line items for a single student"""
    student_class_ids = student.get('class_ids', [])
    
    # Get events in date range for this student
    events_query = {
        "start_date": {"$gte": start_date, "$lte": end_date + "T23:59:59"},
        "$or": [
            {"participants": student['id']},
            {"class_id": {"$in": student_class_ids}}
        ]
    }
    events = await db.events.find(events_query, {"_id": 0}).to_list(1000)
    
    # Get attendance records
    attendance_query = {
        "student_id": student['id'],
        "date": {"$gte": start_date, "$lte": end_date}
    }
    attendance_records = await db.attendance.find(attendance_query, {"_id": 0}).to_list(1000)
    attendance_map = {(a['class_id'], a['date']): a for a in attendance_records}
    
    # Get teacher attendance for self-study detection
    teacher_attendance_query = {
        "attendance_type": "teacher",
        "date": {"$gte": start_date, "$lte": end_date}
    }
    teacher_attendance = await db.attendance.find(teacher_attendance_query, {"_id": 0}).to_list(1000)
    teacher_attendance_map = {}
    for ta in teacher_attendance:
        key = (ta['class_id'], ta['date'])
        if key not in teacher_attendance_map:
            teacher_attendance_map[key] = []
        teacher_attendance_map[key].append(ta)
    
    line_items = []
    credits = []
    subtotal = 0.0
    
    for event in events:
        event_id = event.get('id')
        class_id = event.get('class_id')
        event_date = event.get('start_date', '')[:10]
        event_title = event.get('title', 'Class Session')
        
        cls = class_map.get(class_id, {})
        fee = cls.get('standard_fee', 0) or student.get('fee_amount', 0)
        
        teacher_names = []
        for tid in cls.get('teacher_ids', []):
            t = teacher_map.get(tid)
            if t:
                teacher_names.append(t['name'])
        
        att_key = (class_id, event_date) if class_id else None
        attendance = attendance_map.get(att_key) if att_key else None
        
        teacher_att = teacher_attendance_map.get(att_key, []) if att_key else []
        all_teachers_absent = False
        if teacher_att and cls.get('teacher_ids'):
            present_teachers = [ta for ta in teacher_att if ta.get('status') in ['present', 'late']]
            all_teachers_absent = len(present_teachers) == 0
        
        charge_status = 'charge'
        no_charge_reason = None
        
        if attendance:
            if attendance.get('status') == 'present_no_charge':
                charge_status = 'no_charge'
                no_charge_reason = attendance.get('no_charge_reason', 'No charge')
            elif attendance.get('status') == 'absent':
                charge_status = 'absent'
        
        if all_teachers_absent and attendance and attendance.get('status') in ['present', 'late']:
            charge_status = 'no_charge'
            no_charge_reason = 'Self-study (teacher absent)'
        
        event_status = event.get('status', 'scheduled')
        if event_status == 'cancelled':
            continue
        
        if charge_status == 'charge':
            line_items.append({
                "description": event_title,
                "quantity": 1,
                "unit_price": fee,
                "amount": fee,
                "class_id": class_id,
                "class_name": cls.get('name', ''),
                "tutor_name": ', '.join(teacher_names) if teacher_names else '',
                "duration": cls.get('duration', ''),
                "event_id": event_id,
                "event_date": event_date,
                "status": 'charged',
                "student_id": student['id'],
                "student_name": student['name']
            })
            subtotal += fee
        elif charge_status == 'no_charge':
            line_items.append({
                "description": f"{event_title} (No Charge)",
                "quantity": 1,
                "unit_price": fee,
                "amount": 0,
                "class_id": class_id,
                "class_name": cls.get('name', ''),
                "tutor_name": ', '.join(teacher_names) if teacher_names else '',
                "duration": cls.get('duration', ''),
                "event_id": event_id,
                "event_date": event_date,
                "status": 'no_charge',
                "no_charge_reason": no_charge_reason,
                "student_id": student['id'],
                "student_name": student['name']
            })
    
    # Include upcoming events if requested
    if include_upcoming:
        upcoming_query = {
            "start_date": {"$gt": end_date + "T23:59:59"},
            "$or": [
                {"participants": student['id']},
                {"class_id": {"$in": student_class_ids}}
            ]
        }
        upcoming_events = await db.events.find(upcoming_query, {"_id": 0}).to_list(100)
        
        for event in upcoming_events:
            class_id = event.get('class_id')
            cls = class_map.get(class_id, {})
            fee = cls.get('standard_fee', 0) or student.get('fee_amount', 0)
            
            teacher_names = []
            for tid in cls.get('teacher_ids', []):
                t = teacher_map.get(tid)
                if t:
                    teacher_names.append(t['name'])
            
            line_items.append({
                "description": f"{event.get('title', 'Class Session')} (Upcoming)",
                "quantity": 1,
                "unit_price": fee,
                "amount": fee,
                "class_id": class_id,
                "class_name": cls.get('name', ''),
                "tutor_name": ', '.join(teacher_names) if teacher_names else '',
                "duration": cls.get('duration', ''),
                "event_id": event.get('id'),
                "event_date": event.get('start_date', '')[:10],
                "status": 'upcoming',
                "student_id": student['id'],
                "student_name": student['name']
            })
            subtotal += fee
    
    return line_items, credits, subtotal

@api_router.post("/invoices/generate-for-family")
async def generate_invoice_for_family(request: InvoiceGenerationRequest):
    """Generate invoice for a family with multiple students"""
    if not request.family_id:
        raise HTTPException(status_code=400, detail="Family ID is required")
    
    # Get family (parent)
    family = await db.parents.find_one({"id": request.family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Get students in this family - check both parent_id field and parent's student_ids list
    family_student_ids = family.get('student_ids', [])
    
    if request.student_ids:
        # Filter to only requested students
        target_student_ids = [sid for sid in request.student_ids if sid in family_student_ids]
    else:
        target_student_ids = family_student_ids
    
    # Query students - either by parent_id OR by being in the family's student_ids list
    students_query = {
        "$or": [
            {"parent_id": request.family_id},
            {"id": {"$in": target_student_ids}}
        ]
    }
    
    students = await db.students.find(students_query, {"_id": 0}).to_list(100)
    if not students:
        raise HTTPException(status_code=404, detail="No students found for this family")
    
    # Collect all class IDs
    all_class_ids = []
    for student in students:
        all_class_ids.extend(student.get('class_ids', []))
    all_class_ids = list(set(all_class_ids))
    
    # Get classes and teachers
    classes = await db.classes.find({"id": {"$in": all_class_ids}}, {"_id": 0}).to_list(100)
    class_map = {c['id']: c for c in classes}
    
    all_teacher_ids = []
    for cls in classes:
        all_teacher_ids.extend(cls.get('teacher_ids', []))
    teachers = await db.teachers.find({"id": {"$in": list(set(all_teacher_ids))}}, {"_id": 0}).to_list(100)
    teacher_map = {t['id']: t for t in teachers}
    
    # Generate line items for each student
    all_line_items = []
    all_credits = []
    total_subtotal = 0.0
    students_summary = []
    
    for student in students:
        line_items, credits, subtotal = await generate_student_line_items(
            student, 
            request.start_date, 
            request.end_date, 
            request.include_upcoming,
            class_map,
            teacher_map
        )
        all_line_items.extend(line_items)
        all_credits.extend(credits)
        total_subtotal += subtotal
        
        # Add student credit balance
        credit_balance = student.get('credit_balance', 0)
        discount_percentage = student.get('discount_percentage', 0)
        
        students_summary.append({
            "id": student['id'],
            "name": student['name'],
            "sessions": len([i for i in line_items if i.get('status') == 'charged']),
            "no_charge_sessions": len([i for i in line_items if i.get('status') == 'no_charge']),
            "subtotal": subtotal,
            "credit_balance": credit_balance,
            "discount_percentage": discount_percentage
        })
    
    # Calculate totals
    total_credit_balance = sum(s.get('credit_balance', 0) for s in students_summary)
    # Use family discount if set, otherwise use average of student discounts
    avg_discount = sum(s.get('discount_percentage', 0) for s in students_summary) / len(students_summary) if students_summary else 0
    discount_amount = total_subtotal * (avg_discount / 100)
    credit_to_apply = min(total_credit_balance, total_subtotal - discount_amount) if request.apply_credits else 0
    final_amount = max(0, total_subtotal - discount_amount - credit_to_apply)
    
    return {
        "family": {
            "id": family['id'],
            "name": family['name'],
            "email": family['email']
        },
        "students": students_summary,
        "period": {
            "start_date": request.start_date,
            "end_date": request.end_date,
            "include_upcoming": request.include_upcoming
        },
        "line_items": all_line_items,
        "credits": all_credits,
        "summary": {
            "subtotal": total_subtotal,
            "discount_percentage": avg_discount,
            "discount_amount": discount_amount,
            "total_credit_balance": total_credit_balance,
            "credit_applied": credit_to_apply,
            "total_due": final_amount,
            "total_students": len(students),
            "total_sessions": len([i for i in all_line_items if i.get('status') == 'charged']),
            "no_charge_sessions": len([i for i in all_line_items if i.get('status') == 'no_charge']),
            "upcoming_sessions": len([i for i in all_line_items if i.get('status') == 'upcoming'])
        }
    }

@api_router.post("/invoices/create-family-invoice")
async def create_family_invoice(payload: CreateFamilyInvoiceRequest):
    """Create a family invoice for multiple students"""
    family = await db.parents.find_one({"id": payload.family_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    student_id_list = [s.strip() for s in payload.student_ids.split(',') if s.strip()]
    
    settings = await db.settings.find_one({}, {"_id": 0})
    invoice_description = payload.description or f"Family Invoice: Classes from {payload.start_date} to {payload.end_date}"
    
    invoice_data = {
        "student_id": None,
        "family_id": payload.family_id,
        "student_ids": student_id_list,
        "amount": payload.total_due,
        "issue_date": datetime.now(timezone.utc),
        "due_date": datetime.now(timezone.utc) + timedelta(days=15),
        "description": invoice_description,
        "status": "pending",
        "line_items": payload.line_items,
        "credits": payload.credits,
        "subtotal": payload.subtotal,
        "discount_amount": payload.discount_amount,
        "discount_percentage": payload.discount_percentage,
        "credit_applied": payload.credit_applied,
        "payment_terms": payload.payment_terms or (settings.get('invoice_payment_terms', '') if settings else ''),
        "comments": payload.comments,
        "auto_generated": False,
        "invoice_type": "family"
    }
    
    invoice_obj = Invoice(**invoice_data)
    doc = invoice_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['issue_date'] = doc['issue_date'].isoformat()
    doc['due_date'] = doc['due_date'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Deduct credits from students proportionally
    if payload.credit_applied > 0:
        students = await db.students.find({"id": {"$in": student_id_list}}, {"_id": 0}).to_list(100)
        remaining_credit = payload.credit_applied
        for student in students:
            student_credit = student.get('credit_balance', 0)
            if student_credit > 0 and remaining_credit > 0:
                deduct = min(student_credit, remaining_credit)
                await db.students.update_one(
                    {"id": student['id']},
                    {"$set": {"credit_balance": student_credit - deduct, "credit_details": []}}
                )
                remaining_credit -= deduct
    
    return {
        "message": "Family invoice created successfully",
        "invoice_id": invoice_obj.id,
        "invoice_number": invoice_obj.invoice_number
    }

@api_router.post("/invoices/generate-for-student")
async def generate_invoice_for_student(request: InvoiceGenerationRequest):
    """
    Generate a detailed invoice for a student based on:
    - Attendance records (charged classes)
    - No-charge sessions (present_no_charge status)
    - Cancelled events that were previously invoiced (creates credits)
    - Upcoming events if include_upcoming is True
    """
    student = await db.students.find_one({"id": request.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get student's classes
    student_class_ids = student.get('class_ids', [])
    classes = await db.classes.find({"id": {"$in": student_class_ids}}, {"_id": 0}).to_list(100)
    class_map = {c['id']: c for c in classes}
    
    # Get teachers for class info
    all_teacher_ids = []
    for cls in classes:
        all_teacher_ids.extend(cls.get('teacher_ids', []))
    teachers = await db.teachers.find({"id": {"$in": list(set(all_teacher_ids))}}, {"_id": 0}).to_list(100)
    teacher_map = {t['id']: t for t in teachers}
    
    # Get events in date range
    events_query = {
        "start_date": {"$gte": request.start_date, "$lte": request.end_date + "T23:59:59"},
        "$or": [
            {"participants": request.student_id},
            {"class_id": {"$in": student_class_ids}}
        ]
    }
    events = await db.events.find(events_query, {"_id": 0}).to_list(1000)
    
    # Get attendance records for the date range
    attendance_query = {
        "student_id": request.student_id,
        "date": {"$gte": request.start_date, "$lte": request.end_date}
    }
    attendance_records = await db.attendance.find(attendance_query, {"_id": 0}).to_list(1000)
    attendance_map = {(a['class_id'], a['date']): a for a in attendance_records}
    
    # Get teacher attendance to check for "self-study" sessions
    teacher_attendance_query = {
        "attendance_type": "teacher",
        "date": {"$gte": request.start_date, "$lte": request.end_date}
    }
    teacher_attendance = await db.attendance.find(teacher_attendance_query, {"_id": 0}).to_list(1000)
    teacher_attendance_map = {}
    for ta in teacher_attendance:
        key = (ta['class_id'], ta['date'])
        if key not in teacher_attendance_map:
            teacher_attendance_map[key] = []
        teacher_attendance_map[key].append(ta)
    
    # Check for previously invoiced events that are now cancelled
    previous_invoices = await db.invoices.find({
        "student_id": request.student_id,
        "status": {"$nin": ["cancelled"]}
    }, {"_id": 0}).to_list(1000)
    
    invoiced_events = set()
    for inv in previous_invoices:
        for item in inv.get('line_items', []):
            if item.get('event_id'):
                invoiced_events.add(item['event_id'])
    
    line_items = []
    credits = []
    subtotal = 0.0
    
    # Process events
    for event in events:
        event_id = event.get('id')
        class_id = event.get('class_id')
        event_date = event.get('start_date', '')[:10]
        event_title = event.get('title', 'Class Session')
        
        cls = class_map.get(class_id, {})
        fee = cls.get('standard_fee', 0) or student.get('fee_amount', 0)
        
        # Get teacher info
        teacher_names = []
        for tid in cls.get('teacher_ids', []):
            t = teacher_map.get(tid)
            if t:
                teacher_names.append(t['name'])
        
        # Check attendance status
        att_key = (class_id, event_date) if class_id else None
        attendance = attendance_map.get(att_key) if att_key else None
        
        # Check if any teacher was absent for this class/date
        teacher_att = teacher_attendance_map.get(att_key, []) if att_key else []
        all_teachers_absent = False
        if teacher_att and cls.get('teacher_ids'):
            present_teachers = [ta for ta in teacher_att if ta.get('status') in ['present', 'late']]
            all_teachers_absent = len(present_teachers) == 0
        
        # Determine charge status
        charge_status = 'charge'
        no_charge_reason = None
        
        if attendance:
            if attendance.get('status') == 'present_no_charge':
                charge_status = 'no_charge'
                no_charge_reason = attendance.get('no_charge_reason', 'No charge')
            elif attendance.get('status') == 'absent':
                charge_status = 'absent'
        
        # If teacher was absent and student worked alone, mark as no charge
        if all_teachers_absent and attendance and attendance.get('status') in ['present', 'late']:
            charge_status = 'no_charge'
            no_charge_reason = 'Self-study (teacher absent)'
        
        # Check if event was cancelled
        event_status = event.get('status', 'scheduled')
        if event_status == 'cancelled':
            # If previously invoiced, create credit
            if event_id in invoiced_events:
                credits.append({
                    "description": f"Cancelled: {event_title}",
                    "amount": fee,
                    "original_date": event_date,
                    "reason": "Event cancelled after invoicing",
                    "event_id": event_id
                })
            continue  # Don't add to line items
        
        # Add to line items based on charge status
        if charge_status == 'charge':
            line_items.append({
                "description": event_title,
                "quantity": 1,
                "unit_price": fee,
                "amount": fee,
                "class_id": class_id,
                "class_name": cls.get('name', ''),
                "tutor_name": ', '.join(teacher_names) if teacher_names else '',
                "duration": cls.get('duration', ''),
                "event_id": event_id,
                "event_date": event_date,
                "status": 'charged'
            })
            subtotal += fee
        elif charge_status == 'no_charge':
            line_items.append({
                "description": f"{event_title} (No Charge)",
                "quantity": 1,
                "unit_price": fee,
                "amount": 0,
                "class_id": class_id,
                "class_name": cls.get('name', ''),
                "tutor_name": ', '.join(teacher_names) if teacher_names else '',
                "duration": cls.get('duration', ''),
                "event_id": event_id,
                "event_date": event_date,
                "status": 'no_charge',
                "no_charge_reason": no_charge_reason
            })
    
    # Include upcoming events if requested
    if request.include_upcoming:
        upcoming_query = {
            "start_date": {"$gt": request.end_date + "T23:59:59"},
            "$or": [
                {"participants": request.student_id},
                {"class_id": {"$in": student_class_ids}}
            ]
        }
        upcoming_events = await db.events.find(upcoming_query, {"_id": 0}).to_list(100)
        
        for event in upcoming_events:
            class_id = event.get('class_id')
            cls = class_map.get(class_id, {})
            fee = cls.get('standard_fee', 0) or student.get('fee_amount', 0)
            
            teacher_names = []
            for tid in cls.get('teacher_ids', []):
                t = teacher_map.get(tid)
                if t:
                    teacher_names.append(t['name'])
            
            line_items.append({
                "description": f"{event.get('title', 'Class Session')} (Upcoming)",
                "quantity": 1,
                "unit_price": fee,
                "amount": fee,
                "class_id": class_id,
                "class_name": cls.get('name', ''),
                "tutor_name": ', '.join(teacher_names) if teacher_names else '',
                "duration": cls.get('duration', ''),
                "event_id": event.get('id'),
                "event_date": event.get('start_date', '')[:10],
                "status": 'upcoming'
            })
            subtotal += fee
    
    # Calculate credits from student credit balance
    credit_balance = student.get('credit_balance', 0)
    credit_details = student.get('credit_details', [])
    
    if request.apply_credits and credit_balance > 0:
        for credit_detail in credit_details:
            credits.append({
                "description": credit_detail.get('reason', 'Account Credit'),
                "amount": credit_detail.get('amount', 0),
                "original_date": credit_detail.get('original_class_date'),
                "reason": credit_detail.get('reason', 'Account Credit')
            })
    
    # Calculate totals
    total_credits = sum(c.get('amount', 0) for c in credits)
    discount_percentage = student.get('discount_percentage', 0)
    discount_amount = subtotal * (discount_percentage / 100)
    
    credit_to_apply = min(credit_balance, subtotal - discount_amount) if request.apply_credits else 0
    final_amount = max(0, subtotal - discount_amount - credit_to_apply - total_credits)
    
    return {
        "student": {
            "id": student['id'],
            "name": student['name'],
            "email": student['email']
        },
        "period": {
            "start_date": request.start_date,
            "end_date": request.end_date,
            "include_upcoming": request.include_upcoming
        },
        "line_items": line_items,
        "credits": credits,
        "summary": {
            "subtotal": subtotal,
            "discount_percentage": discount_percentage,
            "discount_amount": discount_amount,
            "credit_balance": credit_balance,
            "credit_applied": credit_to_apply,
            "additional_credits": total_credits,
            "total_due": final_amount,
            "total_sessions": len([i for i in line_items if i.get('status') != 'no_charge']),
            "no_charge_sessions": len([i for i in line_items if i.get('status') == 'no_charge']),
            "upcoming_sessions": len([i for i in line_items if i.get('status') == 'upcoming'])
        }
    }

@api_router.post("/invoices/create-from-preview")
async def create_invoice_from_preview(payload: CreateInvoiceFromPreviewRequest):
    """Create an invoice from the preview data"""
    student = await db.students.find_one({"id": payload.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get settings for defaults
    settings = await db.settings.find_one({}, {"_id": 0})
    
    invoice_description = payload.description or f"Classes from {payload.start_date} to {payload.end_date}"
    
    invoice_data = {
        "student_id": payload.student_id,
        "amount": payload.total_due,
        "issue_date": datetime.now(timezone.utc),
        "due_date": datetime.now(timezone.utc) + timedelta(days=15),
        "description": invoice_description,
        "status": "pending",
        "line_items": payload.line_items,
        "credits": payload.credits,
        "subtotal": payload.subtotal,
        "discount_amount": payload.discount_amount,
        "discount_percentage": payload.discount_percentage,
        "credit_applied": payload.credit_applied,
        "payment_terms": payload.payment_terms or (settings.get('invoice_payment_terms', '') if settings else ''),
        "comments": payload.comments,
        "auto_generated": False
    }
    
    invoice_obj = Invoice(**invoice_data)
    doc = invoice_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['issue_date'] = doc['issue_date'].isoformat()
    doc['due_date'] = doc['due_date'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Deduct applied credits from student balance
    if payload.credit_applied > 0:
        current_balance = student.get('credit_balance', 0)
        new_balance = max(0, current_balance - payload.credit_applied)
        await db.students.update_one(
            {"id": payload.student_id},
            {"$set": {"credit_balance": new_balance, "credit_details": []}}
        )
    
    return {
        "message": "Invoice created successfully",
        "invoice_id": invoice_obj.id,
        "invoice_number": invoice_obj.invoice_number
    }

@api_router.post("/events/{event_id}/cancel")
async def cancel_event(event_id: str, create_credits: bool = True):
    """Cancel an event and optionally create credits for invoiced students"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Mark event as cancelled
    await db.events.update_one(
        {"id": event_id},
        {"$set": {"status": "cancelled"}}
    )
    
    credits_created = 0
    
    if create_credits:
        # Find invoices that include this event
        invoices = await db.invoices.find({
            "line_items.event_id": event_id,
            "status": {"$nin": ["cancelled"]}
        }, {"_id": 0}).to_list(1000)
        
        for invoice in invoices:
            for item in invoice.get('line_items', []):
                if item.get('event_id') == event_id and item.get('amount', 0) > 0:
                    # Add credit to student
                    student_id = invoice.get('student_id')
                    student = await db.students.find_one({"id": student_id}, {"_id": 0})
                    if student:
                        credit_detail = {
                            "amount": item.get('amount', 0),
                            "reason": f"Cancelled event: {event.get('title', 'Class')}",
                            "date": datetime.now(timezone.utc).isoformat(),
                            "original_class_date": event.get('start_date', '')[:10]
                        }
                        
                        current_balance = student.get('credit_balance', 0)
                        current_details = student.get('credit_details', [])
                        current_details.append(credit_detail)
                        
                        await db.students.update_one(
                            {"id": student_id},
                            {"$set": {
                                "credit_balance": current_balance + item.get('amount', 0),
                                "credit_details": current_details
                            }}
                        )
                        credits_created += 1
    
    return {
        "message": "Event cancelled successfully",
        "credits_created": credits_created
    }

@api_router.post("/attendance/mark-no-charge")
async def mark_attendance_no_charge(
    student_id: str,
    class_id: str,
    date: str,
    reason: str
):
    """Mark attendance as present but no charge (e.g., teacher absent, self-study)"""
    existing = await db.attendance.find_one({
        "student_id": student_id,
        "class_id": class_id,
        "date": date
    }, {"_id": 0})
    
    update_data = {
        "status": "present_no_charge",
        "no_charge_reason": reason,
        "marked_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.attendance.update_one(
            {"id": existing['id']},
            {"$set": update_data}
        )
        return {"message": "Attendance updated to no-charge"}
    else:
        attendance_obj = Attendance(
            student_id=student_id,
            class_id=class_id,
            date=date,
            status="present_no_charge",
            no_charge_reason=reason
        )
        doc = attendance_obj.model_dump()
        doc['marked_at'] = doc['marked_at'].isoformat()
        await db.attendance.insert_one(doc)
        return {"message": "No-charge attendance recorded"}

# Calendar/Event Routes
@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate):
    event_obj = Event(**event_data.model_dump())
    doc = event_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat()
    await db.events.insert_one(doc)
    
    # Send event notification emails
    if event_data.participants:
        for participant_id in event_data.participants:
            user = await db.students.find_one({"id": participant_id}, {"_id": 0})
            if not user:
                user = await db.teachers.find_one({"id": participant_id}, {"_id": 0})
            if user:
                html = f"""
                <h2>New Event: {event_data.title}</h2>
                <p>Dear {user['name']},</p>
                <p>{event_data.description}</p>
                <p>Start: {event_data.start_date.strftime('%Y-%m-%d %H:%M')}</p>
                <p>End: {event_data.end_date.strftime('%Y-%m-%d %H:%M')}</p>
                <p>Type: {event_data.event_type}</p>
                """
                await send_email_async(user['email'], f"Event: {event_data.title}", html)
    
    return event_obj

@api_router.get("/events", response_model=List[Event])
async def get_events(start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if start_date and end_date:
        query['start_date'] = {"$gte": start_date, "$lte": end_date}
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    for event in events:
        if isinstance(event['created_at'], str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        if isinstance(event['start_date'], str):
            event['start_date'] = datetime.fromisoformat(event['start_date'])
        if isinstance(event['end_date'], str):
            event['end_date'] = datetime.fromisoformat(event['end_date'])
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if isinstance(event['created_at'], str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    if isinstance(event['start_date'], str):
        event['start_date'] = datetime.fromisoformat(event['start_date'])
    if isinstance(event['end_date'], str):
        event['end_date'] = datetime.fromisoformat(event['end_date'])
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_data: EventCreate):
    doc = event_data.model_dump()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat()
    result = await db.events.update_one({"id": event_id}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return await get_event(event_id)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

# Announcement Routes
@api_router.post("/announcements", response_model=Announcement)
async def create_announcement(announcement_data: AnnouncementCreate, created_by: str = ''):
    announcement_obj = Announcement(**announcement_data.model_dump())
    announcement_obj.created_by = created_by
    doc = announcement_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.announcements.insert_one(doc)
    
    # Send announcement emails if requested
    if announcement_data.send_email:
        recipients = []
        if announcement_data.target_audience in ['all', 'students']:
            students = await db.students.find({}, {"_id": 0}).to_list(1000)
            recipients.extend([s['email'] for s in students])
        if announcement_data.target_audience in ['all', 'teachers']:
            teachers = await db.teachers.find({}, {"_id": 0}).to_list(1000)
            recipients.extend([t['email'] for t in teachers])
        if announcement_data.target_audience in ['all', 'parents']:
            parents = await db.parents.find({}, {"_id": 0}).to_list(1000)
            recipients.extend([p['email'] for p in parents])
        
        html = f"""
        <h2>{announcement_data.title}</h2>
        <p>{announcement_data.content}</p>
        <br>
        <p><small>This is an automated announcement from CoachCenter</small></p>
        """
        
        for recipient in recipients:
            await send_email_async(recipient, announcement_data.title, html)
    
    return announcement_obj

@api_router.get("/announcements", response_model=List[Announcement])
async def get_announcements():
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for announcement in announcements:
        if isinstance(announcement['created_at'], str):
            announcement['created_at'] = datetime.fromisoformat(announcement['created_at'])
    return announcements

@api_router.get("/announcements/{announcement_id}", response_model=Announcement)
async def get_announcement(announcement_id: str):
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if isinstance(announcement['created_at'], str):
        announcement['created_at'] = datetime.fromisoformat(announcement['created_at'])
    return announcement

@api_router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str):
    result = await db.announcements.delete_one({"id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted successfully"}

# Email Routes
@api_router.post("/send-email")
async def send_email(request: EmailRequest):
    result = await send_email_async(request.recipient_email, request.subject, request.html_content)
    return result

# Reminder Configuration
@api_router.post("/reminders/configure")
async def configure_reminder(config: ReminderConfig):
    doc = config.model_dump()
    await db.reminder_configs.update_one(
        {"reminder_type": config.reminder_type},
        {"$set": doc},
        upsert=True
    )
    return {"message": "Reminder configuration saved"}

@api_router.get("/reminders/pending")
async def get_pending_reminders():
    # Fee due reminders
    invoices = await db.invoices.find({"status": "pending"}, {"_id": 0}).to_list(1000)
    pending = []
    
    for invoice in invoices:
        due_date = datetime.fromisoformat(invoice['due_date']) if isinstance(invoice['due_date'], str) else invoice['due_date']
        days_until_due = (due_date - datetime.now(timezone.utc)).days
        
        if 0 <= days_until_due <= 7:
            student = await db.students.find_one({"id": invoice['student_id']}, {"_id": 0})
            if student:
                pending.append({
                    "type": "fee_due",
                    "invoice_id": invoice['id'],
                    "student_name": student['name'],
                    "student_email": student['email'],
                    "amount": invoice['amount'],
                    "due_date": due_date.isoformat(),
                    "days_until_due": days_until_due
                })
    
    return pending

@api_router.post("/reminders/send-due-reminders")
async def send_due_reminders():
    pending = await get_pending_reminders()
    sent_count = 0
    
    for reminder in pending:
        html = f"""
        <h2>Payment Reminder</h2>
        <p>Dear {reminder['student_name']},</p>
        <p>This is a reminder that your payment of ₹{reminder['amount']} is due in {reminder['days_until_due']} days.</p>
        <p>Due Date: {reminder['due_date'][:10]}</p>
        <p>Please make the payment at your earliest convenience.</p>
        <p>Thank you!</p>
        """
        result = await send_email_async(reminder['student_email'], "Payment Reminder", html)
        if result['status'] == 'success':
            sent_count += 1
    
    return {"message": f"Sent {sent_count} reminder emails"}

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_students = await db.students.count_documents({})
    total_teachers = await db.teachers.count_documents({})
    total_classes = await db.classes.count_documents({})
    
    total_attendance = await db.attendance.count_documents({})
    present_count = await db.attendance.count_documents({"status": "present"})
    attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
    
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    total_collected = sum(p['amount'] for p in payments)
    
    # Calculate expected revenue from enrolled students' fees
    students = await db.students.find({}, {"_id": 0}).to_list(10000)
    expected_revenue = sum(s.get('fee_amount', 0) for s in students)
    
    # Get cash and bank balances from settings or accounts
    settings = await db.settings.find_one({}, {"_id": 0})
    cash_balance = settings.get('cash_balance', 0) if settings else 0
    bank_balance = settings.get('bank_balance', 0) if settings else 0
    
    # Adjust balances based on payments received and expenses
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(10000)
    total_cash_expenses = sum(e['amount'] for e in expenses if e.get('payment_method') == 'cash')
    total_bank_expenses = sum(e['amount'] for e in expenses if e.get('payment_method') in ['card', 'bank_transfer', 'upi'])
    
    cash_payments = sum(p['amount'] for p in payments if p.get('payment_method') == 'cash')
    bank_payments = sum(p['amount'] for p in payments if p.get('payment_method') in ['card', 'bank_transfer', 'upi'])
    
    cash_balance = cash_balance + cash_payments - total_cash_expenses
    bank_balance = bank_balance + bank_payments - total_bank_expenses
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "attendance_rate": round(attendance_rate, 2),
        "total_fee_collected": total_collected,
        "expected_revenue": expected_revenue,
        "cash_balance": cash_balance,
        "bank_balance": bank_balance
    }

# Accounting - Chart of Accounts
@api_router.post("/accounts", response_model=ChartOfAccount)
async def create_account(account_data: ChartOfAccountCreate):
    existing = await db.accounts.find_one({"account_code": account_data.account_code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Account code already exists")
    
    account_obj = ChartOfAccount(**account_data.model_dump())
    doc = account_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.accounts.insert_one(doc)
    return account_obj

@api_router.get("/accounts", response_model=List[ChartOfAccount])
async def get_accounts(account_type: Optional[str] = None):
    query = {}
    if account_type:
        query['account_type'] = account_type
    accounts = await db.accounts.find(query, {"_id": 0}).to_list(1000)
    for account in accounts:
        if isinstance(account['created_at'], str):
            account['created_at'] = datetime.fromisoformat(account['created_at'])
    return accounts

@api_router.get("/accounts/{account_id}", response_model=ChartOfAccount)
async def get_account(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if isinstance(account['created_at'], str):
        account['created_at'] = datetime.fromisoformat(account['created_at'])
    return account

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    result = await db.accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted successfully"}

# Accounting - Transactions
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, created_by: str = ''):
    transaction_obj = Transaction(**transaction_data.model_dump())
    transaction_obj.created_by = created_by
    doc = transaction_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['date'] = doc['date'].isoformat()
    await db.transactions.insert_one(doc)
    
    # Update account balances
    debit_account = await db.accounts.find_one({"account_code": transaction_data.debit_account})
    credit_account = await db.accounts.find_one({"account_code": transaction_data.credit_account})
    
    if debit_account:
        new_balance = debit_account.get('balance', 0) + transaction_data.amount
        await db.accounts.update_one({"account_code": transaction_data.debit_account}, {"$set": {"balance": new_balance}})
    
    if credit_account:
        new_balance = credit_account.get('balance', 0) - transaction_data.amount
        await db.accounts.update_one({"account_code": transaction_data.credit_account}, {"$set": {"balance": new_balance}})
    
    return transaction_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if start_date and end_date:
        query['date'] = {"$gte": start_date, "$lte": end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(1000)
    for transaction in transactions:
        if isinstance(transaction['created_at'], str):
            transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
        if isinstance(transaction['date'], str):
            transaction['date'] = datetime.fromisoformat(transaction['date'])
    return transactions

# Expenses
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, created_by: str = ''):
    expense_obj = Expense(**expense_data.model_dump())
    expense_obj.created_by = created_by
    doc = expense_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['date'] = doc['date'].isoformat()
    await db.expenses.insert_one(doc)
    
    # Create accounting transaction
    transaction = TransactionCreate(
        date=expense_data.date,
        description=f"Expense: {expense_data.description}",
        debit_account="EXPENSE",
        credit_account="CASH",
        amount=expense_data.amount,
        reference=expense_obj.id
    )
    await create_transaction(transaction, created_by)
    
    return expense_obj

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(start_date: Optional[str] = None, end_date: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if start_date and end_date:
        query['date'] = {"$gte": start_date, "$lte": end_date}
    if category:
        query['category'] = category
    
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(1000)
    for expense in expenses:
        if isinstance(expense['created_at'], str):
            expense['created_at'] = datetime.fromisoformat(expense['created_at'])
        if isinstance(expense['date'], str):
            expense['date'] = datetime.fromisoformat(expense['date'])
    return expenses

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if isinstance(expense['created_at'], str):
        expense['created_at'] = datetime.fromisoformat(expense['created_at'])
    if isinstance(expense['date'], str):
        expense['date'] = datetime.fromisoformat(expense['date'])
    return expense

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# Financial Reports
@api_router.get("/reports/trial-balance")
async def get_trial_balance():
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(1000)
    
    trial_balance = []
    total_debit = 0
    total_credit = 0
    
    for account in accounts:
        balance = account.get('balance', 0)
        if balance >= 0:
            trial_balance.append({
                "account_code": account['account_code'],
                "account_name": account['account_name'],
                "account_type": account['account_type'],
                "debit": balance,
                "credit": 0
            })
            total_debit += balance
        else:
            trial_balance.append({
                "account_code": account['account_code'],
                "account_name": account['account_name'],
                "account_type": account['account_type'],
                "debit": 0,
                "credit": abs(balance)
            })
            total_credit += abs(balance)
    
    return {
        "accounts": trial_balance,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balanced": abs(total_debit - total_credit) < 0.01
    }

@api_router.get("/reports/income-statement")
async def get_income_statement(start_date: Optional[str] = None, end_date: Optional[str] = None):
    # Get all revenue and expense accounts
    revenue_accounts = await db.accounts.find({"account_type": "revenue"}, {"_id": 0}).to_list(1000)
    expense_accounts = await db.accounts.find({"account_type": "expense"}, {"_id": 0}).to_list(1000)
    
    # Get payments (revenue)
    query = {}
    if start_date and end_date:
        query['payment_date'] = {"$gte": start_date, "$lte": end_date}
    payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
    total_revenue = sum(p['amount'] for p in payments)
    
    # Get expenses
    query = {}
    if start_date and end_date:
        query['date'] = {"$gte": start_date, "$lte": end_date}
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(10000)
    
    expense_by_category = {}
    for expense in expenses:
        category = expense.get('category', 'Other')
        expense_by_category[category] = expense_by_category.get(category, 0) + expense['amount']
    
    total_expenses = sum(expense_by_category.values())
    net_income = total_revenue - total_expenses
    
    return {
        "revenue": {
            "fee_income": total_revenue,
            "total": total_revenue
        },
        "expenses": expense_by_category,
        "total_expenses": total_expenses,
        "net_income": net_income,
        "profit_margin": (net_income / total_revenue * 100) if total_revenue > 0 else 0
    }

@api_router.get("/reports/balance-sheet")
async def get_balance_sheet():
    # Assets
    asset_accounts = await db.accounts.find({"account_type": "asset"}, {"_id": 0}).to_list(1000)
    assets = {}
    total_assets = 0
    for account in asset_accounts:
        assets[account['account_name']] = account.get('balance', 0)
        total_assets += account.get('balance', 0)
    
    # Calculate accounts receivable (pending invoices)
    pending_invoices = await db.invoices.find({"status": {"$in": ["pending", "overdue"]}}, {"_id": 0}).to_list(1000)
    accounts_receivable = sum(inv['amount'] for inv in pending_invoices)
    assets['Accounts Receivable'] = accounts_receivable
    total_assets += accounts_receivable
    
    # Liabilities
    liability_accounts = await db.accounts.find({"account_type": "liability"}, {"_id": 0}).to_list(1000)
    liabilities = {}
    total_liabilities = 0
    for account in liability_accounts:
        liabilities[account['account_name']] = abs(account.get('balance', 0))
        total_liabilities += abs(account.get('balance', 0))
    
    # Equity
    equity_accounts = await db.accounts.find({"account_type": "equity"}, {"_id": 0}).to_list(1000)
    equity = {}
    total_equity = 0
    for account in equity_accounts:
        equity[account['account_name']] = abs(account.get('balance', 0))
        total_equity += abs(account.get('balance', 0))
    
    # Calculate retained earnings (net income)
    income_statement = await get_income_statement()
    retained_earnings = income_statement['net_income']
    equity['Retained Earnings'] = retained_earnings
    total_equity += retained_earnings
    
    return {
        "assets": assets,
        "total_assets": total_assets,
        "liabilities": liabilities,
        "total_liabilities": total_liabilities,
        "equity": equity,
        "total_equity": total_equity,
        "total_liabilities_and_equity": total_liabilities + total_equity,
        "balanced": abs(total_assets - (total_liabilities + total_equity)) < 0.01
    }

@api_router.post("/accounts/initialize")
async def initialize_accounts():
    """Initialize default chart of accounts"""
    default_accounts = [
        # Assets
        {"account_code": "1000", "account_name": "Cash", "account_type": "asset", "category": "Current Assets"},
        {"account_code": "1100", "account_name": "Bank Account", "account_type": "asset", "category": "Current Assets"},
        {"account_code": "1200", "account_name": "Accounts Receivable", "account_type": "asset", "category": "Current Assets"},
        {"account_code": "1500", "account_name": "Furniture & Equipment", "account_type": "asset", "category": "Fixed Assets"},
        
        # Liabilities
        {"account_code": "2000", "account_name": "Accounts Payable", "account_type": "liability", "category": "Current Liabilities"},
        {"account_code": "2100", "account_name": "Salaries Payable", "account_type": "liability", "category": "Current Liabilities"},
        
        # Equity
        {"account_code": "3000", "account_name": "Owner's Equity", "account_type": "equity", "category": "Equity"},
        
        # Revenue
        {"account_code": "4000", "account_name": "Fee Income", "account_type": "revenue", "category": "Operating Revenue"},
        {"account_code": "4100", "account_name": "Other Income", "account_type": "revenue", "category": "Other Revenue"},
        
        # Expenses
        {"account_code": "5000", "account_name": "Salary Expense", "account_type": "expense", "category": "Operating Expenses"},
        {"account_code": "5100", "account_name": "Rent Expense", "account_type": "expense", "category": "Operating Expenses"},
        {"account_code": "5200", "account_name": "Utilities Expense", "account_type": "expense", "category": "Operating Expenses"},
        {"account_code": "5300", "account_name": "Supplies Expense", "account_type": "expense", "category": "Operating Expenses"},
        {"account_code": "5400", "account_name": "Marketing Expense", "account_type": "expense", "category": "Operating Expenses"},
        {"account_code": "5500", "account_name": "Maintenance Expense", "account_type": "expense", "category": "Operating Expenses"},
        {"account_code": "5900", "account_name": "Miscellaneous Expense", "account_type": "expense", "category": "Other Expenses"},
    ]
    
    created_count = 0
    for account_data in default_accounts:
        existing = await db.accounts.find_one({"account_code": account_data['account_code']})
        if not existing:
            account = ChartOfAccount(
                **account_data,
                description=f"Default {account_data['account_name']}"
            )
            doc = account.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.accounts.insert_one(doc)
            created_count += 1
    
    return {"message": f"Initialized {created_count} accounts"}

    return {"message": f"Initialized {created_count} accounts"}

# Student Groups Routes
@api_router.post("/student-groups", response_model=StudentGroup)
async def create_student_group(group_data: StudentGroupCreate, created_by: str = ''):
    group_obj = StudentGroup(**group_data.model_dump())
    group_obj.created_by = created_by
    doc = group_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.student_groups.insert_one(doc)
    return group_obj

@api_router.get("/student-groups", response_model=List[StudentGroup])
async def get_student_groups():
    groups = await db.student_groups.find({}, {"_id": 0}).to_list(1000)
    for group in groups:
        if isinstance(group['created_at'], str):
            group['created_at'] = datetime.fromisoformat(group['created_at'])
    return groups

@api_router.get("/student-groups/{group_id}", response_model=StudentGroup)
async def get_student_group(group_id: str):
    group = await db.student_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Student group not found")
    if isinstance(group['created_at'], str):
        group['created_at'] = datetime.fromisoformat(group['created_at'])
    return group

@api_router.put("/student-groups/{group_id}", response_model=StudentGroup)
async def update_student_group(group_id: str, group_data: StudentGroupCreate):
    doc = group_data.model_dump()
    result = await db.student_groups.update_one({"id": group_id}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student group not found")
    return await get_student_group(group_id)

@api_router.delete("/student-groups/{group_id}")
async def delete_student_group(group_id: str):
    result = await db.student_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student group not found")
    return {"message": "Student group deleted successfully"}

# Test Data Seeding
@api_router.post("/seed-test-data")
async def seed_test_data():
    """Create comprehensive test data for demonstration"""
    created = {
        "parents": [],
        "students": [],
        "teachers": [],
        "classes": [],
        "groups": []
    }
    
    try:
        # Create Teachers
        teachers_data = [
            {"name": "Dr. Sarah Johnson", "email": "sarah.j@coachcenter.com", "phone": "9876543210", "subject": "Mathematics", "joining_date": datetime.now().isoformat()},
            {"name": "Prof. Michael Chen", "email": "michael.c@coachcenter.com", "phone": "9876543211", "subject": "Physics", "joining_date": datetime.now().isoformat()}
        ]
        
        for t_data in teachers_data:
            existing = await db.teachers.find_one({"email": t_data['email']})
            if not existing:
                teacher = Teacher(**t_data)
                doc = teacher.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.teachers.insert_one(doc)
                created["teachers"].append(teacher.id)
        
        # Get all teachers
        all_teachers = await db.teachers.find({}, {"_id": 0}).to_list(100)
        teacher_ids = [t['id'] for t in all_teachers[:2]]
        
        # Create Classes
        classes_data = [
            {"name": "Advanced Mathematics", "subject": "Mathematics", "class_type": "paid", "teacher_ids": [teacher_ids[0]] if teacher_ids else [], "student_ids": [], "schedule": "Mon-Wed-Fri 10:00 AM"},
            {"name": "Physics Honors", "subject": "Physics", "class_type": "paid", "teacher_ids": [teacher_ids[1]] if len(teacher_ids) > 1 else [], "student_ids": [], "schedule": "Tue-Thu 2:00 PM"},
            {"name": "Foundation Course", "subject": "General", "class_type": "demo", "teacher_ids": teacher_ids, "student_ids": [], "schedule": "Mon-Fri 9:00 AM"}
        ]
        
        class_ids = []
        for c_data in classes_data:
            existing = await db.classes.find_one({"name": c_data['name']})
            if not existing:
                cls = Class(**c_data)
                doc = cls.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.classes.insert_one(doc)
                created["classes"].append(cls.id)
                class_ids.append(cls.id)
            else:
                class_ids.append(existing['id'])
        
        # Create Students
        students_data = [
            {"name": "Rahul Sharma", "email": "rahul.s@student.com", "phone": "9123456780", "enrollment_date": datetime.now().isoformat(), "class_type": "paid", "fee_amount": 5000, "class_ids": class_ids[:2] if len(class_ids) >= 2 else class_ids},
            {"name": "Priya Patel", "email": "priya.p@student.com", "phone": "9123456781", "enrollment_date": datetime.now().isoformat(), "class_type": "paid", "fee_amount": 5000, "class_ids": [class_ids[0], class_ids[2]] if len(class_ids) >= 3 else class_ids},
            {"name": "Amit Kumar", "email": "amit.k@student.com", "phone": "9123456782", "enrollment_date": datetime.now().isoformat(), "class_type": "demo", "fee_amount": 0, "class_ids": [class_ids[2]] if len(class_ids) >= 3 else class_ids}
        ]
        
        student_ids = []
        for s_data in students_data:
            existing = await db.students.find_one({"email": s_data['email']})
            if not existing:
                student = Student(**s_data)
                doc = student.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.students.insert_one(doc)
                created["students"].append(student.id)
                student_ids.append(student.id)
            else:
                student_ids.append(existing['id'])
        
        # Create Parents
        parents_data = [
            {"name": "Rajesh Sharma", "email": "rajesh.sharma@parent.com", "phone": "9012345670", "relationship": "father", "student_ids": [student_ids[0]] if student_ids else []},
            {"name": "Anjali Patel", "email": "anjali.patel@parent.com", "phone": "9012345671", "relationship": "mother", "student_ids": [student_ids[1], student_ids[2]] if len(student_ids) >= 3 else student_ids}
        ]
        
        for p_data in parents_data:
            existing = await db.parents.find_one({"email": p_data['email']})
            if not existing:
                parent = Parent(**p_data)
                doc = parent.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.parents.insert_one(doc)
                created["parents"].append(parent.id)
        
        # Create Student Group
        if student_ids:
            group_data = {
                "name": "Advanced Learners",
                "description": "Top performing students group",
                "student_ids": student_ids[:2] if len(student_ids) >= 2 else student_ids
            }
            existing_group = await db.student_groups.find_one({"name": group_data['name']})
            if not existing_group:
                group = StudentGroup(**group_data, created_by='admin')
                doc = group.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.student_groups.insert_one(doc)
                created["groups"].append(group.id)
        
        return {
            "message": "Test data created successfully",
            "created": created,
            "summary": {
                "parents": len(created["parents"]),
                "students": len(created["students"]),
                "teachers": len(created["teachers"]),
                "classes": len(created["classes"]),
                "groups": len(created["groups"])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed test data: {str(e)}")

# Data Import Endpoints
@api_router.post("/import/students")
async def import_students(file: UploadFile = File(...)):
    """Import students from CSV/Excel file"""
    try:
        contents = await file.read()
        
        # Detect file type and read accordingly
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel.")
        
        # Normalize column names (handle TutorBird format and common variations)
        df.columns = df.columns.str.lower().str.strip().str.replace(' ', '_')
        
        # Map TutorBird fields to our fields
        column_mapping = {
            'student_name': 'name',
            'full_name': 'name',
            'email': 'email',
            'email_address': 'email',
            'phone': 'phone',
            'phone_number': 'phone',
            'mobile': 'phone',
            'enrollment_date': 'enrollment_date',
            'join_date': 'enrollment_date',
            'start_date': 'enrollment_date',
            'class_type': 'class_type',
            'student_type': 'class_type',
            'fee': 'fee_amount',
            'fee_amount': 'fee_amount',
            'tuition_fee': 'fee_amount',
            'monthly_fee': 'fee_amount'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Check required fields
                if 'name' not in row or pd.isna(row['name']):
                    skipped_count += 1
                    continue
                
                # Default values for missing fields
                student_data = {
                    'name': str(row.get('name', '')),
                    'email': str(row.get('email', f'student{index}@example.com')),
                    'phone': str(row.get('phone', '0000000000')),
                    'enrollment_date': datetime.now().isoformat(),
                    'class_type': str(row.get('class_type', 'paid')).lower() if str(row.get('class_type', '')).lower() in ['paid', 'demo', 'free'] else 'paid',
                    'fee_amount': float(row.get('fee_amount', 0)) if pd.notna(row.get('fee_amount')) else 0.0
                }
                
                # Handle enrollment date
                if 'enrollment_date' in row and pd.notna(row['enrollment_date']):
                    try:
                        student_data['enrollment_date'] = pd.to_datetime(row['enrollment_date']).isoformat()
                    except:
                        student_data['enrollment_date'] = datetime.now().isoformat()
                
                # Check if student already exists
                existing = await db.students.find_one({'email': student_data['email']})
                if existing:
                    skipped_count += 1
                    continue
                
                # Create student
                student_obj = Student(**student_data)
                doc = student_obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                if not isinstance(doc['enrollment_date'], str):
                    doc['enrollment_date'] = doc['enrollment_date'].isoformat()
                
                await db.students.insert_one(doc)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                skipped_count += 1
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors[:10]  # Return first 10 errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.post("/import/teachers")
async def import_teachers(file: UploadFile = File(...)):
    """Import teachers from CSV/Excel file"""
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        df.columns = df.columns.str.lower().str.strip().str.replace(' ', '_')
        
        column_mapping = {
            'teacher_name': 'name',
            'full_name': 'name',
            'email': 'email',
            'email_address': 'email',
            'phone': 'phone',
            'phone_number': 'phone',
            'subject': 'subject',
            'subjects': 'subject',
            'joining_date': 'joining_date',
            'hire_date': 'joining_date',
            'start_date': 'joining_date'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                if 'name' not in row or pd.isna(row['name']):
                    skipped_count += 1
                    continue
                
                teacher_data = {
                    'name': str(row.get('name', '')),
                    'email': str(row.get('email', f'teacher{index}@example.com')),
                    'phone': str(row.get('phone', '0000000000')),
                    'subject': str(row.get('subject', 'General')),
                    'joining_date': datetime.now().isoformat()
                }
                
                if 'joining_date' in row and pd.notna(row['joining_date']):
                    try:
                        teacher_data['joining_date'] = pd.to_datetime(row['joining_date']).isoformat()
                    except:
                        pass
                
                existing = await db.teachers.find_one({'email': teacher_data['email']})
                if existing:
                    skipped_count += 1
                    continue
                
                teacher_obj = Teacher(**teacher_data)
                doc = teacher_obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                if not isinstance(doc['joining_date'], str):
                    doc['joining_date'] = doc['joining_date'].isoformat()
                
                await db.teachers.insert_one(doc)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                skipped_count += 1
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.post("/import/attendance")
async def import_attendance(file: UploadFile = File(...)):
    """Import attendance records from CSV/Excel file"""
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        df.columns = df.columns.str.lower().str.strip().str.replace(' ', '_')
        
        column_mapping = {
            'student_name': 'student_name',
            'student_email': 'student_email',
            'class_name': 'class_name',
            'date': 'date',
            'attendance_date': 'date',
            'status': 'status',
            'attendance': 'status',
            'present': 'status'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        # Get all students and classes for lookup
        all_students = await db.students.find({}, {"_id": 0}).to_list(10000)
        all_classes = await db.classes.find({}, {"_id": 0}).to_list(10000)
        
        student_map = {s['email']: s['id'] for s in all_students}
        student_name_map = {s['name'].lower(): s['id'] for s in all_students}
        class_map = {c['name'].lower(): c['id'] for c in all_classes}
        
        for index, row in df.iterrows():
            try:
                # Find student
                student_id = None
                if 'student_email' in row and pd.notna(row['student_email']):
                    student_id = student_map.get(str(row['student_email']))
                elif 'student_name' in row and pd.notna(row['student_name']):
                    student_id = student_name_map.get(str(row['student_name']).lower())
                
                if not student_id:
                    skipped_count += 1
                    errors.append(f"Row {index + 1}: Student not found")
                    continue
                
                # Find class (use first class if not specified)
                class_id = None
                if 'class_name' in row and pd.notna(row['class_name']):
                    class_id = class_map.get(str(row['class_name']).lower())
                
                if not class_id and all_classes:
                    class_id = all_classes[0]['id']
                
                if not class_id:
                    skipped_count += 1
                    errors.append(f"Row {index + 1}: No class found")
                    continue
                
                # Parse date
                date_str = datetime.now().strftime('%Y-%m-%d')
                if 'date' in row and pd.notna(row['date']):
                    try:
                        date_str = pd.to_datetime(row['date']).strftime('%Y-%m-%d')
                    except:
                        pass
                
                # Parse status
                status = 'present'
                if 'status' in row and pd.notna(row['status']):
                    status_val = str(row['status']).lower()
                    if status_val in ['absent', 'late', 'present']:
                        status = status_val
                    elif status_val in ['p', 'y', 'yes', '1', 'true']:
                        status = 'present'
                    elif status_val in ['a', 'n', 'no', '0', 'false']:
                        status = 'absent'
                    elif status_val in ['l', 'tardy']:
                        status = 'late'
                
                # Check if attendance already exists
                existing = await db.attendance.find_one({
                    'student_id': student_id,
                    'class_id': class_id,
                    'date': date_str
                })
                
                if existing:
                    # Update existing
                    await db.attendance.update_one(
                        {'id': existing['id']},
                        {'$set': {'status': status, 'marked_at': datetime.now(timezone.utc).isoformat()}}
                    )
                else:
                    # Create new
                    attendance_obj = Attendance(
                        student_id=student_id,
                        class_id=class_id,
                        date=date_str,
                        status=status
                    )
                    doc = attendance_obj.model_dump()
                    doc['marked_at'] = doc['marked_at'].isoformat()
                    await db.attendance.insert_one(doc)
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                skipped_count += 1
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.post("/import/payments")
async def import_payments(file: UploadFile = File(...)):
    """Import payment records from CSV/Excel file"""
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        df.columns = df.columns.str.lower().str.strip().str.replace(' ', '_')
        
        column_mapping = {
            'student_name': 'student_name',
            'student_email': 'student_email',
            'amount': 'amount',
            'payment_amount': 'amount',
            'date': 'payment_date',
            'payment_date': 'payment_date',
            'method': 'payment_method',
            'payment_method': 'payment_method',
            'notes': 'notes',
            'description': 'notes'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        # Get all students for lookup
        all_students = await db.students.find({}, {"_id": 0}).to_list(10000)
        student_map = {s['email']: s['id'] for s in all_students}
        student_name_map = {s['name'].lower(): s['id'] for s in all_students}
        
        for index, row in df.iterrows():
            try:
                # Find student
                student_id = None
                if 'student_email' in row and pd.notna(row['student_email']):
                    student_id = student_map.get(str(row['student_email']))
                elif 'student_name' in row and pd.notna(row['student_name']):
                    student_id = student_name_map.get(str(row['student_name']).lower())
                
                if not student_id:
                    skipped_count += 1
                    errors.append(f"Row {index + 1}: Student not found")
                    continue
                
                # Parse amount
                amount = 0.0
                if 'amount' in row and pd.notna(row['amount']):
                    try:
                        amount = float(str(row['amount']).replace(',', '').replace('₹', '').replace('$', '').strip())
                    except:
                        pass
                
                if amount <= 0:
                    skipped_count += 1
                    errors.append(f"Row {index + 1}: Invalid amount")
                    continue
                
                # Parse date
                payment_date = datetime.now()
                if 'payment_date' in row and pd.notna(row['payment_date']):
                    try:
                        payment_date = pd.to_datetime(row['payment_date'])
                    except:
                        pass
                
                payment_method = str(row.get('payment_method', 'cash')).lower()
                if payment_method not in ['cash', 'card', 'upi', 'bank_transfer']:
                    payment_method = 'cash'
                
                payment_data = {
                    'student_id': student_id,
                    'amount': amount,
                    'payment_date': payment_date.isoformat(),
                    'payment_method': payment_method,
                    'notes': str(row.get('notes', 'Imported from file'))
                }
                
                payment_obj = Payment(**payment_data)
                doc = payment_obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                if not isinstance(doc['payment_date'], str):
                    doc['payment_date'] = doc['payment_date'].isoformat()
                
                await db.payments.insert_one(doc)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                skipped_count += 1
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.get("/import/template/{data_type}")
async def download_import_template(data_type: str):
    """Download CSV template for import"""
    templates = {
        "students": ["name", "email", "phone", "enrollment_date", "class_type", "fee_amount"],
        "teachers": ["name", "email", "phone", "subject", "joining_date"],
        "attendance": ["student_email", "class_name", "date", "status"],
        "payments": ["student_email", "amount", "payment_date", "payment_method", "notes"]
    }
    
    if data_type not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create CSV file
    df = pd.DataFrame(columns=templates[data_type])
    
    # Add example row
    if data_type == "students":
        df.loc[0] = ["John Doe", "john@example.com", "1234567890", "2024-01-01", "paid", "5000"]
    elif data_type == "teachers":
        df.loc[0] = ["Jane Smith", "jane@example.com", "0987654321", "Mathematics", "2024-01-01"]
    elif data_type == "attendance":
        df.loc[0] = ["john@example.com", "Class A", "2024-01-01", "present"]
    elif data_type == "payments":
        df.loc[0] = ["john@example.com", "5000", "2024-01-01", "cash", "Monthly fee"]
    
    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    df.to_csv(temp_file.name, index=False)
    
    return FileResponse(
        temp_file.name,
        media_type="text/csv",
        filename=f"{data_type}_import_template.csv"
    )

# Settings Model
class SettingsBase(BaseModel):
    center_name: str = "CoachCenter"
    currency: str = "INR"
    cash_balance: float = 0.0
    bank_balance: float = 0.0
    fee_receivable_opening: float = 0.0
    fee_payable_opening: float = 0.0
    expense_categories: List[str] = [
        "Salary Expense",
        "Rent Expense",
        "Utilities Expense",
        "Supplies Expense",
        "Marketing Expense",
        "Maintenance Expense",
        "Miscellaneous Expense"
    ]
    # Invoice settings
    invoice_company_name: str = "CoachCenter"
    invoice_address: str = ""
    invoice_logo_url: str = ""
    invoice_payment_terms: str = ""
    invoice_default_comments: str = ""
    # Terminology settings
    terminology_class: str = "Class"
    terminology_classes: str = "Classes"
    # General Settings (Event Scheduling)
    check_scheduling_conflicts: bool = True
    enable_multi_timezone: bool = False
    timezone: str = "(UTC-05:00) Eastern Time (US & Canada)"
    tutor_name_format: str = "First Last"
    student_name_format: str = "Last, First"
    # Accounts & Invoices Settings
    payment_methods: List[str] = ["Cash", "Card", "Bank Transfer", "UPI", "Interac e-Transfer"]
    default_balance_date: str = "end_of_month"
    balance_day_of_month: int = 1
    late_payment_fee_type: str = "none"
    late_payment_fee_amount: float = 0.0
    late_payment_fee_percentage: float = 0.0
    send_sms_invoice_notifications: bool = False
    send_overdue_invoice_reminder: bool = False
    email_timeframe_start: str = "08:00"
    email_timeframe_end: str = "09:00"
    invoice_name: str = "Invoice"
    # Invoice Display Options
    show_class_details: bool = True
    show_tutor_details: bool = True
    show_session_date: bool = True
    show_session_time: bool = True
    show_duration: bool = False
    show_student_name_on_family: bool = True
    group_by_student: bool = True
    show_no_charge_items: bool = True
    # Business Card / Center Info
    business_address: str = ""
    business_phone: str = ""
    business_country: str = "Canada - English"
    business_logo_url: str = ""
    # Email & SMS Settings
    business_email_address: str = ""
    use_business_name_as_sender: bool = True
    use_business_name_on_reminders: bool = True
    use_business_name_on_lesson_notes: bool = False
    send_birthday_emails: bool = True
    tutor_email_address: str = ""
    # Policies Settings - Booking Policy
    min_advance_booking_hours: int = 24
    max_advance_booking_days: int = 60
    weekly_slot_hold_days: int = 7
    allow_booking_from: str = "booking_form_and_portal"
    restrict_portal_to_makeup_credits: bool = False
    send_booking_notification: bool = True
    # Policies Settings - Cancellation Policy
    allow_portal_cancellation: bool = True
    log_cancellation_notification: bool = True
    cancellation_policy_text: str = ""
    cancellation_deadline_hours: int = 24

class SettingsUpdate(BaseModel):
    center_name: Optional[str] = None
    currency: Optional[str] = None
    cash_balance: Optional[float] = None
    bank_balance: Optional[float] = None
    fee_receivable_opening: Optional[float] = None
    fee_payable_opening: Optional[float] = None
    expense_categories: Optional[List[str]] = None
    # Invoice settings
    invoice_company_name: Optional[str] = None
    invoice_address: Optional[str] = None
    invoice_logo_url: Optional[str] = None
    invoice_payment_terms: Optional[str] = None
    invoice_default_comments: Optional[str] = None
    # Terminology settings
    terminology_class: Optional[str] = None
    terminology_classes: Optional[str] = None
    # General Settings
    check_scheduling_conflicts: Optional[bool] = None
    enable_multi_timezone: Optional[bool] = None
    timezone: Optional[str] = None
    tutor_name_format: Optional[str] = None
    student_name_format: Optional[str] = None
    # Accounts & Invoices Settings
    payment_methods: Optional[List[str]] = None
    default_balance_date: Optional[str] = None
    balance_day_of_month: Optional[int] = None
    late_payment_fee_type: Optional[str] = None
    late_payment_fee_amount: Optional[float] = None
    late_payment_fee_percentage: Optional[float] = None
    send_sms_invoice_notifications: Optional[bool] = None
    send_overdue_invoice_reminder: Optional[bool] = None
    email_timeframe_start: Optional[str] = None
    email_timeframe_end: Optional[str] = None
    invoice_name: Optional[str] = None
    # Invoice Display Options
    show_class_details: Optional[bool] = None
    show_tutor_details: Optional[bool] = None
    show_session_date: Optional[bool] = None
    show_session_time: Optional[bool] = None
    show_duration: Optional[bool] = None
    show_student_name_on_family: Optional[bool] = None
    group_by_student: Optional[bool] = None
    show_no_charge_items: Optional[bool] = None
    # Business Card / Center Info
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_country: Optional[str] = None
    business_logo_url: Optional[str] = None
    # Email & SMS Settings
    business_email_address: Optional[str] = None
    use_business_name_as_sender: Optional[bool] = None
    use_business_name_on_reminders: Optional[bool] = None
    use_business_name_on_lesson_notes: Optional[bool] = None
    send_birthday_emails: Optional[bool] = None
    tutor_email_address: Optional[str] = None
    # Policies Settings
    min_advance_booking_hours: Optional[int] = None
    max_advance_booking_days: Optional[int] = None
    weekly_slot_hold_days: Optional[int] = None
    allow_booking_from: Optional[str] = None
    restrict_portal_to_makeup_credits: Optional[bool] = None
    send_booking_notification: Optional[bool] = None
    allow_portal_cancellation: Optional[bool] = None
    log_cancellation_notification: Optional[bool] = None
    cancellation_policy_text: Optional[str] = None
    cancellation_deadline_hours: Optional[int] = None

# Settings Routes
@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default settings
        default_settings = SettingsBase()
        return default_settings.model_dump()
    return settings

@api_router.put("/settings")
async def update_settings(settings_data: SettingsUpdate):
    existing = await db.settings.find_one({})
    
    update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    
    if existing:
        await db.settings.update_one({}, {"$set": update_data})
    else:
        default = SettingsBase().model_dump()
        default.update(update_data)
        await db.settings.insert_one(default)
    
    return await get_settings()

@api_router.post("/settings/add-expense-category")
async def add_expense_category(category: str):
    settings = await db.settings.find_one({})
    
    if not settings:
        default = SettingsBase().model_dump()
        default['expense_categories'].append(category)
        await db.settings.insert_one(default)
    else:
        categories = settings.get('expense_categories', [])
        if category not in categories:
            categories.append(category)
            await db.settings.update_one({}, {"$set": {"expense_categories": categories}})
    
    return {"message": "Category added successfully"}

@api_router.delete("/settings/expense-category/{category}")
async def delete_expense_category(category: str):
    settings = await db.settings.find_one({})
    
    if settings:
        categories = settings.get('expense_categories', [])
        if category in categories:
            categories.remove(category)
            await db.settings.update_one({}, {"$set": {"expense_categories": categories}})
    
    return {"message": "Category deleted successfully"}

@api_router.post("/invoices/reminders/run-now")
async def run_reminders_now():
    """Manually trigger the reminder pass (useful for admin testing)."""
    await _process_invoice_reminders()
    return {"message": "Reminder pass complete"}


# ── Website Manager Models ──────────────────────────────────────────────────

class GalleryItemCreate(BaseModel):
    url: str
    type: Literal['photo', 'video'] = 'photo'
    caption: str = ""

class GalleryItem(GalleryItemCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebsiteProgramCreate(BaseModel):
    title: str
    description: str
    badge: str = ""
    image_url: str = ""
    highlights: List[str] = []
    color: str = "#1a5fa8"
    order: int = 0

class WebsiteProgram(WebsiteProgramCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebsiteStat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    value: int
    suffix: str = "+"
    label: str

DEFAULT_WEBSITE_STATS = [
    {"id": "stat-1", "value": 1000, "suffix": "+", "label": "Students Trained"},
    {"id": "stat-2", "value": 10, "suffix": "+", "label": "Years Experience"},
    {"id": "stat-3", "value": 10, "suffix": "+", "label": "Courses Offered"},
    {"id": "stat-4", "value": 4, "suffix": " Age Groups", "label": "Served"},
]


# ── Website Gallery Routes ───────────────────────────────────────────────────

@api_router.get("/website/gallery")
async def get_gallery():
    items = await db.gallery.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.post("/website/gallery")
async def add_gallery_item(item: GalleryItemCreate):
    obj = GalleryItem(**item.model_dump())
    doc = obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.gallery.insert_one(doc)
    return obj

@api_router.delete("/website/gallery/{item_id}")
async def delete_gallery_item(item_id: str):
    result = await db.gallery.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return {"message": "Deleted"}


# ── Website Programs Routes ──────────────────────────────────────────────────

@api_router.get("/website/programs")
async def get_website_programs():
    programs = await db.website_programs.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return programs

@api_router.post("/website/programs")
async def create_website_program(data: WebsiteProgramCreate):
    obj = WebsiteProgram(**data.model_dump())
    doc = obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.website_programs.insert_one(doc)
    return obj

@api_router.put("/website/programs/{program_id}")
async def update_website_program(program_id: str, data: WebsiteProgramCreate):
    result = await db.website_programs.update_one(
        {"id": program_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    return await db.website_programs.find_one({"id": program_id}, {"_id": 0})

@api_router.delete("/website/programs/{program_id}")
async def delete_website_program(program_id: str):
    result = await db.website_programs.delete_one({"id": program_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"message": "Deleted"}


# ── Website Stats Routes ─────────────────────────────────────────────────────

@api_router.get("/website/stats")
async def get_website_stats():
    config = await db.website_config.find_one({"key": "stats"}, {"_id": 0})
    if config:
        return config.get("stats", DEFAULT_WEBSITE_STATS)
    return DEFAULT_WEBSITE_STATS

@api_router.put("/website/stats")
async def update_website_stats(stats: List[WebsiteStat]):
    data = [s.model_dump() for s in stats]
    await db.website_config.update_one(
        {"key": "stats"},
        {"$set": {"key": "stats", "stats": data}},
        upsert=True
    )
    return data


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ----- Automated Invoice Reminders -----
REMINDER_DAYS_BEFORE = [3]          # send reminder X days BEFORE due date
REMINDER_DAYS_OVERDUE = [1, 7, 14]  # send overdue reminder X days AFTER due date
REMINDER_INTERVAL_HOURS = 12         # check twice a day

async def _send_invoice_reminder(invoice: dict, days_diff: int, overdue: bool):
    """Compose and send a single reminder email for one invoice."""
    # Resolve recipient (parent first, then student email)
    recipient_email = None
    recipient_name = None
    student = None
    parent = None

    if invoice.get('invoice_type') == 'family' and invoice.get('family_id'):
        parent = await db.parents.find_one({"id": invoice['family_id']}, {"_id": 0})
    elif invoice.get('student_id'):
        student = await db.students.find_one({"id": invoice['student_id']}, {"_id": 0})
        if student:
            if student.get('parent_id'):
                parent = await db.parents.find_one({"id": student['parent_id']}, {"_id": 0})
            if not parent:
                parent = await db.parents.find_one({"student_ids": student['id']}, {"_id": 0})

    if parent and parent.get('email'):
        recipient_email = parent['email']
        recipient_name = parent.get('name', 'Parent')
    elif student and student.get('email'):
        recipient_email = student['email']
        recipient_name = student.get('name', 'Student')

    if not recipient_email:
        return False

    settings = await db.settings.find_one({}, {"_id": 0})
    company_name = (settings or {}).get('invoice_company_name') or (settings or {}).get('center_name') or 'StemXplore'
    invoice_num = invoice.get('invoice_number', invoice['id'][:8].upper())
    due_date = invoice['due_date'][:10] if isinstance(invoice['due_date'], str) else invoice['due_date'].strftime('%Y-%m-%d')
    bill_to = student['name'] if student else (parent.get('name', '') if parent else '')

    if overdue:
        subject = f"Overdue: Invoice {invoice_num} ({days_diff} day(s) past due)"
        intro = f"This is a friendly reminder that invoice {invoice_num} is now <strong>{days_diff} day(s) overdue</strong>."
        accent = "#ef4444"
    else:
        subject = f"Reminder: Invoice {invoice_num} due in {days_diff} day(s)"
        intro = f"This is a friendly reminder that invoice {invoice_num} is due in <strong>{days_diff} day(s)</strong>."
        accent = "#1E3A8A"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: {accent};">{company_name}</h2>
      <p>Dear {recipient_name},</p>
      <p>{intro}</p>
      <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0;">
        <p><strong>Invoice #:</strong> {invoice_num}</p>
        <p><strong>For:</strong> {bill_to}</p>
        <p><strong>Amount:</strong> {invoice['amount']:.2f}</p>
        <p><strong>Due Date:</strong> {due_date}</p>
        <p><strong>Status:</strong> {invoice.get('status', 'pending').upper()}</p>
      </div>
      <p>Please make the payment at your earliest convenience.</p>
      <p>Thank you for choosing {company_name}!</p>
    </div>
    """

    result = await send_email_async(recipient_email, subject, html)
    if result.get("status") == "success":
        await db.invoices.update_one(
            {"id": invoice['id']},
            {"$set": {f"reminder_sent_{'overdue' if overdue else 'before'}_{days_diff}": datetime.now(timezone.utc).isoformat()}}
        )
        logger.info(f"Sent reminder for invoice {invoice_num} to {recipient_email} ({'overdue ' + str(days_diff) + 'd' if overdue else 'due in ' + str(days_diff) + 'd'})")
        return True
    return False

async def _process_invoice_reminders():
    """Scan unpaid invoices and send reminders matching the configured schedule."""
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    if settings.get('disable_invoice_reminders'):
        return

    today = datetime.now(timezone.utc).date()
    invoices = await db.invoices.find(
        {"status": {"$in": ["pending", "overdue"]}},
        {"_id": 0}
    ).to_list(2000)

    for inv in invoices:
        try:
            due = inv.get('due_date')
            if isinstance(due, str):
                due_dt = datetime.fromisoformat(due.replace('Z', '+00:00'))
            else:
                due_dt = due
            if not due_dt:
                continue
            days_until_due = (due_dt.date() - today).days

            if days_until_due >= 0 and days_until_due in REMINDER_DAYS_BEFORE:
                key = f"reminder_sent_before_{days_until_due}"
                if not inv.get(key):
                    await _send_invoice_reminder(inv, days_until_due, overdue=False)
            elif days_until_due < 0:
                days_overdue = -days_until_due
                if days_overdue in REMINDER_DAYS_OVERDUE:
                    key = f"reminder_sent_overdue_{days_overdue}"
                    if not inv.get(key):
                        await _send_invoice_reminder(inv, days_overdue, overdue=True)
                # Mark overdue if past due
                if inv.get('status') == 'pending':
                    await db.invoices.update_one({"id": inv['id']}, {"$set": {"status": "overdue"}})
        except Exception as e:
            logger.error(f"Reminder error for invoice {inv.get('invoice_number')}: {e}")

async def _reminder_loop():
    """Background task: run reminders every REMINDER_INTERVAL_HOURS hours."""
    # Initial small delay so app is fully ready
    await asyncio.sleep(15)
    while True:
        try:
            await _process_invoice_reminders()
        except Exception as e:
            logger.error(f"Reminder loop error: {e}")
        await asyncio.sleep(REMINDER_INTERVAL_HOURS * 60 * 60)

SELF_PING_INTERVAL_SECONDS = 14 * 60  # 14 minutes

async def _self_ping_loop():
    """Keep the server alive on free-tier hosts by pinging its own health endpoint."""
    import httpx
    await asyncio.sleep(30)  # let the server fully start first
    base_url = os.environ.get('SELF_URL', 'http://localhost:8001')
    while True:
        try:
            async with httpx.AsyncClient() as client_http:
                r = await client_http.get(f"{base_url}/api/health", timeout=10)
            logger.info(f"Self-ping OK ({r.status_code})")
        except Exception as e:
            logger.warning(f"Self-ping failed: {e}")
        await asyncio.sleep(SELF_PING_INTERVAL_SECONDS)

@app.on_event("startup")
async def _start_reminder_scheduler():
    asyncio.create_task(_reminder_loop())
    asyncio.create_task(_self_ping_loop())
    logger.info("Invoice reminder scheduler and self-ping started")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()