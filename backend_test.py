#!/usr/bin/env python3
"""
RentEase Backend API Testing Script
Tests all authentication, listings, bookings, and messaging endpoints
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get base URL from environment
BASE_URL = "https://renthub-design.preview.emergentagent.com/api"

class RentEaseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.host_token = None
        self.renter_token = None
        self.host_user = None
        self.renter_user = None
        self.created_listings = []
        self.created_bookings = []
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method.upper() == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    default_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=default_headers)
                else:
                    response = requests.post(url, json=data, headers=default_headers)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None
    
    def test_register_host(self):
        """Test host user registration"""
        data = {
            "name": "John Host",
            "email": "john.host@rentease.com",
            "password": "securepass123",
            "user_type": "host"
        }
        
        response = self.make_request('POST', 'auth/register', data)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'user' in result and 'token' in result:
                self.host_token = result['token']
                self.host_user = result['user']
                self.log_result("Host Registration", True, "Host user registered successfully", 
                              {'user_id': result['user']['id'], 'user_type': result['user']['user_type']})
                return True
            else:
                self.log_result("Host Registration", False, "Missing user or token in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Host Registration", False, f"Registration failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_register_renter(self):
        """Test renter user registration"""
        data = {
            "name": "Jane Renter",
            "email": "jane.renter@rentease.com", 
            "password": "securepass456",
            "user_type": "renter"
        }
        
        response = self.make_request('POST', 'auth/register', data)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'user' in result and 'token' in result:
                self.renter_token = result['token']
                self.renter_user = result['user']
                self.log_result("Renter Registration", True, "Renter user registered successfully",
                              {'user_id': result['user']['id'], 'user_type': result['user']['user_type']})
                return True
            else:
                self.log_result("Renter Registration", False, "Missing user or token in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Renter Registration", False, f"Registration failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_login_host(self):
        """Test host login"""
        data = {
            "email": "john.host@rentease.com",
            "password": "securepass123"
        }
        
        response = self.make_request('POST', 'auth/login', data)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'user' in result and 'token' in result:
                # Update token in case it's different
                self.host_token = result['token']
                self.log_result("Host Login", True, "Host login successful", 
                              {'user_id': result['user']['id']})
                return True
            else:
                self.log_result("Host Login", False, "Missing user or token in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Host Login", False, f"Login failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_login_renter(self):
        """Test renter login"""
        data = {
            "email": "jane.renter@rentease.com",
            "password": "securepass456"
        }
        
        response = self.make_request('POST', 'auth/login', data)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'user' in result and 'token' in result:
                # Update token in case it's different
                self.renter_token = result['token']
                self.log_result("Renter Login", True, "Renter login successful",
                              {'user_id': result['user']['id']})
                return True
            else:
                self.log_result("Renter Login", False, "Missing user or token in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Renter Login", False, f"Login failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_auth_me_host(self):
        """Test getting current user info for host"""
        if not self.host_token:
            self.log_result("Host Auth Me", False, "No host token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.host_token}'}
        response = self.make_request('GET', 'auth/me', headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'user' in result and result['user']['user_type'] == 'host':
                self.log_result("Host Auth Me", True, "Host user info retrieved successfully",
                              {'user_id': result['user']['id'], 'name': result['user']['name']})
                return True
            else:
                self.log_result("Host Auth Me", False, "Invalid user data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Host Auth Me", False, f"Auth me failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_auth_me_renter(self):
        """Test getting current user info for renter"""
        if not self.renter_token:
            self.log_result("Renter Auth Me", False, "No renter token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.renter_token}'}
        response = self.make_request('GET', 'auth/me', headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'user' in result and result['user']['user_type'] == 'renter':
                self.log_result("Renter Auth Me", True, "Renter user info retrieved successfully",
                              {'user_id': result['user']['id'], 'name': result['user']['name']})
                return True
            else:
                self.log_result("Renter Auth Me", False, "Invalid user data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Renter Auth Me", False, f"Auth me failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_create_listings(self):
        """Test creating multiple listings as host"""
        if not self.host_token:
            self.log_result("Create Listings", False, "No host token available")
            return False
        
        listings_data = [
            {
                "title": "Luxury Downtown Apartment",
                "description": "Beautiful 2-bedroom apartment in the heart of downtown with city views",
                "category": "apartment",
                "price": 150.00,
                "location": "Downtown, New York",
                "amenities": ["WiFi", "Kitchen", "Parking", "Air Conditioning"]
            },
            {
                "title": "Tesla Model 3 for Rent",
                "description": "Clean, well-maintained Tesla Model 3 with autopilot features",
                "category": "car",
                "price": 80.00,
                "location": "Manhattan, New York",
                "amenities": ["GPS", "Bluetooth", "Autopilot", "Charging Cable"]
            },
            {
                "title": "Professional Camera Kit",
                "description": "Canon EOS R5 with multiple lenses and accessories for photography",
                "category": "gadget",
                "price": 45.00,
                "location": "Brooklyn, New York",
                "amenities": ["Multiple Lenses", "Tripod", "Memory Cards", "Carrying Case"]
            }
        ]
        
        headers = {'Authorization': f'Bearer {self.host_token}'}
        success_count = 0
        
        for i, listing_data in enumerate(listings_data):
            response = self.make_request('POST', 'listings', listing_data, headers)
            
            if response and response.status_code == 200:
                result = response.json()
                if 'listing' in result:
                    self.created_listings.append(result['listing'])
                    success_count += 1
                    self.log_result(f"Create Listing {i+1}", True, f"Listing '{listing_data['title']}' created successfully",
                                  {'listing_id': result['listing']['id'], 'category': result['listing']['category']})
                else:
                    self.log_result(f"Create Listing {i+1}", False, "Missing listing in response", result)
            else:
                error_msg = response.json() if response else "No response"
                self.log_result(f"Create Listing {i+1}", False, f"Listing creation failed: {response.status_code if response else 'No response'}", error_msg)
        
        return success_count == len(listings_data)
    
    def test_get_all_listings(self):
        """Test getting all listings (public endpoint)"""
        response = self.make_request('GET', 'listings')
        
        if response and response.status_code == 200:
            result = response.json()
            if 'listings' in result and isinstance(result['listings'], list):
                listings_count = len(result['listings'])
                self.log_result("Get All Listings", True, f"Retrieved {listings_count} listings successfully",
                              {'count': listings_count})
                return True
            else:
                self.log_result("Get All Listings", False, "Invalid listings data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Get All Listings", False, f"Get listings failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_get_single_listing(self):
        """Test getting single listing details"""
        if not self.created_listings:
            self.log_result("Get Single Listing", False, "No listings available to test")
            return False
        
        listing_id = self.created_listings[0]['id']
        response = self.make_request('GET', f'listings/{listing_id}')
        
        if response and response.status_code == 200:
            result = response.json()
            if 'listing' in result and 'host' in result['listing']:
                self.log_result("Get Single Listing", True, "Single listing retrieved with host info",
                              {'listing_id': result['listing']['id'], 'host_name': result['listing']['host']['name']})
                return True
            else:
                self.log_result("Get Single Listing", False, "Missing listing or host info in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Get Single Listing", False, f"Get single listing failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_create_booking(self):
        """Test creating a booking as renter"""
        if not self.renter_token:
            self.log_result("Create Booking", False, "No renter token available")
            return False
        
        if not self.created_listings:
            self.log_result("Create Booking", False, "No listings available to book")
            return False
        
        # Use the first listing for booking
        listing = self.created_listings[0]
        
        # Set dates for next week
        check_in = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        check_out = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        
        booking_data = {
            "listing_id": listing['id'],
            "check_in": check_in,
            "check_out": check_out,
            "total_price": listing['price'] * 3  # 3 days
        }
        
        headers = {'Authorization': f'Bearer {self.renter_token}'}
        response = self.make_request('POST', 'bookings', booking_data, headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'booking' in result:
                self.created_bookings.append(result['booking'])
                self.log_result("Create Booking", True, "Booking created successfully",
                              {'booking_id': result['booking']['id'], 'listing_title': listing['title']})
                return True
            else:
                self.log_result("Create Booking", False, "Missing booking in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Create Booking", False, f"Booking creation failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_get_renter_bookings(self):
        """Test getting renter's bookings"""
        if not self.renter_token:
            self.log_result("Get Renter Bookings", False, "No renter token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.renter_token}'}
        response = self.make_request('GET', 'bookings', headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'bookings' in result and isinstance(result['bookings'], list):
                bookings_count = len(result['bookings'])
                self.log_result("Get Renter Bookings", True, f"Retrieved {bookings_count} renter bookings",
                              {'count': bookings_count})
                return True
            else:
                self.log_result("Get Renter Bookings", False, "Invalid bookings data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Get Renter Bookings", False, f"Get renter bookings failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_get_host_bookings(self):
        """Test getting host's bookings"""
        if not self.host_token:
            self.log_result("Get Host Bookings", False, "No host token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.host_token}'}
        response = self.make_request('GET', 'bookings', headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'bookings' in result and isinstance(result['bookings'], list):
                bookings_count = len(result['bookings'])
                self.log_result("Get Host Bookings", True, f"Retrieved {bookings_count} host bookings",
                              {'count': bookings_count})
                return True
            else:
                self.log_result("Get Host Bookings", False, "Invalid bookings data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Get Host Bookings", False, f"Get host bookings failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_send_message(self):
        """Test sending a message from renter to host"""
        if not self.renter_token or not self.host_user:
            self.log_result("Send Message", False, "Missing renter token or host user info")
            return False
        
        message_data = {
            "receiver_id": self.host_user['id'],
            "message": "Hi! I'm interested in your downtown apartment listing. Is it available for the dates I requested?"
        }
        
        headers = {'Authorization': f'Bearer {self.renter_token}'}
        response = self.make_request('POST', 'messages', message_data, headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'message' in result:
                self.log_result("Send Message", True, "Message sent successfully",
                              {'message_id': result['message']['id'], 'receiver': self.host_user['name']})
                return True
            else:
                self.log_result("Send Message", False, "Missing message in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Send Message", False, f"Send message failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_get_renter_messages(self):
        """Test getting renter's messages"""
        if not self.renter_token:
            self.log_result("Get Renter Messages", False, "No renter token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.renter_token}'}
        response = self.make_request('GET', 'messages', headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'messages' in result and isinstance(result['messages'], list):
                messages_count = len(result['messages'])
                self.log_result("Get Renter Messages", True, f"Retrieved {messages_count} renter messages",
                              {'count': messages_count})
                return True
            else:
                self.log_result("Get Renter Messages", False, "Invalid messages data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Get Renter Messages", False, f"Get renter messages failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_get_host_messages(self):
        """Test getting host's messages"""
        if not self.host_token:
            self.log_result("Get Host Messages", False, "No host token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.host_token}'}
        response = self.make_request('GET', 'messages', headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            if 'messages' in result and isinstance(result['messages'], list):
                messages_count = len(result['messages'])
                self.log_result("Get Host Messages", True, f"Retrieved {messages_count} host messages",
                              {'count': messages_count})
                return True
            else:
                self.log_result("Get Host Messages", False, "Invalid messages data in response", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Get Host Messages", False, f"Get host messages failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def test_booking_conflict_detection(self):
        """Test booking conflict detection"""
        if not self.renter_token or not self.created_listings:
            self.log_result("Booking Conflict Detection", False, "Missing renter token or listings")
            return False
        
        # Try to book the same listing for overlapping dates
        listing = self.created_listings[0]
        
        # Use same dates as previous booking
        check_in = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        check_out = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        
        booking_data = {
            "listing_id": listing['id'],
            "check_in": check_in,
            "check_out": check_out,
            "total_price": listing['price'] * 3
        }
        
        headers = {'Authorization': f'Bearer {self.renter_token}'}
        response = self.make_request('POST', 'bookings', booking_data, headers)
        
        # Should fail with conflict error
        if response and response.status_code == 400:
            result = response.json()
            if 'error' in result and 'not available' in result['error'].lower():
                self.log_result("Booking Conflict Detection", True, "Booking conflict properly detected",
                              {'error_message': result['error']})
                return True
            else:
                self.log_result("Booking Conflict Detection", False, "Wrong error message for conflict", result)
        else:
            error_msg = response.json() if response else "No response"
            self.log_result("Booking Conflict Detection", False, f"Conflict detection failed: {response.status_code if response else 'No response'}", error_msg)
        
        return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting RentEase Backend API Tests...")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📝 Authentication Tests:")
        self.test_register_host()
        self.test_register_renter()
        self.test_login_host()
        self.test_login_renter()
        self.test_auth_me_host()
        self.test_auth_me_renter()
        
        # Listings Tests
        print("\n🏠 Listings Tests:")
        self.test_create_listings()
        self.test_get_all_listings()
        self.test_get_single_listing()
        
        # Bookings Tests
        print("\n📅 Bookings Tests:")
        self.test_create_booking()
        self.test_get_renter_bookings()
        self.test_get_host_bookings()
        self.test_booking_conflict_detection()
        
        # Messages Tests
        print("\n💬 Messages Tests:")
        self.test_send_message()
        self.test_get_renter_messages()
        self.test_get_host_messages()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY:")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

def main():
    """Main function to run tests"""
    tester = RentEaseAPITester()
    
    try:
        success = tester.run_all_tests()
        
        if success:
            print("\n🎉 All tests passed! RentEase backend is working correctly.")
            sys.exit(0)
        else:
            print("\n⚠️  Some tests failed. Check the details above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 Test execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()