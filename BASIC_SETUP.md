# 🚀 Basic Setup Guide (Tanpa Firebase)

## Quick Start untuk Development

### 1. Environment Variables (Minimum Required)

Hanya perlu set yang basic je untuk start:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://username:password@localhost:5432/healthcare_db?schema=public"

# Authentication (REQUIRED)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Application (REQUIRED)
NODE_ENV="development"
PORT=3000
```

### 2. Generate Secret Key

```bash
# Generate secure secret
openssl rand -base64 32
```

Copy output dan replace `your-super-secret-key-change-this-in-production` dalam .env

### 3. Database Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb healthcare_db
```

#### Option B: Docker PostgreSQL
```bash
# Run PostgreSQL in Docker
docker run --name postgres-healthcare \
  -e POSTGRES_DB=healthcare_db \
  -e POSTGRES_USER=healthcare_user \
  -e POSTGRES_PASSWORD=healthcare_pass \
  -p 5432:5432 \
  -d postgres:15

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://healthcare_user:healthcare_pass@localhost:5432/healthcare_db?schema=public"
```

#### Option C: Free Cloud Database (Supabase)
1. Go to [supabase.com](https://supabase.com)
2. Create free project
3. Get connection string from Settings > Database
4. Update DATABASE_URL in .env

### 4. Install & Run

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### 5. Test Application

1. Open http://localhost:3000
2. Register new account
3. Login and test functionality

## 📋 What Works Without Firebase

✅ **User Authentication** - NextAuth with database sessions
✅ **Patient Management** - Full patient records and appointments
✅ **Provider Dashboard** - All provider functionality
✅ **Admin Panel** - User management and system admin
✅ **EMR System** - Medical records, notes, prescriptions
✅ **Appointments** - Scheduling and management
✅ **Performance Monitoring** - Built-in performance dashboard

## 🚫 What's Disabled (Optional Features)

❌ **Push Notifications** - Requires Firebase
❌ **Email Notifications** - Requires SendGrid setup
❌ **Calendar Integration** - Requires Google API setup
❌ **File Storage** - Uses local storage instead of cloud

## 🔧 Add Optional Features Later

### Email Notifications (SendGrid)
```env
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@yourdomain.com"
```

### Push Notifications (Firebase)
```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
```

### Calendar Integration (Google)
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 🎯 Performance Features (Already Active)

✅ **Optimized Middleware** - Fast authentication and routing
✅ **Database Optimization** - Efficient queries and caching
✅ **Memory Caching** - In-memory cache for better performance
✅ **Performance Monitoring** - Real-time metrics at `/api/admin/performance`
✅ **Loading States** - Better user experience
✅ **Error Handling** - User-friendly error messages

## 🚀 Production Deployment (Basic)

### Environment Variables for Production
```env
NODE_ENV="production"
NEXTAUTH_URL="https://yourdomain.com"
DATABASE_URL="your-production-database-url"
NEXTAUTH_SECRET="your-production-secret"
```

### Deploy Options
1. **Vercel** - Easy deployment with database
2. **Railway** - Simple with PostgreSQL included
3. **Heroku** - Classic option with add-ons
4. **DigitalOcean** - VPS with more control

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull
```

### Authentication Issues
- Make sure NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Verify database is running

### Performance Issues
```bash
# Run performance test
node scripts/performance-test.js
```

### Check Application Health
- Visit `/api/admin/performance` (need admin account)
- Check browser console for errors
- Monitor server logs

## 📞 Support

Kalau ada issues:
1. Check console errors
2. Verify .env variables
3. Test database connection
4. Check server logs

Application ni dah fully functional tanpa Firebase! Semua core features akan berfungsi dengan baik. 🎉