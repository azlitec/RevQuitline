#!/bin/bash

echo "🔧 Fixing package-lock.json and rebuilding..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Install Node.js if not available
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Regenerate package-lock.json
echo "🔄 Regenerating package-lock.json..."
npm install

# Commit the updated lock file
echo "💾 Committing updated package-lock.json..."
git add package-lock.json
git commit -m "Fix package-lock.json sync issue" || echo "No changes to commit"
git push || echo "Push failed or no changes"

# Now rebuild
echo ""
echo "🏗️  Starting rebuild..."
./rebuild-production.sh
