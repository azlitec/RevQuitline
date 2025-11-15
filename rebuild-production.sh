#!/bin/bash

echo "🔨 Rebuilding production with fresh CSS and assets..."
echo ""

# Stop containers
echo "⏹️  Step 1/7: Stopping containers..."
docker compose down

# Remove old images to force fresh build
echo "🗑️  Step 2/7: Removing old images..."
docker rmi quitline-web 2>/dev/null || true
docker image prune -f

# Clear Next.js cache in host
echo "🧹 Step 3/7: Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache

# Clear Docker build cache
echo "🧹 Step 4/7: Clearing Docker build cache..."
docker builder prune -f

# Rebuild with no cache
echo "🏗️  Step 5/7: Building fresh image (this will take a few minutes)..."
echo "           This ensures all CSS and assets are properly compiled..."
docker compose build --no-cache --progress=plain web

# Start containers
echo "🚀 Step 6/7: Starting containers..."
docker compose up -d

# Wait for startup
echo "⏳ Step 7/7: Waiting for application to start..."
sleep 8

# Show logs
echo ""
echo "✅ Rebuild complete! Checking logs..."
echo "================================================"
docker logs quitline --tail 30
echo "================================================"

echo ""
echo "🌐 Application should be available at: http://35.187.238.136"
echo ""
echo "📋 Next steps:"
echo "   1. Open browser and go to http://35.187.238.136"
echo "   2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   3. If still broken, clear browser cache completely"
echo "   4. Check browser console (F12) for any errors"
echo ""
echo "🔍 To monitor logs: docker logs -f quitline"
echo "🔍 To check CSS files: docker exec quitline ls -la .next/static/css"
