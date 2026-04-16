# Superadmin + Paystack Subscription System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `superadmin` role, Paystack subscription billing, and soft-lock infrastructure to UmpiluziFirePermits — with zero breaking changes to existing functionality.

**Architecture:** Single `system/subscription` Firestore doc tracks billing state. Paystack webhooks update it via Admin SDK. A new superadmin dashboard manages users, billing config, and toggles. Existing roles, routes, and client behavior are unchanged unless `softLockEnabled` is flipped on by superadmin.

**Tech Stack:** Firebase Functions (Express), Firestore, Paystack Inline JS + webhook API, React + shadcn/ui, Zod validation.

**Critical constraint:** Every task must leave the system fully functional. The existing `admin` role must continue to work identically. No Firestore rule must become more restrictive for existing roles. Build + deploy after each task group to verify.

---

## File Map

### New files — Functions
- `functions/src/superadmin-routes.ts` — superadmin-only API endpoints (user mgmt, config, toggles)
- `functions/src/subscription-routes.ts` — Paystack subscription endpoints (initialize, cancel, status, resubscribe)
- `functions/src/paystack-webhook.ts` — webhook handler with HMAC verification
- `functions/src/subscription-middleware.ts` — soft-lock enforcement middleware

### New files — Client
- `client/src/pages/SuperAdmin.tsx` — superadmin dashboard (users, subscription, config tabs)
- `client/src/components/SubscriptionManager.tsx` — billing UI for users with billing access
- `client/src/components/SoftLockBanner.tsx` — conditional banner when soft-locked
- `client/src/hooks/useSubscriptionStatus.ts` — React Query hook for subscription state

### Modified files — Functions
- `functions/src/schema.ts` — add `superadmin` to role enum, add subscription/config types
- `functions/src/auth-middleware.ts` — add `requireSuperAdmin`, `requireBillingAccess`, update `requireAdmin`
- `functions/src/routes.ts` — mount new route files
- `functions/src/firebase-service.ts` — add `UserProfile.canManageBilling` field handling
- `functions/src/app.ts` — add raw body parsing for webhook route

### Modified files — Client
- `client/src/lib/roles.ts` — add `superadmin` to UserRole
- `client/src/lib/AuthContext.tsx` — add `isSuperAdmin`, `canManageBilling` flags
- `client/src/lib/firebase.ts` — add `canManageBilling` to UserProfile interface
- `client/src/App.tsx` — add routes, render SoftLockBanner
- `client/src/components/Header.tsx` — add Super Admin + Billing nav items
- `client/src/pages/ApplyPermit.tsx` — disable submit when soft-locked
- `client/index.html` — add Paystack inline script

### Modified files — Config
- `firestore.rules` — add `isSuperAdmin()` helper, `system/{docId}` rules, update `isAdmin()`

---

### Task 1: Update role system (functions + client)

**Files:**
- Modify: `functions/src/schema.ts`
- Modify: `functions/src/auth-middleware.ts`
- Modify: `functions/src/firebase-service.ts:70-91` (getUserProfile)
- Modify: `client/src/lib/roles.ts`
- Modify: `client/src/lib/firebase.ts:252-260` (UserProfile interface)
- Modify: `client/src/lib/AuthContext.tsx`
- Modify: `shared/schema.ts:9` (role enum)

- [ ] **Step 1: Update `functions/src/schema.ts` — add superadmin to role enum + new types**

Add `"superadmin"` to the role enum and add subscription/config interfaces:

```typescript
// In userProfileSchema, change the role enum:
role: z.enum(["superadmin", "admin", "area-manager", "user", "api-user"]),

// Add to UserProfile interface:
export interface UserProfile {
  // ... existing fields ...
  canManageBilling?: boolean;
}

// Add new interfaces at bottom:
export interface SubscriptionState {
  subscriptionStatus: 'free' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'none';
  subscriptionCode?: string;
  subscriptionEmailToken?: string;
  subscriptionPlan?: string;
  subscriptionStartedAt?: string;
  currentPeriodEnd?: string;
  paystackCustomerCode?: string;
  isFree: boolean;
  softLockEnabled: boolean;
  lastWebhookEventId?: string;
}

export interface PaystackConfig {
  publicKey: string;
  monthlyPlanCode?: string;
  annualPlanCode?: string;
}
```

- [ ] **Step 2: Update `functions/src/auth-middleware.ts` — add new middleware, update existing**

