#!/bin/bash

# Deployment Pre-Check Script
# Run this before deploying to Vercel

echo "🔍 Checking deployment readiness..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Check required environment variables
echo "📋 Checking environment variables..."

check_env() {
    if grep -q "^$1=" .env; then
        echo "  ✅ $1 is set"
        return 0
    else
        echo "  ❌ $1 is missing"
        return 1
    fi
}

ERRORS=0

check_env "DATABASE_URL" || ERRORS=$((ERRORS+1))
check_env "NEXTAUTH_SECRET" || ERRORS=$((ERRORS+1))
check_env "NEXTAUTH_URL" || ERRORS=$((ERRORS+1))

echo ""

# Check DATABASE_URL format
if grep -q "DATABASE_URL.*:6543" .env; then
    echo "  ✅ DATABASE_URL uses port 6543"
else
    echo "  ⚠️  DATABASE_URL should use port 6543"
    ERRORS=$((ERRORS+1))
fi

if grep -q "DATABASE_URL.*pgbouncer=true" .env; then
    echo "  ✅ DATABASE_URL has pgbouncer=true"
else
    echo "  ⚠️  DATABASE_URL should include pgbouncer=true"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Check NEXTAUTH_SECRET length
SECRET=$(grep "^NEXTAUTH_SECRET=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
if [ ${#SECRET} -ge 32 ]; then
    echo "  ✅ NEXTAUTH_SECRET is ${#SECRET} characters (>= 32)"
else
    echo "  ❌ NEXTAUTH_SECRET is only ${#SECRET} characters (need >= 32)"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Test build
echo "🔨 Testing build..."
if npm run build > /dev/null 2>&1; then
    echo "  ✅ Build successful"
else
    echo "  ❌ Build failed"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Check bundle size
if [ -d .next/standalone ]; then
    SIZE=$(du -sh .next/standalone | cut -f1)
    echo "📦 Deployment size: $SIZE"
    
    # Warn if > 200MB
    SIZE_MB=$(du -sm .next/standalone | cut -f1)
    if [ $SIZE_MB -gt 200 ]; then
        echo "  ⚠️  Deployment is large (> 200MB), may be slow"
    else
        echo "  ✅ Deployment size is good"
    fi
elif [ -d .next ]; then
    echo "📦 Build folder exists"
    echo "  ✅ Build completed"
fi

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "1. Commit your changes: git add . && git commit -m 'Optimize deployment'"
    echo "2. Push to Git: git push"
    echo "3. Vercel will auto-deploy, or run: vercel --prod"
    exit 0
else
    echo "❌ Found $ERRORS issue(s). Please fix before deploying."
    exit 1
fi
