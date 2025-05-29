import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Request, Response, NextFunction } from 'express';
import { ApiUsageLog, RateLimit } from '../shared/schema';

const db = getFirestore();

// Rate limit configurations
const RATE_LIMITS: Record<string, { requests: number; windowMinutes: number }> = {
  '/api/permits': { requests: 100, windowMinutes: 60 }, // 100 requests per hour
  '/api/areas': { requests: 50, windowMinutes: 60 }, // 50 requests per hour
  '/api/burn-types': { requests: 30, windowMinutes: 60 }, // 30 requests per hour
  '/api/user/profile': { requests: 20, windowMinutes: 60 }, // 20 requests per hour
  default: { requests: 200, windowMinutes: 60 } // Default limit
};

// Daily limits for API users
const DAILY_LIMITS: Record<string, number> = {
  'api-user': 1000,
  'area-manager': 500,
  'admin': 2000,
  'user': 100
};

export class RateLimitService {
  static async logApiUsage(
    req: Request, 
    res: Response, 
    responseTime: number, 
    userId: string
  ): Promise<void> {
    try {
      const log: Omit<ApiUsageLog, 'id'> = {
        userId,
        endpoint: req.path,
        method: req.method,
        queryParams: req.query as Record<string, any>,
        timestamp: new Date(),
        responseStatus: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
      };

      await db.collection('apiUsageLogs').add({
        ...log,
        timestamp: Timestamp.fromDate(log.timestamp)
      });
    } catch (error) {
      console.error('Error logging API usage:', error);
      // Don't throw - logging failures shouldn't break API requests
    }
  }

  static async checkRateLimit(
    userId: string, 
    endpoint: string, 
    userRole: string
  ): Promise<{ allowed: boolean; resetTime?: Date; remainingRequests?: number }> {
    try {
      const now = new Date();
      const endpointConfig = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
      const windowStart = new Date(now.getTime() - (endpointConfig.windowMinutes * 60 * 1000));

      // Check hourly rate limit
      const hourlyCount = await this.getRequestCount(userId, endpoint, windowStart);
      
      if (hourlyCount >= endpointConfig.requests) {
        const resetTime = new Date(windowStart.getTime() + (endpointConfig.windowMinutes * 60 * 1000));
        return { 
          allowed: false, 
          resetTime, 
          remainingRequests: 0 
        };
      }

      // Check daily limit
      const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dailyCount = await this.getRequestCount(userId, null, dailyStart);
      const dailyLimit = DAILY_LIMITS[userRole] || DAILY_LIMITS.user;

      if (dailyCount >= dailyLimit) {
        const resetTime = new Date(dailyStart.getTime() + (24 * 60 * 60 * 1000));
        return { 
          allowed: false, 
          resetTime, 
          remainingRequests: 0 
        };
      }

      return { 
        allowed: true, 
        remainingRequests: Math.min(
          endpointConfig.requests - hourlyCount,
          dailyLimit - dailyCount
        )
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // If rate limiting fails, allow the request but log the error
      return { allowed: true };
    }
  }

  private static async getRequestCount(
    userId: string, 
    endpoint: string | null, 
    since: Date
  ): Promise<number> {
    let query = db.collection('apiUsageLogs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', Timestamp.fromDate(since));

    if (endpoint) {
      query = query.where('endpoint', '==', endpoint);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  static async getUsageStats(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalRequests: number;
    requestsByEndpoint: Record<string, number>;
    requestsByDay: Record<string, number>;
    averageResponseTime: number;
  }> {
    try {
      const snapshot = await db.collection('apiUsageLogs')
        .where('userId', '==', userId)
        .where('timestamp', '>=', Timestamp.fromDate(startDate))
        .where('timestamp', '<=', Timestamp.fromDate(endDate))
        .get();

      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        };
      });

      const requestsByEndpoint: Record<string, number> = {};
      const requestsByDay: Record<string, number> = {};
      let totalResponseTime = 0;

      logs.forEach((log: any) => {
        // Count by endpoint
        requestsByEndpoint[log.endpoint] = (requestsByEndpoint[log.endpoint] || 0) + 1;

        // Count by day
        const day = log.timestamp.toISOString().split('T')[0];
        requestsByDay[day] = (requestsByDay[day] || 0) + 1;

        // Sum response times
        totalResponseTime += log.responseTime || 0;
      });

      return {
        totalRequests: logs.length,
        requestsByEndpoint,
        requestsByDay,
        averageResponseTime: logs.length > 0 ? totalResponseTime / logs.length : 0
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw new Error('Failed to retrieve usage statistics');
    }
  }
}

// Middleware for rate limiting and logging
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Log API usage if user is authenticated
    if (req.user) {
      RateLimitService.logApiUsage(req, res, responseTime, req.user.uid)
        .catch(error => console.error('Logging error:', error));
    }

    return originalJson.call(this, body);
  };

  next();
};

export const checkRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(); // Skip rate limiting for unauthenticated requests
  }

  try {
    const { allowed, resetTime, remainingRequests } = await RateLimitService.checkRateLimit(
      req.user.uid,
      req.path,
      req.user.role
    );

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        resetTime: resetTime?.toISOString(),
        remainingRequests: 0
      });
    }

    // Add rate limit headers
    if (remainingRequests !== undefined) {
      res.set('X-RateLimit-Remaining', remainingRequests.toString());
    }
    if (resetTime) {
      res.set('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000).toString());
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    // If rate limiting fails, allow the request
    next();
  }
};