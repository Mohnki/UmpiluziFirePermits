import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Request, Response, NextFunction } from "express";

const db = getFirestore();

const RATE_LIMITS: Record<string, { requests: number; windowMinutes: number }> = {
  "/api/permits": { requests: 100, windowMinutes: 60 },
  "/api/areas": { requests: 50, windowMinutes: 60 },
  "/api/burn-types": { requests: 30, windowMinutes: 60 },
  "/api/user/profile": { requests: 20, windowMinutes: 60 },
  default: { requests: 200, windowMinutes: 60 },
};

const DAILY_LIMITS: Record<string, number> = {
  "api-user": 1000,
  "area-manager": 500,
  admin: 2000,
  user: 100,
};

export class RateLimitService {
  static async logApiUsage(
    req: Request,
    res: Response,
    responseTime: number,
    userId: string
  ): Promise<void> {
    try {
      await db.collection("apiUsageLogs").add({
        userId,
        endpoint: req.path,
        method: req.method,
        queryParams: req.query as Record<string, any>,
        timestamp: Timestamp.fromDate(new Date()),
        responseStatus: res.statusCode,
        responseTime,
        userAgent: req.get("User-Agent") || null,
        ipAddress: req.ip || null,
      });
    } catch (error) {
      console.error("Error logging API usage:", error);
    }
  }

  static async checkRateLimit(
    userId: string,
    endpoint: string,
    userRole: string
  ): Promise<{ allowed: boolean; resetTime?: Date; remainingRequests?: number }> {
    try {
      const now = new Date();
      const cfg = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
      const windowStart = new Date(now.getTime() - cfg.windowMinutes * 60 * 1000);
      const hourlyCount = await RateLimitService.getRequestCount(userId, endpoint, windowStart);
      if (hourlyCount >= cfg.requests) {
        return {
          allowed: false,
          resetTime: new Date(windowStart.getTime() + cfg.windowMinutes * 60 * 1000),
          remainingRequests: 0,
        };
      }
      const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dailyCount = await RateLimitService.getRequestCount(userId, null, dailyStart);
      const dailyLimit = DAILY_LIMITS[userRole] || DAILY_LIMITS.user;
      if (dailyCount >= dailyLimit) {
        return {
          allowed: false,
          resetTime: new Date(dailyStart.getTime() + 24 * 60 * 60 * 1000),
          remainingRequests: 0,
        };
      }
      return {
        allowed: true,
        remainingRequests: Math.min(cfg.requests - hourlyCount, dailyLimit - dailyCount),
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return { allowed: true };
    }
  }

  private static async getRequestCount(
    userId: string,
    endpoint: string | null,
    since: Date
  ): Promise<number> {
    let q = db
      .collection("apiUsageLogs")
      .where("userId", "==", userId)
      .where("timestamp", ">=", Timestamp.fromDate(since));
    if (endpoint) q = q.where("endpoint", "==", endpoint);
    const snapshot = await q.get();
    return snapshot.size;
  }
}

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;
    if (req.user) {
      RateLimitService.logApiUsage(req, res, responseTime, req.user.uid).catch((err) =>
        console.error("Logging error:", err)
      );
    }
    return originalJson(body);
  };
  next();
};

export const checkRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return next();
  try {
    const result = await RateLimitService.checkRateLimit(req.user.uid, req.path, req.user.role);
    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        resetTime: result.resetTime?.toISOString(),
        remainingRequests: 0,
      });
    }
    if (result.remainingRequests !== undefined) {
      res.set("X-RateLimit-Remaining", result.remainingRequests.toString());
    }
    if (result.resetTime) {
      res.set("X-RateLimit-Reset", Math.ceil(result.resetTime.getTime() / 1000).toString());
    }
    return next();
  } catch (error) {
    console.error("Rate limit check error:", error);
    return next();
  }
};
