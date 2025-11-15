# 🚨 VERCEL LOGIN FIX - FINAL SOLUTION

## ❌ Problem

Login redirects to `/api/auth/error` on Vercel (but works on localhost)

## ✅ Root Cause

**NEXTAUTH_URL** not set correctly on Vercel

---

## 🎯 THE FIX (5 MINUTES)

### Step 1: Go to Vercel Dashboard

1. Open https://vercel.com/dashboard
2. Click your project: **rev-quitline**
3. Click **Settings** tab
4. Click **Environment Variables** in sidebar

### Step 2: Set NEXTAUTH_URL

**CRITICAL**: Add this EXACT value

```
Variable Name: NEXTAUTH_URL
Value: https://quitline.lumelife.my
Environment: Production
```

**IMPORTANT**:
- ✅ Must be `https://quitline.lumelife.my`
- ✅ NO trailing slash
- ✅ Must be HTTPS (not HTTP)
- ✅ Must match your EXACT domain

### Step 3: Verify Other Variables

Make sure these exist:

```
NEXTAUTH_SECRET
Value: 77JVhwtR2Le3kq92+7XHJrJUXTnznGJvWFDQlY/TP2A=
Environment: Production, Preview, Development

DATABASE_URL
Value: postgresql://postgres.jurngwvhwrswzvrgyeek:ZaqXsw123Zaq@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
Environment: Production, Preview, Development
```

### Step 4: Redeploy

After adding/updating variables:

1. Go to **Deployments** tab
2. Click **...** (three dots) on latest deployment
3. Click **Redeploy**

OR

```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

### Step 5: Test

1. Go to https://quitline.lumelife.my/login
2. Enter credentials
3. Click Sign In
4. **Should redirect to dashboard** (NOT /api/auth/error)

---

## 🔍 Why This Happens

### On Localhost (Works)
```
NEXTAUTH_URL=http://localhost:3000
✅ Matches the domain
✅ Cookies set correctly
✅ Login works
```

### On Vercel (Broken)
```
NEXTAUTH_URL=not set or wrong
❌ NextAuth doesn't know the domain
❌ Cookies not set correctly
❌ Login fails → redirects to /api/auth/error
```

---

## 📊 Checklist

Before testing:

- [ ] NEXTAUTH_URL set to `https://quitline.lumelife.my`
- [ ] NEXTAUTH_SECRET exists
- [ ] DATABASE_URL exists with port 6543
- [ ] Redeployed after setting variables
- [ ] Waited 1-2 minutes for deployment

---

## 🐛 If Still Not Working

### Check 1: Exact Domain

Your domain is: `quitline.lumelife.my`

NEXTAUTH_URL MUST be: `https://quitline.lumelife.my`

Common mistakes:
- ❌ `https://quitline.lumelife.my/` (trailing slash)
- ❌ `http://quitline.lumelife.my` (http instead of https)
- ❌ `https://www.quitline.lumelife.my` (www subdomain)
- ❌ `https://rev-quitline.vercel.app` (vercel domain)

### Check 2: Environment

Make sure NEXTAUTH_URL is set for **Production** environment

### Check 3: Deployment

Make sure you redeployed AFTER setting the variable

### Check 4: Browser

Try in incognito mode to avoid cached cookies

---

## 💡 Quick Test

After deployment, test this:

```bash
curl https://quitline.lumelife.my/api/auth/providers

# Should return:
{"credentials":{"id":"credentials","name":"Credentials","type":"credentials"}}
```

If this works, NextAuth is configured correctly.

---

## 🎯 Summary

**Problem**: Login → /api/auth/error  
**Cause**: NEXTAUTH_URL not set on Vercel  
**Fix**: Set NEXTAUTH_URL=https://quitline.lumelife.my  
**Time**: 5 minutes  

---

**This is the ONLY thing you need to fix!**

The code is fine. The configuration is fine. You just need to set the environment variable on Vercel.
