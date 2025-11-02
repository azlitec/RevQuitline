# BayarCash Payment Gateway Setup Guide

## Overview
BayarCash adalah payment gateway Malaysia yang membolehkan penerimaan pembayaran melalui pelbagai kaedah termasuk kad kredit, online banking, dan e-wallet.

## Required Credentials

Untuk integrate dengan BayarCash, anda memerlukan credentials berikut dari BayarCash merchant dashboard:

### 1. Personal Access Token (PAT)
- Authentication token untuk API calls
- Diperlukan dalam Authorization header
- Format: Bearer token
- Contoh: `pat_live_abc123...`

### 2. API Secret Key
- Private key untuk signature generation
- Digunakan untuk verify callback authenticity
- Format: Long alphanumeric string
- **PENTING**: Jangan share secret key ini!

### 3. Portal Key
- Additional authentication key
- Diperlukan dalam X-Portal-Key header
- Format: Alphanumeric string
- Contoh: `portal_xyz789...`

## How to Get Credentials

### Step 1: Register BayarCash Account
1. Visit [BayarCash website](https://bayarcash.com)
2. Sign up for merchant account
3. Complete KYC verification process
4. Wait for account approval

### Step 2: Access Merchant Dashboard
1. Login to BayarCash merchant portal
2. Navigate to "API Settings" or "Integration"
3. Generate or copy your credentials:
   - Merchant ID
   - Secret Key
   - API Key/PAT

### Step 3: Configure Webhook URLs
Set up callback URLs in BayarCash dashboard:
- **Return URL**: `https://yourdomain.com/patient/payment/return`
- **Callback URL**: `https://yourdomain.com/api/payment/callback`

## API URLs (Updated Based on Official Documentation)

BayarCash menggunakan URL yang berbeza untuk sandbox dan production:

### Production URLs:
- **API v3**: `https://api.console.bayar.cash/v3` (Recommended)
- **API v2**: `https://console.bayar.cash/api/v2` (Legacy)

### Sandbox URLs:
- **API v3**: `https://api.console.bayarcash-sandbox.com/v3` (Recommended)
- **API v2**: `https://console.bayarcash-sandbox.com/api/v2` (Legacy)

## Environment Configuration

### Development Environment (.env)
```env
# BayarCash Payment Gateway Configuration - DEVELOPMENT
# Using sandbox environment for testing
BAYARCASH_API_URL="https://api.console.bayarcash-sandbox.com/v3"
BAYARCASH_PAT="your-sandbox-personal-access-token"
BAYARCASH_API_SECRET="your-sandbox-api-secret-key"
BAYARCASH_PORTAL_KEY="your-sandbox-portal-key"
BAYARCASH_RETURN_URL="http://localhost:3000/patient/payment/return"
BAYARCASH_CALLBACK_URL="http://localhost:3000/api/payment/callback"
```

### Production Environment (.env.production)
```env
# BayarCash Payment Gateway Configuration - PRODUCTION
BAYARCASH_API_URL="https://api.console.bayar.cash/v3"
BAYARCASH_PAT="your-production-personal-access-token"
BAYARCASH_API_SECRET="your-production-api-secret-key"
BAYARCASH_PORTAL_KEY="your-production-portal-key"
BAYARCASH_RETURN_URL="https://yourdomain.com/patient/payment/return"
BAYARCASH_CALLBACK_URL="https://yourdomain.com/api/payment/callback"
```

## URL Purposes Explained

### Return URL vs Callback URL

#### Return URL (Frontend)
- **Purpose**: Halaman di mana pengguna akan dihantar balik selepas pembayaran
- **Type**: Frontend route (user-facing page)
- **When called**: Selepas pengguna selesai/batal pembayaran di BayarCash
- **Reliability**: Tidak boleh dipercayai 100% (pengguna boleh tutup browser)
- **Usage**: Untuk memaparkan mesej "Terima kasih" atau status pembayaran
- **Example**: `https://yourdomain.com/patient/payment/return`

#### Callback URL (Backend/Webhook)
- **Purpose**: API endpoint untuk menerima notifikasi status pembayaran
- **Type**: Backend API route (server-to-server)
- **When called**: Apabila status pembayaran berubah (success/failed/pending)
- **Reliability**: Sangat boleh dipercayai (server-to-server communication)
- **Usage**: Untuk mengemas kini database dan status pembayaran
- **Example**: `https://yourdomain.com/api/payment/callback`

## Testing

### Test Payment Flow
1. Book an appointment with price
2. Click "Pay Now" button
3. Should redirect to BayarCash payment page
4. Use test card numbers provided by BayarCash
5. Complete payment and verify callback

## Supported Payment Methods

BayarCash typically supports:
- **Credit/Debit Cards**: Visa, Mastercard, American Express
- **Online Banking**: Maybank2u, CIMB Clicks, Public Bank, RHB, etc.
- **E-Wallets**: Touch 'n Go eWallet, GrabPay, Boost
- **Bank Transfer**: FPX (Financial Process Exchange)

## Security Notes

1. **Never expose credentials** in client-side code
2. **Use HTTPS** for all callback URLs
3. **Verify signatures** for all callbacks
4. **Store credentials securely** in environment variables
5. **Use different credentials** for production vs staging

## Troubleshooting

### Common Issues:

1. **"Invalid API Key" Error**:
   - Check if API key is correct
   - Ensure proper Authorization header format
   - Verify API key is active in dashboard

2. **"Invalid Signature" Error**:
   - Check secret key configuration
   - Verify signature generation algorithm
   - Ensure all parameters are included in signature

3. **"Merchant Not Found" Error**:
   - Verify merchant ID is correct
   - Check if merchant account is active
   - Ensure account is approved for API access

4. **Callback Not Received**:
   - Check callback URL configuration
   - Ensure URL is publicly accessible
   - Verify webhook settings in dashboard

## Support

If you encounter issues:
1. Check BayarCash documentation
2. Contact BayarCash support team
3. Verify all credentials are correct
4. Test with sandbox environment first

## Production Checklist

Before going live:
- [ ] Production credentials configured
- [ ] Callback URLs updated to production domain
- [ ] SSL certificate installed
- [ ] Payment flow tested end-to-end
- [ ] Error handling implemented
- [ ] Logging configured for debugging