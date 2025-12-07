#!/bin/bash
# Test CSS Sanitization with real GrapesJS content

API_BASE="http://localhost:3001/api"

echo "=== Testing CSS Sanitization for GrapesJS ==="
echo

# First, get authentication token
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

if [ $? -eq 0 ]; then
  TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
  echo "✅ Authentication successful"
else
  echo "❌ Authentication failed"
  exit 1
fi
echo

# Test 2: Create page with GrapesJS styles (should preserve safe styles)
echo "2. Creating page with GrapesJS-style content (should preserve safe inline styles)..."
GRAPES_CONTENT='<section style="padding: 60px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 400px; border-radius: 12px;">
  <h1 style="font-size: 3em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Welcome to Tyler'\''s Barbershop</h1>
  <p style="font-size: 1.5em; margin-bottom: 40px; opacity: 0.9;">Professional grooming services</p>
  <div data-booking-widget="true" style="display: flex; justify-content: center; align-items: center; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 8px;">
    <h2 style="margin: 0; font-size: 1.8em;">Book Your Appointment</h2>
  </div>
</section>'

SAFE_PAGE_RESPONSE=$(curl -s -X POST "$API_BASE/pages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"shopId\": \"default-shop-id\",
    \"slug\": \"grapes-safe-styles\",
    \"title\": \"GrapesJS Safe Styles Test\",
    \"html\": \"$GRAPES_CONTENT\",
    \"isHome\": false
  }")

echo "Page creation response:"
echo "$SAFE_PAGE_RESPONSE" | jq '.'
echo

# Test 3: Try to create page with dangerous styles (should remove dangerous CSS)
echo "3. Creating page with dangerous CSS (should remove dangerous parts)..."
DANGEROUS_CONTENT='<div style="color: red; background-image: url(javascript:alert(1)); padding: 20px; behavior: url(evil.htc); position: absolute;">
  <p style="font-size: 16px; background: expression(alert(1)); margin: 10px;">This should be sanitized</p>
  <script>alert("xss")</script>
</div>'

DANGEROUS_PAGE_RESPONSE=$(curl -s -X POST "$API_BASE/pages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"shopId\": \"default-shop-id\",
    \"slug\": \"dangerous-styles-test\",
    \"title\": \"Dangerous Styles Test\",
    \"html\": \"$DANGEROUS_CONTENT\",
    \"isHome\": false
  }")

echo "Dangerous content response:"
echo "$DANGEROUS_PAGE_RESPONSE" | jq '.'
echo

# Test 4: Fetch and verify the sanitized content
echo "4. Fetching sanitized content to verify CSS processing..."
FETCH_RESPONSE=$(curl -s -X GET "$API_BASE/public/pages/by-slug/grapes-safe-styles?shopId=default-shop-id")
echo "Safe styles page content:"
echo "$FETCH_RESPONSE" | jq '.html' | sed 's/\\"/"/g' | sed 's/^"//; s/"$//'
echo

FETCH_DANGEROUS=$(curl -s -X GET "$API_BASE/public/pages/by-slug/dangerous-styles-test?shopId=default-shop-id")
echo "Dangerous styles page (after sanitization):"
echo "$FETCH_DANGEROUS" | jq '.html' | sed 's/\\"/"/g' | sed 's/^"//; s/"$//'
echo

echo "=== CSS Sanitization Analysis ==="
echo "✅ Safe CSS properties (padding, color, background gradients, etc.) should be preserved"
echo "❌ Dangerous CSS (javascript: URLs, expression(), behavior, etc.) should be removed"
echo "✅ GrapesJS functionality should work with visual styling intact"
echo "❌ XSS vectors through CSS should be blocked"