# Superadmin + Paystack Subscription System for Umpiluzi

**Date:** 2026-04-16
**Status:** Approved (user)
**Target project:** `umpiluzi-fire-permits`

## Context

Umpiluzi needs a payment system modeled on the FirePermits project at
`~/Projects/FirePermits`. The UFPA (single FPA) pays a subscription to keep
the system running. Individual farmers do not pay. A new `superadmin` role
gives the system owner (willem@alasia.co.za) full control over billing,
user management, Paystack configuration, and a soft-lock toggle.

## Decisions locked in

1. **Payment model:** single FPA subscription — UFPA pays, farmers don't.
2. **Billing person:** capability on existing admin/area-manager role (`canManageBilling` flag), not a new role.
3. **Superadmin:** full system owner — admin + billing + user management + system settings. Only superadmin can promote/demote admins and grant billing access.
4. **Enforcement:** soft-lock infrastructure built but disabled by default. Superadmin has a toggle. When active + subscription inactive: read-only for users, submit disabled, banner shown. Superadmin always exempt.
5. **Initial state:** `isFree: true`. No trial. Superadmin migrates to paid when ready.
6. **Paystack plans:** superadmin-configurable from dashboard. Plan codes stored in Firestore, not hardcoded.

## Role hierarchy

```
superadmin  →  full system owner (only willem@alasia.co.za initially)
   ├── manage all users + promote/demote admins
   ├── billing: configure Paystack, assign billing access, toggle isFree, toggle soft-lock
   └── everything admin can do
admin  →  same as today + optional billing capability (if superadmin grants it)
area-manager  →  same as today + optional billing capability
user  →  same as today
api-user  →  same as today
```

`UserRole` type: `'superadmin' | 'admin' | 'area-manager' | 'user' | 'api-user'`.

Superadmin inherits all admin permissions everywhere — Firestore rules,
Cloud Function middleware, client-side guards.

## Firestore data changes

### `users/{uid}` — new/changed fields

```
role: 'superadmin' | 'admin' | 'area-manager' | 'user' | 'api-user'
canManageBilling?: boolean    // superadmin sets this; grants billing tab access
```

### New document: `system/subscription`

Single document (not a collection).

```
subscriptionStatus: 'free' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'none'
subscriptionCode?: string              // Paystack SUB_xxx
subscriptionEmailToken?: string        // required for Paystack cancellation API
subscriptionPlan?: string              // 'monthly' | 'annual'
subscriptionStartedAt?: string         // ISO date
currentPeriodEnd?: string              // when billing period expires
paystackCustomerCode?: string          // CUS_xxx
isFree: boolean                        // starts true
softLockEnabled: boolean               // starts false
lastWebhookEventId?: string            // idempotency guard
```

### New document: `system/paystackConfig`

```
publicKey: string                      // pk_live_xxx or pk_test_xxx
monthlyPlanCode?: string               // PLN_xxx
annualPlanCode?: string                // PLN_xxx
```

Both `system/*` docs: readable by superadmin and users with
`canManageBilling: true`. Writes only via Cloud Functions (Admin SDK).

## Cloud Function changes

### New files in `functions/src/`

**`subscription-routes.ts`**

Paystack subscription endpoints (require auth + billing access or superadmin):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/subscriptions/initialize` | Return Paystack inline popup config (plan code, email, public key) |
| `POST` | `/api/subscriptions/create-with-saved-card` | Resubscribe using saved Paystack card authorization |
| `GET` | `/api/subscriptions/status` | Current subscription state |
| `POST` | `/api/subscriptions/cancel` | Cancel auto-renewal (keeps access until period end) |

**`paystack-webhook.ts`**

`POST /api/paystack/webhook` — no auth (public), verified via HMAC SHA512
signature using `PAYSTACK_SECRET_KEY`.

| Webhook event | Action |
| --- | --- |
| `subscription.create` | Set status to `active`, store codes + email token |
| `invoice.update` (success) | Extend `currentPeriodEnd` |
| `invoice.payment_failed` | Set status to `past_due` |
| `subscription.disable` | Set status to `cancelled` |
| `subscription.not_renew` | Set status to `cancelled` |

All writes go to `system/subscription` via Admin SDK. Idempotency via
`lastWebhookEventId`.

**`superadmin-routes.ts`**

Superadmin-only endpoints (require auth + `superadmin` role):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/superadmin/users` | List all users with roles |
| `PATCH` | `/api/superadmin/users/:uid/role` | Set role (only superadmin can set admin/superadmin) |
| `PATCH` | `/api/superadmin/users/:uid/billing` | Toggle `canManageBilling` |
| `GET` | `/api/superadmin/subscription` | Full subscription document |
| `PATCH` | `/api/superadmin/subscription/toggle-free` | Flip `isFree` |
| `PATCH` | `/api/superadmin/subscription/toggle-softlock` | Flip `softLockEnabled` |
| `PUT` | `/api/superadmin/paystack-config` | Set public key + plan codes |

### Modified files

- **`auth-middleware.ts`** — add `requireSuperAdmin` middleware, add
  `requireBillingAccess` middleware (checks `superadmin` OR
  `canManageBilling`). Update `requireAdmin` to also accept `superadmin`.
- **`routes.ts`** — mount `subscription-routes`, `paystack-webhook`,
  `superadmin-routes`.
