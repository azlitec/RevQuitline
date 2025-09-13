# RevQuitline - Smoking Cessation Platform

A comprehensive healthcare platform for smoking cessation management built with Next.js, Prisma, and PostgreSQL.

## Features

- Patient and provider dashboards
- Appointment scheduling system
- Electronic Health Records (EHR) management
- Smoking metrics tracking
- Medication management
- Email notifications via SendGrid
- Authentication with NextAuth.js

## Environment Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- SendGrid account (for email functionality)

### Environment Variables

Copy the `.env.example` file to `.env` and configure the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/revquitline"
DIRECT_URL="postgresql://username:password@localhost:5432/revquitline"

# NextAuth.js Configuration
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# SendGrid Email Service
SENDGRID_API_KEY="your-sendgrid-api-key-here"

# Environment
NODE_ENV="development"
```

### Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run database migrations
   npm run prisma:migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open Prisma Studio (optional):**
   ```bash
   npx prisma studio
   ```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
├── lib/                # Utility libraries
│   ├── auth/           # Authentication utilities
│   ├── db/             # Database utilities
│   └── email/          # Email service utilities
└── types/              # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma database GUI

## Deployment

The project is configured for deployment on Vercel:

```bash
# Deploy to production
vercel --prod
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models include:
- Users (patients, providers, admins)
- Appointments
- Health Records
- Vital Signs
- Smoking Metrics
- Medications
- Notifications

See `prisma/schema.prisma` for complete schema details.