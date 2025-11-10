#!/bin/bash

# Vercel Deployment Script
# This script helps you deploy to Vercel with proper checks

echo "🚀 RevQuitline Healthcare - Vercel Deployment"
echo "=============================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

echo "✅ Vercel CLI found"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Make sure to set environment variables in Vercel dashboard"
fi

# Check database connection string
if grep -q "5432" .env 2>/dev/null; then
    echo "❌ ERROR: Database connection uses port 5432"
    echo "   For Vercel, you MUST use port 6543"
    echo "   Please update DATABASE_URL in .env and Vercel dashboard"
    exit 1
fi

echo "✅ Database connection check passed"
echo ""

# Run build locally to check for errors
echo "🔨 Testing build locally..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying to Vercel"
    exit 1
fi

echo "✅ Local build successful"
echo ""

# Ask for deployment type
echo "Select deployment type:"
echo "1) Production (main branch)"
echo "2) Preview (current branch)"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "🚀 Deploying to PRODUCTION..."
        vercel --prod
        ;;
    2)
        echo "🔍 Deploying PREVIEW..."
        vercel
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "  [ ] Test login functionality"
echo "  [ ] Check patient dashboard loads"
echo "  [ ] Verify API endpoints work"
echo "  [ ] Test payment flow"
echo "  [ ] Check mobile responsiveness"
echo ""
echo "📊 Monitor your deployment:"
echo "   https://vercel.com/dashboard"