- **`schema.ts`** — add subscription, paystack config, and updated role types.

### Environment / secrets

- `PAYSTACK_SECRET_KEY` — set via `firebase functions:secrets:set`.
  Used for webhook HMAC verification and server-side Paystack API calls
  (cancel subscription, fetch card authorizations).

## Client changes

### New files

**`client/src/pages/SuperAdmin.tsx`**

Dashboard with three tabs:
1. **Users** — table of all users. Columns: name, email, role (dropdown),
   billing toggle. Superadmin can promote to admin, demote, grant/revoke
   billing. Cannot demote themselves.
2. **Subscription** — status card (plan, next billing date, status badge),
   `isFree` toggle switch, `softLockEnabled` toggle switch.
3. **Paystack Config** — form: public key input, monthly plan code input,
   annual plan code input. Save button.

**`client/src/components/SubscriptionManager.tsx`**

For users with `canManageBilling: true` or superadmin. Renders as a tab
in the Admin page or as a standalone `/billing` route.
- Current plan card (status, next billing, plan name)
- "Subscribe" button → opens Paystack inline popup
- "Cancel subscription" button (with confirm dialog)
- "Resubscribe with saved card" button (if previously subscribed)

**`client/src/components/SoftLockBanner.tsx`**

Conditional banner shown on all pages when `softLockEnabled: true` AND
subscription is not active/free:
> "Subscription inactive — new permits cannot be submitted. Contact your
> administrator to restore access."

Rendered in `App.tsx` above `<Router />`.

**`client/src/hooks/useSubscriptionStatus.ts`**

Polls `GET /api/subscriptions/status`. Cached with React Query (5-min stale
time). Returns `{ status, isFree, softLockEnabled, isActive }` where
`isActive` is the computed "can the system be used" boolean.

### Modified files

- **`client/src/lib/roles.ts`** — add `'superadmin'` to `UserRole`. Add
  `isSuperAdmin()`. Update `isAdmin()` to return true for superadmin.
  Update `hasManagerAccess()` to include superadmin.
- **`client/src/lib/AuthContext.tsx`** — add `isSuperAdmin` and
  `canManageBilling` flags to context.
- **`client/src/App.tsx`** — add `/superadmin` route (guarded by
  `isSuperAdmin`). Add `/billing` route (guarded by `canManageBilling ||
  isSuperAdmin`). Render `SoftLockBanner` conditionally.
- **`client/src/components/Header.tsx`** — show "Super Admin" nav link for
  superadmin (distinct red badge style). Show "Billing" link for users with
  billing access.
- **`client/src/pages/ApplyPermit.tsx`** — when soft-lock active +
  subscription inactive: disable submit button, show inline warning.
- **`client/src/pages/Admin.tsx`** — add "Billing" tab visible to users
  with billing access, rendering `SubscriptionManager`.

## Firestore rules changes

```
// System config — superadmin + billing users read; writes via Admin SDK only
match /system/{docId} {
  allow read: if isSuperAdmin() ||
    (isAuthenticated() &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.canManageBilling == true);
  allow write: if false;
}
```

Update `isAdmin()` helper in rules to also match role `'superadmin'`.

All existing collection rules unchanged. Superadmin inherits admin
access everywhere.

## Soft-lock enforcement (built but off by default)

**When `softLockEnabled: true` AND subscription not active/free:**

Client side:
- `SoftLockBanner` visible on all pages
- `ApplyPermit` submit button disabled with warning text
- Client-direct Firestore writes for permits still technically possible
  (rules don't enforce subscription) — this is acceptable because the
  client UI blocks it, and server endpoints also block

Server side:
- Cloud Function middleware on write endpoints (`POST /api/documents`,
  `PATCH /api/permits/:id`) checks `system/subscription`. Returns 402
  if locked. Read endpoints stay open. Superadmin exempt.

**When `softLockEnabled: false` (default):**
No enforcement anywhere. System works exactly as today.

## Migration (one-time, part of deploy)

1. Update `willem@alasia.co.za` user doc: `role: 'superadmin'`,
   `canManageBilling: true`.
2. Create `system/subscription`: `{ subscriptionStatus: 'free', isFree: true,
   softLockEnabled: false }`.
3. Create `system/paystackConfig`: `{ publicKey: '', monthlyPlanCode: '',
   annualPlanCode: '' }` (superadmin fills from dashboard).

## What does NOT change

- All existing permit flows (apply, approve, reject, complete)
- Client-direct Firestore writes for permits/farms/areas/bans
- External API consumer endpoints (`/api/permits`, `/api/areas`, etc.)
- Rate limiting and API usage logging
- Document upload/download via Cloud Storage
- Map/GeoJSON endpoints
- PWA service worker and install prompt
- Any existing user's experience (until soft-lock is enabled)

## Phase ordering for implementation

1. Update role system (roles.ts, schema, AuthContext, Firestore rules, auth middleware).
2. Create `system/subscription` and `system/paystackConfig` Firestore docs.
3. Build superadmin routes + page (user management, config, toggles).
4. Build Paystack webhook handler + subscription routes.
5. Build SubscriptionManager component + billing tab.
6. Build SoftLockBanner + enforcement middleware (off by default).
7. Run migration script for willem@alasia.co.za.
8. Deploy functions + hosting + rules. Test with Paystack test keys.
9. Superadmin sets live Paystack keys from dashboard when ready.
