# 🚀 Vercel Hobby Plan Deployment Guide

Complete step-by-step guide untuk deploy RevQuitline Healthcare ke Vercel Hobby plan.

---

## 📋 Pre-Deployment Checklist

### ✅ Files Yang Dah Ready
- [x] `vercel.json` - Vercel configuration
- [x] `next.config.ts` - Optimized Next.js config
- [x] `.vercelignore` - Files to exclude from deployment
- [x] `.env.production.example` - Production environment template
- [x] Database connection optimized (port 6543)
- [x] API timeout protection implemented
- [x] Error handling enhanced

### ⚠️ Files Yang Perlu Migrate (Later)
- [ ] File uploads (currently in `uploads/` - 5.3MB)
- [ ] Cron jobs (need to convert to webhooks)

---

## 🔧 Step 1: Prepare Vercel Project

### 1.1 Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### 1.2 Login to Vercel
```bash
vercel login
```

---

## 🌐 Step 2: Create Vercel Project

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Git Repository**
   - Connect your GitHub/GitLab/Bitbucket account
   - Select your repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

### Option B: Via CLI

```bash
# In your project directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? revquitline-healthcare
# - Directory? ./
# - Override settings? No
```

---

## 🔐 Step 3: Configure Environment Variables

### 3.1 Via Vercel Dashboard

1. Go to your project → **Settings** → **Environment Variables**

2. Add these variables (one by one):

#### **Database (CRITICAL!)**
```
Name: DATABASE_URL
Value: postgresql://postgres.jurngwvhwrswzvrgyeek:ZaqXsw123Zaq@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
Environment: Production, Preview, Development
```

⚠️ **PENTING**: Pastikan port `6543` (bukan 5432)!

#### **NextAuth**
```
Name: NEXTAUTH_URL
Value: https://your-app.vercel.app
Environment: Production

Name: NEXTAUTH_SECRET
Value: 77JVhwtR2Le3kq92+7XHJrJUXTnznGJvWFDQlY/TP2A=
Environment: Production, Preview, Development
```

#### **Application**
```
Name: NODE_ENV
Value: production
Environment: Production
```

#### **BayarCash Payment**
```
Name: BAYARCASH_API_URL
Value: https://console.bayarcash-sandbox.com/api/v2
Environment: Production, Preview, Development

Name: BAYARCASH_PAT
Value: [your-production-token]
Environment: Production

Name: BAYARCASH_API_SECRET
Value: [your-api-secret]
Environment: Production

Name: BAYARCASH_PORTAL_KEY
Value: [your-portal-key]
Environment: Production

Name: BAYARCASH_RETURN_URL
Value: https://your-app.vercel.app/patient/payment/return
Environment: Production

Name: BAYARCASH_CALLBACK_URL
Value: https://your-app.vercel.app/api/payment/callback
Environment: Production

Name: BAYARCASH_DEBUG
Value: false
Environment: Production

Name: BAYARCASH_TIMEOUT
Value: 30000
Environment: Production

Name: BAYARCASH_RETRY_ATTEMPTS
Value: 3
Environment: Production
```

#### **Feature Flags (Optional)**
```
Name: DISABLE_PUSH_NOTIFICATIONS
Value: false
Environment: Production

Name: DISABLE_GOOGLE
Value: true
Environment: Production

Name: DISABLE_EMAIL
Value: true
Environment: Production
```

### 3.2 Via CLI

```bash
# Set environment variables
vercel env add DATABASE_URL production
# Paste the value when prompted

vercel env add NEXTAUTH_URL production
# Enter: https://your-app.vercel.app

vercel env add NEXTAUTH_SECRET production
# Paste your secret

# Repeat for all other variables...
```

---

## 🏗️ Step 4: Deploy to Vercel

### 4.1 First Deployment

#### Via Dashboard:
1. After configuring environment variables
2. Go to **Deployments** tab
3. Click **"Redeploy"** or push to your Git branch
4. Wait for build to complete (~3-5 minutes)

#### Via CLI:
```bash
# Deploy to production
vercel --prod

# Or just deploy (preview)
vercel
```

### 4.2 Monitor Build

Watch the build logs for any errors:
- ✅ Installing dependencies
- ✅ Running `prisma generate`
- ✅ Building Next.js application
- ✅ Optimizing production build
- ✅ Deployment ready

### 4.3 Common Build Errors & Solutions

#### Error: "DATABASE_URL is not defined"
**Solution**: Add DATABASE_URL to environment variables

#### Error: "Prisma Client not generated"
**Solution**: Ensure build command includes `prisma generate`

#### Error: "Module not found"
**Solution**: Check package.json dependencies, run `npm install` locally first

---

## ✅ Step 5: Verify Deployment

### 5.1 Check Deployment URL

Your app will be available at:
```
https://your-app.vercel.app
```

### 5.2 Test Critical Functionality

1. **Homepage**
   - Visit https://your-app.vercel.app
   - Should load without errors

2. **Login**
   - Go to /login
   - Try logging in with valid credentials
   - Should redirect to dashboard

3. **Patient Dashboard**
   - Should load within 10 seconds
   - Stats should display correctly
   - No infinite loading

4. **API Endpoints**
   - Test: https://your-app.vercel.app/api/auth/session
   - Should return session data or empty object

### 5.3 Check Function Logs

1. Go to Vercel Dashboard → Your Project → **Functions**
2. Click on any function to see logs
3. Look for errors or timeouts

---

## 🔍 Step 6: Monitor Performance

