#!/bin/bash
# Test script to demonstrate the page controller authorization

API_BASE="http://localhost:3001/api"

echo "=== Testing Page Controller Authorization ==="
echo

# Test 1: Try to create a page without authentication (should fail with 401)
echo "1. Testing createPage without authentication (should return 401):"
curl -s -X POST "$API_BASE/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "default-shop-id",
    "slug": "test-page",
    "title": "Test Page",
    "html": "<h1>Test</h1>",
    "isHome": false
  }' | jq '.' 2>/dev/null || echo "Request failed as expected (401 Unauthorized)"
echo

# Test 2: Try to get pages without authentication (should fail with 401)
echo "2. Testing findAll without authentication (should return 401):"
curl -s -X GET "$API_BASE/pages?shopId=default-shop-id" | jq '.' 2>/dev/null || echo "Request failed as expected (401 Unauthorized)"
echo

# Test 3: Login to get authentication token
echo "3. Getting authentication token:"
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

if [ $? -eq 0 ]; then
  TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
  echo "Authentication successful, token obtained"
else
  echo "Authentication failed"
  exit 1
fi
echo

# Test 4: Try to create a page with authentication (should work)
echo "4. Testing createPage with authentication:"
curl -s -X POST "$API_BASE/pages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "shopId": "default-shop-id",
    "slug": "authorized-page",
    "title": "Authorized Page",
    "html": "<h1>This page was created with proper authorization</h1>",
    "isHome": false
  }' | jq '.'
echo

# Test 5: Try to get pages with authentication (should work)
echo "5. Testing findAll with authentication:"
curl -s -X GET "$API_BASE/pages?shopId=default-shop-id" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo

# Test 6: Test public access to pages (should work without auth)
echo "6. Testing public access to home page (should work without auth):"
curl -s -X GET "$API_BASE/public/pages/home?shopId=default-shop-id" | jq '.'
echo

echo "=== Authorization test complete ==="