```typescript
// Update requireAdmin to include superadmin:
export const requireAdmin = requireRole(["superadmin", "admin"]);
export const requireManagerAccess = requireRole(["superadmin", "admin", "area-manager"]);
export const requireApiAccess = requireRole(["superadmin", "admin", "area-manager", "api-user"]);

// Add new middleware after existing exports:
export const requireSuperAdmin = requireRole(["superadmin"]);

export const requireBillingAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  if (req.user.role === "superadmin" || req.user.canManageBilling) {
    return next();
  }
  return res.status(403).json({ success: false, error: "Billing access required" });
};
```

- [ ] **Step 3: Update `functions/src/firebase-service.ts` — handle canManageBilling in getUserProfile**

In `AuthService.getUserProfile`, add `canManageBilling` to the returned object:

```typescript
return {
  uid: data.uid,
  email: data.email,
  displayName: data.displayName,
  photoURL: data.photoURL || undefined,
  role: data.role,
  createdAt: convertTimestampToDate(data.createdAt),
  canManageBilling: data.canManageBilling || false,
};
```

- [ ] **Step 4: Update `client/src/lib/roles.ts`**

```typescript
export type UserRole = 'superadmin' | 'admin' | 'area-manager' | 'user' | 'api-user';

export const isSuperAdmin = (role: UserRole | undefined): boolean => {
  return role === 'superadmin';
};

export const isAdmin = (role: UserRole | undefined): boolean => {
  return role === 'admin' || role === 'superadmin';
};

export const isAreaManager = (role: UserRole | undefined): boolean => {
  return role === 'area-manager';
};

export const isApiUser = (role: UserRole | undefined): boolean => {
  return role === 'api-user';
};

export const hasManagerAccess = (role: UserRole | undefined): boolean => {
  return role === 'admin' || role === 'area-manager' || role === 'superadmin';
};
```

- [ ] **Step 5: Update `client/src/lib/firebase.ts` — add canManageBilling to UserProfile interface**

At the bottom of the file, update the `UserProfile` interface:

```typescript
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: Date;
  canManageBilling?: boolean;
}
```

- [ ] **Step 6: Update `client/src/lib/AuthContext.tsx` — add isSuperAdmin + canManageBilling**

```typescript
type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAreaManager: boolean;
  isApiUser: boolean;
  hasManagerAccess: boolean;
  canManageBilling: boolean;
};

// In the provider, update computed flags:
const isSuperAdmin = userProfile?.role === 'superadmin';
const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
const isAreaManager = userProfile?.role === 'area-manager';
const isApiUser = userProfile?.role === 'api-user';
const hasManagerAccess = isAdmin || isAreaManager;
const canManageBilling = isSuperAdmin || (userProfile?.canManageBilling ?? false);

// Update the Provider value:
value={{
  user, userProfile, loading,
  isAdmin, isSuperAdmin, isAreaManager, isApiUser,
  hasManagerAccess, canManageBilling
}}
```

- [ ] **Step 7: Update `shared/schema.ts` — add superadmin to role enum**

```typescript
role: z.enum(['superadmin', 'admin', 'area-manager', 'user', 'api-user']),
```

- [ ] **Step 8: Build and verify no breakage**

```bash
cd functions && npm run build
cd .. && npm run build
```

Both must succeed with zero errors.

- [ ] **Step 9: Commit**

```bash
git add functions/src/schema.ts functions/src/auth-middleware.ts functions/src/firebase-service.ts client/src/lib/roles.ts client/src/lib/firebase.ts client/src/lib/AuthContext.tsx shared/schema.ts
git commit -m "feat: add superadmin role to type system and middleware"
```

---

### Task 2: Update Firestore rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add isSuperAdmin helper and system collection rules**

In `firestore.rules`, add a `isSuperAdmin()` function and update `isAdmin()`:

```
// Replace existing isAdmin():
function isAdmin() {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin');
}

// Add new helper after isAdmin():
function isSuperAdmin() {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
}

// Add before the closing braces, after apiUsageLogs:
// System config — superadmin + billing users read; writes via Admin SDK only
match /system/{docId} {
  allow read: if isSuperAdmin() ||
    (isAuthenticated() &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.canManageBilling == true);
  allow write: if false;
}
```

- [ ] **Step 2: Deploy rules**

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add superadmin and system collection to Firestore rules"
```

---

### Task 3: Create migration script + seed system docs

**Files:**
- Create: `scripts/migrate-superadmin.ts`

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-superadmin.ts`:

