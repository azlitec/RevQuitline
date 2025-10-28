/**
 * Performance monitoring utilities for API endpoints
 * Helps identify slow queries and bottlenecks
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  userId?: string;
  status: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  startTimer(endpoint: string, method: string, userId?: string) {
    const startTime = performance.now();
    
    return {
      end: (status: number = 200) => {
        const duration = performance.now() - startTime;
        this.recordMetric({
          endpoint,
          method,
          duration,
          timestamp: Date.now(),
          userId,
          status
        });
        return duration;
      }
    };
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests (> 1 second)
    if (metric.duration > 1000) {
      console.warn(`Slow API request: ${metric.method} ${metric.endpoint} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  getStats(timeWindowMs = 300000) { // Default 5 minutes
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        topSlowEndpoints: []
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const slowRequests = recentMetrics.filter(m => m.duration > 1000).length;
    const errorRequests = recentMetrics.filter(m => m.status >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    // Group by endpoint and calculate average response time
    const endpointStats = recentMetrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalDuration: 0, errors: 0 };
      }
      acc[key].count++;
      acc[key].totalDuration += metric.duration;
      if (metric.status >= 400) {
        acc[key].errors++;
      }
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; errors: number }>);

    const topSlowEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        averageResponseTime: stats.totalDuration / stats.count,
        requestCount: stats.count,
        errorRate: (stats.errors / stats.count) * 100
      }))
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      topSlowEndpoints
    };
  }

  clearMetrics() {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware wrapper for automatic performance monitoring
export function withPerformanceMonitoring(
  endpoint: string,
  method: string,
  handler: (userId?: string) => Promise<Response>
) {
  return async (request: Request, userId?: string): Promise<Response> => {
    const timer = performanceMonitor.startTimer(endpoint, method, userId);
    
    try {
      const response = await handler(userId);
      timer.end(response.status);
      return response;
    } catch (error) {
      timer.end(500);
      throw error;
    }
  };
}