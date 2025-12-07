#!/bin/bash
# Test script to demonstrate the page controller authorization
# 
# This script validates:
# 1. Unauthorized requests are properly rejected (HTTP 401)
# 2. Authentication works and returns valid JWT tokens
# 3. Authorized requests succeed with proper tokens
# 4. Public endpoints work without authentication
#
# Security improvements:
# - HTTP status codes validated for all requests
# - Token validation ensures non-empty, non-null values
# - Curl failures handled separately from HTTP errors
# - Clear error messages for debugging
# - Security-conscious token display (truncated)

API_BASE="http://localhost:3001/api"

echo "=== Testing Page Controller Authorization ==="
echo

# Test 1: Try to create a page without authentication (should fail with 401)
echo "1. Testing createPage without authentication (should return 401):"
TEST1_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "default-shop-id",
    "slug": "test-page",
    "title": "Test Page",
    "html": "<h1>Test</h1>",
    "isHome": false
  }')

# Check if request succeeded but returned 401 as expected
TEST1_STATUS=$(echo "$TEST1_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
if [[ "$TEST1_STATUS" == "401" ]]; then
  echo "✅ Correctly rejected - HTTP 401 Unauthorized"
else
  echo "❌ Unexpected status - HTTP $TEST1_STATUS (expected 401)"
  echo "Response: $(echo "$TEST1_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')"
fi
echo

# Test 2: Try to get pages without authentication (should fail with 401)
echo "2. Testing findAll without authentication (should return 401):"
TEST2_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/pages?shopId=default-shop-id")

# Check if request succeeded but returned 401 as expected
TEST2_STATUS=$(echo "$TEST2_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
if [[ "$TEST2_STATUS" == "401" ]]; then
  echo "✅ Correctly rejected - HTTP 401 Unauthorized"
else
  echo "❌ Unexpected status - HTTP $TEST2_STATUS (expected 401)"
  echo "Response: $(echo "$TEST2_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')"
fi
echo

# Test 3: Login to get authentication token
echo "3. Getting authentication token:"

# Capture both HTTP status and response body
HTTP_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

# Check if curl command succeeded
if [ $? -ne 0 ]; then
  echo "❌ Authentication failed - curl command error"
  echo "Could not connect to API endpoint: $API_BASE/auth/login"
  exit 1
fi

# Extract HTTP status and response body
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

# Validate HTTP status indicates success (200 or 201)
if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "201" ]]; then
  echo "❌ Authentication failed - HTTP $HTTP_STATUS"
  echo "Response body: $HTTP_BODY"
  exit 1
fi

# Extract token from response
TOKEN=$(echo "$HTTP_BODY" | jq -r '.access_token' 2>/dev/null)

# Validate token is non-empty and not null
if [[ -z "$TOKEN" || "$TOKEN" == "null" || "$TOKEN" == "" ]]; then
  echo "❌ Authentication failed - no valid token received"
  echo "HTTP Status: $HTTP_STATUS"
  echo "Response body: $HTTP_BODY"
  echo "Expected: JSON response with 'access_token' field"
  exit 1
fi

echo "✅ Authentication successful - HTTP $HTTP_STATUS"
echo "Token received: ${TOKEN:0:20}... (truncated for security)"
echo

# Test 4: Try to create a page with authentication (should work)
echo "4. Testing createPage with authentication:"
TEST4_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/pages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "shopId": "default-shop-id",
    "slug": "authorized-page",
    "title": "Authorized Page",
    "html": "<h1>This page was created with proper authorization</h1>",
    "isHome": false
  }')

TEST4_STATUS=$(echo "$TEST4_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
TEST4_BODY=$(echo "$TEST4_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')

if [[ "$TEST4_STATUS" == "200" || "$TEST4_STATUS" == "201" ]]; then
  echo "✅ Page created successfully - HTTP $TEST4_STATUS"
  echo "$TEST4_BODY" | jq '.' 2>/dev/null || echo "$TEST4_BODY"
else
  echo "❌ Page creation failed - HTTP $TEST4_STATUS"
  echo "Response: $TEST4_BODY"
fi
echo

# Test 5: Try to get pages with authentication (should work)
echo "5. Testing findAll with authentication:"
TEST5_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/pages?shopId=default-shop-id" \
  -H "Authorization: Bearer $TOKEN")

TEST5_STATUS=$(echo "$TEST5_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
TEST5_BODY=$(echo "$TEST5_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')

if [[ "$TEST5_STATUS" == "200" ]]; then
  echo "✅ Pages retrieved successfully - HTTP $TEST5_STATUS"
  echo "$TEST5_BODY" | jq '.' 2>/dev/null || echo "$TEST5_BODY"
else
  echo "❌ Page retrieval failed - HTTP $TEST5_STATUS"
  echo "Response: $TEST5_BODY"
fi
echo

# Test 6: Test public access to pages (should work without auth)
echo "6. Testing public access to home page (should work without auth):"
TEST6_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/public/pages/home?shopId=default-shop-id")

TEST6_STATUS=$(echo "$TEST6_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
TEST6_BODY=$(echo "$TEST6_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')

if [[ "$TEST6_STATUS" == "200" ]]; then
  echo "✅ Public page accessed successfully - HTTP $TEST6_STATUS"
  echo "$TEST6_BODY" | jq '.' 2>/dev/null || echo "$TEST6_BODY"
else
  echo "❌ Public page access failed - HTTP $TEST6_STATUS"
  echo "Response: $TEST6_BODY"
fi
echo

echo "=== Authorization test complete ==="