```typescript
/**
 * One-time migration: set willem@alasia.co.za as superadmin,
 * create system/subscription and system/paystackConfig docs.
 *
 * Run: npx tsx scripts/migrate-superadmin.ts
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase default credentials.
 */
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "umpiluzi-fire-permits" });
}

const db = admin.firestore();

async function migrate() {
  // 1. Find willem@alasia.co.za and set to superadmin
  const usersSnap = await db.collection("users").where("email", "==", "willem@alasia.co.za").get();

  if (usersSnap.empty) {
    console.error("User willem@alasia.co.za not found in Firestore users collection");
    process.exit(1);
  }

  for (const doc of usersSnap.docs) {
    await doc.ref.update({ role: "superadmin", canManageBilling: true });
    console.log(`Updated user ${doc.id} (${doc.data().email}) to superadmin`);
  }

  // 2. Create system/subscription
  await db.doc("system/subscription").set({
    subscriptionStatus: "free",
    isFree: true,
    softLockEnabled: false,
  }, { merge: true });
  console.log("Created system/subscription");

  // 3. Create system/paystackConfig
  await db.doc("system/paystackConfig").set({
    publicKey: "",
    monthlyPlanCode: "",
    annualPlanCode: "",
  }, { merge: true });
  console.log("Created system/paystackConfig");

  console.log("Migration complete.");
}

migrate().catch(console.error);
```

- [ ] **Step 2: Run the migration**

```bash
npx tsx scripts/migrate-superadmin.ts
```

Expected output:
```
Updated user <uid> (willem@alasia.co.za) to superadmin
Created system/subscription
Created system/paystackConfig
Migration complete.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-superadmin.ts
git commit -m "feat: add superadmin migration script and seed system docs"
```

---

### Task 4: Build superadmin API routes

**Files:**
- Create: `functions/src/superadmin-routes.ts`
- Modify: `functions/src/routes.ts` (import + mount)

- [ ] **Step 1: Create `functions/src/superadmin-routes.ts`**

```typescript
import { Router, Request, Response } from "express";
import { authenticateUser, requireSuperAdmin } from "./auth-middleware";
import { db } from "./firebase-service";

const router = Router();

// All routes require superadmin
router.use(authenticateUser, requireSuperAdmin);

// GET /api/superadmin/users — list all users
router.get("/users", async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("users").orderBy("email").get();
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error listing users:", error);
    return res.status(500).json({ success: false, error: "Failed to list users" });
  }
});

// PATCH /api/superadmin/users/:uid/role
router.patch("/users/:uid/role", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;
    const validRoles = ["superadmin", "admin", "area-manager", "user", "api-user"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }
    // Prevent superadmin from demoting themselves
    if (uid === req.user!.uid && role !== "superadmin") {
      return res.status(400).json({ success: false, error: "Cannot demote yourself" });
    }
    await db.collection("users").doc(uid).update({ role });
    return res.json({ success: true, message: `Role updated to ${role}` });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ success: false, error: "Failed to update role" });
  }
});

// PATCH /api/superadmin/users/:uid/billing — toggle canManageBilling
router.patch("/users/:uid/billing", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { canManageBilling } = req.body;
    if (typeof canManageBilling !== "boolean") {
      return res.status(400).json({ success: false, error: "canManageBilling must be boolean" });
    }
    await db.collection("users").doc(uid).update({ canManageBilling });
    return res.json({ success: true, message: `Billing access ${canManageBilling ? "granted" : "revoked"}` });
  } catch (error) {
    console.error("Error toggling billing:", error);
    return res.status(500).json({ success: false, error: "Failed to update billing access" });
  }
});

// GET /api/superadmin/subscription
router.get("/subscription", async (_req: Request, res: Response) => {
  try {
    const doc = await db.doc("system/subscription").get();
    return res.json({ success: true, data: doc.exists ? doc.data() : null });
  } catch (error) {
    console.error("Error getting subscription:", error);
    return res.status(500).json({ success: false, error: "Failed to get subscription" });
  }
});

// PATCH /api/superadmin/subscription/toggle-free
router.patch("/subscription/toggle-free", async (_req: Request, res: Response) => {
  try {
    const doc = await db.doc("system/subscription").get();
    const current = doc.data()?.isFree ?? true;
    await db.doc("system/subscription").update({ isFree: !current });
    return res.json({ success: true, data: { isFree: !current } });
  } catch (error) {
    console.error("Error toggling free:", error);
    return res.status(500).json({ success: false, error: "Failed to toggle free status" });
  }
});

// PATCH /api/superadmin/subscription/toggle-softlock
router.patch("/subscription/toggle-softlock", async (_req: Request, res: Response) => {
  try {
    const doc = await db.doc("system/subscription").get();
    const current = doc.data()?.softLockEnabled ?? false;
    await db.doc("system/subscription").update({ softLockEnabled: !current });
    return res.json({ success: true, data: { softLockEnabled: !current } });
  } catch (error) {
    console.error("Error toggling softlock:", error);
    return res.status(500).json({ success: false, error: "Failed to toggle soft lock" });
  }
});

// PUT /api/superadmin/paystack-config
router.put("/paystack-config", async (req: Request, res: Response) => {
  try {
    const { publicKey, monthlyPlanCode, annualPlanCode } = req.body;
    if (typeof publicKey !== "string") {
      return res.status(400).json({ success: false, error: "publicKey is required" });
    }
    await db.doc("system/paystackConfig").set({
      publicKey,
      monthlyPlanCode: monthlyPlanCode || "",
      annualPlanCode: annualPlanCode || "",
    });
    return res.json({ success: true, message: "Paystack config saved" });
  } catch (error) {
    console.error("Error saving paystack config:", error);
    return res.status(500).json({ success: false, error: "Failed to save config" });
  }
});

// GET /api/superadmin/paystack-config
router.get("/paystack-config", async (_req: Request, res: Response) => {
  try {
    const doc = await db.doc("system/paystackConfig").get();
    return res.json({ success: true, data: doc.exists ? doc.data() : null });
  } catch (error) {
    console.error("Error getting paystack config:", error);
    return res.status(500).json({ success: false, error: "Failed to get config" });
  }
});

export { router as superadminRoutes };
```

