# Design Document

## Overview

This design document outlines the comprehensive optimization strategy for deploying the RevQuitline Healthcare application on Vercel's Hobby plan. The solution addresses key limitations including function timeouts, memory constraints, file storage restrictions, and the absence of background processes while maintaining full application functionality.

## Architecture

### Current Architecture Issues
- Local file storage in `uploads/` directory (5.3MB currently)
- Potential long-running API functions without timeout optimization
- Missing Vercel-specific configuration
- Cron job scripts that won't work on serverless
- No bundle size optimization
- Database connections without proper pooling configuration

### Target Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel Edge   │    │  Vercel Functions│    │   Supabase DB   │
│   (Static/CDN)  │    │  (API Routes)    │    │  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Cloudinary/    │    │   Optimized      │    │  Connection     │
│  Vercel Blob    │    │   Functions      │    │  Pooling        │
│  (File Storage) │    │   (<10s timeout) │    │  (Supabase)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. File Storage Migration

**Current Implementation:**
- Files stored in local `uploads/` directory
- Direct filesystem access via Node.js `fs` module
- 5.3MB of existing files need migration

**New Implementation:**
```typescript
interface CloudStorageAdapter {
  upload(file: File, options: UploadOptions): Promise<UploadResult>;
  delete(fileId: string): Promise<void>;
  getUrl(fileId: string): Promise<string>;
}

interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  id: string;
  url: string;
  publicId: string;
  size: number;
  format: string;
}
```

**Storage Options:**
1. **Vercel Blob Storage** (Recommended)
   - Native Vercel integration
   - Automatic CDN distribution
   - Simple API
   - Cost-effective for Hobby plan

2. **Cloudinary** (Alternative)
   - Advanced image processing
   - Automatic optimization
   - Generous free tier

### 2. Function Timeout Optimization

**Timeout Risk Areas:**
- File upload processing
- Payment webhook handling
- Database queries with joins
- Email sending operations

**Optimization Strategies:**
```typescript
// Async processing pattern
interface AsyncJobQueue {
  enqueue(job: JobPayload): Promise<string>;
  process(jobId: string): Promise<JobResult>;
  getStatus(jobId: string): Promise<JobStatus>;
}

// Timeout wrapper
function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 8000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Function timeout')), timeoutMs)
    )
  ]);
}
```

### 3. Database Connection Optimization

**Current Issues:**
- Basic Prisma client without connection limits
- No connection pooling configuration
- Potential connection leaks

**Optimized Configuration:**
```typescript
// Enhanced Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

// Connection management
class DatabaseManager {
  private static instance: PrismaClient;
  
  static getInstance(): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new PrismaClient({
        datasources: {
          db: {
            url: `${process.env.DATABASE_URL}?connection_limit=1&pool_timeout=20`
          }
        }
      });
    }
    return DatabaseManager.instance;
  }
  
  static async disconnect(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.$disconnect();
    }
  }
}
```

### 4. Bundle Size Optimization

**Current Bundle Analysis:**
- Large dependencies: `@react-pdf/renderer`, `googleapis`, `mongoose`
- Unused imports and dead code
- No code splitting implementation

**Optimization Strategy:**
```typescript
// Dynamic imports for heavy libraries
const PDFRenderer = dynamic(() => import('@react-pdf/renderer'), {
  ssr: false,
  loading: () => <div>Loading PDF generator...</div>
});

// Tree shaking configuration
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@prisma/client'
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mongoose': false, // Remove if not needed
    };
    return config;
  }
};
```

### 5. Background Process Elimination

**Current Cron Jobs to Convert:**
- `cron:send-reminders` → Webhook-triggered endpoint
- `cron:send-refill-reminders` → On-demand API call

**New Implementation:**
```typescript
// Convert cron to webhook endpoint
export async function POST(request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get('x-webhook-signature');
  if (!verifyWebhookSignature(signature)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process reminders with timeout protection
  return withTimeout(
    processReminders(),
    9000 // Leave 1 second buffer
  );
}

// External cron service configuration (GitHub Actions)
name: Send Reminders
on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM
jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Webhook
        run: |
          curl -X POST ${{ secrets.WEBHOOK_URL }}/api/cron/send-reminders \
            -H "x-webhook-signature: ${{ secrets.WEBHOOK_SECRET }}"
```

