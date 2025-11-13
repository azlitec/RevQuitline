#!/bin/bash

# NextAuth 405 Error Fix - Test Script
# This script tests all HTTP methods to verify the fix

echo "🧪 Testing NextAuth Endpoints..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (change this to your Vercel URL for production testing)
BASE_URL="${1:-http://localhost:3000}"

echo "Testing URL: $BASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: GET /api/auth/session
echo "Test 1: GET /api/auth/session"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/session")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $STATUS"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $STATUS (expected 200)"
fi
echo ""

# Test 2: HEAD /api/auth/session
echo "Test 2: HEAD /api/auth/session"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -I "$BASE_URL/api/auth/session")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $STATUS"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $STATUS (expected 200)"
fi
echo ""

# Test 3: OPTIONS /api/auth/session
echo "Test 3: OPTIONS /api/auth/session"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE_URL/api/auth/session")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $STATUS"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $STATUS (expected 200)"
fi
echo ""

# Test 4: GET /api/auth/csrf
echo "Test 4: GET /api/auth/csrf"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/csrf")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $STATUS"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $STATUS (expected 200)"
fi
echo ""

# Test 5: GET /api/auth/providers
echo "Test 5: GET /api/auth/providers"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/providers")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status: $STATUS"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $STATUS (expected 200)"
fi
echo ""

# Test 6: Database test endpoint
echo "Test 6: GET /api/test/db"
RESPONSE=$(curl -s "$BASE_URL/api/test/db")
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC} - Database connected"
    echo "$RESPONSE" | grep -o '"userCount":[0-9]*' | sed 's/"userCount":/Users: /'
else
    echo -e "${RED}✗ FAIL${NC} - Database connection failed"
    echo "$RESPONSE"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Test Summary:"
echo "  - All tests should return 200 status"
echo "  - No 405 errors should appear"
echo "  - Database should be connected"
echo ""
echo "💡 To test on Vercel:"
echo "  ./test-nextauth.sh https://your-app.vercel.app"
echo ""