- [ ] **Step 2: Mount in `functions/src/routes.ts`**

Add at the top of routes.ts with the other imports:
```typescript
import { superadminRoutes } from "./superadmin-routes";
```

Add inside `registerRoutes`, before the `// Auth` comment:
```typescript
  app.use("/api/superadmin", superadminRoutes);
```

- [ ] **Step 3: Build functions**

```bash
cd functions && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/superadmin-routes.ts functions/src/routes.ts
git commit -m "feat: add superadmin API routes for user mgmt, config, toggles"
```

---

### Task 5: Build Paystack webhook + subscription routes

**Files:**
- Create: `functions/src/paystack-webhook.ts`
- Create: `functions/src/subscription-routes.ts`
- Create: `functions/src/subscription-middleware.ts`
- Modify: `functions/src/routes.ts` (mount)
- Modify: `functions/src/app.ts` (raw body for webhook)
- Modify: `functions/src/index.ts` (add PAYSTACK_SECRET_KEY secret)

- [ ] **Step 1: Create `functions/src/paystack-webhook.ts`**

```typescript
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

    const eventId = event.data?.id?.toString() || crypto.randomBytes(16).toString("hex");
    const subRef = db.doc("system/subscription");

    // Idempotency check
    const subDoc = await subRef.get();
    if (subDoc.exists && subDoc.data()?.lastWebhookEventId === eventId) {
      console.log("[Paystack Webhook] Duplicate event, skipping:", eventId);
      return res.status(200).json({ message: "Already processed" });
    }

    switch (event.event) {
      case "subscription.create": {
        const d = event.data;
        const planType = d.plan?.interval === "annually" ? "annual" : "monthly";
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
          const periodEnd = d.period_end || new Date(Date.now() + 30 * 86400000).toISOString();
          // Don't shorten an existing longer period
          const existing = subDoc.data()?.currentPeriodEnd;
          const finalEnd = existing && new Date(existing) > new Date(periodEnd) ? existing : periodEnd;
          await subRef.update({
            subscriptionStatus: "active",
            currentPeriodEnd: finalEnd,
            lastWebhookEventId: eventId,
          });
          console.log("[Paystack Webhook] Invoice paid, period end:", finalEnd);
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
```

- [ ] **Step 2: Create `functions/src/subscription-routes.ts`**

