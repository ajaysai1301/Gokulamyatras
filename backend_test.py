#!/usr/bin/env python3
"""
Backend API Tests for GokulamYatras Milestone 2
Comprehensive testing of auth, booking, payment, check-in, and admin endpoints.
"""
import requests
import json
import random
from typing import Dict, List, Any, Optional

# Base URL from environment
BASE_URL = "https://temple-journey-v1.preview.emergentagent.com/api"

# Global state for test data
test_state = {
    "admin_token": None,
    "coordinator_token": None,
    "booking_references": [],
    "ticket_tokens": [],
    "yatra_ids": {},
}

def print_test_header(test_name: str):
    """Print a formatted test header."""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(passed: bool, message: str):
    """Print test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")

def check_no_mongo_id(data: Any, path: str = "root") -> bool:
    """Recursively check that no MongoDB _id field exists in response."""
    if isinstance(data, dict):
        if "_id" in data:
            print_result(False, f"MongoDB _id found at {path}")
            return False
        for key, value in data.items():
            if not check_no_mongo_id(value, f"{path}.{key}"):
                return False
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if not check_no_mongo_id(item, f"{path}[{i}]"):
                return False
    return True

def generate_mobile() -> str:
    """Generate a random Indian mobile number."""
    return f"9{random.randint(100000000, 999999999)}"

def generate_email() -> str:
    """Generate a random email."""
    return f"test{random.randint(1000, 9999)}@example.com"

# ============================================================================
# AUTH TESTS
# ============================================================================

def test_auth_admin_login():
    """Test 1: POST /api/auth/login with admin credentials."""
    print_test_header("Auth - Admin Login")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@gokulamyatras.in", "password": "admin123"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Status code is 200")
        data = response.json()
        
        # Check for token
        if "token" not in data:
            print_result(False, "Response missing 'token' field")
            return False
        
        print_result(True, "Token present in response")
        test_state["admin_token"] = data["token"]
        
        # Check for role
        if data.get("role") == "ADMIN":
            print_result(True, "Role is ADMIN")
        else:
            print_result(False, f"Expected role ADMIN, got {data.get('role')}")
            return False
        
        # Check no MongoDB _id
        if check_no_mongo_id(data):
            print_result(True, "No MongoDB _id in response")
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_auth_coordinator_login():
    """Test 2: POST /api/auth/login with coordinator credentials."""
    print_test_header("Auth - Coordinator Login")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "coordinator@gokulamyatras.in", "password": "coord123"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Status code is 200")
        data = response.json()
        
        # Check for token
        if "token" not in data:
            print_result(False, "Response missing 'token' field")
            return False
        
        print_result(True, "Token present in response")
        test_state["coordinator_token"] = data["token"]
        
        # Check for role
        if data.get("role") == "COORDINATOR":
            print_result(True, "Role is COORDINATOR")
        else:
            print_result(False, f"Expected role COORDINATOR, got {data.get('role')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_auth_wrong_password():
    """Test 3: POST /api/auth/login with wrong password."""
    print_test_header("Auth - Wrong Password")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@gokulamyatras.in", "password": "wrongpassword"},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print_result(True, "Status code is 401 (Unauthorized)")
            return True
        else:
            print_result(False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# BOOKING TESTS
# ============================================================================

def test_booking_create_success():
    """Test 4: POST /api/bookings with valid data and acceptedTerms=true."""
    print_test_header("Booking - Create with Valid Data")
    
    try:
        mobile = generate_mobile()
        email = generate_email()
        
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "tirupati-yatra",
                "primaryCustomer": {
                    "fullName": "Rajesh Kumar",
                    "mobile": mobile,
                    "email": email
                },
                "travellers": [
                    {"fullName": "Rajesh Kumar", "age": 35, "gender": "MALE"},
                    {"fullName": "Priya Kumar", "age": 32, "gender": "FEMALE"}
                ],
                "acceptedTerms": True
            },
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 201:
            print_result(False, f"Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Status code is 201")
        data = response.json()
        
        if "booking" not in data:
            print_result(False, "Response missing 'booking' field")
            return False
        
        booking = data["booking"]
        
        # Check booking reference format
        import re
        if re.match(r"GMY-\d{4}-\d{5}", booking.get("reference", "")):
            print_result(True, f"Booking reference matches format: {booking['reference']}")
            test_state["booking_references"].append({
                "reference": booking["reference"],
                "mobile": mobile,
                "yatraSlug": "tirupati-yatra"
            })
        else:
            print_result(False, f"Booking reference format invalid: {booking.get('reference')}")
            return False
        
        # Check status
        if booking.get("status") == "PAYMENT_PENDING":
            print_result(True, "Booking status is PAYMENT_PENDING")
        else:
            print_result(False, f"Expected status PAYMENT_PENDING, got {booking.get('status')}")
            return False
        
        # Check payment status
        if booking.get("paymentStatus") == "PENDING":
            print_result(True, "Payment status is PENDING")
        else:
            print_result(False, f"Expected paymentStatus PENDING, got {booking.get('paymentStatus')}")
            return False
        
        # Check traveller count
        if booking.get("travellerCount") == 2:
            print_result(True, "Traveller count is 2")
        else:
            print_result(False, f"Expected travellerCount 2, got {booking.get('travellerCount')}")
            return False
        
        # Check total amount (price * 2)
        # Tirupati yatra price should be in the response or we can verify it's calculated
        if "totalAmount" in booking and booking["totalAmount"] > 0:
            print_result(True, f"Total amount calculated: {booking['totalAmount']}")
        else:
            print_result(False, "Total amount not calculated correctly")
            return False
        
        # Check no MongoDB _id
        if check_no_mongo_id(data):
            print_result(True, "No MongoDB _id in response")
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_booking_without_terms():
    """Test 5: POST /api/bookings with acceptedTerms=false."""
    print_test_header("Booking - Without Accepted Terms")
    
    try:
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "tirupati-yatra",
                "primaryCustomer": {
                    "fullName": "Test User",
                    "mobile": generate_mobile(),
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Test User", "age": 30, "gender": "MALE"}
                ],
                "acceptedTerms": False
            },
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            print_result(True, "Status code is 400 (Bad Request)")
            return True
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_booking_capacity_exceeded():
    """Test 6: POST /api/bookings with travellers exceeding capacity."""
    print_test_header("Booking - Capacity Exceeded")
    
    try:
        # Use rameshwaram-madurai-yatra with capacity 40
        # Try to book 100 travellers
        travellers = [{"fullName": f"Traveller {i}", "age": 30, "gender": "MALE"} for i in range(100)]
        
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "rameshwaram-madurai-yatra",
                "primaryCustomer": {
                    "fullName": "Test User",
                    "mobile": generate_mobile(),
                    "email": generate_email()
                },
                "travellers": travellers,
                "acceptedTerms": True
            },
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 409:
            print_result(True, "Status code is 409 (Conflict)")
            data = response.json()
            if data.get("code") == "CAPACITY_EXCEEDED":
                print_result(True, "Error code is CAPACITY_EXCEEDED")
                return True
            else:
                print_result(False, f"Expected code CAPACITY_EXCEEDED, got {data.get('code')}")
                return False
        else:
            print_result(False, f"Expected 409, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_booking_normal_after_capacity_check():
    """Test 7: POST /api/bookings with normal count after capacity check."""
    print_test_header("Booking - Normal Booking After Capacity Check")
    
    try:
        mobile = generate_mobile()
        
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "rameshwaram-madurai-yatra",
                "primaryCustomer": {
                    "fullName": "Suresh Reddy",
                    "mobile": mobile,
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Suresh Reddy", "age": 40, "gender": "MALE"},
                    {"fullName": "Lakshmi Reddy", "age": 38, "gender": "FEMALE"}
                ],
                "acceptedTerms": True
            },
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print_result(True, "Normal booking succeeded after capacity check")
            data = response.json()
            if "booking" in data:
                test_state["booking_references"].append({
                    "reference": data["booking"]["reference"],
                    "mobile": mobile,
                    "yatraSlug": "rameshwaram-madurai-yatra"
                })
            return True
        else:
            print_result(False, f"Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# PAYMENT TESTS
# ============================================================================

def test_payment_success_flow():
    """Test 8: Payment success flow - order -> verify(success) -> CONFIRMED + ticket."""
    print_test_header("Payment - Success Flow")
    
    try:
        # Create a new booking first
        mobile = generate_mobile()
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "shirdi-sai-darshan",
                "primaryCustomer": {
                    "fullName": "Amit Sharma",
                    "mobile": mobile,
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Amit Sharma", "age": 28, "gender": "MALE"}
                ],
                "acceptedTerms": True
            },
            timeout=10
        )
        
        if response.status_code != 201:
            print_result(False, f"Failed to create booking: {response.status_code}")
            return False
        
        booking_ref = response.json()["booking"]["reference"]
        print(f"Created booking: {booking_ref}")
        
        # Create payment order
        order_response = requests.post(
            f"{BASE_URL}/payments/order",
            json={"bookingReference": booking_ref},
            timeout=10
        )
        
        if order_response.status_code != 200:
            print_result(False, f"Failed to create order: {order_response.status_code}")
            print(f"Response: {order_response.text}")
            return False
        
        print_result(True, "Payment order created")
        order_data = order_response.json()
        
        if order_data.get("order", {}).get("isMock") != True:
            print_result(False, "Order isMock is not True")
            return False
        
        print_result(True, "Order isMock is True")
        order_id = order_data["order"]["orderId"]
        
        # Verify payment with success
        verify_response = requests.post(
            f"{BASE_URL}/payments/verify",
            json={
                "bookingReference": booking_ref,
                "orderId": order_id,
                "simulate": "success"
            },
            timeout=10
        )
        
        if verify_response.status_code != 200:
            print_result(False, f"Failed to verify payment: {verify_response.status_code}")
            print(f"Response: {verify_response.text}")
            return False
        
        print_result(True, "Payment verified")
        verify_data = verify_response.json()
        
        if verify_data.get("result", {}).get("status") == "PAID":
            print_result(True, "Payment status is PAID")
        else:
            print_result(False, f"Expected status PAID, got {verify_data.get('result', {}).get('status')}")
            return False
        
        if verify_data.get("result", {}).get("booking", {}).get("status") == "CONFIRMED":
            print_result(True, "Booking status is CONFIRMED")
        else:
            print_result(False, f"Expected booking status CONFIRMED, got {verify_data.get('result', {}).get('booking', {}).get('status')}")
            return False
        
        # Store for lookup test
        test_state["booking_references"].append({
            "reference": booking_ref,
            "mobile": mobile,
            "yatraSlug": "shirdi-sai-darshan",
            "confirmed": True
        })
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_payment_failed_flow():
    """Test 9: Payment failed flow - order -> verify(failed) -> CANCELLED."""
    print_test_header("Payment - Failed Flow")
    
    try:
        # Create a new booking
        mobile = generate_mobile()
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "tirupati-yatra",
                "primaryCustomer": {
                    "fullName": "Vijay Patel",
                    "mobile": mobile,
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Vijay Patel", "age": 45, "gender": "MALE"}
                ],
                "acceptedTerms": True
            },
            timeout=10
        )
        
        if response.status_code != 201:
            print_result(False, f"Failed to create booking: {response.status_code}")
            return False
        
        booking_ref = response.json()["booking"]["reference"]
        print(f"Created booking: {booking_ref}")
        
        # Create payment order
        order_response = requests.post(
            f"{BASE_URL}/payments/order",
            json={"bookingReference": booking_ref},
            timeout=10
        )
        
        if order_response.status_code != 200:
            print_result(False, f"Failed to create order: {order_response.status_code}")
            return False
        
        order_id = order_response.json()["order"]["orderId"]
        
        # Verify payment with failed
        verify_response = requests.post(
            f"{BASE_URL}/payments/verify",
            json={
                "bookingReference": booking_ref,
                "orderId": order_id,
                "simulate": "failed"
            },
            timeout=10
        )
        
        if verify_response.status_code != 200:
            print_result(False, f"Failed to verify payment: {verify_response.status_code}")
            return False
        
        verify_data = verify_response.json()
        
        if verify_data.get("result", {}).get("status") == "FAILED":
            print_result(True, "Payment status is FAILED")
        else:
            print_result(False, f"Expected status FAILED, got {verify_data.get('result', {}).get('status')}")
            return False
        
        if verify_data.get("result", {}).get("booking", {}).get("status") == "CANCELLED":
            print_result(True, "Booking status is CANCELLED (seats released)")
        else:
            print_result(False, f"Expected booking status CANCELLED, got {verify_data.get('result', {}).get('booking', {}).get('status')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_payment_pending_flow():
    """Test 10: Payment pending flow - order -> verify(pending) -> stays PAYMENT_PENDING."""
    print_test_header("Payment - Pending Flow")
    
    try:
        # Create a new booking
        mobile = generate_mobile()
        response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "tirupati-yatra",
                "primaryCustomer": {
                    "fullName": "Deepak Singh",
                    "mobile": mobile,
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Deepak Singh", "age": 33, "gender": "MALE"}
                ],
                "acceptedTerms": True
            },
            timeout=10
        )
        
        if response.status_code != 201:
            print_result(False, f"Failed to create booking: {response.status_code}")
            return False
        
        booking_ref = response.json()["booking"]["reference"]
        print(f"Created booking: {booking_ref}")
        
        # Create payment order
        order_response = requests.post(
            f"{BASE_URL}/payments/order",
            json={"bookingReference": booking_ref},
            timeout=10
        )
        
        if order_response.status_code != 200:
            print_result(False, f"Failed to create order: {order_response.status_code}")
            return False
        
        order_id = order_response.json()["order"]["orderId"]
        
        # Verify payment with pending
        verify_response = requests.post(
            f"{BASE_URL}/payments/verify",
            json={
                "bookingReference": booking_ref,
                "orderId": order_id,
                "simulate": "pending"
            },
            timeout=10
        )
        
        if verify_response.status_code != 200:
            print_result(False, f"Failed to verify payment: {verify_response.status_code}")
            return False
        
        verify_data = verify_response.json()
        
        if verify_data.get("result", {}).get("status") == "PENDING":
            print_result(True, "Payment status is PENDING")
        else:
            print_result(False, f"Expected status PENDING, got {verify_data.get('result', {}).get('status')}")
            return False
        
        if verify_data.get("result", {}).get("booking", {}).get("status") == "PAYMENT_PENDING":
            print_result(True, "Booking status stays PAYMENT_PENDING")
        else:
            print_result(False, f"Expected booking status PAYMENT_PENDING, got {verify_data.get('result', {}).get('booking', {}).get('status')}")
            return False
        
        # Check no ticket issued
        if verify_data.get("result", {}).get("booking", {}).get("ticket") is None:
            print_result(True, "No ticket issued for pending payment")
        else:
            print_result(False, "Ticket should not be issued for pending payment")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# BOOKING LOOKUP TESTS
# ============================================================================

def test_booking_lookup_success():
    """Test 11: POST /api/bookings/lookup with correct reference and mobile."""
    print_test_header("Booking Lookup - Success with Ticket")
    
    try:
        # Find a confirmed booking from previous tests
        confirmed_booking = None
        for booking in test_state["booking_references"]:
            if booking.get("confirmed"):
                confirmed_booking = booking
                break
        
        if not confirmed_booking:
            print_result(False, "No confirmed booking available for lookup test")
            return False
        
        response = requests.post(
            f"{BASE_URL}/bookings/lookup",
            json={
                "reference": confirmed_booking["reference"],
                "mobile": confirmed_booking["mobile"]
            },
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Lookup successful")
        data = response.json()
        
        if "booking" not in data:
            print_result(False, "Response missing 'booking' field")
            return False
        
        booking = data["booking"]
        
        # Check ticket token
        if booking.get("ticket") and booking["ticket"].get("token"):
            print_result(True, f"Ticket token present: {booking['ticket']['token']}")
            test_state["ticket_tokens"].append({
                "token": booking["ticket"]["token"],
                "yatraSlug": confirmed_booking["yatraSlug"]
            })
        else:
            print_result(False, "Ticket token not present in confirmed booking")
            return False
        
        # Check no MongoDB _id
        if check_no_mongo_id(data):
            print_result(True, "No MongoDB _id in response")
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_booking_lookup_wrong_mobile():
    """Test 12: POST /api/bookings/lookup with correct reference but wrong mobile."""
    print_test_header("Booking Lookup - Wrong Mobile")
    
    try:
        if not test_state["booking_references"]:
            print_result(False, "No bookings available for lookup test")
            return False
        
        booking = test_state["booking_references"][0]
        
        response = requests.post(
            f"{BASE_URL}/bookings/lookup",
            json={
                "reference": booking["reference"],
                "mobile": "9999999999"  # Wrong mobile
            },
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 404:
            print_result(True, "Status code is 404 (Not Found) for wrong mobile")
            return True
        else:
            print_result(False, f"Expected 404, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# COORDINATOR CHECK-IN TESTS
# ============================================================================

def test_checkin_validate_valid_token():
    """Test 13: POST /api/checkin/validate with valid token."""
    print_test_header("Check-in - Validate Valid Token")
    
    try:
        if not test_state["coordinator_token"]:
            print_result(False, "Coordinator token not available")
            return False
        
        if not test_state["ticket_tokens"]:
            print_result(False, "No ticket tokens available for validation")
            return False
        
        token = test_state["ticket_tokens"][0]["token"]
        
        response = requests.post(
            f"{BASE_URL}/checkin/validate",
            json={"token": token},
            headers={"Authorization": f"Bearer {test_state['coordinator_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Token validation successful")
        data = response.json()
        
        if data.get("valid") == True:
            print_result(True, "Token is valid")
        else:
            print_result(False, f"Expected valid=true, got {data.get('valid')}")
            return False
        
        if "booking" in data:
            print_result(True, "Booking details present in validation response")
        else:
            print_result(False, "Booking details missing in validation response")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_checkin_first_time():
    """Test 14: POST /api/checkin with valid token (first time)."""
    print_test_header("Check-in - First Time Check-in")
    
    try:
        if not test_state["coordinator_token"]:
            print_result(False, "Coordinator token not available")
            return False
        
        if not test_state["ticket_tokens"]:
            print_result(False, "No ticket tokens available for check-in")
            return False
        
        token = test_state["ticket_tokens"][0]["token"]
        
        response = requests.post(
            f"{BASE_URL}/checkin",
            json={"token": token},
            headers={"Authorization": f"Bearer {test_state['coordinator_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Check-in successful")
        data = response.json()
        
        if data.get("ok") == True:
            print_result(True, "Check-in ok=true")
        else:
            print_result(False, f"Expected ok=true, got {data.get('ok')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_checkin_duplicate():
    """Test 15: POST /api/checkin with same token (duplicate check-in)."""
    print_test_header("Check-in - Duplicate Check-in Prevention")
    
    try:
        if not test_state["coordinator_token"]:
            print_result(False, "Coordinator token not available")
            return False
        
        if not test_state["ticket_tokens"]:
            print_result(False, "No ticket tokens available for check-in")
            return False
        
        token = test_state["ticket_tokens"][0]["token"]
        
        response = requests.post(
            f"{BASE_URL}/checkin",
            json={"token": token},
            headers={"Authorization": f"Bearer {test_state['coordinator_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 409:
            print_result(True, "Status code is 409 (Conflict)")
            data = response.json()
            if data.get("reason") == "ALREADY_CHECKED_IN":
                print_result(True, "Reason is ALREADY_CHECKED_IN")
                return True
            else:
                print_result(False, f"Expected reason ALREADY_CHECKED_IN, got {data.get('reason')}")
                return False
        else:
            print_result(False, f"Expected 409, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_checkin_validate_invalid_token():
    """Test 16: POST /api/checkin/validate with invalid token."""
    print_test_header("Check-in - Validate Invalid Token")
    
    try:
        if not test_state["coordinator_token"]:
            print_result(False, "Coordinator token not available")
            return False
        
        response = requests.post(
            f"{BASE_URL}/checkin/validate",
            json={"token": "GMY-TKT-bogus"},
            headers={"Authorization": f"Bearer {test_state['coordinator_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get("valid") == False:
            print_result(True, "Token is invalid (valid=false)")
        else:
            print_result(False, f"Expected valid=false, got {data.get('valid')}")
            return False
        
        if data.get("reason") == "INVALID":
            print_result(True, "Reason is INVALID")
        else:
            print_result(False, f"Expected reason INVALID, got {data.get('reason')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_checkin_summary():
    """Test 17: GET /api/checkin/summary?yatraId=<id>."""
    print_test_header("Check-in - Summary")
    
    try:
        if not test_state["coordinator_token"]:
            print_result(False, "Coordinator token not available")
            return False
        
        # Get a yatra ID first
        yatra_response = requests.get(f"{BASE_URL}/yatras/tirupati-yatra", timeout=10)
        if yatra_response.status_code != 200:
            print_result(False, "Failed to get yatra details")
            return False
        
        yatra_id = yatra_response.json()["yatra"]["id"]
        
        response = requests.get(
            f"{BASE_URL}/checkin/summary?yatraId={yatra_id}",
            headers={"Authorization": f"Bearer {test_state['coordinator_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Summary retrieved successfully")
        data = response.json()
        
        # Check for numeric fields
        required_fields = ["bookedTravellers", "checkedInTravellers", "remaining"]
        for field in required_fields:
            if field in data and isinstance(data[field], (int, float)):
                print_result(True, f"{field} present: {data[field]}")
            else:
                print_result(False, f"Missing or invalid {field}")
                return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_checkin_no_auth():
    """Test 18: POST /api/checkin/validate without Authorization header."""
    print_test_header("Check-in - No Authorization")
    
    try:
        response = requests.post(
            f"{BASE_URL}/checkin/validate",
            json={"token": "GMY-TKT-test"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print_result(True, "Status code is 401 (Unauthorized)")
            return True
        else:
            print_result(False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# ADMIN TESTS
# ============================================================================

def test_admin_dashboard():
    """Test 19: GET /api/admin/dashboard."""
    print_test_header("Admin - Dashboard Metrics")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        response = requests.get(
            f"{BASE_URL}/admin/dashboard",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Dashboard retrieved successfully")
        data = response.json()
        
        # Check for required numeric fields
        required_fields = [
            "upcomingYatras", "totalBookings", "confirmedBookings", 
            "pendingPayments", "totalTravellers", "revenue", "todayCheckins"
        ]
        
        for field in required_fields:
            if field in data and isinstance(data[field], (int, float)):
                print_result(True, f"{field} present: {data[field]}")
            else:
                print_result(False, f"Missing or invalid {field}")
                return False
        
        # Check capacity array
        if "capacity" in data and isinstance(data["capacity"], list):
            print_result(True, f"Capacity array present with {len(data['capacity'])} items")
        else:
            print_result(False, "Missing or invalid capacity array")
            return False
        
        # Check no MongoDB _id
        if check_no_mongo_id(data):
            print_result(True, "No MongoDB _id in response")
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_yatras_list():
    """Test 20: GET /api/admin/yatras (includes DRAFT + PUBLISHED)."""
    print_test_header("Admin - List All Yatras")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        response = requests.get(
            f"{BASE_URL}/admin/yatras",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Yatras list retrieved successfully")
        data = response.json()
        
        if "yatras" in data and isinstance(data["yatras"], list):
            print_result(True, f"Yatras array present with {len(data['yatras'])} items")
        else:
            print_result(False, "Missing or invalid yatras array")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_yatra_create():
    """Test 21: POST /api/admin/yatras (create new yatra)."""
    print_test_header("Admin - Create New Yatra")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        response = requests.post(
            f"{BASE_URL}/admin/yatras",
            json={
                "name": "Test Yatra",
                "price": 1000,
                "capacity": 10,
                "startDate": "2026-12-25",
                "status": "DRAFT"
            },
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 201:
            print_result(False, f"Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Yatra created successfully")
        data = response.json()
        
        if "yatra" in data and "slug" in data["yatra"]:
            print_result(True, f"Yatra has slug: {data['yatra']['slug']}")
            test_state["yatra_ids"]["test_yatra"] = data["yatra"]["id"]
        else:
            print_result(False, "Missing yatra or slug in response")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_yatra_update():
    """Test 22: PUT /api/admin/yatras/:id (update yatra)."""
    print_test_header("Admin - Update Yatra")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        if "test_yatra" not in test_state["yatra_ids"]:
            print_result(False, "Test yatra ID not available")
            return False
        
        yatra_id = test_state["yatra_ids"]["test_yatra"]
        
        response = requests.put(
            f"{BASE_URL}/admin/yatras/{yatra_id}",
            json={"price": 1500},
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Yatra updated successfully")
        data = response.json()
        
        if data.get("yatra", {}).get("price") == 1500:
            print_result(True, "Price updated to 1500")
        else:
            print_result(False, f"Expected price 1500, got {data.get('yatra', {}).get('price')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_yatra_publish():
    """Test 23: POST /api/admin/yatras/:id/publish."""
    print_test_header("Admin - Publish Yatra")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        if "test_yatra" not in test_state["yatra_ids"]:
            print_result(False, "Test yatra ID not available")
            return False
        
        yatra_id = test_state["yatra_ids"]["test_yatra"]
        
        response = requests.post(
            f"{BASE_URL}/admin/yatras/{yatra_id}/publish",
            json={"published": True},
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Yatra published successfully")
        data = response.json()
        
        if data.get("yatra", {}).get("status") == "PUBLISHED":
            print_result(True, "Status is PUBLISHED")
        else:
            print_result(False, f"Expected status PUBLISHED, got {data.get('yatra', {}).get('status')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_bookings_list():
    """Test 24: GET /api/admin/bookings with filters."""
    print_test_header("Admin - List Bookings with Filters")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        # Test without filters
        response = requests.get(
            f"{BASE_URL}/admin/bookings",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
        
        print_result(True, "Bookings list retrieved")
        data = response.json()
        
        if "bookings" in data and isinstance(data["bookings"], list):
            print_result(True, f"Bookings array present with {len(data['bookings'])} items")
        else:
            print_result(False, "Missing or invalid bookings array")
            return False
        
        # Test with status filter
        response2 = requests.get(
            f"{BASE_URL}/admin/bookings?status=CONFIRMED",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        if response2.status_code == 200:
            print_result(True, "Status filter works")
        else:
            print_result(False, f"Status filter failed: {response2.status_code}")
            return False
        
        # Test with paymentStatus filter
        response3 = requests.get(
            f"{BASE_URL}/admin/bookings?paymentStatus=PAID",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        if response3.status_code == 200:
            print_result(True, "PaymentStatus filter works")
        else:
            print_result(False, f"PaymentStatus filter failed: {response3.status_code}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_booking_detail():
    """Test 25: GET /api/admin/bookings/:reference."""
    print_test_header("Admin - Get Booking Detail")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        if not test_state["booking_references"]:
            print_result(False, "No booking references available")
            return False
        
        reference = test_state["booking_references"][0]["reference"]
        
        response = requests.get(
            f"{BASE_URL}/admin/bookings/{reference}",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Booking detail retrieved")
        data = response.json()
        
        if "booking" not in data:
            print_result(False, "Missing booking in response")
            return False
        
        booking = data["booking"]
        
        # Check for travellers
        if "travellers" in booking and isinstance(booking["travellers"], list):
            print_result(True, f"Travellers array present with {len(booking['travellers'])} items")
        else:
            print_result(False, "Missing or invalid travellers array")
            return False
        
        # Check for payments
        if "payments" in booking:
            print_result(True, "Payments field present")
        else:
            print_result(False, "Missing payments field")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_booking_cancel():
    """Test 26: POST /api/admin/bookings/:reference/cancel."""
    print_test_header("Admin - Cancel Booking")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        # Create a new booking to cancel
        mobile = generate_mobile()
        create_response = requests.post(
            f"{BASE_URL}/bookings",
            json={
                "yatraSlug": "tirupati-yatra",
                "primaryCustomer": {
                    "fullName": "Cancel Test",
                    "mobile": mobile,
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Cancel Test", "age": 30, "gender": "MALE"}
                ],
                "acceptedTerms": True
            },
            timeout=10
        )
        
        if create_response.status_code != 201:
            print_result(False, "Failed to create booking for cancellation test")
            return False
        
        reference = create_response.json()["booking"]["reference"]
        
        # Cancel the booking
        response = requests.post(
            f"{BASE_URL}/admin/bookings/{reference}/cancel",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Booking cancelled successfully")
        data = response.json()
        
        if data.get("booking", {}).get("status") == "CANCELLED":
            print_result(True, "Booking status is CANCELLED")
        else:
            print_result(False, f"Expected status CANCELLED, got {data.get('booking', {}).get('status')}")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_manual_booking():
    """Test 27: POST /api/admin/bookings (manual booking)."""
    print_test_header("Admin - Manual Booking")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        mobile = generate_mobile()
        
        response = requests.post(
            f"{BASE_URL}/admin/bookings",
            json={
                "yatraSlug": "shirdi-sai-darshan",
                "primaryCustomer": {
                    "fullName": "Manual Booking Test",
                    "mobile": mobile,
                    "email": generate_email()
                },
                "travellers": [
                    {"fullName": "Manual Test", "age": 30, "gender": "OTHER"}
                ],
                "paymentMethod": "CASH"
            },
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 201:
            print_result(False, f"Expected 201, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Manual booking created")
        data = response.json()
        
        if "booking" not in data:
            print_result(False, "Missing booking in response")
            return False
        
        booking = data["booking"]
        
        # Check status is CONFIRMED
        if booking.get("status") == "CONFIRMED":
            print_result(True, "Booking status is CONFIRMED")
        else:
            print_result(False, f"Expected status CONFIRMED, got {booking.get('status')}")
            return False
        
        # Check source is ADMIN
        if booking.get("source") == "ADMIN":
            print_result(True, "Booking source is ADMIN")
        else:
            print_result(False, f"Expected source ADMIN, got {booking.get('source')}")
            return False
        
        # Check ticket is present
        if booking.get("ticket"):
            print_result(True, "Ticket issued for manual booking")
        else:
            print_result(False, "Ticket not issued for manual booking")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_customers_list():
    """Test 28: GET /api/admin/customers?search=."""
    print_test_header("Admin - List Customers")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        response = requests.get(
            f"{BASE_URL}/admin/customers",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Customers list retrieved")
        data = response.json()
        
        if "customers" in data and isinstance(data["customers"], list):
            print_result(True, f"Customers array present with {len(data['customers'])} items")
            
            # Check if customers have totalBookings
            if len(data["customers"]) > 0:
                if "totalBookings" in data["customers"][0]:
                    print_result(True, "Customers have totalBookings field")
                else:
                    print_result(False, "Customers missing totalBookings field")
                    return False
        else:
            print_result(False, "Missing or invalid customers array")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_customer_detail():
    """Test 29: GET /api/admin/customers/:id."""
    print_test_header("Admin - Get Customer Detail")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        # Get customers list first
        list_response = requests.get(
            f"{BASE_URL}/admin/customers",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        if list_response.status_code != 200 or not list_response.json().get("customers"):
            print_result(False, "No customers available for detail test")
            return False
        
        customer_id = list_response.json()["customers"][0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/admin/customers/{customer_id}",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Customer detail retrieved")
        data = response.json()
        
        if "customer" in data and "bookings" in data:
            print_result(True, "Customer and bookings present in response")
        else:
            print_result(False, "Missing customer or bookings in response")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_admin_reports():
    """Test 30: GET /api/admin/reports."""
    print_test_header("Admin - Get Reports")
    
    try:
        if not test_state["admin_token"]:
            print_result(False, "Admin token not available")
            return False
        
        response = requests.get(
            f"{BASE_URL}/admin/reports",
            headers={"Authorization": f"Bearer {test_state['admin_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print_result(True, "Reports retrieved")
        data = response.json()
        
        if "reports" in data and isinstance(data["reports"], list):
            print_result(True, f"Reports array present with {len(data['reports'])} items")
            
            # Check report structure
            if len(data["reports"]) > 0:
                report = data["reports"][0]
                required_fields = ["capacity", "booked", "confirmed", "revenue"]
                for field in required_fields:
                    if field not in report:
                        print_result(False, f"Report missing {field} field")
                        return False
                print_result(True, "Reports have required fields (capacity, booked, confirmed, revenue)")
        else:
            print_result(False, "Missing or invalid reports array")
            return False
        
        return True
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# AUTHORIZATION TESTS
# ============================================================================

def test_coordinator_on_admin_route():
    """Test 31: Use coordinator token on admin route (should be 401)."""
    print_test_header("Authorization - Coordinator on Admin Route")
    
    try:
        if not test_state["coordinator_token"]:
            print_result(False, "Coordinator token not available")
            return False
        
        response = requests.get(
            f"{BASE_URL}/admin/dashboard",
            headers={"Authorization": f"Bearer {test_state['coordinator_token']}"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print_result(True, "Status code is 401 (Unauthorized)")
            return True
        else:
            print_result(False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

def test_no_token_on_admin_route():
    """Test 32: No token on admin route (should be 401)."""
    print_test_header("Authorization - No Token on Admin Route")
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/dashboard",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print_result(True, "Status code is 401 (Unauthorized)")
            return True
        else:
            print_result(False, f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Exception occurred: {str(e)}")
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    """Run all backend tests."""
    print("\n" + "="*80)
    print("GOKULAM YATRAS MILESTONE 2 - COMPREHENSIVE BACKEND API TEST SUITE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    tests = [
        # Auth
        ("Auth - Admin Login", test_auth_admin_login),
        ("Auth - Coordinator Login", test_auth_coordinator_login),
        ("Auth - Wrong Password", test_auth_wrong_password),
        
        # Booking
        ("Booking - Create Success", test_booking_create_success),
        ("Booking - Without Terms", test_booking_without_terms),
        ("Booking - Capacity Exceeded", test_booking_capacity_exceeded),
        ("Booking - Normal After Capacity", test_booking_normal_after_capacity_check),
        
        # Payment
        ("Payment - Success Flow", test_payment_success_flow),
        ("Payment - Failed Flow", test_payment_failed_flow),
        ("Payment - Pending Flow", test_payment_pending_flow),
        
        # Booking Lookup
        ("Booking Lookup - Success", test_booking_lookup_success),
        ("Booking Lookup - Wrong Mobile", test_booking_lookup_wrong_mobile),
        
        # Check-in
        ("Check-in - Validate Valid Token", test_checkin_validate_valid_token),
        ("Check-in - First Time", test_checkin_first_time),
        ("Check-in - Duplicate Prevention", test_checkin_duplicate),
        ("Check-in - Validate Invalid Token", test_checkin_validate_invalid_token),
        ("Check-in - Summary", test_checkin_summary),
        ("Check-in - No Authorization", test_checkin_no_auth),
        
        # Admin
        ("Admin - Dashboard", test_admin_dashboard),
        ("Admin - List Yatras", test_admin_yatras_list),
        ("Admin - Create Yatra", test_admin_yatra_create),
        ("Admin - Update Yatra", test_admin_yatra_update),
        ("Admin - Publish Yatra", test_admin_yatra_publish),
        ("Admin - List Bookings", test_admin_bookings_list),
        ("Admin - Booking Detail", test_admin_booking_detail),
        ("Admin - Cancel Booking", test_admin_booking_cancel),
        ("Admin - Manual Booking", test_admin_manual_booking),
        ("Admin - List Customers", test_admin_customers_list),
        ("Admin - Customer Detail", test_admin_customer_detail),
        ("Admin - Reports", test_admin_reports),
        
        # Authorization
        ("Authorization - Coordinator on Admin", test_coordinator_on_admin_route),
        ("Authorization - No Token on Admin", test_no_token_on_admin_route),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR in {test_name}: {str(e)}")
            results[test_name] = False
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
