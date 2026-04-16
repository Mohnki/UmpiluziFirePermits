import crypto from "crypto";
import { Request, Response } from "express";
import { db } from "./firebase-service";
import { defineSecret } from "firebase-functions/params";

export const paystackSecretKey = defineSecret("PAYSTACK_SECRET_KEY");

export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    const secret = paystackSecretKey.value();
    if (!secret) {
      console.error("[Paystack Webhook] PAYSTACK_SECRET_KEY not configured");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      console.error("[Paystack Webhook] Invalid signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body;
    console.log("[Paystack Webhook] Received:", event.event);

    const eventId =
      event.data?.id?.toString() || crypto.randomBytes(16).toString("hex");
    const subRef = db.doc("system/subscription");

    const subDoc = await subRef.get();
    if (subDoc.exists && subDoc.data()?.lastWebhookEventId === eventId) {
      console.log("[Paystack Webhook] Duplicate event, skipping:", eventId);
      return res.status(200).json({ message: "Already processed" });
    }

    switch (event.event) {
      case "subscription.create": {
        const d = event.data;
        const planType =
          d.plan?.interval === "annually" ? "annual" : "monthly";
        await subRef.update({
          subscriptionStatus: "active",
          subscriptionCode: d.subscription_code,
          subscriptionEmailToken: d.email_token,
          subscriptionPlan: planType,
          subscriptionStartedAt: new Date().toISOString(),
          currentPeriodEnd: d.next_payment_date,
          paystackCustomerCode: d.customer?.customer_code,
          lastWebhookEventId: eventId,
        });
        console.log("[Paystack Webhook] Subscription created, plan:", planType);
        break;
      }

      case "invoice.update": {
        const d = event.data;
        if (d.status === "success" && d.paid_at) {
          const periodEnd =
            d.period_end ||
            new Date(Date.now() + 30 * 86400000).toISOString();
          const existing = subDoc.data()?.currentPeriodEnd;
          const finalEnd =
            existing && new Date(existing) > new Date(periodEnd)
              ? existing
              : periodEnd;
          await subRef.update({
            subscriptionStatus: "active",
            currentPeriodEnd: finalEnd,
            lastWebhookEventId: eventId,
          });
          console.log(
            "[Paystack Webhook] Invoice paid, period end:",
            finalEnd
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        await subRef.update({
          subscriptionStatus: "past_due",
          lastWebhookEventId: eventId,
        });
        console.log("[Paystack Webhook] Payment failed — past_due");
        break;
      }

      case "subscription.not_renew":
      case "subscription.disable": {
        await subRef.update({
          subscriptionStatus: "cancelled",
          lastWebhookEventId: eventId,
        });
        console.log("[Paystack Webhook] Subscription cancelled/disabled");
        break;
      }

      default:
        console.log("[Paystack Webhook] Unhandled event:", event.event);
    }

    return res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    console.error("[Paystack Webhook] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