```typescript
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
      return res.json({ success: true, data: { subscriptionStatus: "none", isFree: true, softLockEnabled: false, isActive: true } });
    }
    const isActive = sub.isFree ||
      sub.subscriptionStatus === "active" ||
      sub.subscriptionStatus === "free" ||
      (sub.subscriptionStatus === "cancelled" && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date());
    return res.json({
      success: true,
      data: { ...sub, isActive },
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return res.status(500).json({ success: false, error: "Failed to get status" });
  }
});

// POST /api/subscriptions/initialize
router.post("/initialize", async (req: Request, res: Response) => {
  try {
    const { plan, email } = req.body;
    if (!plan || !email) {
      return res.status(400).json({ success: false, error: "plan and email required" });
    }
    if (plan !== "monthly" && plan !== "annual") {
      return res.status(400).json({ success: false, error: "plan must be monthly or annual" });
    }

    const configDoc = await db.doc("system/paystackConfig").get();
    const config = configDoc.data();
    if (!config?.publicKey) {
      return res.status(500).json({ success: false, error: "Paystack not configured. Ask superadmin to set plan codes." });
    }

    const planCode = plan === "monthly" ? config.monthlyPlanCode : config.annualPlanCode;
    if (!planCode) {
      return res.status(500).json({ success: false, error: `No ${plan} plan code configured` });
    }

    // Check for re-subscription with custom start date
    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();
    let startDate: string | undefined;
    if (sub?.subscriptionStatus === "cancelled" && sub?.currentPeriodEnd) {
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
    return res.status(500).json({ success: false, error: "Failed to initialize" });
  }
});

// POST /api/subscriptions/cancel
router.post("/cancel", async (_req: Request, res: Response) => {
  try {
    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();
    if (!sub?.subscriptionCode) {
      return res.status(400).json({ success: false, error: "No active subscription" });
    }
    if (!sub.subscriptionEmailToken) {
      return res.status(400).json({ success: false, error: "Email token missing — contact support" });
    }

    const secret = paystackSecretKey.value();
    if (!secret) {
      return res.status(500).json({ success: false, error: "Paystack not configured" });
    }

    const paystackRes = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: sub.subscriptionCode,
        token: sub.subscriptionEmailToken,
      }),
    });

    if (!paystackRes.ok) {
      const err = await paystackRes.json();
      console.error("[Subscription Cancel] Paystack error:", err);
      return res.status(500).json({ success: false, error: "Failed to cancel with payment provider" });
    }

    await db.doc("system/subscription").update({ subscriptionStatus: "cancelled" });
    return res.json({
      success: true,
      message: "Subscription cancelled. Access continues until end of current period.",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return res.status(500).json({ success: false, error: "Failed to cancel" });
  }
});

// POST /api/subscriptions/create-with-saved-card
router.post("/create-with-saved-card", async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    if (!plan || (plan !== "monthly" && plan !== "annual")) {
      return res.status(400).json({ success: false, error: "plan must be monthly or annual" });
    }

    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();
    if (!sub?.paystackCustomerCode) {
      return res.status(400).json({ success: false, error: "No saved payment method. Please use the payment form first." });
    }

    const secret = paystackSecretKey.value();
    if (!secret) {
      return res.status(500).json({ success: false, error: "Paystack not configured" });
    }

    const configDoc = await db.doc("system/paystackConfig").get();
    const config = configDoc.data();
    const planCode = plan === "monthly" ? config?.monthlyPlanCode : config?.annualPlanCode;
    if (!planCode) {
      return res.status(500).json({ success: false, error: `No ${plan} plan code configured` });
    }

    // Fetch saved authorizations
    const authRes = await fetch(`https://api.paystack.co/customer/${sub.paystackCustomerCode}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const authResult = await authRes.json();
    const auths = authResult.data?.authorizations?.filter((a: any) => a.reusable && a.channel === "card") || [];
    if (auths.length === 0) {
      return res.status(400).json({ success: false, error: "No valid saved payment method" });
    }

    // Calculate start date for re-subscription
    let startDate: string | undefined;
    if (sub.subscriptionStatus === "cancelled" && sub.currentPeriodEnd) {
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

    const paystackRes = await fetch("https://api.paystack.co/subscription", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionData),
    });
    const result = await paystackRes.json();
    if (!result.status || !result.data?.subscription_code) {
      return res.status(400).json({ success: false, error: result.message || "Failed to create subscription" });
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
    return res.status(500).json({ success: false, error: "Failed to create subscription" });
  }
});

export { router as subscriptionRoutes };
```

- [ ] **Step 3: Create `functions/src/subscription-middleware.ts`**

```typescript
import { Request, Response, NextFunction } from "express";
import { db } from "./firebase-service";