### 6.1 Vercel Analytics (Free on Hobby)

1. Go to your project → **Analytics**
2. Monitor:
   - Page load times
   - Function execution times
   - Error rates

### 6.2 Function Execution Times

Check that all functions complete within 10 seconds:
- ✅ `/api/patient/dashboard` - Should be < 5s
- ✅ `/api/appointments` - Should be < 3s
- ✅ `/api/patient/messages` - Should be < 3s

### 6.3 Bandwidth Usage

Monitor bandwidth to stay within 100GB/month limit:
- Go to **Settings** → **Usage**
- Check current bandwidth usage

---

## 🚨 Troubleshooting

### Issue: "Function Timeout"

**Symptoms**: API requests fail after 10 seconds

**Solutions**:
1. Check database queries - optimize slow queries
2. Add indexes to frequently queried fields
3. Implement caching for expensive operations
4. Use `Promise.race()` with timeout

**Example**:
```typescript
const result = await Promise.race([
  fetchData(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 9000)
  )
]);
```

### Issue: "Database Connection Error"

**Symptoms**: "Too many connections" or connection timeouts

**Solutions**:
1. Verify DATABASE_URL uses port 6543 (not 5432)
2. Ensure `pgbouncer=true` in connection string
3. Set `connection_limit=1` in connection string
4. Check Supabase connection pooling settings

### Issue: "Module Not Found"

**Symptoms**: Build fails with "Cannot find module"

**Solutions**:
1. Check package.json has all dependencies
2. Run `npm install` locally to verify
3. Clear Vercel build cache: Settings → General → Clear Build Cache
4. Redeploy

### Issue: "Environment Variable Not Set"

**Symptoms**: App crashes or features don't work

**Solutions**:
1. Go to Settings → Environment Variables
2. Verify all required variables are set
3. Check variable names match exactly (case-sensitive)
4. Redeploy after adding variables

### Issue: "Static File Not Found"

**Symptoms**: Images or assets return 404

**Solutions**:
1. Ensure files are in `public/` directory
2. Reference with `/filename.ext` (not `./public/filename.ext`)
3. Check `.vercelignore` doesn't exclude needed files

---

## 📊 Vercel Hobby Plan Limits

### Current Usage vs Limits

| Resource | Limit | Current Usage | Status |
|----------|-------|---------------|--------|
| Bandwidth | 100 GB/month | ~0 GB | ✅ Safe |
| Function Execution | 100 GB-Hours | ~0 GB-Hours | ✅ Safe |
| Function Duration | 10 seconds | Max 5s | ✅ Safe |
| Function Memory | 512 MB | ~200 MB | ✅ Safe |
| Build Time | 45 minutes | ~3-5 min | ✅ Safe |
| Deployments | Unlimited | - | ✅ Safe |

### Tips to Stay Within Limits

1. **Bandwidth**
   - Optimize images (use Next.js Image component)
   - Enable caching headers
   - Use CDN for static assets

2. **Function Execution**
   - Implement timeout protection
   - Cache expensive operations
   - Optimize database queries

3. **Build Time**
   - Remove unused dependencies
   - Use `.vercelignore` to exclude unnecessary files
   - Enable incremental builds

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to Git:

- **Production**: Push to `main` or `master` branch
- **Preview**: Push to any other branch

### Manual Deployments

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

### Rollback

If deployment fails:
1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **"..."** → **"Promote to Production"**

---

## 📝 Post-Deployment Tasks

### 1. Update BayarCash URLs
- Login to BayarCash dashboard
- Update callback URL to: `https://your-app.vercel.app/api/payment/callback`
- Update return URL to: `https://your-app.vercel.app/patient/payment/return`

### 2. Update Supabase Settings (if using Supabase Auth)
- Go to Supabase Dashboard → Authentication → URL Configuration
- Add your Vercel URL to allowed redirect URLs

### 3. Set Up Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update NEXTAUTH_URL to your custom domain

### 4. Enable Vercel Analytics
1. Go to Analytics tab
2. Click "Enable Analytics"
3. Monitor performance metrics

---

## 🎯 Next Steps

After successful deployment, continue with remaining optimization tasks:

### Priority 1: File Storage Migration
- [ ] Task 2: Implement Vercel Blob storage
- [ ] Migrate existing files from `uploads/`
- [ ] Update file upload endpoints

### Priority 2: Background Processes
- [ ] Task 4: Convert cron jobs to webhooks
- [ ] Set up GitHub Actions for scheduling
- [ ] Test webhook endpoints

### Priority 3: Performance Optimization
- [ ] Task 5: Optimize bundle size
- [ ] Implement code splitting
- [ ] Remove unused dependencies

---

## 📞 Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js on Vercel**: https://vercel.com/docs/frameworks/nextjs
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Supabase + Vercel**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

---

## ✅ Deployment Checklist

Before going live, verify:

- [ ] All environment variables set correctly
- [ ] DATABASE_URL uses port 6543
- [ ] NEXTAUTH_URL points to production domain
- [ ] BayarCash URLs updated
- [ ] Login/logout works
- [ ] Patient dashboard loads
- [ ] Appointments can be created
- [ ] Payments work (test mode)
- [ ] No console errors
- [ ] All API endpoints respond within 10s
- [ ] Mobile responsive
- [ ] Security headers configured

---

**Status**: Ready for deployment! 🚀

**Estimated Deployment Time**: 5-10 minutes

**Next**: Follow Step 2 to create your Vercel project.
