import { Request, Response, NextFunction } from "express";
import { db } from "./firebase-service";

/**
 * Soft-lock middleware: blocks write operations when soft-lock is active
 * and subscription is not active/free. Superadmin is always exempt.
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role === "superadmin") return next();

  try {
    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();

    if (!sub || !sub.softLockEnabled) return next();

    const isActive =
      sub.isFree ||
      sub.subscriptionStatus === "active" ||
      sub.subscriptionStatus === "free" ||
      (sub.subscriptionStatus === "cancelled" &&
        sub.currentPeriodEnd &&
        new Date(sub.currentPeriodEnd) > new Date());

    if (isActive) return next();

    return res.status(402).json({
      success: false,
      error:
        "Subscription inactive. Contact your administrator to restore access.",
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return next(); // Fail open
  }
}
