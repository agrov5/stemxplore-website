"""
Backend tests for Bulk Attendance and Present No Charge features
Testing: POST /api/attendance, POST /api/attendance/bulk, POST /api/attendance/mark-all
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://batch-update-v1.preview.emergentagent.com').rstrip('/')


class TestAttendanceAPIs:
    """Test attendance endpoints including bulk and mark-all"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@test.com", "password": "Demo123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Get students and classes
        students_res = requests.get(f"{BASE_URL}/api/students", headers=self.headers)
        classes_res = requests.get(f"{BASE_URL}/api/classes", headers=self.headers)
        
        assert students_res.status_code == 200, f"Failed to get students: {students_res.text}"
        assert classes_res.status_code == 200, f"Failed to get classes: {classes_res.text}"
        
        self.students = students_res.json()
        self.classes = classes_res.json()
        self.test_date = datetime.now().strftime('%Y-%m-%d')
        
    def test_single_attendance_present(self):
        """Test marking single student as present"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "present",
                "no_charge_reason": None
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "present"
        assert data["student_id"] == student_id
        assert data["class_id"] == class_id
        print(f"✓ Single attendance (present) marked successfully")
    
    def test_single_attendance_absent(self):
        """Test marking single student as absent"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "absent",
                "no_charge_reason": None
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "absent"
        print(f"✓ Single attendance (absent) marked successfully")
    
    def test_single_attendance_late(self):
        """Test marking single student as late"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "late",
                "no_charge_reason": None
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "late"
        print(f"✓ Single attendance (late) marked successfully")
    
    def test_single_attendance_present_no_charge_trial(self):
        """Test marking single student as present_no_charge with trial reason"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "present_no_charge",
                "no_charge_reason": "trial"
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "present_no_charge"
        assert data["no_charge_reason"] == "trial"
        print(f"✓ Single attendance (present_no_charge - trial) marked successfully")
    
    def test_single_attendance_present_no_charge_makeup(self):
        """Test marking single student as present_no_charge with makeup reason"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[1]["id"] if len(self.students) > 1 else self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "present_no_charge",
                "no_charge_reason": "makeup"
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "present_no_charge"
        assert data["no_charge_reason"] == "makeup"
        print(f"✓ Single attendance (present_no_charge - makeup) marked successfully")
    
    def test_single_attendance_present_no_charge_scholarship(self):
        """Test marking single student as present_no_charge with scholarship reason"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[2]["id"] if len(self.students) > 2 else self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "present_no_charge",
                "no_charge_reason": "scholarship"
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "present_no_charge"
        assert data["no_charge_reason"] == "scholarship"
        print(f"✓ Single attendance (present_no_charge - scholarship) marked successfully")
    
    def test_single_attendance_present_no_charge_free_session(self):
        """Test marking single student as present_no_charge with free_session reason"""
        if not self.students or not self.classes:
            pytest.skip("No test data available")
            
        student_id = self.students[3]["id"] if len(self.students) > 3 else self.students[0]["id"]
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            json={
                "student_id": student_id,
                "class_id": class_id,
                "date": self.test_date,
                "status": "present_no_charge",
                "no_charge_reason": "free_session"
            }
        )
        
        assert response.status_code == 200, f"Failed to mark attendance: {response.text}"
        data = response.json()
        assert data["status"] == "present_no_charge"
        assert data["no_charge_reason"] == "free_session"
        print(f"✓ Single attendance (present_no_charge - free_session) marked successfully")

    def test_bulk_attendance_present(self):
        """Test bulk marking multiple students as present"""
        if len(self.students) < 2 or not self.classes:
            pytest.skip("Need at least 2 students for bulk test")
            
        class_id = self.classes[0]["id"]
        records = [
            {"student_id": self.students[0]["id"], "status": "present", "no_charge_reason": None},
            {"student_id": self.students[1]["id"], "status": "present", "no_charge_reason": None}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance/bulk",
            headers=self.headers,
            json={
                "class_id": class_id,
                "date": self.test_date,
                "records": records
            }
        )
        
        assert response.status_code == 200, f"Failed to bulk mark attendance: {response.text}"
        data = response.json()
        assert data["success"] == 2
        assert data["failed"] == 0
        print(f"✓ Bulk attendance (present) for {data['success']} students marked successfully")
    
    def test_bulk_attendance_mixed_status(self):
        """Test bulk marking with mixed statuses"""
        if len(self.students) < 3 or not self.classes:
            pytest.skip("Need at least 3 students for mixed bulk test")
            
        class_id = self.classes[0]["id"]
        records = [
            {"student_id": self.students[0]["id"], "status": "present", "no_charge_reason": None},
            {"student_id": self.students[1]["id"], "status": "absent", "no_charge_reason": None},
            {"student_id": self.students[2]["id"], "status": "late", "no_charge_reason": None}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance/bulk",
            headers=self.headers,
            json={
                "class_id": class_id,
                "date": self.test_date,
                "records": records
            }
        )
        
        assert response.status_code == 200, f"Failed to bulk mark attendance: {response.text}"
        data = response.json()
        assert data["success"] == 3
        assert data["failed"] == 0
        print(f"✓ Bulk attendance (mixed status) for {data['success']} students marked successfully")
    
    def test_bulk_attendance_present_no_charge(self):
        """Test bulk marking multiple students as present_no_charge with reason"""
        if len(self.students) < 2 or not self.classes:
            pytest.skip("Need at least 2 students for bulk no charge test")
            
        class_id = self.classes[0]["id"]
        records = [
            {"student_id": self.students[0]["id"], "status": "present_no_charge", "no_charge_reason": "trial"},
            {"student_id": self.students[1]["id"], "status": "present_no_charge", "no_charge_reason": "scholarship"}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance/bulk",
            headers=self.headers,
            json={
                "class_id": class_id,
                "date": self.test_date,
                "records": records
            }
        )
        
        assert response.status_code == 200, f"Failed to bulk mark attendance: {response.text}"
        data = response.json()
        assert data["success"] == 2
        assert data["failed"] == 0
        print(f"✓ Bulk attendance (present_no_charge) for {data['success']} students marked successfully")
    
    def test_mark_all_present(self):
        """Test mark-all endpoint to mark all students as present"""
        if not self.classes:
            pytest.skip("No classes available")
            
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance/mark-all",
            headers=self.headers,
            params={
                "class_id": class_id,
                "date": self.test_date,
                "status": "present",
                "no_charge_reason": None
            }
        )
        
        assert response.status_code == 200, f"Failed to mark all attendance: {response.text}"
        data = response.json()
        assert data["success"] > 0
        print(f"✓ Mark-all (present) for {data['success']} students completed successfully")
    
    def test_mark_all_absent(self):
        """Test mark-all endpoint to mark all students as absent"""
        if not self.classes:
            pytest.skip("No classes available")
            
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance/mark-all",
            headers=self.headers,
            params={
                "class_id": class_id,
                "date": self.test_date,
                "status": "absent",
                "no_charge_reason": None
            }
        )
        
        assert response.status_code == 200, f"Failed to mark all attendance: {response.text}"
        data = response.json()
        assert data["success"] > 0
        print(f"✓ Mark-all (absent) for {data['success']} students completed successfully")
    
    def test_get_attendance_by_class_and_date(self):
        """Test getting attendance records filtered by class and date"""
        if not self.classes:
            pytest.skip("No classes available")
            
        class_id = self.classes[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/attendance",
            headers=self.headers,
            params={
                "class_id": class_id,
                "date": self.test_date
            }
        )
        
        assert response.status_code == 200, f"Failed to get attendance: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get attendance returned {len(data)} records")
        
        # Verify data structure
        if len(data) > 0:
            record = data[0]
            assert "student_id" in record
            assert "class_id" in record
            assert "date" in record
            assert "status" in record
            # no_charge_reason can be None or missing
            print(f"✓ Attendance record structure validated")
    
    def test_bulk_attendance_empty_records(self):
        """Test bulk attendance with empty records returns appropriate response"""
        if not self.classes:
            pytest.skip("No classes available")
            
        class_id = self.classes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/attendance/bulk",
            headers=self.headers,
            json={
                "class_id": class_id,
                "date": self.test_date,
                "records": []
            }
        )
        
        assert response.status_code == 200, f"Unexpected response: {response.text}"
        data = response.json()
        assert data["success"] == 0
        print(f"✓ Bulk attendance with empty records handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
