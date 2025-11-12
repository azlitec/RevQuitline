# ✅ BayarCash Correct Implementation Guide

## 🔐 Authentication Method (BETUL)

### ❌ SALAH (Old Implementation)
```typescript
// JANGAN GUNA INI!
headers: {
  'Authorization': `Bearer ${PAT}`,
  'X-Portal-Key': portalKey,  // ❌ SALAH! Portal key bukan header
}
```

### ✅ BETUL (New Implementation)
```typescript
// ✅ BETUL: Portal key dalam request body
headers: {
  'Authorization': `Bearer ${PAT}`,  // ✅ Only PAT in header
}

body: {
  portal_key: portalKey,  // ✅ Portal key in request body
  order_id: 'ORDER123',
  amount: 1000,
  // ... other fields
}
```

---

## 📋 Configuration Yang Betul

### Environment Variables

```env
# Production API URL (v3)
BAYARCASH_API_URL="https://api.console.bayar.cash/v3"

# Personal Access Token (JWT format)
BAYARCASH_PAT="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."

# API Secret (for signature generation)
BAYARCASH_API_SECRET="your-api-secret-key"

# Portal Key (for request body)
BAYARCASH_PORTAL_KEY="your-portal-key"

# Callback URLs
BAYARCASH_RETURN_URL="https://your-domain.com/patient/payment/return"
BAYARCASH_CALLBACK_URL="https://your-domain.com/api/payment/callback"
```

---

## 🔧 Implementation Details

### 1. Create Payment Request

```typescript
// ✅ CORRECT: Portal key in body
const payload = {
  portal_key: 'your-portal-key',  // ✅ In request body
  order_id: 'ORDER123',
  amount: 10000,  // RM 100.00 in cents
  currency: 'MYR',
  description: 'Appointment payment',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '+60123456789',
  return_url: 'https://your-domain.com/patient/payment/return',
  callback_url: 'https://your-domain.com/api/payment/callback',
  timestamp: Math.floor(Date.now() / 1000),
};

// Generate signature
const signature = generateSignature(payload);

// Send request
const response = await fetch('https://api.console.bayar.cash/v3/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PAT}`,  // ✅ Only PAT here
  },
  body: JSON.stringify({
    ...payload,
    signature,
  }),
});
```

### 2. Check Payment Status

```typescript
// ✅ CORRECT: Portal key in body
const payload = {
  portal_key: 'your-portal-key',  // ✅ In request body
  transaction_id: 'TXN123',
  timestamp: Math.floor(Date.now() / 1000),
};

const signature = generateSignature(payload);

const response = await fetch('https://api.console.bayar.cash/v3/payment/status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PAT}`,  // ✅ Only PAT here
  },
  body: JSON.stringify({
    ...payload,
    signature,
  }),
});
```

### 3. Signature Generation

```typescript
function generateSignature(data: any): string {
  // 1. Sort keys alphabetically
  const sortedKeys = Object.keys(data).sort();
  
  // 2. Create query string
  const queryString = sortedKeys
    .map(key => {
      const value = data[key];
      const encodedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      return `${key}=${encodedValue}`;
    })
    .join('&');
  
  // 3. Append API secret
  const stringToSign = queryString + '&api_secret=' + API_SECRET;
  
  // 4. Generate SHA256 hash
  const crypto = require('crypto');
  const signature = crypto
    .createHash('sha256')
    .update(stringToSign)
    .digest('hex');
  
  return signature;
}
```

---

## 📝 Request Body Structure

### Create Payment
```json
{
  "portal_key": "your-portal-key",
  "order_id": "ORDER123",
  "amount": 10000,
  "currency": "MYR",
  "description": "Appointment payment",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+60123456789",
  "return_url": "https://your-domain.com/patient/payment/return",
  "callback_url": "https://your-domain.com/api/payment/callback",
  "timestamp": 1699999999,
  "signature": "generated-sha256-hash"
}
```

### Check Status
```json
{
  "portal_key": "your-portal-key",
  "transaction_id": "TXN123",
  "timestamp": 1699999999,
  "signature": "generated-sha256-hash"
}
```

---

## 🔍 Verification

### Test Your Implementation

```typescript
// Test 1: Check configuration
const config = {
  pat: process.env.BAYARCASH_PAT,
  apiSecret: process.env.BAYARCASH_API_SECRET,
  portalKey: process.env.BAYARCASH_PORTAL_KEY,
  apiUrl: process.env.BAYARCASH_API_URL,
};

