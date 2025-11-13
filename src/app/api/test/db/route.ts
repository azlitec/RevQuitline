import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Database Test Endpoint
 * 
 * Provides diagnostic capability to verify database connectivity and environment configuration.
 * This endpoint is critical for debugging deployment issues on Vercel.
 * 
 * @route GET /api/test/db
 * @returns JSON response with connection status, user count, and environment details
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Validate environment variables
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const nodeEnv = process.env.NODE_ENV || 'unknown';

    // Check if DATABASE_URL has correct format for Vercel
    const dbUrlValid = hasDbUrl && 
      process.env.DATABASE_URL!.includes(':6543') && 
      process.env.DATABASE_URL!.includes('pgbouncer=true');

    const environment = {
      hasDbUrl,
      hasNextAuthUrl,
      hasNextAuthSecret,
      nodeEnv,
      dbUrlValid,
      dbUrlPort: hasDbUrl ? (process.env.DATABASE_URL!.includes(':6543') ? '6543' : 'other') : 'missing',
      hasPgBouncer: hasDbUrl ? process.env.DATABASE_URL!.includes('pgbouncer=true') : false,
    };

    // Log environment check
    console.log('[DB Test] Environment check:', {
      timestamp: new Date().toISOString(),
      ...environment,
    });

    // Check for missing critical variables
    if (!hasDbUrl) {
      console.error('[DB Test] DATABASE_URL is missing');
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not configured',
        details: 'Add DATABASE_URL to environment variables',
        environment,
      }, { status: 500 });
    }

    if (!dbUrlValid) {
      console.error('[DB Test] DATABASE_URL format incorrect:', {
        hasPort6543: process.env.DATABASE_URL!.includes(':6543'),
        hasPgBouncer: process.env.DATABASE_URL!.includes('pgbouncer=true'),
      });
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL configuration incorrect',
        details: 'Must use port 6543 with pgbouncer=true for Vercel serverless',
        environment,
      }, { status: 500 });
    }

    if (!hasNextAuthUrl || !hasNextAuthSecret) {
      console.warn('[DB Test] NextAuth environment variables missing');
    }

    // Test database connection
    console.log('[DB Test] Attempting database connection...');
    
    // Execute a simple query to verify connectivity
    const userCount = await prisma.user.count();
    
    const responseTime = Date.now() - startTime;
    
    console.log('[DB Test] Database connection successful:', {
      timestamp: new Date().toISOString(),
      userCount,
      responseTime: `${responseTime}ms`,
    });

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      userCount,
      database: 'connected',
      responseTime: `${responseTime}ms`,
      environment,
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Log detailed error information
    console.error('[DB Test] Database connection failed:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      code: error.code,
      stack: error.stack,
      responseTime: `${responseTime}ms`,
    });

    // Return user-friendly error
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error.message,
      errorCode: error.code || 'UNKNOWN',
      responseTime: `${responseTime}ms`,
      environment: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nodeEnv: process.env.NODE_ENV || 'unknown',
      },
    }, { status: 500 });
  }
}
