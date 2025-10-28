/**
 * Optimized database utilities for better performance
 * Includes connection pooling, query optimization, and caching
 */

import { prisma } from '@/lib/db';
import { memoryCache, createCacheKey } from '@/lib/cache/memory';

// Common select fields to avoid over-fetching
export const USER_SELECT_BASIC = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  createdAt: true,
} as const;

export const USER_SELECT_WITH_ROLE = {
  ...USER_SELECT_BASIC,
  role: true,
  isAdmin: true,
  isProvider: true,
  isClerk: true,
} as const;

export const APPOINTMENT_SELECT_BASIC = {
  id: true,
  date: true,
  status: true,
  type: true,
} as const;

// Optimized user queries with caching
export class OptimizedUserQueries {
  static async findUserById(id: string, useCache = true) {
    const cacheKey = createCacheKey('user', { id });
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_WITH_ROLE,
    });

    if (useCache && user) {
      memoryCache.set(cacheKey, user, 300); // Cache for 5 minutes
    }

    return user;
  }

  static async findUsersByRole(role: string, limit = 50) {
    const cacheKey = createCacheKey('users_by_role', { role, limit });
    const cached = memoryCache.get(cacheKey);
    
    if (cached) return cached;

    const users = await prisma.user.findMany({
      where: { role },
      select: USER_SELECT_BASIC,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    memoryCache.set(cacheKey, users, 180); // Cache for 3 minutes
    return users;
  }
}

// Optimized appointment queries
export class OptimizedAppointmentQueries {
  static async getPatientAppointmentStats(patientId: string) {
    const cacheKey = createCacheKey('patient_appt_stats', { patientId });
    const cached = memoryCache.get(cacheKey);
    
    if (cached) return cached;

    const stats = await prisma.appointment.groupBy({
      by: ['status'],
      where: { patientId },
      _count: { id: true },
    });

    const result = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    memoryCache.set(cacheKey, result, 60); // Cache for 1 minute
    return result;
  }

  static async getProviderAppointments(providerId: string, options: {
    status?: string[];
    limit?: number;
    includePatient?: boolean;
  } = {}) {
    const { status, limit = 50, includePatient = false } = options;
    
    const cacheKey = createCacheKey('provider_appointments', {
      providerId,
      status: status?.join(',') || 'all',
      limit,
      includePatient
    });
    
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    const where: any = { providerId };
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        ...APPOINTMENT_SELECT_BASIC,
        ...(includePatient && {
          patient: {
            select: USER_SELECT_BASIC
          }
        })
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    memoryCache.set(cacheKey, appointments, 30); // Cache for 30 seconds
    return appointments;
  }
}

// Batch operations for better performance
export class BatchOperations {
  static async getUsersWithAppointmentCounts(userIds: string[]) {
    if (userIds.length === 0) return [];

    // Use a single query with aggregation
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        ...USER_SELECT_BASIC,
        _count: {
          select: {
            appointmentsAsPatient: true,
            appointmentsAsProvider: true,
          }
        }
      }
    });

    return users;
  }

  static async getMultipleAppointmentStats(patientIds: string[], providerId: string) {
    if (patientIds.length === 0) return new Map();

    const stats = await prisma.appointment.groupBy({
      by: ['patientId', 'status'],
      where: {
        patientId: { in: patientIds },
        providerId,
      },
      _count: { id: true },
    });

    // Group by patient ID
    const result = new Map<string, Record<string, number>>();
    
    stats.forEach(stat => {
      if (!result.has(stat.patientId)) {
        result.set(stat.patientId, {});
      }
      result.get(stat.patientId)![stat.status] = stat._count.id;
    });

    return result;
  }
}

// Database health monitoring
export class DatabaseMonitor {
  static async checkHealth() {
    try {
      const start = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = performance.now() - start;
      
      return {
        healthy: true,
        responseTime: Math.round(duration),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async getConnectionInfo() {
    try {
      // Get basic connection pool info if available
      const result = await prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[];

      return result[0] || { total_connections: 0, active_connections: 0 };
    } catch (error) {
      console.warn('Could not get connection info:', error);
      return { total_connections: 0, active_connections: 0 };
    }
  }
}

// Query optimization helpers
export function optimizeQuery<T>(
  queryFn: () => Promise<T>,
  cacheKey: string,
  ttlSeconds = 300
): Promise<T> {
  const cached = memoryCache.get<T>(cacheKey);
  
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return queryFn().then(result => {
    memoryCache.set(cacheKey, result, ttlSeconds);
    return result;
  });
}