/**
 * One-time migration: set willem@alasia.co.za as superadmin,
 * create system/subscription and system/paystackConfig docs.
 *
 * Run: npx tsx scripts/migrate-superadmin.ts
 */
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "umpiluzi-fire-permits" });
}

const db = admin.firestore();

async function migrate() {
  // 1. Find willem@alasia.co.za and set to superadmin
  const usersSnap = await db
    .collection("users")
    .where("email", "==", "willem@alasia.co.za")
    .get();

  if (usersSnap.empty) {
    console.error("User willem@alasia.co.za not found in Firestore users collection");
    process.exit(1);
  }

  for (const doc of usersSnap.docs) {
    await doc.ref.update({ role: "superadmin", canManageBilling: true });
    console.log(`Updated user ${doc.id} (${doc.data().email}) to superadmin`);
  }

  // 2. Create system/subscription
  await db.doc("system/subscription").set(
    {
      subscriptionStatus: "free",
      isFree: true,
      softLockEnabled: false,
    },
    { merge: true }
  );
  console.log("Created system/subscription");

  // 3. Create system/paystackConfig
  await db.doc("system/paystackConfig").set(
    {
      publicKey: "",
      monthlyPlanCode: "",
      annualPlanCode: "",
    },
    { merge: true }
  );
  console.log("Created system/paystackConfig");

  console.log("Migration complete.");
}

migrate().catch(console.error);
