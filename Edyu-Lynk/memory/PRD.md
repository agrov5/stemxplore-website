# StemXplore - Coaching Center Management Application

## Product Requirements Document

### Original Problem Statement
Build a comprehensive coaching center management application for managing students, teachers, classes, attendance, fees, invoices, and scheduling. The app should match TutorBird-style UI/UX patterns.

---

## What's Been Implemented (Latest Session - February 09, 2026)

### Attendance UX Fix ✅ (NEW)
- [x] **Replaced click-to-cycle with click-to-popover** on Attendance page
- [x] Users can now jump to any status (Present / Absent / Late / No Charge) directly — no more "stuck on No Charge" issue
- [x] Auto-save preserved on each selection (no extra Save button needed)
- [x] Teacher cards updated with 3-option popover (Present / Absent / Late)

## What's Been Implemented (Previous Session - February 21, 2026)

### App Rebranding ✅ (NEW)
- [x] **CoachCenter → StemXplore** - All branding updated across app
- [x] Login page, Sidebar, Register page updated

### Teacher Enhancements ✅ (NEW)
- [x] **Country Code for Phone** - Dropdown with 12 countries (+91 India default)
- [x] **Fee per Session** - New field to track teacher payment per class
- [x] Teachers table shows Fee/Session column

### Student Group Tags ✅ (NEW)
- [x] **Group Tag Selection** - Checkboxes in Student add/edit form
- [x] **Group Tags Column** - Students table shows colored badges for assigned groups
- [x] Backend `group_ids` field on StudentBase model

### Dual Attendance Tracking ✅ (NEW)
- [x] **Teacher + Student Attendance** - Tabs in Attendance page
- [x] **Teacher attendance cards** - Click to mark Present/Absent/Late
- [x] Backend supports `attendance_type: 'teacher' | 'student'`

### Comprehensive Invoicing System ✅ (NEW - Feb 23, 2026)
- [x] **Attendance-Based Invoicing** - Generate invoices based on attendance records
- [x] **Date Range Selection** - Invoice for any selected period (start/end dates)
- [x] **Include Upcoming Events** - Option to include future scheduled classes
- [x] **No-Charge Sessions** - Mark sessions as no-charge when teacher absent (self-study)
- [x] **Credit System** - Cancelled events that were invoiced create credits
- [x] **Family Invoicing** - Invoice multiple students under one family
- [x] **Line Item Selection** - Choose which sessions to include in invoice
- [x] **Auto-Apply Credits** - Option to auto-apply student credit balance

### Admin User Approval System ✅ (NEW - Feb 22, 2026)
- [x] **Registration Approval Flow** - New users get `status: pending` until admin approves
- [x] **First User Auto-Approved** - First registered user is auto-approved as admin
- [x] **Login Blocked for Pending Users** - Returns "Your account is pending admin approval"
- [x] **User Management Page** - `/users` route with approve/reject/delete actions
- [x] **Stats Dashboard** - Cards showing Pending, Approved, Rejected, Total users
- [x] **Registration Page Notice** - Alert informing users about approval requirement

### Calendar Enhancements ✅ (NEW - Feb 22, 2026)
- [x] **Click date to Add Event** - onSelectSlot opens Add Event dialog with date pre-filled
- [x] **Edit Event Option** - Edit button in event view dialog opens form with existing data
- [x] **Class Name Prefill** - Selecting a class auto-fills event title (editable by user)
- [x] Event view dialog footer: Close, Edit, Delete buttons

### Enhanced Class Schedule System ✅
- [x] **Day Selection UI** - Checkboxes for Mon/Tue/Wed/Thu/Fri/Sat/Sun
- [x] **Time Selection** - Start Time and End Time pickers
- [x] **Date Range** - Start Date and End Date for class duration
- [x] **Auto-Duration Calculation** - Duration auto-calculated from start/end time
- [x] **Schedule String** - Human-readable format "Mon, Wed, Fri 9:00 AM - 10:00 AM"
- [x] **Auto Calendar Events** - Events auto-generated based on schedule and date range
- [x] **Effective Date Dialog** - When schedule changes, prompts for effective date
- [x] **Cascading Delete** - Deleting class also removes associated calendar events

#### Backend Changes:
- New `ClassSchedule` model with days, start_time, end_time
- Enhanced `ClassBase` model with schedule_details, start_date, end_date, duration_minutes
- New `ClassUpdate` model with effective_date for schedule changes
- `generate_class_events()` helper function for event generation
- `POST /api/classes/{id}/regenerate-events` endpoint

### Previous Session Work (Feb 2026)

#### TutorBird-Style UI Restructure ✅

#### Dashboard Enhancements ✅
- [x] **Event Tiles with Tabs** - "Next 5" and "Past 5" event tabs
- [x] **Event Click Action** - Opens dialog with "Mark Attendance" and "View/Edit Event" options
- [x] **Clickable stat cards** - Navigate to respective pages

