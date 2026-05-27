"""
Test calendar event endpoints for CalendarPage features:
1. POST /api/events - Create event
2. PUT /api/events/{event_id} - Update event  
3. DELETE /api/events/{event_id} - Delete event
4. GET /api/events - Get events
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCalendarEvents:
    """Calendar Event CRUD tests for the 3 new calendar features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_event_ids = []
        yield
        # Cleanup: Delete test events
        for event_id in self.test_event_ids:
            try:
                requests.delete(f"{BASE_URL}/api/events/{event_id}")
            except:
                pass
    
    def test_get_events(self):
        """Test GET /api/events returns list of events"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/events - returned {len(data)} events")
    
    def test_create_event_basic(self):
        """Test POST /api/events - Create event (used by Add Event dialog)"""
        start_date = datetime.now() + timedelta(days=1)
        end_date = start_date + timedelta(hours=1)
        
        event_data = {
            "title": "TEST_Calendar_Event_Basic",
            "description": "Test event description",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "event_type": "class",
            "class_id": "",
            "participants": []
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST_Calendar_Event_Basic"
        assert data["description"] == "Test event description"
        assert "id" in data
        
        self.test_event_ids.append(data["id"])
        print(f"SUCCESS: POST /api/events - Created event with id={data['id']}")
    
    def test_create_event_with_class_id(self):
        """Test creating event with class_id (testing class prefill feature)"""
        start_date = datetime.now() + timedelta(days=2)
        end_date = start_date + timedelta(hours=1)
        
        # First get a class if one exists
        classes_response = requests.get(f"{BASE_URL}/api/classes")
        classes = classes_response.json() if classes_response.status_code == 200 else []
        
        class_id = classes[0]["id"] if classes else ""
        class_name = classes[0]["name"] if classes else "Manual Event"
        
        event_data = {
            "title": f"TEST_{class_name} - Scheduled Class",
            "description": "Event created with class reference",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "event_type": "class",
            "class_id": class_id,
            "participants": []
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["class_id"] == class_id
        self.test_event_ids.append(data["id"])
        print(f"SUCCESS: POST /api/events with class_id - Event created with class_id={class_id}")
    
    def test_update_event(self):
        """Test PUT /api/events/{event_id} - Edit event (testing Edit Event feature)"""
        # First create an event
        start_date = datetime.now() + timedelta(days=3)
        end_date = start_date + timedelta(hours=1)
        
        create_data = {
            "title": "TEST_Original_Event_Title",
            "description": "Original description",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "event_type": "meeting",
            "class_id": "",
            "participants": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/events", json=create_data)
        assert create_response.status_code == 200
        
        event_id = create_response.json()["id"]
        self.test_event_ids.append(event_id)
        
        # Now update the event
        new_start_date = datetime.now() + timedelta(days=4)
        new_end_date = new_start_date + timedelta(hours=2)
        
        update_data = {
            "title": "TEST_Updated_Event_Title",
            "description": "Updated description with more details",
            "start_date": new_start_date.isoformat(),
            "end_date": new_end_date.isoformat(),
            "event_type": "exam",
            "class_id": "",
            "participants": []
        }
        
        update_response = requests.put(f"{BASE_URL}/api/events/{event_id}", json=update_data)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_data = update_response.json()
        assert updated_data["title"] == "TEST_Updated_Event_Title"
        assert updated_data["description"] == "Updated description with more details"
        assert updated_data["event_type"] == "exam"
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["title"] == "TEST_Updated_Event_Title"
        
        print(f"SUCCESS: PUT /api/events/{event_id} - Event updated and verified via GET")
    
    def test_delete_event(self):
        """Test DELETE /api/events/{event_id} - Delete event feature"""
        # First create an event
        start_date = datetime.now() + timedelta(days=5)
        end_date = start_date + timedelta(hours=1)
        
        create_data = {
            "title": "TEST_Event_To_Delete",
            "description": "This event will be deleted",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "event_type": "other",
            "class_id": "",
            "participants": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/events", json=create_data)
        assert create_response.status_code == 200
        
        event_id = create_response.json()["id"]
        
        # Delete the event
        delete_response = requests.delete(f"{BASE_URL}/api/events/{event_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 404, f"Expected 404 after delete, got {get_response.status_code}"
        
        print(f"SUCCESS: DELETE /api/events/{event_id} - Event deleted and verified")
    
    def test_get_single_event(self):
        """Test GET /api/events/{event_id}"""
        # First create an event
        start_date = datetime.now() + timedelta(days=6)
        end_date = start_date + timedelta(hours=1)
        
        create_data = {
            "title": "TEST_Single_Event_Get",
            "description": "Get single event test",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "event_type": "class",
            "class_id": "",
            "participants": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/events", json=create_data)
        assert create_response.status_code == 200
        
        event_id = create_response.json()["id"]
        self.test_event_ids.append(event_id)
        
        # Get single event
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["id"] == event_id
        assert data["title"] == "TEST_Single_Event_Get"
        
        print(f"SUCCESS: GET /api/events/{event_id} - Single event retrieved")


class TestCalendarGetClasses:
    """Test GET /api/classes for class name prefill feature"""
    
    def test_get_classes_for_prefill(self):
        """Test that classes can be retrieved for prefilling event title"""
        response = requests.get(f"{BASE_URL}/api/classes")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Check class has name and subject for prefill
            cls = data[0]
            assert "name" in cls
            assert "subject" in cls
            assert "id" in cls
            print(f"SUCCESS: GET /api/classes - {len(data)} classes available for prefill")
        else:
            print("INFO: No classes exist for prefill test - this is OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
