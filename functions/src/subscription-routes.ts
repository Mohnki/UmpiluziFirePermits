import { Router, Request, Response } from "express";
import { authenticateUser, requireBillingAccess } from "./auth-middleware";
import { db } from "./firebase-service";
import { paystackSecretKey } from "./paystack-webhook";

const router = Router();

router.use(authenticateUser, requireBillingAccess);

// GET /api/subscriptions/status
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();
    if (!sub) {
      return res.json({
        success: true,
        data: {
          subscriptionStatus: "none",
          isFree: true,
          softLockEnabled: false,
          isActive: true,
        },
      });
    }
    const isActive =
      sub.isFree ||
      sub.subscriptionStatus === "active" ||
      sub.subscriptionStatus === "free" ||
      (sub.subscriptionStatus === "cancelled" &&
        sub.currentPeriodEnd &&
        new Date(sub.currentPeriodEnd) > new Date());
    return res.json({ success: true, data: { ...sub, isActive } });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to get status" });
  }
});

// POST /api/subscriptions/initialize
router.post("/initialize", async (req: Request, res: Response) => {
  try {
    const { plan, email } = req.body;
    if (!plan || !email) {
      return res
        .status(400)
        .json({ success: false, error: "plan and email required" });
    }
    if (plan !== "monthly" && plan !== "annual") {
      return res
        .status(400)
        .json({ success: false, error: "plan must be monthly or annual" });
    }

    const configDoc = await db.doc("system/paystackConfig").get();
    const config = configDoc.data();
    if (!config?.publicKey) {
      return res.status(500).json({
        success: false,
        error:
          "Paystack not configured. Ask superadmin to set plan codes.",
      });
    }

    const planCode =
      plan === "monthly" ? config.monthlyPlanCode : config.annualPlanCode;
    if (!planCode) {
      return res
        .status(500)
        .json({ success: false, error: `No ${plan} plan code configured` });
    }

    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();
    let startDate: string | undefined;
    if (
      sub?.subscriptionStatus === "cancelled" &&
      sub?.currentPeriodEnd
    ) {
      const periodEnd = new Date(sub.currentPeriodEnd);
      if (periodEnd > new Date()) {
        startDate = periodEnd.toISOString();
      }
    }

    return res.json({
      success: true,
      data: {
        publicKey: config.publicKey,
        email,
        planCode,
        currency: "ZAR",
        plan,
        startDate,
        metadata: { plan, startDate },
      },
    });
  } catch (error) {
    console.error("Error initializing subscription:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to initialize" });
  }
});

// POST /api/subscriptions/cancel
router.post("/cancel", async (_req: Request, res: Response) => {
  try {
    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();
    if (!sub?.subscriptionCode) {
      return res
        .status(400)
        .json({ success: false, error: "No active subscription" });
    }
    if (!sub.subscriptionEmailToken) {
      return res.status(400).json({
        success: false,
        error: "Email token missing — contact support",
      });
    }

    const secret = paystackSecretKey.value();
    if (!secret) {
      return res
        .status(500)
        .json({ success: false, error: "Paystack not configured" });
    }

    const paystackRes = await fetch(
      "https://api.paystack.co/subscription/disable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: sub.subscriptionCode,
          token: sub.subscriptionEmailToken,
        }),
      }
    );

    if (!paystackRes.ok) {
      const err = await paystackRes.json();
      console.error("[Subscription Cancel] Paystack error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to cancel with payment provider",
      });
    }

    await db
      .doc("system/subscription")
      .update({ subscriptionStatus: "cancelled" });
    return res.json({
      success: true,
      message:
        "Subscription cancelled. Access continues until end of current period.",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel" });
  }
});

// POST /api/subscriptions/create-with-saved-card
router.post(
  "/create-with-saved-card",
  async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      if (!plan || (plan !== "monthly" && plan !== "annual")) {
        return res.status(400).json({
          success: false,
          error: "plan must be monthly or annual",
        });
      }

      const subDoc = await db.doc("system/subscription").get();
      const sub = subDoc.data();
      if (!sub?.paystackCustomerCode) {
        return res.status(400).json({
          success: false,
          error:
            "No saved payment method. Please use the payment form first.",
        });
      }

      const secret = paystackSecretKey.value();
      if (!secret) {
        return res
          .status(500)
          .json({ success: false, error: "Paystack not configured" });
      }

      const configDoc = await db.doc("system/paystackConfig").get();
      const config = configDoc.data();
      const planCode =
        plan === "monthly"
          ? config?.monthlyPlanCode
          : config?.annualPlanCode;
      if (!planCode) {
        return res.status(500).json({
          success: false,
          error: `No ${plan} plan code configured`,
        });
      }

      const authRes = await fetch(
        `https://api.paystack.co/customer/${sub.paystackCustomerCode}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      const authResult = await authRes.json();
      const auths =
        authResult.data?.authorizations?.filter(
          (a: any) => a.reusable && a.channel === "card"
        ) || [];
      if (auths.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid saved payment method",
        });
      }

      let startDate: string | undefined;
      if (
        sub.subscriptionStatus === "cancelled" &&
        sub.currentPeriodEnd
      ) {
        const periodEnd = new Date(sub.currentPeriodEnd);
        if (periodEnd > new Date()) {
          startDate = periodEnd.toISOString();
        }
      }

      const subscriptionData: any = {
        customer: sub.paystackCustomerCode,
        plan: planCode,
        authorization: auths[0].authorization_code,
        metadata: { plan, startDate },
      };
      if (startDate) subscriptionData.start_date = startDate;

      const paystackRes = await fetch(
        "https://api.paystack.co/subscription",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptionData),
        }
      );
      const result = await paystackRes.json();
      if (!result.status || !result.data?.subscription_code) {
        return res.status(400).json({
          success: false,
          error: result.message || "Failed to create subscription",
        });
      }

      return res.json({
        success: true,
        data: {
          subscriptionCode: result.data.subscription_code,
          nextPaymentDate: result.data.next_payment_date,
        },
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create subscription",
      });
    }
  }
);

export { router as subscriptionRoutes };
