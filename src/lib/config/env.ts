/**
 * Environment variables validation and configuration
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  
  // Email (optional)
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // Firebase (completely optional)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  
  // Google Services (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().int().positive()).default('10485760'),
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().int().min(10).max(15)).default('12'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),
  
  // Cache
  CACHE_TTL_SECONDS: z.string().transform(Number).pipe(z.number().int().positive()).default('300'),
  MAX_CACHE_SIZE: z.string().transform(Number).pipe(z.number().int().positive()).default('1000'),
  
  // Performance Monitoring
  ENABLE_PERFORMANCE_MONITORING: z.string().transform(val => val === 'true').default('true'),
  LOG_SLOW_QUERIES: z.string().transform(val => val === 'true').default('true'),
  SLOW_QUERY_THRESHOLD_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('1000'),
  
  // Development
  DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  ENABLE_CONSOLE_LOGS: z.string().transform(val => val === 'true').default('false'),
  
  // API Rate Limiting
  API_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('60000'),
  API_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default('60'),
  
  // Session
  SESSION_MAX_AGE: z.string().transform(Number).pipe(z.number().int().positive()).default('2592000'),
  SESSION_UPDATE_AGE: z.string().transform(Number).pipe(z.number().int().positive()).default('86400'),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  
  // Health Check
  HEALTH_CHECK_INTERVAL_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('30000'),
  DATABASE_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('5000'),
});

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      
      console.error('❌ Environment validation failed:');
      console.error('Missing or invalid environment variables:');
      missingVars.forEach(msg => console.error(`  - ${msg}`));
      console.error('\n📖 Please check ENVIRONMENT_SETUP.md for configuration guide');
      
      process.exit(1);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Configuration objects
export const dbConfig = {
  url: env.DATABASE_URL,
  timeout: env.DATABASE_TIMEOUT_MS,
};

export const authConfig = {
  url: env.NEXTAUTH_URL,
  secret: env.NEXTAUTH_SECRET,
  sessionMaxAge: env.SESSION_MAX_AGE,
  sessionUpdateAge: env.SESSION_UPDATE_AGE,
};

export const cacheConfig = {
  ttlSeconds: env.CACHE_TTL_SECONDS,
  maxSize: env.MAX_CACHE_SIZE,
};

export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  apiWindowMs: env.API_RATE_LIMIT_WINDOW_MS,
  apiMaxRequests: env.API_RATE_LIMIT_MAX_REQUESTS,
};

export const uploadConfig = {
  maxFileSize: env.MAX_FILE_SIZE,
  uploadDir: env.UPLOAD_DIR,
};

export const performanceConfig = {
  enableMonitoring: env.ENABLE_PERFORMANCE_MONITORING,
  logSlowQueries: env.LOG_SLOW_QUERIES,
  slowQueryThreshold: env.SLOW_QUERY_THRESHOLD_MS,
};

export const securityConfig = {
  bcryptRounds: env.BCRYPT_ROUNDS,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
};

// Email configuration (optional)
export const emailConfig = env.SENDGRID_API_KEY ? {
  apiKey: env.SENDGRID_API_KEY,
  fromEmail: env.FROM_EMAIL || 'noreply@localhost',
} : null;

// Firebase configuration (optional)
export const firebaseConfig = env.FIREBASE_PROJECT_ID ? {
  projectId: env.FIREBASE_PROJECT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
} : null;

// Google configuration (optional)
export const googleConfig = env.GOOGLE_CLIENT_ID ? {
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
} : null;

// Development helpers
export const devConfig = {
  debugMode: env.DEBUG_MODE,
  enableConsoleLogs: env.ENABLE_CONSOLE_LOGS,
  healthCheckInterval: env.HEALTH_CHECK_INTERVAL_MS,
};

// Validation helper for runtime checks
export function requireEnvVar(name: string, value?: string): string {
  const envValue = value || process.env[name];
  if (!envValue) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return envValue;
}

// Log configuration summary (for debugging)
export function logConfigSummary() {
  if (!isDevelopment) return;
  
  console.log('🔧 Configuration Summary:');
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Port: ${env.PORT}`);
  console.log(`  Database: ${env.DATABASE_URL.includes('localhost') ? 'Local' : 'Remote'}`);
  console.log(`  Cache TTL: ${env.CACHE_TTL_SECONDS}s`);
  console.log(`  Rate Limit: ${env.RATE_LIMIT_MAX_REQUESTS} requests/${env.RATE_LIMIT_WINDOW_MS}ms`);
  console.log(`  Performance Monitoring: ${env.ENABLE_PERFORMANCE_MONITORING ? 'Enabled' : 'Disabled'}`);
  console.log(`  Email Service: ${emailConfig ? 'Configured' : 'Not configured'}`);
  console.log(`  Firebase: ${firebaseConfig ? 'Configured' : 'Not configured'}`);
  console.log(`  Google Services: ${googleConfig ? 'Configured' : 'Not configured'}`);
}