"""
Invoicing Features Test Suite
Tests for:
- Single Student Invoice Generation (generate-for-student)
- Family Invoice Generation (generate-for-family)
- Invoice Preview with line items (charged/no-charge status)
- Create Invoice from Preview (create-from-preview)
- Create Family Invoice (create-family-invoice)
- Invoice Status Update
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvoiceGeneration:
    """Test invoice generation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get test data from API"""
        self.students_response = requests.get(f"{BASE_URL}/api/students")
        self.parents_response = requests.get(f"{BASE_URL}/api/parents")
        
        self.students = self.students_response.json() if self.students_response.status_code == 200 else []
        self.parents = self.parents_response.json() if self.parents_response.status_code == 200 else []
    
    def test_get_students_for_invoice(self):
        """Test that students endpoint returns data needed for invoicing"""
        assert self.students_response.status_code == 200
        assert isinstance(self.students, list)
        
        if len(self.students) > 0:
            student = self.students[0]
            # Check required fields for invoicing
            assert 'id' in student
            assert 'name' in student
            assert 'email' in student
            assert 'fee_amount' in student
            assert 'class_ids' in student
            assert 'credit_balance' in student
            assert 'discount_percentage' in student
            print(f"Found {len(self.students)} students for invoicing")
    
    def test_get_parents_for_family_invoice(self):
        """Test that parents endpoint returns data needed for family invoicing"""
        assert self.parents_response.status_code == 200
        assert isinstance(self.parents, list)
        
        if len(self.parents) > 0:
            parent = self.parents[0]
            # Check required fields for family invoicing
            assert 'id' in parent
            assert 'name' in parent
            assert 'email' in parent
            assert 'student_ids' in parent
            print(f"Found {len(self.parents)} families for invoicing")
    
    def test_generate_student_invoice_preview(self):
        """Test generating invoice preview for single student"""
        if len(self.students) == 0:
            pytest.skip("No students available for testing")
        
        student = self.students[0]
        
        # Test with date range
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        payload = {
            "student_id": student['id'],
            "start_date": start_date,
            "end_date": end_date,
            "include_upcoming": False,
            "apply_credits": True
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-student", json=payload)
        
        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert 'student' in data
        assert 'period' in data
        assert 'line_items' in data
        assert 'credits' in data
        assert 'summary' in data
        
        # Verify student info
        assert data['student']['id'] == student['id']
        assert data['student']['name'] == student['name']
        
        # Verify period
        assert data['period']['start_date'] == start_date
        assert data['period']['end_date'] == end_date
        
        # Verify summary fields
        summary = data['summary']
        assert 'subtotal' in summary
        assert 'discount_percentage' in summary
        assert 'discount_amount' in summary
        assert 'credit_balance' in summary
        assert 'credit_applied' in summary
        assert 'total_due' in summary
        assert 'total_sessions' in summary
        assert 'no_charge_sessions' in summary
        assert 'upcoming_sessions' in summary
        
        print(f"Generated invoice preview for {student['name']} with {len(data['line_items'])} line items")
    
    def test_generate_student_invoice_with_upcoming(self):
        """Test generating invoice preview with upcoming classes included"""
        if len(self.students) == 0:
            pytest.skip("No students available for testing")
        
        student = self.students[0]
        
        today = datetime.now()
        start_date = (today - timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        payload = {
            "student_id": student['id'],
            "start_date": start_date,
            "end_date": end_date,
            "include_upcoming": True,  # Include upcoming classes
            "apply_credits": True
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-student", json=payload)
        
        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()
        
        # Verify upcoming sessions are counted
        assert 'upcoming_sessions' in data['summary']
        print(f"Invoice preview shows {data['summary']['upcoming_sessions']} upcoming sessions")
    
    def test_generate_student_invoice_without_credits(self):
        """Test generating invoice preview without applying credits"""
        if len(self.students) == 0:
            pytest.skip("No students available for testing")
        
        student = self.students[0]
        
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        payload = {
            "student_id": student['id'],
            "start_date": start_date,
            "end_date": end_date,
            "include_upcoming": False,
            "apply_credits": False  # Don't apply credits
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-student", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Credit applied should be 0 when apply_credits is False
        assert data['summary']['credit_applied'] == 0
        print("Verified credits are not applied when apply_credits=False")
    
    def test_generate_student_invoice_invalid_student(self):
        """Test generating invoice for non-existent student"""
        payload = {
            "student_id": "non-existent-id-12345",
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "include_upcoming": False,
            "apply_credits": True
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-student", json=payload)
        
        assert response.status_code == 404
        assert 'detail' in response.json()
        print("Correctly returns 404 for non-existent student")


class TestFamilyInvoicing:
    """Test family invoice generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get test data from API"""
        self.students_response = requests.get(f"{BASE_URL}/api/students")
        self.parents_response = requests.get(f"{BASE_URL}/api/parents")
        
        self.students = self.students_response.json() if self.students_response.status_code == 200 else []
        self.parents = self.parents_response.json() if self.parents_response.status_code == 200 else []
        
        # Create student_id to student mapping
        student_map = {s['id']: s for s in self.students}
        
        # Find a family with multiple students using parent's student_ids list
        self.family_with_students = None
        self.family_student_ids = []
        for parent in self.parents:
            student_ids = parent.get('student_ids', [])
            # Check which students actually exist
            valid_student_ids = [sid for sid in student_ids if sid in student_map]
            if len(valid_student_ids) >= 1:  # At least one student
                self.family_with_students = parent
                self.family_student_ids = valid_student_ids
                break
    
    def test_generate_family_invoice_preview(self):
        """Test generating invoice preview for a family"""
        if not self.family_with_students:
            pytest.skip("No families with students available for testing")
        
        family = self.family_with_students
        
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        payload = {
            "family_id": family['id'],
            "student_ids": self.family_student_ids,
            "start_date": start_date,
            "end_date": end_date,
            "include_upcoming": False,
            "apply_credits": True
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-family", json=payload)
        
        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()
        
        # Verify response structure for family invoice
        assert 'family' in data
        assert 'students' in data
        assert 'period' in data
        assert 'line_items' in data
        assert 'credits' in data
        assert 'summary' in data
        
        # Verify family info
        assert data['family']['id'] == family['id']
        assert data['family']['name'] == family['name']
        
        # Verify students summary
        assert isinstance(data['students'], list)
        assert len(data['students']) >= 1
        
        # Verify summary has family-specific fields
        summary = data['summary']
        assert 'total_students' in summary
        assert 'total_credit_balance' in summary
        assert 'subtotal' in summary
        assert 'total_due' in summary
        
        print(f"Generated family invoice for {family['name']} with {len(data['students'])} students")
    
    def test_generate_family_invoice_requires_family_id(self):
        """Test that family_id is required for family invoice"""
        payload = {
            "student_id": None,
            "family_id": None,  # Missing
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "include_upcoming": False,
            "apply_credits": True
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-family", json=payload)
        
        assert response.status_code == 400
        print("Correctly requires family_id for family invoice")
    
    def test_generate_family_invoice_invalid_family(self):
        """Test generating invoice for non-existent family"""
        payload = {
            "family_id": "non-existent-family-id",
            "student_ids": [],
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "include_upcoming": False,
            "apply_credits": True
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/generate-for-family", json=payload)
        
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent family")


class TestInvoiceCreation:
    """Test invoice creation from preview"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get test data from API"""
        self.students_response = requests.get(f"{BASE_URL}/api/students")
        self.parents_response = requests.get(f"{BASE_URL}/api/parents")
        
        self.students = self.students_response.json() if self.students_response.status_code == 200 else []
        self.parents = self.parents_response.json() if self.parents_response.status_code == 200 else []
    
    def test_create_invoice_from_preview(self):
        """Test creating a student invoice from preview data"""
        if len(self.students) == 0:
            pytest.skip("No students available for testing")
        
        student = self.students[0]
        
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        # Create invoice with params
        params = {
            "student_id": student['id'],
            "start_date": start_date,
            "end_date": end_date,
            "subtotal": 100.0,
            "discount_amount": 0.0,
            "discount_percentage": 0.0,
            "credit_applied": 0.0,
            "total_due": 100.0,
            "comments": "TEST_Invoice_Creation"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/create-from-preview", params=params)
        
        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()
        
        assert 'invoice_id' in data or 'id' in data
        assert 'invoice_number' in data
        assert 'message' in data
        
        print(f"Created invoice {data.get('invoice_number', 'unknown')} for {student['name']}")
    
    def test_create_family_invoice(self):
        """Test creating a family invoice"""
        # Find a family with students
        student_map = {s['id']: s for s in self.students}
        family_with_students = None
        family_student_ids = []
        
        for parent in self.parents:
            student_ids = parent.get('student_ids', [])
            # Check which students actually exist
            valid_student_ids = [sid for sid in student_ids if sid in student_map]
            if len(valid_student_ids) >= 1:
                family_with_students = parent
                family_student_ids = valid_student_ids
                break
        
        if not family_with_students:
            pytest.skip("No families with students available for testing")
        
        today = datetime.now()
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        
        params = {
            "family_id": family_with_students['id'],
            "student_ids": ','.join(family_student_ids),  # Comma-separated
            "start_date": start_date,
            "end_date": end_date,
            "subtotal": 200.0,
            "discount_amount": 0.0,
            "discount_percentage": 0.0,
            "credit_applied": 0.0,
            "total_due": 200.0,
            "comments": "TEST_Family_Invoice"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/create-family-invoice", params=params)
        
        assert response.status_code == 200, f"Failed with: {response.text}"
        data = response.json()
        
        assert 'invoice_id' in data or 'id' in data
        assert 'invoice_number' in data
        
        print(f"Created family invoice {data.get('invoice_number', 'unknown')} for {family_with_students['name']}")


class TestInvoiceList:
    """Test invoice list and status management"""
    
    def test_get_invoices_list(self):
        """Test getting list of invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 200
        invoices = response.json()
        assert isinstance(invoices, list)
        
        if len(invoices) > 0:
            invoice = invoices[0]
            # Verify invoice structure
            assert 'id' in invoice
            assert 'invoice_number' in invoice
            assert 'student_id' in invoice or 'family_id' in invoice
            assert 'amount' in invoice
            assert 'status' in invoice
            assert 'issue_date' in invoice
            assert 'due_date' in invoice
            
            print(f"Found {len(invoices)} invoices in system")
    
    def test_update_invoice_status(self):
        """Test updating invoice status"""
        # First get an existing invoice
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices available for testing")
        
        invoice = invoices[0]
        invoice_id = invoice['id']
        
        # Update status to pending
        response = requests.put(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            params={"status": "pending"}
        )
        
        assert response.status_code == 200, f"Failed with: {response.text}"
        
        # Verify status was updated
        updated = response.json()
        assert updated['status'] == 'pending'
        
        print(f"Successfully updated invoice {invoice_id} status to pending")


class TestCleanup:
    """Clean up test data"""
    
    def test_cleanup_test_invoices(self):
        """Remove TEST_ prefixed invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        if response.status_code != 200:
            return
        
        invoices = response.json()
        deleted = 0
        
        for invoice in invoices:
            comments = invoice.get('comments', '') or ''
            if 'TEST_' in comments:
                # Note: There's no delete endpoint for invoices, 
                # so we'll just change status to cancelled
                requests.put(
                    f"{BASE_URL}/api/invoices/{invoice['id']}",
                    params={"status": "cancelled"}
                )
                deleted += 1
        
        print(f"Marked {deleted} test invoices as cancelled")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
