import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { performanceMonitor } from '@/lib/performance/monitor';
import { memoryCache } from '@/lib/cache/memory';
import { DatabaseMonitor } from '@/lib/db/optimized';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin access
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '300000'); // Default 5 minutes

    // Get performance metrics
    const [apiStats, cacheStats, dbHealth, dbConnections] = await Promise.all([
      performanceMonitor.getStats(timeWindow),
      memoryCache.getStats(),
      DatabaseMonitor.checkHealth(),
      DatabaseMonitor.getConnectionInfo()
    ]);

    // System memory usage (if available)
    const memoryUsage = process.memoryUsage();

    const performanceData = {
      timestamp: new Date().toISOString(),
      timeWindowMs: timeWindow,
      api: {
        ...apiStats,
        requestsPerMinute: Math.round((apiStats.totalRequests / (timeWindow / 60000)) * 100) / 100
      },
      cache: {
        ...cacheStats,
        hitRate: 'N/A', // Would need to track hits/misses to calculate
        memoryUsageMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
      },
      database: {
        ...dbHealth,
        ...dbConnections,
        connectionPoolUtilization: dbConnections.total_connections > 0 
          ? Math.round((dbConnections.active_connections / dbConnections.total_connections) * 100)
          : 0
      },
      system: {
        memoryUsage: {
          heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
          external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
          rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version
      }
    };

    return NextResponse.json(performanceData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Clear performance metrics (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    performanceMonitor.clearMetrics();
    memoryCache.clear();

    return NextResponse.json({ 
      message: 'Performance metrics and cache cleared successfully' 
    });

  } catch (error) {
    console.error('Performance clear API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}