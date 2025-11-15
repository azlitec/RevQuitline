# Vercel Deployment Guide - Hobby Plan

This guide will help you deploy your application to Vercel's Hobby (Free) plan with optimized login functionality.

## Prerequisites

- Vercel account (free)
- Supabase database (free tier)
- Your application code pushed to GitHub/GitLab/Bitbucket

## Step 1: Prepare Environment Variables

Before deploying, gather these environment variables:

### Required Variables

1. **DATABASE_URL**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings > Database
   - Copy the **"Connection pooling"** string (NOT "Connection string")
   - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
   - ⚠️ Must use port **6543** (not 5432)
   - ⚠️ Must include `pgbouncer=true`
   - ⚠️ Must include `connection_limit=1`

2. **NEXTAUTH_SECRET**
   - Generate a secure secret:
     ```bash
     openssl rand -base64 32
     ```
   - Copy the output (should be 44 characters)
   - ⚠️ Must be at least 32 characters
   - ⚠️ Use the SAME secret across all environments

3. **NEXTAUTH_URL**
   - Will be set automatically by Vercel for preview deployments
   - For production, you'll set this after first deployment

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run vercel-build` (or leave default)
   - **Output Directory**: `.next` (leave as default)
   - **Install Command**: `npm install` (leave as default)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

## Step 3: Configure Environment Variables

1. In Vercel Dashboard, go to your project
2. Go to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `DATABASE_URL` | Your Supabase connection pooling URL | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Your generated secret (44 chars) | Production, Preview, Development |
| `NODE_ENV` | `production` | Production only |

**For optional payment features (BayarCash):**

| Variable | Value | Environments |
|----------|-------|--------------|
| `BAYARCASH_API_URL` | Your BayarCash API URL | Production, Preview, Development |
| `BAYARCASH_PAT` | Your Personal Access Token | Production, Preview, Development |
| `BAYARCASH_API_SECRET` | Your API Secret | Production, Preview, Development |
| `BAYARCASH_PORTAL_KEY` | Your Portal Key | Production, Preview, Development |
| `BAYARCASH_RETURN_URL` | `https://your-domain.vercel.app/patient/payment/return` | Production |
| `BAYARCASH_CALLBACK_URL` | `https://your-domain.vercel.app/api/payment/callback` | Production |

## Step 4: Set Production NEXTAUTH_URL

After your first deployment:

1. Copy your production URL (e.g., `https://your-app.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Add `NEXTAUTH_URL`:
   - **Value**: `https://your-app.vercel.app` (your exact domain, no trailing slash)
   - **Environment**: Production only
4. Redeploy your application

## Step 5: Configure Vercel Project Settings

1. Go to **Settings** → **General**
2. Set **Region**: Singapore (sin1) - closest to Supabase
3. Go to **Settings** → **Functions**
4. Verify settings:
   - **Function Region**: Singapore (sin1)
   - **Max Duration**: 10 seconds (Hobby plan limit)

## Step 6: Verify Deployment

### Check Build Logs

1. Go to **Deployments** tab
2. Click on your latest deployment
3. Check **Build Logs** for:
   - ✅ `Prisma schema loaded`
   - ✅ `Generated Prisma Client`
   - ✅ `Database configuration validated for Vercel serverless`
   - ✅ `Environment validation passed`
   - ✅ Build completed successfully

### Test Login Functionality

1. Visit your production URL
2. Try to log in with valid credentials
3. Verify:
   - ✅ Login succeeds within 3-5 seconds
   - ✅ Redirects to correct dashboard
   - ✅ Session persists across page loads
   - ✅ No timeout errors

### Monitor Function Logs

1. Go to **Deployments** → **Functions**
2. Check for any errors in real-time logs
3. Look for:
   - ✅ `[Auth] Authentication successful`
   - ✅ `[Prisma] Database connection established`
   - ❌ No timeout errors
   - ❌ No connection pool errors

## Troubleshooting

### Login Fails with Timeout

**Symptoms**: Login takes >10 seconds or times out

**Solutions**:
1. Verify DATABASE_URL uses port 6543
2. Verify DATABASE_URL includes `pgbouncer=true`
3. Check Supabase connection pooling is enabled
4. Verify Vercel region matches Supabase region (Singapore)

### "Invalid email or password" Error

**Symptoms**: Login fails immediately with error

**Solutions**:
1. Verify user exists in database
2. Check password is correctly hashed (bcrypt)
3. Verify NEXTAUTH_SECRET is set correctly
4. Check database connection is working

### Session Not Persisting

**Symptoms**: User gets logged out on page refresh

**Solutions**:
1. Verify NEXTAUTH_URL matches your exact domain
2. Verify NEXTAUTH_SECRET is the same across all environments
3. Check cookies are being set (browser dev tools)
4. Verify no trailing slash in NEXTAUTH_URL

### Database Connection Errors

**Symptoms**: "Too many connections" or "Connection pool exhausted"

**Solutions**:
1. Verify `connection_limit=1` in DATABASE_URL
2. Check Supabase connection pooling is enabled
3. Verify using port 6543 (not 5432)
4. Check Supabase dashboard for connection count

### Build Fails

**Symptoms**: Deployment fails during build

**Solutions**:
1. Verify all environment variables are set
2. Check Prisma schema is valid
3. Verify `vercel-build` script in package.json
4. Check build logs for specific errors

## Performance Optimization

### Expected Performance Metrics

- **Login time**: 2-4 seconds
- **Page load**: 1-3 seconds
- **API response**: 200-500ms
- **Cold start**: 1-2 seconds

### Monitoring

1. Use Vercel Analytics (free tier)
2. Monitor function execution time
3. Check database connection count in Supabase
4. Set up alerts for errors

### Optimization Tips

1. **Database Queries**
   - Use Prisma's `select` to fetch only needed fields
   - Add indexes for frequently queried fields
   - Use connection pooling (already configured)

2. **Caching**
   - Use Next.js built-in caching
   - Cache static assets
   - Use ISR for semi-static pages

3. **Code Splitting**
   - Use dynamic imports for large components
   - Lazy load non-critical features
   - Optimize bundle size

## Maintenance

### Regular Tasks

1. **Weekly**: Check error logs in Vercel dashboard
2. **Monthly**: Review database connection usage
3. **Quarterly**: Update dependencies and redeploy
4. **Quarterly**: Rotate NEXTAUTH_SECRET (requires user re-login)

### Updating Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Edit the variable
3. Redeploy the application (automatic or manual)

### Rolling Back

If issues occur after deployment:

1. Go to **Deployments** tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

## Support

### Vercel Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Status](https://www.vercel-status.com/)

### Supabase Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- [Supabase Status](https://status.supabase.com/)

### NextAuth Support

- [NextAuth Documentation](https://next-auth.js.org/)
- [NextAuth GitHub](https://github.com/nextauthjs/next-auth)

## Checklist

Before going live, verify:

- [ ] All environment variables set in Vercel
- [ ] NEXTAUTH_URL matches production domain
- [ ] DATABASE_URL uses port 6543 with pgbouncer
- [ ] NEXTAUTH_SECRET is at least 32 characters
- [ ] Build succeeds without errors
- [ ] Login works in production
- [ ] Session persists across page loads
- [ ] No timeout errors in logs
- [ ] Database connections stay under limit
- [ ] All user roles can access their dashboards
- [ ] Payment features work (if enabled)
- [ ] Error monitoring is set up
- [ ] Backup plan is in place

## Success!

Your application is now deployed to Vercel Hobby plan with optimized login functionality! 🎉

For any issues, check the troubleshooting section or refer to the support links above.
