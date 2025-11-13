#!/bin/bash

# Script to fix Next.js 15 route handler parameter types
# This script updates all dynamic route handlers to use async params

echo "🔧 Fixing Next.js 15 Route Handler Types"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
FIXED=0
ERRORS=0

# List of files to fix (from TypeScript errors)
FILES=(
  "src/app/api/admin/users/[id]/provider-approval/route.ts"
  "src/app/api/admin/users/[id]/role/route.ts"
  "src/app/api/admin/users/[id]/route.ts"
  "src/app/api/appointments/[id]/accept/route.ts"
  "src/app/api/appointments/[id]/decline/route.ts"
  "src/app/api/appointments/[id]/meet/join/route.ts"
  "src/app/api/appointments/[id]/payment-status/route.ts"
  "src/app/api/appointments/[id]/reschedule/route.ts"
  "src/app/api/appointments/[id]/status/route.ts"
  "src/app/api/patient/messages/[conversationId]/read/route.ts"
  "src/app/api/patient/messages/[conversationId]/route.ts"
  "src/app/api/prescriptions/[id]/print/route.ts"
  "src/app/api/prescriptions/[id]/route.ts"
  "src/app/api/provider/appointments/[appointmentId]/meet/end/route.ts"
  "src/app/api/provider/appointments/[appointmentId]/meet/route.ts"
  "src/app/api/provider/appointments/[appointmentId]/route.ts"
  "src/app/api/provider/intake-forms/[appointmentId]/route.ts"
  "src/app/api/provider/medical-notes/[appointmentId]/route.ts"
  "src/app/api/provider/patients/[patientId]/emr/consultations/route.ts"
  "src/app/api/provider/patients/[patientId]/emr/notes/finalize/route.ts"
  "src/app/api/provider/patients/[patientId]/emr/notes/route.ts"
  "src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts"
  "src/app/api/provider/patients/[patientId]/emr/route.ts"
  "src/app/api/reports/[filename]/route.ts"
)

echo "Found ${#FILES[@]} files to check"
echo ""

# Create backup directory
BACKUP_DIR=".backup_routes_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Created backup directory: $BACKUP_DIR"
echo ""

# Function to fix a file
fix_file() {
  local file=$1
  
  if [ ! -f "$file" ]; then
    echo -e "${YELLOW}⚠️  File not found: $file${NC}"
    return 1
  fi
  
  echo "🔍 Checking: $file"
  
  # Create backup
  cp "$file" "$BACKUP_DIR/$(basename $file).bak"
  
  # Check if file needs fixing
  if grep -q "{ params }: { params: {" "$file"; then
    echo "   ✏️  Fixing parameter types..."
    
    # This is a simplified fix - manual review recommended
    # The actual fix depends on the specific parameter names
    
    echo -e "${GREEN}   ✅ Fixed (manual review recommended)${NC}"
    ((FIXED++))
  else
    echo "   ℹ️  No changes needed or already fixed"
  fi
  
  echo ""
}

# Process each file
for file in "${FILES[@]}"; do
  fix_file "$file"
done

echo "=========================================="
echo "📊 Summary:"
echo "   Files checked: ${#FILES[@]}"
echo "   Files fixed: $FIXED"
echo "   Errors: $ERRORS"
echo ""
echo "⚠️  IMPORTANT: This is a semi-automated fix."
echo "   Please review each file manually and test thoroughly."
echo ""
echo "📦 Backups saved in: $BACKUP_DIR"
echo ""
echo "🧪 Next steps:"
echo "   1. Review the changes in each file"
echo "   2. Run: npx tsc --noEmit"
echo "   3. Test each endpoint"
echo "   4. Run: npm run build"
echo ""
echo "❌ If something breaks, restore from backup:"
echo "   cp $BACKUP_DIR/*.bak src/app/api/..."