#### Families & Invoices Page ✅ (NEW)
- [x] **Merged Parents + Invoices** into single "Families & Invoices" page
- [x] **Table Columns**: Family, Family Contact (email + phone), Group Tags, Balance, Auto-Invoice
- [x] **Header Info**: "You're owed ₹X as of DATE" and "Prepaid Balance"
- [x] **Action Buttons**: Add Transaction, Charge Categories, Auto-Invoicing
- [x] **Add Family Dialog**:
  - Name, Email, Phone fields
  - Group Tags (add/remove tags)
  - Students multi-select
  - Auto-Invoice toggle with frequency selection

#### Business Settings Overhaul ✅
- [x] **TutorBird-Style Layout** - Business card on left, tabbed settings on right
- [x] **7 Tabs**:
  1. **General** - Event Scheduling (conflicts, multi-timezone), Naming Format (tutor/student)
  2. **Accounts & Invoices** - Payment Methods, Default Balance Date, Late Payment Fee, Invoice Formatting
  3. **Email & SMS** - Business email, sender preferences, system email templates
  4. **Policies** - Booking Policy (advance booking times, slot hold), Cancellation Policy (preferences, policy text, deadline)
  5. **Terminology** - Class/Course/Subject naming
  6. **Currency** - INR, USD, EUR, etc.
  7. **Alerts** - Invoice/Payment email notifications, reminders

#### Backend Enhancements ✅
- [x] **Enhanced Parent Model**:
  - group_tags: List[str]
  - balance: float
  - prepaid_balance: float
  - auto_invoice: bool
  - auto_invoice_frequency: str
  - notes: str
- [x] **New API Endpoints**:
  - `GET /families/summary` - Get families with calculated balances
  - `POST /parents/{id}/add-transaction` - Add payment/charge to family

#### Settings Model Enhancements ✅
- [x] General Settings: scheduling conflicts, multi-timezone, name formats
- [x] Accounts & Invoices: payment methods, balance date, late fees, email timeframe
- [x] Email Settings: business email, sender preferences, birthday emails
- [x] Policies: booking/cancellation rules and texts

---

## Previously Implemented Features

### Core Features ✅
- User Authentication (Register/Login with JWT)
- Dashboard with clickable stat cards + Revenue breakdown
- Student, Teacher, Parent CRUD
- Class management with multiple teachers/students

### Invoice System ✅
- Invoice Settings Tab in Settings page
- Enhanced Invoice PDF with company info, line items, credits
- Send Invoice to Parent email
- Auto-Invoice System (monthly/weekly/custom frequency)

### Attendance System ✅
- By Class and By Event modes
- Bulk attendance marking
- Present No Charge option
- Navigation from Calendar/Dashboard events

### Financial Features ✅
- Fee management
- Invoice generation with PDF
- Payment tracking
- Expense tracking with categories
- Opening balances

### Scheduling ✅
- Calendar with clickable events
- Event view with attendance marking option
- Announcements

---

## Upcoming Tasks

### P0 - Critical (Next Session)
1. **Calendar with Attendance Indicators** - TutorBird-style:
   - Green mark = full attendance
   - Grey mark = absent
   - Show past 5 events in Attendance tab

2. **Student Profile Updates**:
   - Link students to Family
   - Discount & auto-invoice fields in form
   - Credit balance display

### P1 - High Priority
1. **Teacher Profile Features**:
   - Attendance tracking per class
   - Fee details on profile

2. **Terminology Propagation** - Make all pages use Settings terminology

### P2 - Medium Priority
1. **Student Profile Redesign** - Match TutorBird screenshot
2. **Teacher Profile Redesign** - Match TutorBird screenshot
3. Financial Reports UI completion

---

## Test Credentials
- Email: demo@test.com
- Password: Demo123!

## App URL
https://batch-update-v1.preview.emergentagent.com

## File Structure
```
/app
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.js          # Event tiles with Next 5/Past 5 tabs
│       │   ├── FamiliesInvoices.js   # Merged families & invoices
│       │   ├── Classes.js            # Enhanced schedule with day/time/date selection
│       │   ├── Settings.js           # TutorBird-style 7-tab layout
│       │   └── ...
│       └── components/
│           └── Sidebar.js            # Updated menu
└── backend/
    └── server.py                      # Enhanced Class models with schedule support
```

## Key Test IDs (Classes Page)
- `add-class-button` - Open add class dialog
- `class-name-input` - Class name field
- `day-checkbox-{mon,tue,wed,thu,fri,sat,sun}` - Day selection checkboxes
- `class-start-time` / `class-end-time` - Time pickers
- `class-start-date` / `class-end-date` - Date pickers
- `effective-date-input` - Effective date in change dialog
- `confirm-effective-date` - Confirm schedule change button