## Data Models

### File Storage Migration Model
```typescript
interface FileRecord {
  id: string;
  originalName: string;
  cloudUrl: string;
  cloudPublicId: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  migrated: boolean; // Track migration status
}
```

### Performance Monitoring Model
```typescript
interface PerformanceMetric {
  id: string;
  endpoint: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}
```

## Error Handling

### Timeout Error Handling
```typescript
class TimeoutError extends Error {
  constructor(operation: string) {
    super(`Operation '${operation}' exceeded timeout limit`);
    this.name = 'TimeoutError';
  }
}

// Global error handler
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof TimeoutError) {
    return NextResponse.json(
      { error: 'Request timeout', retry: true },
      { status: 408 }
    );
  }
  
  // Other error handling...
}
```

### File Upload Error Handling
```typescript
interface UploadError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED' | 'TIMEOUT';
  message: string;
  retryable: boolean;
}

function handleUploadError(error: unknown): UploadError {
  if (error instanceof TimeoutError) {
    return {
      code: 'TIMEOUT',
      message: 'Upload timed out, please try again',
      retryable: true
    };
  }
  // Handle other upload errors...
}
```

## Testing Strategy

### Performance Testing
```typescript
// Function timeout testing
describe('API Timeout Compliance', () => {
  test('all endpoints complete within 9 seconds', async () => {
    const endpoints = ['/api/uploads', '/api/payment/create', '/api/notifications'];
    
    for (const endpoint of endpoints) {
      const start = Date.now();
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: testData
      });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(9000);
      expect(response.ok).toBe(true);
    }
  });
});
```

### Bundle Size Testing
```typescript
// Bundle analysis testing
describe('Bundle Size Compliance', () => {
  test('total bundle size under 250MB', () => {
    const bundleSize = getBundleSize();
    expect(bundleSize).toBeLessThan(250 * 1024 * 1024);
  });
  
  test('individual chunks under 50MB', () => {
    const chunks = getChunkSizes();
    chunks.forEach(chunk => {
      expect(chunk.size).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
```

### File Storage Testing
```typescript
// Cloud storage integration testing
describe('Cloud Storage Integration', () => {
  test('file upload to cloud storage', async () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const result = await cloudStorage.upload(file);
    
    expect(result.url).toMatch(/^https:\/\//);
    expect(result.id).toBeDefined();
  });
  
  test('file deletion from cloud storage', async () => {
    const uploadResult = await cloudStorage.upload(testFile);
    await cloudStorage.delete(uploadResult.id);
    
    // Verify file is deleted
    await expect(cloudStorage.getUrl(uploadResult.id))
      .rejects.toThrow('File not found');
  });
});
```

## Deployment Configuration

### Vercel Configuration (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "NEXTAUTH_URL": "@nextauth-url"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### Environment Variables Setup
```bash
# Production environment variables for Vercel
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.vercel.app"
CLOUD_STORAGE_API_KEY="..."
WEBHOOK_SECRET="..."
```

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Configure Vercel project
2. Set up cloud storage (Vercel Blob)
3. Configure environment variables
4. Test basic deployment

### Phase 2: File Storage Migration
1. Implement cloud storage adapter
2. Migrate existing files from uploads/
3. Update file upload endpoints
4. Test file operations

### Phase 3: Performance Optimization
1. Implement timeout wrappers
2. Optimize database queries
3. Add bundle size optimization
4. Performance testing

### Phase 4: Background Process Migration
1. Convert cron jobs to webhooks
2. Set up external scheduling (GitHub Actions)
3. Test webhook endpoints
4. Monitor execution

### Phase 5: Final Optimization
1. Code splitting implementation
2. Dead code elimination
3. Final performance testing
4. Production deployment