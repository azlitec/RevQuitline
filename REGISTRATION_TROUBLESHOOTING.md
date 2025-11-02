# Registration Troubleshooting Guide

## Common Registration Issues and Solutions

### Issue: "An error occurred during registration" for Doctor Registration

**Root Cause**: Strict validation requirements not clearly communicated to users.

### Password Requirements (FIXED)

The system enforces a strong password policy:

✅ **Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*()_-+=[]{}\\|;:'",.<>/?`~)

❌ **Examples of INVALID passwords:**
- `password123` (no uppercase, no special char)
- `Password` (no number, no special char)
- `Pass123` (less than 8 chars)

✅ **Examples of VALID passwords:**
- `MyPassword123!`
- `SecurePass2024@`
- `Doctor#2025`

### Phone Number Format (FIXED)

✅ **Valid formats:**
- `+60123456789` (Malaysian format)
- Leave empty (optional field)

❌ **Invalid formats:**
- `0123456789` (missing country code)
- `+60 12 345 6789` (spaces not allowed)
- `60123456789` (missing + sign)

### Doctor-Specific Requirements

For doctor registration, additional field is required:
- **Medical Registration Number**: Required, minimum 3 characters

### Frontend Improvements Made

1. **Enhanced Validation**: Frontend now matches backend validation rules exactly
2. **Better Error Messages**: Clear indication of what's wrong with password/phone
3. **Helper Text**: Shows requirements before user submits
4. **Backend Error Handling**: Properly displays validation errors from server

### Testing Registration

You can test the registration API directly:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Dr. Ahmad",
    "lastName": "Rahman", 
    "email": "ahmad.rahman@example.com",
    "phone": "+60123456789",
    "password": "MyPassword123!",
    "userType": "doctor",
    "licenseNumber": "MMC12345"
  }'
```

### User Flow After Registration

1. **Patient Registration**: 
   - Redirected to `/patient/dashboard`
   - Full access to patient features immediately

2. **Doctor Registration**: 
   - Redirected to `/provider/pending` (waiting room)
   - Account status: `PROVIDER_PENDING` (requires admin approval)
   - Cannot access provider dashboard until approved
   - Shows clear status and next steps

### Admin Approval Process

Doctors registered through the system:
- Start with role `PROVIDER_PENDING`
- Need admin approval to become active providers
- Admin can approve through admin dashboard
- Once approved, role changes to `PROVIDER` and `isProvider` becomes `true`
#
## Provider Pending Page Features

The new `/provider/pending` page provides:

1. **Clear Status Communication**: Shows that account is under review
2. **Timeline Expectations**: 1-3 business days for approval
3. **Registration Details**: Displays submitted information
4. **Contact Information**: Support email for questions
5. **Professional Design**: Maintains trust and professionalism

### Middleware Updates

Updated middleware to handle pending providers:
- `PROVIDER_PENDING` users can only access `/provider/pending`
- Approved providers (`PROVIDER` role) can access full provider dashboard
- Proper redirects prevent confusion

### Fixed Issues

✅ **Doctor Registration Flow**: 
- No longer redirects to patient dashboard
- Goes to appropriate waiting room instead
- Clear communication about approval process

✅ **Role-Based Access**: 
- Pending providers cannot access provider features
- Proper separation between pending and approved states
- Admin approval required before full access