console.log('PAT format:', config.pat?.startsWith('eyJ') ? '✅ JWT' : '❌ Invalid');
console.log('API Secret length:', config.apiSecret?.length, '✅ Should be > 20');
console.log('Portal Key length:', config.portalKey?.length, '✅ Should be > 20');
console.log('API URL:', config.apiUrl);

// Test 2: Generate test signature
const testPayload = {
  portal_key: config.portalKey,
  order_id: 'TEST123',
  amount: 1000,
  timestamp: Math.floor(Date.now() / 1000),
};

const signature = generateSignature(testPayload);
console.log('Signature generated:', signature.length === 64 ? '✅ Valid SHA256' : '❌ Invalid');

// Test 3: Make test request
const response = await fetch(`${config.apiUrl}/payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.pat}`,
  },
  body: JSON.stringify({
    ...testPayload,
    signature,
  }),
});

console.log('API Response:', response.status);
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Portal Key in Header
```typescript
// SALAH!
headers: {
  'X-Portal-Key': portalKey,  // ❌ Don't do this
}
```

### ✅ Fix: Portal Key in Body
```typescript
// BETUL!
body: {
  portal_key: portalKey,  // ✅ Do this
}
```

### ❌ Mistake 2: Wrong API URL
```typescript
// SALAH untuk production!
BAYARCASH_API_URL="https://console.bayarcash-sandbox.com/api/v2"
```

### ✅ Fix: Correct Production URL
```typescript
// BETUL untuk production!
BAYARCASH_API_URL="https://api.console.bayar.cash/v3"
```

### ❌ Mistake 3: Missing Portal Key in Signature
```typescript
// SALAH! Portal key not included in signature
const payload = {
  order_id: 'ORDER123',
  amount: 1000,
  // Missing portal_key
};
```

### ✅ Fix: Include Portal Key
```typescript
// BETUL! Portal key included
const payload = {
  portal_key: 'your-portal-key',  // ✅ Must be included
  order_id: 'ORDER123',
  amount: 1000,
};
```

---

## 📊 API Endpoints

### Sandbox (Testing)
```
Base URL: https://console.bayarcash-sandbox.com/api/v2
```

### Production
```
Base URL: https://api.console.bayar.cash/v3
```

### Available Endpoints
- `POST /payment` - Create payment
- `POST /payment/status` - Check payment status
- `GET /test` - Test connectivity (optional)

---

## ✅ Implementation Checklist

Before deploying to production:

- [ ] Portal key is in request body (NOT in headers)
- [ ] Only PAT in Authorization header
- [ ] Signature includes portal_key field
- [ ] Using correct production API URL (v3)
- [ ] All credentials are from production dashboard
- [ ] Callback URL is publicly accessible
- [ ] Return URL is correct
- [ ] Signature generation is correct
- [ ] Test payment works in sandbox
- [ ] Error handling implemented

---

## 🔗 Official Documentation

- **BayarCash Docs**: https://docs.bayarcash.com/
- **API Reference**: https://docs.bayarcash.com/api-reference
- **Dashboard**: https://console.bayar.cash/

---

## 📞 Support

If you encounter issues:
1. Check BayarCash dashboard for error logs
2. Verify all credentials are correct
3. Test in sandbox first before production
4. Contact BayarCash support: support@bayarcash.com

---

**Status**: ✅ Implementation corrected according to BayarCash API specifications

**Last Updated**: November 10, 2025
