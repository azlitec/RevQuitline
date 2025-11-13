#!/bin/bash

# Login Error Diagnostic Script
# This script helps identify why login is failing

echo "🔍 Login Error Diagnostic Tool"
echo "==============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check 1: Server Running
echo -e "${BLUE}[1/8] Checking if server is running...${NC}"
if curl -s http://localhost:3001/api/auth/session > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Server is running on port 3001${NC}"
else
  if curl -s http://localhost:3000/api/auth/session > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running on port 3000${NC}"
  else
    echo -e "${RED}❌ Server is not running${NC}"
    echo "   Run: npm run dev"
    exit 1
  fi
fi
echo ""

# Check 2: Database Connection
echo -e "${BLUE}[2/8] Checking database connection...${NC}"
if grep -q "6543" .env 2>/dev/null; then
  echo -e "${GREEN}✅ Database URL uses correct port (6543)${NC}"
else
  echo -e "${RED}❌ Database URL may use wrong port${NC}"
  echo "   Check .env file - should use port 6543"
fi
echo ""

# Check 3: Environment Variables
echo -e "${BLUE}[3/8] Checking environment variables...${NC}"
if [ -f .env ]; then
  echo -e "${GREEN}✅ .env file exists${NC}"
  
  # Check critical variables
  if grep -q "DATABASE_URL=" .env; then
    echo "   ✅ DATABASE_URL is set"
  else
    echo -e "   ${RED}❌ DATABASE_URL is missing${NC}"
  fi
  
  if grep -q "NEXTAUTH_SECRET=" .env; then
    echo "   ✅ NEXTAUTH_SECRET is set"
  else
    echo -e "   ${RED}❌ NEXTAUTH_SECRET is missing${NC}"
  fi
  
  if grep -q "NEXTAUTH_URL=" .env; then
    echo "   ✅ NEXTAUTH_URL is set"
  else
    echo -e "   ${RED}❌ NEXTAUTH_URL is missing${NC}"
  fi
else
  echo -e "${RED}❌ .env file not found${NC}"
fi
echo ""

# Check 4: Prisma Client
echo -e "${BLUE}[4/8] Checking Prisma client...${NC}"
if [ -d "node_modules/@prisma/client" ]; then
  echo -e "${GREEN}✅ Prisma client is installed${NC}"
else
  echo -e "${RED}❌ Prisma client not found${NC}"
  echo "   Run: npx prisma generate"
fi
echo ""

# Check 5: NextAuth Configuration
echo -e "${BLUE}[5/8] Checking NextAuth configuration...${NC}"
if [ -f "src/lib/auth/auth.ts" ]; then
  echo -e "${GREEN}✅ NextAuth config file exists${NC}"
else
  echo -e "${RED}❌ NextAuth config file not found${NC}"
fi
echo ""

# Check 6: Middleware
echo -e "${BLUE}[6/8] Checking middleware...${NC}"
if [ -f "src/middleware.ts" ]; then
  echo -e "${GREEN}✅ Middleware file exists${NC}"
  
  # Check if middleware allows auth routes
  if grep -q "/api/auth/" src/middleware.ts; then
    echo "   ✅ Middleware allows /api/auth/ routes"
  else
    echo -e "   ${YELLOW}⚠️  Middleware may block auth routes${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  No middleware file found${NC}"
fi
echo ""

# Check 7: Test Auth Endpoint
echo -e "${BLUE}[7/8] Testing auth endpoint...${NC}"
AUTH_RESPONSE=$(curl -s http://localhost:3001/api/auth/session 2>/dev/null || curl -s http://localhost:3000/api/auth/session 2>/dev/null)
if [ -n "$AUTH_RESPONSE" ]; then
  echo -e "${GREEN}✅ Auth endpoint responds${NC}"
  echo "   Response: $AUTH_RESPONSE"
else
  echo -e "${RED}❌ Auth endpoint not responding${NC}"
fi
echo ""

# Check 8: Database Connection Test
echo -e "${BLUE}[8/8] Testing database connection...${NC}"
if npx prisma db push --skip-generate > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
else
  echo -e "${RED}❌ Database connection failed${NC}"
  echo "   Check DATABASE_URL in .env"
fi
echo ""

# Summary
echo "==============================="
echo "📋 Diagnostic Summary"
echo "==============================="
echo ""
echo "Next steps to debug login error:"
echo ""
echo "1. Open browser console (F12)"
echo "2. Go to http://localhost:3001/login"
echo "3. Try to login"
echo "4. Check console for errors"
echo "5. Check Network tab for failed requests"
echo ""
echo "Common issues:"
echo "  • Wrong password/email"
echo "  • Database connection failed"
echo "  • NEXTAUTH_SECRET not set"
echo "  • Middleware blocking requests"
echo "  • Prisma client not generated"
echo ""
echo "To get more details, check server logs:"
echo "  • Look at terminal where 'npm run dev' is running"
echo "  • Check for error messages"
echo ""
echo "Need help? Share:"
echo "  1. Browser console errors (screenshot)"
echo "  2. Server log errors"
echo "  3. Network tab (failed requests)"
