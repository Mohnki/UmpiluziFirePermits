import { Router, Request, Response } from "express";
import { authenticateUser, requireSuperAdmin } from "./auth-middleware";
import { db } from "./firebase-service";

const router = Router();

router.use(authenticateUser, requireSuperAdmin);

// GET /api/superadmin/users
router.get("/users", async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("users").orderBy("email").get();
    const users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
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

// PATCH /api/superadmin/users/:uid/billing
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
