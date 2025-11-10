# 🚀 Quick Vercel Deployment

## TL;DR - Deploy Sekarang!

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

## ⚡ Super Quick Setup (5 Minutes)

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click "Deploy"

### 3. Add Environment Variables
Go to Settings → Environment Variables, add:

**CRITICAL** (Must have):
```
DATABASE_URL=postgresql://postgres.jurngwvhwrswzvrgyeek:ZaqXsw123Zaq@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=77JVhwtR2Le3kq92+7XHJrJUXTnznGJvWFDQlY/TP2A=
```

**Payment** (Required for payments):
```
BAYARCASH_API_URL=https://console.bayarcash-sandbox.com/api/v2
BAYARCASH_PAT=your-token
BAYARCASH_API_SECRET=your-secret
BAYARCASH_PORTAL_KEY=your-key
BAYARCASH_RETURN_URL=https://your-app.vercel.app/patient/payment/return
BAYARCASH_CALLBACK_URL=https://your-app.vercel.app/api/payment/callback
```

### 4. Redeploy
Click "Redeploy" in Vercel dashboard

### 5. Test
Visit your app at `https://your-app.vercel.app`

---

## ✅ Deployment Checklist

Before deploying:
- [ ] Database URL uses port **6543** (not 5432)
- [ ] All environment variables ready
- [ ] Local build works: `npm run build`
- [ ] Tests pass (optional): `npm test`

After deploying:
- [ ] Login works
- [ ] Dashboard loads
- [ ] No console errors
- [ ] Mobile works

---

## 🆘 Common Issues

### "Function Timeout"
**Fix**: Already handled with 10s timeout protection

### "Database Connection Error"
**Fix**: Use port 6543 in DATABASE_URL

### "Module Not Found"
**Fix**: Run `npm install` locally first

### "Environment Variable Not Set"
**Fix**: Add in Vercel Settings → Environment Variables

---

## 📚 Full Documentation

- **Complete Guide**: See `VERCEL_DEPLOYMENT_GUIDE.md`
- **Fixes Applied**: See `VERCEL_FIXES_APPLIED.md`
- **Optimization Spec**: See `.kiro/specs/vercel-hobby-optimization/`

---

## 🎯 What's Optimized

✅ Database connection (port 6543)
✅ API timeout protection (10s max)
✅ Bundle size optimization
✅ Serverless configuration
✅ Error handling
✅ Loading states

---

## 📊 Vercel Hobby Limits

| Resource | Limit | Status |
|----------|-------|--------|
| Bandwidth | 100 GB/month | ✅ Safe |
| Function Duration | 10 seconds | ✅ Protected |
| Function Memory | 512 MB | ✅ Optimized |
| Build Time | 45 minutes | ✅ ~3-5 min |

---

## 🔗 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **BayarCash Dashboard**: https://console.bayarcash-sandbox.com

---

**Ready to deploy? Run `./deploy-vercel.sh` or follow the 5-minute setup above!** 🚀
