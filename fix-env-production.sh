#!/bin/bash

# Script to fix .env.production file format issues
# This script will clean up any malformed environment variables

echo "🔧 Fixing .env.production file..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found!"
    echo "📝 Creating from .env.production.example..."
    
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        echo "✅ Created .env.production from example"
        echo "⚠️  Please update the values in .env.production with your actual credentials"
        exit 0
    else
        echo "❌ .env.production.example also not found!"
        exit 1
    fi
fi

# Backup original file
cp .env.production .env.production.backup
echo "📦 Backup created: .env.production.backup"

# Fix common issues:
# 1. Remove duplicate variable names in values (e.g., VAR=VAR=value -> VAR=value)
# 2. Remove extra spaces
# 3. Ensure proper format

echo "🔍 Checking for issues..."

# Create temporary file
temp_file=$(mktemp)

# Process each line
while IFS= read -r line; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
        echo "$line" >> "$temp_file"
        continue
    fi
    
    # Check if line contains =
    if [[ "$line" =~ = ]]; then
        # Extract variable name and value
        var_name=$(echo "$line" | cut -d'=' -f1)
        var_value=$(echo "$line" | cut -d'=' -f2-)
        
        # Check if value contains the variable name again (malformed)
        if [[ "$var_value" == "$var_name="* ]]; then
            echo "⚠️  Found malformed line: $line"
            # Extract the actual value
            actual_value=$(echo "$var_value" | cut -d'=' -f2-)
            echo "$var_name=$actual_value" >> "$temp_file"
            echo "✅ Fixed to: $var_name=$actual_value"
        else
            # Line is OK, keep as is
            echo "$line" >> "$temp_file"
        fi
    else
        # Line doesn't contain =, keep as is
        echo "$line" >> "$temp_file"
    fi
done < .env.production

# Replace original file with fixed version
mv "$temp_file" .env.production

echo ""
echo "✅ .env.production file has been fixed!"
echo ""
echo "🔍 Verifying BayarCash URLs..."

# Extract and display BayarCash URLs
echo ""
echo "Current BayarCash Configuration:"
echo "================================"
grep "BAYARCASH_" .env.production | grep -E "(URL|PAT|SECRET|KEY)" || echo "No BayarCash config found"
echo ""

echo "📝 Next steps:"
echo "1. Review the fixed .env.production file"
echo "2. Ensure all URLs are correct (no variable names in values)"
echo "3. Rebuild and restart your Docker containers:"
echo "   docker-compose down"
echo "   docker-compose build --no-cache"
echo "   docker-compose up -d"
echo ""
echo "4. Check logs for any remaining errors:"
echo "   docker logs -f quitline"
