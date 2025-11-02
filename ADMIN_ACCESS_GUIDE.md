# Admin System Access Guide

## Admin System Overview

Sistem admin tersedia untuk menguruskan:
- ✅ User approvals (approve pending doctors)
- ✅ User management 
- ✅ Payment monitoring
- ✅ System reports
- ✅ Notifications

## How to Access Admin System

### Option 1: Create New Admin Account

1. **Go to Admin Registration**:
   ```
   http://localhost:3000/admin-auth/register
   ```

2. **Enter Admin Registration Code**:
   ```
   Code: 1234567890ABC
   ```
   *(This is hardcoded in the system for security)*

3. **Complete Registration Form**:
   - Full Name: Your name
   - Email: Your admin email
   - Password: Strong password (8+ characters)
   - Confirm Password: Same password

4. **Login to Admin System**:
   ```
   http://localhost:3000/admin-auth/login
   ```

### Option 2: Use Existing Admin Account (if any)

If you already have an admin account, directly go to:
```
http://localhost:3000/admin-auth/login
```

## Admin System URLs

### Main Access Points:
- **Admin Registration**: `http://localhost:3000/admin-auth/register`
- **Admin Login**: `http://localhost:3000/admin-auth/login`
- **Admin Dashboard**: `http://localhost:3000/admin/dashboard`

### Admin Features:
- **User Management**: `http://localhost:3000/admin/users`
- **Provider Approvals**: `http://localhost:3000/admin/approvals`
- **Payment Monitoring**: `http://localhost:3000/admin/payments`
- **System Reports**: `http://localhost:3000/admin/reports`
- **Notifications**: `http://localhost:3000/admin/notifications`

## Security Features

1. **Two-Step Registration**:
   - Step 1: Verify admin registration code
   - Step 2: Complete account details

2. **Admin-Only Access**:
   - System checks if user is admin before allowing login
   - Middleware protects all admin routes

3. **Separate Authentication**:
   - Admin login is separate from regular user login
   - Different UI and security measures

## Quick Start Steps

### Step 1: Create Admin Account
```bash
# 1. Open browser and go to:
http://localhost:3000/admin-auth/register

# 2. Enter registration code:
1234567890ABC

# 3. Fill in your details and register
```

### Step 2: Login as Admin
```bash
# 1. Go to admin login:
http://localhost:3000/admin-auth/login

# 2. Use your registered email and password
```

### Step 3: Access Admin Features
```bash
# After login, you'll be redirected to:
http://localhost:3000/admin/dashboard

# From there you can access all admin features
```

## Approve Pending Doctors

Once you're logged in as admin:

1. **Go to Approvals Section**:
   ```
   http://localhost:3000/admin/approvals
   ```

2. **Find Pending Providers**:
   - Look for users with role `PROVIDER_PENDING`
   - Review their medical registration numbers
   - Check their credentials

3. **Approve Provider**:
   - Click approve button
   - This will change their role from `PROVIDER_PENDING` to `PROVIDER`
   - Set `isProvider` to `true`
   - They can then access full provider dashboard

## Troubleshooting

### "Invalid admin registration code"
- Make sure you're using: `1234567890ABC`
- Code is case-sensitive

### "Invalid credentials or user is not an administrator"
- This means the email is not registered as admin
- Register first using the admin registration page

### Cannot access admin routes
- Make sure you're logged in as admin
- Check that your account has `isAdmin: true`

### Redirected to /login when accessing admin-auth pages (FIXED)
- **Issue**: Middleware was redirecting admin-auth routes to regular login
- **Solution**: Updated middleware to allow admin-auth paths without token check
- **Fixed URLs**: `/admin-auth/login` and `/admin-auth/register` now work properly

## Security Notes

⚠️ **Important Security Considerations**:

1. **Change Registration Code**: The hardcoded registration code `1234567890ABC` should be changed in production
2. **Environment Variable**: Move the code to environment variable
3. **IP Restrictions**: Consider adding IP restrictions for admin access
4. **Audit Logging**: Add logging for admin actions
5. **Session Management**: Implement proper session timeouts

## Production Deployment

For production, update the registration code in:
```typescript
// src/app/admin-auth/register/page.tsx
// Change this line:
if (formData.registrationCode !== "1234567890ABC") {

// To use environment variable:
if (formData.registrationCode !== process.env.ADMIN_REGISTRATION_CODE) {
```

Then set in your `.env`:
```env
ADMIN_REGISTRATION_CODE=your_secure_code_here
```