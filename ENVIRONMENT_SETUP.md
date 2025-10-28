# Environment Setup Guide

## 🔧 Environment Variables Configuration

This guide will help you set up the required environment variables for the healthcare web application.

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Required Configuration

#### Database (PostgreSQL)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/healthcare_db?schema=public"
```

**Setup Steps:**
1. Install PostgreSQL locally or use a cloud service
2. Create a database named `healthcare_db`
3. Update the connection string with your credentials

#### NextAuth (Authentication)
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
```

**Setup Steps:**
1. Generate a secure secret: `openssl rand -base64 32`
2. Replace `your-super-secret-key-change-this-in-production` with the generated secret
3. For production, update `NEXTAUTH_URL` to your domain

### 3. Optional Services

#### Email (SendGrid)
```env
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@yourdomain.com"
```

**Setup Steps:**
1. Create a SendGrid account
2. Generate an API key
3. Verify your sender email

#### Firebase (Push Notifications)
```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
```

**Setup Steps:**
1. Create a Firebase project
2. Generate service account credentials
3. Download the JSON file and extract the required fields

#### Google Services (Calendar Integration)
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Setup Steps:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs

### 4. Development vs Production

#### Development Settings
```env
NODE_ENV="development"
DEBUG_MODE=true
ENABLE_CONSOLE_LOGS=true
```

#### Production Settings
```env
NODE_ENV="production"
DEBUG_MODE=false
ENABLE_CONSOLE_LOGS=false
NEXTAUTH_URL="https://yourdomain.com"
```

### 5. Performance Configuration

#### Cache Settings
```env
CACHE_TTL_SECONDS=300          # 5 minutes cache
MAX_CACHE_SIZE=1000           # Maximum cache entries
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes window
RATE_LIMIT_MAX_REQUESTS=100   # Max requests per window
```

#### Performance Monitoring
```env
ENABLE_PERFORMANCE_MONITORING=true
LOG_SLOW_QUERIES=true
SLOW_QUERY_THRESHOLD_MS=1000  # Log queries slower than 1s
```

### 6. Security Best Practices

#### Strong Secrets
- Use `openssl rand -base64 32` to generate secure secrets
- Never commit real secrets to version control
- Use different secrets for different environments

#### Database Security
- Use strong passwords
- Enable SSL for production databases
- Restrict database access by IP

#### API Security
- Set appropriate rate limits
- Use HTTPS in production
- Validate all input data

### 7. Quick Start Commands

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev

# 5. Start development server
npm run dev
```

### 8. Environment Validation

The application will validate required environment variables on startup. If any required variables are missing, you'll see helpful error messages.

### 9. Troubleshooting

#### Database Connection Issues
- Check if PostgreSQL is running
- Verify connection string format
- Ensure database exists
- Check firewall settings

#### Authentication Issues
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Ensure OAuth providers are configured correctly

#### Performance Issues
- Adjust cache settings based on your needs
- Monitor slow query logs
- Check rate limiting configuration

### 10. Production Deployment

For production deployment, ensure:

1. **Security**: All secrets are properly secured
2. **Database**: Use a managed database service
3. **Caching**: Consider Redis for distributed caching
4. **Monitoring**: Set up proper logging and monitoring
5. **Backup**: Regular database backups
6. **SSL**: HTTPS everywhere

### 11. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | - | NextAuth encryption secret |
| `NEXTAUTH_URL` | ✅ | - | Application base URL |
| `SENDGRID_API_KEY` | ❌ | - | Email service API key |
| `FIREBASE_PROJECT_ID` | ❌ | - | Firebase project identifier |
| `CACHE_TTL_SECONDS` | ❌ | 300 | Cache expiration time |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | 100 | Rate limit threshold |

### 12. Support

If you encounter issues with environment setup:

1. Check the console for specific error messages
2. Verify all required variables are set
3. Test database connectivity
4. Review the application logs

For additional help, refer to the main README.md or create an issue in the repository.