/**
 * Soft-lock middleware: blocks write operations when soft-lock is active
 * and subscription is not active/free. Superadmin is always exempt.
 * Only attach to write endpoints (POST/PATCH/DELETE on specific routes).
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  // Superadmin always exempt
  if (req.user?.role === "superadmin") return next();

  try {
    const subDoc = await db.doc("system/subscription").get();
    const sub = subDoc.data();

    // If no doc or softLockEnabled is false, allow
    if (!sub || !sub.softLockEnabled) return next();

    // Check if subscription is active
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
      error: "Subscription inactive. Contact your administrator to restore access.",
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    // Fail open — don't block on middleware errors
    return next();
  }
}
```

- [ ] **Step 4: Mount in `functions/src/routes.ts`**

Add imports:
```typescript
import { subscriptionRoutes } from "./subscription-routes";
import { handlePaystackWebhook } from "./paystack-webhook";
import { requireActiveSubscription } from "./subscription-middleware";
```

Add routes inside `registerRoutes`, before the `// Auth` section:
```typescript
  // Paystack webhook (no auth — signature verified internally)
  app.post("/api/paystack/webhook", handlePaystackWebhook);

  // Subscription management (requires billing access)
  app.use("/api/subscriptions", subscriptionRoutes);
```

Add soft-lock middleware to write endpoints (after existing `authenticateUser` middleware). Add to `POST /api/documents` and `PATCH /api/permits/:id` routes by inserting `requireActiveSubscription` after `authenticateUser`:

For `PATCH /api/permits/:id` route:
```typescript
  app.patch(
    "/api/permits/:id",
    authenticateUser,
    requireManagerAccess,
    requireActiveSubscription,  // <-- add this
    async (req: Request, res: Response) => {
```

For `POST /api/documents`:
```typescript
  app.post(
    "/api/documents",
    authenticateUser,
    requireAdmin,
    requireActiveSubscription,  // <-- add this
    upload.single("file"),
```

- [ ] **Step 5: Update `functions/src/index.ts` to declare the secret**

```typescript
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { buildApp } from "./app";
import { paystackSecretKey } from "./paystack-webhook";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

const app = buildApp();

export const api = onRequest(
  {
    memory: "512MiB",
    timeoutSeconds: 60,
    cpu: 1,
    concurrency: 80,
    invoker: "public",
    secrets: [paystackSecretKey],
  },
  app
);
```

- [ ] **Step 6: Build functions**

```bash
cd functions && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add functions/src/paystack-webhook.ts functions/src/subscription-routes.ts functions/src/subscription-middleware.ts functions/src/routes.ts functions/src/index.ts
git commit -m "feat: add Paystack webhook, subscription routes, and soft-lock middleware"
```

---

### Task 6: Build client — SuperAdmin page, SubscriptionManager, SoftLockBanner, hooks

**Files:**
- Create: `client/src/pages/SuperAdmin.tsx`
- Create: `client/src/components/SubscriptionManager.tsx`
- Create: `client/src/components/SoftLockBanner.tsx`
- Create: `client/src/hooks/useSubscriptionStatus.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Header.tsx`
- Modify: `client/src/pages/ApplyPermit.tsx`
- Modify: `client/index.html`

- [ ] **Step 1: Add Paystack inline script to `client/index.html`**

Add before the closing `</head>` tag:

```html
<script src="https://js.paystack.co/v2/inline.js"></script>
```

- [ ] **Step 2: Create `client/src/hooks/useSubscriptionStatus.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

export interface SubscriptionStatus {
  subscriptionStatus: string;
  isFree: boolean;
  softLockEnabled: boolean;
  isActive: boolean;
  subscriptionPlan?: string;
  currentPeriodEnd?: string;
  subscriptionCode?: string;
  paystackCustomerCode?: string;
}

export function useSubscriptionStatus() {
  const { user, canManageBilling, isSuperAdmin } = useAuth();

  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const token = await user!.getIdToken();
      const res = await fetch("/api/subscriptions/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      const json = await res.json();
      return json.data;
    },
    enabled: !!(user && (canManageBilling || isSuperAdmin)),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: Create `client/src/components/SoftLockBanner.tsx`**

```typescript
import { AlertTriangle } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuth } from "@/lib/AuthContext";

export default function SoftLockBanner() {
  const { user, isSuperAdmin, canManageBilling } = useAuth();
  const { data: sub } = useSubscriptionStatus();

  // Don't show if: not logged in, is superadmin, no data yet, not soft-locked, or subscription is active
  if (!user || isSuperAdmin || !sub || !sub.softLockEnabled || sub.isActive) {
    return null;
  }

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3" role="alert">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-destructive font-medium">
          Subscription inactive — new permits cannot be submitted.
          {canManageBilling ? (
            <a href="/billing" className="underline ml-1">Manage billing</a>
          ) : (
            <span className="ml-1">Contact your administrator to restore access.</span>
          )}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/components/SubscriptionManager.tsx`**

This is a large component. Create it based on the FirePermits reference pattern but adapted for single-system (no fpaId). See the file content below — create the full file:

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, AlertCircle, Check, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useConfirm } from "@/components/ui/confirm-dialog";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: any) => { openIframe: () => void };
    };
  }
}

export default function SubscriptionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useSubscriptionStatus();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  const getToken = async () => {
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  };

  const initMutation = useMutation({
    mutationFn: async (data: { plan: string; email: string }) => {
      const token = await getToken();
      const res = await fetch("/api/subscriptions/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (resp) => {
      const data = resp.data;
      if (window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: data.publicKey,
          email: data.email,
          plan: data.planCode,
          currency: data.currency || "ZAR",
          metadata: data.metadata,
          onClose: () => toast({ title: "Cancelled", description: "Payment window closed." }),
          callback: () => {
            toast({ title: "Subscription created", description: "Refreshing status…" });
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ["subscription-status"] }), 2000);
            setIsDialogOpen(false);
          },
        });
        handler.openIframe();
      } else {
        toast({ title: "Error", description: "Payment system not loaded. Refresh and try again.", variant: "destructive" });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const savedCardMutation = useMutation({
    mutationFn: async (data: { plan: string }) => {
      const token = await getToken();
      const res = await fetch("/api/subscriptions/create-with-saved-card", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription activated" });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      setIsDialogOpen(false);
    },
    onError: (e: Error) => {
      if (e.message.includes("No") && e.message.includes("payment")) {
        initMutation.mutate({ plan: selectedPlan, email: user!.email! });
      } else {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cancelled", description: "Access continues until end of billing period." });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubscribe = () => {
    if (status?.subscriptionStatus === "cancelled" && status?.paystackCustomerCode) {
      savedCardMutation.mutate({ plan: selectedPlan });
    } else {
      initMutation.mutate({ plan: selectedPlan, email: user!.email! });
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel subscription?",
      description: "Access continues until the end of the current billing period. You can resubscribe at any time.",
      confirmLabel: "Yes, cancel",
      destructive: true,
    });
    if (ok) cancelMutation.mutate();
  };

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>;
  }

  if (status?.isFree) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" />Subscription</CardTitle></CardHeader>
        <CardContent>
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700 dark:text-green-300">Free access</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">This system is currently free. No subscription required.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const showSubscribe = !status?.subscriptionStatus || status.subscriptionStatus === "cancelled" || status.subscriptionStatus === "past_due" || status.subscriptionStatus === "none";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Subscription</CardTitle>
          <CardDescription>Manage the UFPA system subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={status?.subscriptionStatus === "active" ? "default" : "destructive"} className={status?.subscriptionStatus === "active" ? "bg-green-500" : ""}>
              {status?.subscriptionStatus === "active" ? "Active" : status?.subscriptionStatus === "past_due" ? "Payment failed" : status?.subscriptionStatus === "cancelled" ? "Cancelled" : "No subscription"}
            </Badge>
          </div>

          {status?.subscriptionStatus === "active" && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium capitalize">{status.subscriptionPlan}</span></div>
              {status.currentPeriodEnd && (
                <div className="flex justify-between"><span className="text-muted-foreground">Renews</span><span className="font-medium tabular-nums">{new Date(status.currentPeriodEnd).toLocaleDateString("en-ZA")}</span></div>
              )}
            </div>
          )}

          {(status?.subscriptionStatus === "past_due" || status?.subscriptionStatus === "cancelled") && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription issue</AlertTitle>
              <AlertDescription>
                {status.subscriptionStatus === "past_due" ? "Payment failed. Update your payment method." : "Subscription cancelled. Resubscribe to maintain access."}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {showSubscribe && <Button onClick={() => setIsDialogOpen(true)} className="w-full h-11"><CreditCard className="h-4 w-4 mr-2" />{status?.subscriptionStatus === "cancelled" ? "Resubscribe" : "Subscribe now"}</Button>}
            {status?.subscriptionStatus === "active" && <Button variant="outline" onClick={handleCancel} className="w-full h-11">Cancel subscription</Button>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose your plan</DialogTitle>
            <DialogDescription>Select a subscription plan for the UFPA Fire Permit System</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as "monthly" | "annual")}>
            <Label htmlFor="monthly" className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3"><RadioGroupItem value="monthly" id="monthly" /><div><div className="font-semibold">Monthly</div><div className="text-sm text-muted-foreground">Billed monthly</div></div></div>
            </Label>
            <Label htmlFor="annual" className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3"><RadioGroupItem value="annual" id="annual" /><div><div className="font-semibold">Annual</div><div className="text-sm text-muted-foreground">Billed yearly</div><Badge variant="secondary" className="mt-1">Best value</Badge></div></div>
            </Label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubscribe} disabled={initMutation.isPending || savedCardMutation.isPending}>
              {initMutation.isPending || savedCardMutation.isPending ? "Processing…" : "Continue to payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 5: Create `client/src/pages/SuperAdmin.tsx`**

This is a large page — create a full file with three tabs: Users, Subscription, Paystack Config. The file should import from existing shadcn components (Tabs, Table, Badge, Button, Input, Switch, Select) and use the auth token for API calls. Full implementation should be written to this file.

Key behaviors:
- Users tab: fetch `GET /api/superadmin/users`, render table with role dropdown and billing toggle
- Subscription tab: fetch `GET /api/superadmin/subscription`, show status card + isFree switch + softLockEnabled switch
- Config tab: fetch `GET /api/superadmin/paystack-config`, render form with publicKey, monthlyPlanCode, annualPlanCode inputs + save button calling `PUT /api/superadmin/paystack-config`

- [ ] **Step 6: Update `client/src/App.tsx`**

Add imports:
```typescript
import SuperAdmin from "@/pages/SuperAdmin";
import SoftLockBanner from "@/components/SoftLockBanner";
```

Add route:
```typescript
<Route path="/superadmin" component={SuperAdmin} />
```

Add `SoftLockBanner` in the App component:
```typescript
<ConfirmDialogProvider>
  <SoftLockBanner />
  <Toaster />
  <Router />
  <PWAInstallPrompt />
</ConfirmDialogProvider>
```

- [ ] **Step 7: Update `client/src/components/Header.tsx`**

Add `isSuperAdmin` and `canManageBilling` to the destructured auth context. Add nav items:

Desktop nav (after the existing admin/area-manager links):
```tsx
{isSuperAdmin && (
  <Link href="/superadmin"
    className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition font-medium"
  >
    <Settings className="h-4 w-4" aria-hidden="true" />
    Super Admin
  </Link>
)}
```

Mobile nav (similar pattern, after admin/area-manager links).

For billing, in the user dropdown menu (after API Documentation link):
```tsx
{canManageBilling && (
  <Link href="/billing">
    <DropdownMenuItem className="cursor-pointer">
      <CreditCard className="mr-2 h-4 w-4" />
      <span>Billing</span>
    </DropdownMenuItem>
  </Link>
)}
```

Add `CreditCard` to the lucide-react imports.

- [ ] **Step 8: Update `client/src/pages/ApplyPermit.tsx` — soft-lock guard on submit**

Import the hook:
```typescript
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
```

In the component, add:
```typescript
const { data: subStatus } = useSubscriptionStatus();
const isSoftLocked = subStatus?.softLockEnabled && !subStatus?.isActive;
```

Update the submit button's `disabled` condition:
```typescript
disabled={isSubmitting || !form.watch("acceptDisclaimer") || isSoftLocked}
```

Add a warning above the button when soft-locked:
```tsx
{isSoftLocked && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Submissions paused</AlertTitle>
    <AlertDescription>
      The system subscription is inactive. New permit applications cannot be submitted until billing is restored.
    </AlertDescription>
  </Alert>
)}
```

- [ ] **Step 9: Build client**

```bash
npm run build
```

- [ ] **Step 10: Commit**

```bash
git add client/ functions/
git commit -m "feat: add SuperAdmin dashboard, SubscriptionManager, SoftLockBanner, and billing UI"
```

---

### Task 7: Deploy and verify

**Files:** None (deploy only)

- [ ] **Step 1: Set the Paystack secret**

```bash
firebase functions:secrets:set PAYSTACK_SECRET_KEY
```

Enter the secret key when prompted. For now, use a test key to verify the integration works. Superadmin will set live keys from the dashboard.

- [ ] **Step 2: Deploy everything**

```bash
npm run build
firebase deploy
```

This deploys: functions, hosting, firestore rules, storage rules, indexes.

- [ ] **Step 3: Run migration script**

```bash
npx tsx scripts/migrate-superadmin.ts
```

- [ ] **Step 4: Verify existing functionality unchanged**

```bash
curl -s https://umpiluzi-fire-permits.web.app/api/health
```

Expected: `{"success":true,"message":"API is running",...}`

- [ ] **Step 5: Verify superadmin endpoints**

Log in as willem@alasia.co.za, get ID token, test:
```bash
curl -s https://umpiluzi-fire-permits.web.app/api/superadmin/users -H "Authorization: Bearer <token>"
```

Expected: `{"success":true,"data":[...]}`

- [ ] **Step 6: Verify existing user can still apply for permit**

Log in as a regular user and verify the ApplyPermit page loads and submits normally. No banner should appear (softLockEnabled is false).

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "deploy: superadmin + paystack subscription system live"
git push origin main
```
