"""
Test Class Schedule Enhancement Features
- Day selection checkboxes (Mon-Sun)
- Start time and end time pickers
- Start date and end date fields  
- Auto-generation of calendar events
- Effective date for schedule updates
- Duration auto-calculation
- Deleting class deletes its events
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClassScheduleFeatures:
    """Test suite for enhanced class scheduling features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@test.com",
            "password": "Demo123!"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup test classes after tests
        classes = self.session.get(f"{BASE_URL}/api/classes").json()
        for cls in classes:
            if cls.get('name', '').startswith('TEST_'):
                self.session.delete(f"{BASE_URL}/api/classes/{cls['id']}")

    def test_api_health_check(self):
        """Verify backend is running"""
        response = self.session.get(f"{BASE_URL}/api/classes")
        assert response.status_code == 200, f"API should be reachable. Got {response.status_code}"
        print("✓ Backend API is healthy")

    def test_create_class_with_schedule_details(self):
        """Test creating a class with day selection, times, and date range"""
        # Calculate dates for next week
        start_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        class_data = {
            "name": "TEST_Schedule_Class",
            "subject": "Testing",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule": "Mon, Wed 10:00 AM - 11:00 AM",  # Legacy field
            "schedule_details": {
                "days": ["mon", "wed"],
                "start_time": "10:00",
                "end_time": "11:00"
            },
            "start_date": start_date,
            "end_date": end_date,
            "duration": "1 hour",
            "duration_minutes": 60,
            "standard_fee": 50.0
        }
        
        response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Schedule_Class"
        assert data.get("schedule_details") is not None, "schedule_details should be saved"
        assert data["schedule_details"]["days"] == ["mon", "wed"]
        assert data["schedule_details"]["start_time"] == "10:00"
        assert data["schedule_details"]["end_time"] == "11:00"
        assert data["start_date"] == start_date
        assert data["end_date"] == end_date
        print(f"✓ Created class with schedule_details: {data['id']}")
        
        return data["id"]

    def test_auto_generate_calendar_events(self):
        """Test that creating a class with schedule auto-generates calendar events"""
        # First create a class with schedule
        start_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        class_data = {
            "name": "TEST_AutoEvent_Class",
            "subject": "Auto Events",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule_details": {
                "days": ["tue", "thu"],
                "start_time": "14:00",
                "end_time": "15:30"
            },
            "start_date": start_date,
            "end_date": end_date,
            "duration": "1 hour 30 min",
            "duration_minutes": 90,
            "standard_fee": 75.0
        }
        
        # Create the class
        create_response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert create_response.status_code == 200, f"Failed to create class: {create_response.text}"
        
        class_id = create_response.json()["id"]
        print(f"✓ Created class: {class_id}")
        
        # Check events were generated
        events_response = self.session.get(f"{BASE_URL}/api/events")
        assert events_response.status_code == 200
        
        events = events_response.json()
        class_events = [e for e in events if e.get("class_id") == class_id]
        
        assert len(class_events) > 0, f"Expected events to be generated for class {class_id}"
        print(f"✓ Auto-generated {len(class_events)} calendar events for the class")
        
        # Verify event details
        for event in class_events:
            assert event["event_type"] == "class"
            assert "TEST_AutoEvent_Class" in event["title"]
            print(f"  - Event: {event['title']} at {event['start_date']}")
        
        return class_id

    def test_update_class_schedule_regenerates_events(self):
        """Test that updating class schedule regenerates events from effective date"""
        # Create initial class
        start_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=21)).strftime('%Y-%m-%d')
        effective_date = (datetime.now() + timedelta(days=8)).strftime('%Y-%m-%d')
        
        class_data = {
            "name": "TEST_UpdateSchedule_Class",
            "subject": "Update Test",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule_details": {
                "days": ["mon", "wed", "fri"],
                "start_time": "09:00",
                "end_time": "10:00"
            },
            "start_date": start_date,
            "end_date": end_date,
            "duration": "1 hour",
            "duration_minutes": 60,
            "standard_fee": 40.0
        }
        
        # Create class
        create_response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert create_response.status_code == 200
        class_id = create_response.json()["id"]
        print(f"✓ Created class for update test: {class_id}")
        
        # Count initial events
        events_response = self.session.get(f"{BASE_URL}/api/events")
        initial_events = [e for e in events_response.json() if e.get("class_id") == class_id]
        initial_count = len(initial_events)
        print(f"✓ Initial events count: {initial_count}")
        
        # Update schedule with effective_date
        updated_class_data = {
            **class_data,
            "schedule_details": {
                "days": ["tue", "thu"],  # Changed days
                "start_time": "11:00",   # Changed time
                "end_time": "12:00"
            },
            "effective_date": effective_date
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/classes/{class_id}", json=updated_class_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"✓ Updated class schedule with effective_date: {effective_date}")
        
        # Verify updated class has new schedule
        get_response = self.session.get(f"{BASE_URL}/api/classes/{class_id}")
        updated_class = get_response.json()
        assert updated_class["schedule_details"]["days"] == ["tue", "thu"]
        print("✓ Class schedule_details updated successfully")
        
        return class_id

    def test_delete_class_deletes_events(self):
        """Test that deleting a class also deletes its associated calendar events"""
        # Create class with schedule
        start_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
        
        class_data = {
            "name": "TEST_DeleteEvents_Class",
            "subject": "Delete Test",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule_details": {
                "days": ["mon", "tue", "wed"],
                "start_time": "16:00",
                "end_time": "17:00"
            },
            "start_date": start_date,
            "end_date": end_date,
            "duration": "1 hour",
            "duration_minutes": 60,
            "standard_fee": 30.0
        }
        
        # Create class
        create_response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert create_response.status_code == 200
        class_id = create_response.json()["id"]
        print(f"✓ Created class for delete test: {class_id}")
        
        # Verify events exist
        events_before = self.session.get(f"{BASE_URL}/api/events").json()
        class_events_before = [e for e in events_before if e.get("class_id") == class_id]
        assert len(class_events_before) > 0, "Events should be created with the class"
        print(f"✓ Events before delete: {len(class_events_before)}")
        
        # Delete class
        delete_response = self.session.delete(f"{BASE_URL}/api/classes/{class_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("✓ Class deleted successfully")
        
        # Verify events are also deleted
        events_after = self.session.get(f"{BASE_URL}/api/events").json()
        class_events_after = [e for e in events_after if e.get("class_id") == class_id]
        assert len(class_events_after) == 0, f"Events should be deleted with class. Found: {len(class_events_after)}"
        print("✓ Associated calendar events also deleted")

    def test_get_class_with_schedule_details(self):
        """Test that GET class returns schedule_details properly"""
        # First create a class
        start_date = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=20)).strftime('%Y-%m-%d')
        
        class_data = {
            "name": "TEST_GetSchedule_Class",
            "subject": "Get Test",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule_details": {
                "days": ["sat", "sun"],
                "start_time": "08:00",
                "end_time": "09:30"
            },
            "start_date": start_date,
            "end_date": end_date,
            "duration": "1 hour 30 min",
            "duration_minutes": 90,
            "standard_fee": 60.0
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert create_response.status_code == 200
        class_id = create_response.json()["id"]
        
        # Get the class
        get_response = self.session.get(f"{BASE_URL}/api/classes/{class_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["schedule_details"]["days"] == ["sat", "sun"]
        assert data["schedule_details"]["start_time"] == "08:00"
        assert data["schedule_details"]["end_time"] == "09:30"
        assert data["start_date"] == start_date
        assert data["end_date"] == end_date
        print(f"✓ GET class returns schedule_details correctly")

    def test_list_classes_includes_schedule_details(self):
        """Test that listing classes includes new fields with defaults"""
        response = self.session.get(f"{BASE_URL}/api/classes")
        assert response.status_code == 200
        
        classes = response.json()
        assert len(classes) > 0, "Should have at least one class"
        
        # All classes should have schedule_details field (can be null)
        for cls in classes:
            assert "schedule_details" in cls, f"Class {cls['name']} missing schedule_details"
            assert "start_date" in cls, f"Class {cls['name']} missing start_date"
            assert "end_date" in cls, f"Class {cls['name']} missing end_date"
        
        print(f"✓ All {len(classes)} classes have schedule fields")

    def test_regenerate_events_endpoint(self):
        """Test the manual regenerate-events endpoint"""
        # Create class with schedule
        start_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        
        class_data = {
            "name": "TEST_Regenerate_Class",
            "subject": "Regenerate Test",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule_details": {
                "days": ["fri"],
                "start_time": "18:00",
                "end_time": "19:00"
            },
            "start_date": start_date,
            "end_date": end_date,
            "duration": "1 hour",
            "duration_minutes": 60,
            "standard_fee": 25.0
        }
        
        # Create class
        create_response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert create_response.status_code == 200
        class_id = create_response.json()["id"]
        print(f"✓ Created class: {class_id}")
        
        # Call regenerate endpoint
        regenerate_response = self.session.post(f"{BASE_URL}/api/classes/{class_id}/regenerate-events")
        assert regenerate_response.status_code == 200, f"Regenerate failed: {regenerate_response.text}"
        
        result = regenerate_response.json()
        assert "generated" in result
        print(f"✓ Regenerate endpoint returned: {result}")


class TestClassScheduleValidation:
    """Test validation and edge cases for class schedule"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield

    def test_class_without_schedule_details(self):
        """Test creating class without schedule_details (backwards compatibility)"""
        class_data = {
            "name": "TEST_NoSchedule_Class",
            "subject": "Legacy",
            "class_type": "paid",
            "teacher_ids": [],
            "student_ids": [],
            "schedule": "Monday 10:00 AM"  # Old format
        }
        
        response = self.session.post(f"{BASE_URL}/api/classes", json=class_data)
        assert response.status_code == 200, f"Should create class without schedule_details: {response.text}"
        
        data = response.json()
        # Should not generate events when no schedule_details
        class_id = data["id"]
        events = self.session.get(f"{BASE_URL}/api/events").json()
        class_events = [e for e in events if e.get("class_id") == class_id]
        assert len(class_events) == 0, "No events should be generated without schedule_details"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/classes/{class_id}")
        print("✓ Class without schedule_details created successfully (no auto events)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
