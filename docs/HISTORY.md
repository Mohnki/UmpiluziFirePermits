# UmpiluziFirePermits — Project History & Context

**Purpose:** If you start a fresh Claude/LLM session tomorrow, this file is the
single source of truth for how the app is structured, what was already done,
and what's left. Read this first.

## What the app is

A web app for the **Umpiluzi Fire Protection Association** (`umpiluzifpa.org`)
to let farmers apply for fire/burn permits, admins and area managers approve
them, and track historical activity. PWA. Production.

- Frontend: Vite + React 18, shadcn/ui, Wouter router, React Query, Tailwind
- Backend: Express (Cloud Functions 2nd gen post-migration)
- Data: **Firestore** (not Postgres — see below)
- Auth: **Firebase Auth** (Google + email/password)
- File storage: **Cloud Storage for Firebase** (post-migration only)
- Hosting: **Firebase Hosting** (post-migration; Replit before)
- Firebase project: `umpiluzi-fire-permits` (project number 706188247136)
- Production domain: `umpiluzifpa.org`

## Critical context: the "migration" was not what it sounded like

The app was **already on Firestore and Firebase Auth** before the migration.
Anyone reading `package.json` will see Drizzle ORM, Neon Postgres, Passport,
and express-session — **these are all dead code**, never imported at runtime.
`server/storage.ts` references types (`users`, `InsertUser`) that don't even
exist in `shared/schema.ts`.

What actually moved during the 2026-04-15 migration:
- **Compute:** Replit autoscale → Cloud Functions 2nd gen (`us-central1`)
- **Static hosting:** Replit Express `serveStatic` → Firebase Hosting
- **File storage:** half-broken in-memory multer → real Cloud Storage bucket
- **Security rules:** added `documents` and `apiUsageLogs` collections to
  existing Firestore rules; new Storage deny-all rules
- **Indexes:** captured live + added 4 new composite indexes

Firestore collections and data were **untouched**. Firebase Auth users were
**untouched**.

## Repo layout (post-migration)

```
/
├── client/                       Vite React SPA
│   ├── src/
│   │   ├── App.tsx              router
│   │   ├── pages/               Admin, ApplyPermit, MyPermits, TodaysPermits,
│   │   │                        PermitReports, UserReports, AreaManager,
│   │   │                        ManageFarms, RiskCalculator, Safety,
│   │   │                        ApiDocumentation, Home
│   │   ├── components/          Header, PermitManagement, BanManagement,
│   │   │                        Documents, AuthForms, UmpiluziFMUMap, ...
│   │   ├── lib/
│   │   │   ├── firebase.ts      client Firebase init + Auth helpers
│   │   │   ├── AuthContext.tsx  React auth context
│   │   │   ├── permit-service.ts   CLIENT-DIRECT Firestore writes for permits/bans
│   │   │   ├── area-service.ts     CLIENT-DIRECT Firestore for areas/burnTypes
│   │   │   ├── farm-service.ts     CLIENT-DIRECT Firestore for farms
│   │   │   ├── roles.ts            role enum + helpers
│   │   │   └── queryClient.ts      React Query config
│   │   └── main.tsx
│   └── public/                   manifest.json, sw.js, icons
├── functions/                    NEW: Cloud Functions source
│   ├── src/
│   │   ├── index.ts             exports `api = onRequest(app)` (public invoker)
│   │   ├── app.ts               builds Express app, wires error handler
│   │   ├── routes.ts            all /api/* handlers (ported from server/routes.ts)
│   │   ├── firebase-service.ts  Admin-SDK classes (Auth/Permit/Area/BurnType/Document)
│   │   ├── auth-middleware.ts   Bearer token verification + role gates
│   │   ├── rate-limit-service.ts Firestore-backed request logging (enforcement OFF)
│   │   ├── storage-service.ts   Cloud Storage upload + signed-URL download
│   │   └── schema.ts            local Zod copies (duplicated from shared/)
│   ├── package.json             Node 20; firebase-functions v6, firebase-admin, express, multer, zod
│   └── tsconfig.json
├── shared/schema.ts              Zod schemas (client uses these too)
├── server/                       LEGACY — still present, NOT deployed. Delete in cleanup PR.
├── docs/
│   ├── MIGRATION.md              operational cutover & deploy guide
│   ├── HISTORY.md                this file
│   └── superpowers/specs/2026-04-15-firebase-migration-design.md
├── firebase.json                 hosting + functions + rewrite + rules/indexes config
├── firestore.rules               role-aware per-collection rules
├── firestore.indexes.json        9 composite indexes
├── storage.rules                 deny-all (Admin SDK bypasses)
├── .firebaserc                   default project = umpiluzi-fire-permits
├── vite.config.ts                outputs to dist/public
└── package.json                  root — still has dead Drizzle/Postgres deps (cleanup pending)
```

## Firestore collections

| Collection | Written by | Notes |
| --- | --- | --- |
| `users` | client (on signup) | `{uid, email, displayName, role, ...}`. `role` ∈ `admin`, `area-manager`, `user`, `api-user` |
| `burnPermits` | client direct (`createBurnPermit`) + Function (`PATCH /api/permits/:id`) | Auto-approval logic in `client/src/lib/permit-service.ts` |
| `burnBans` | client direct | |
| `areas` | client direct | has `areaManagerId` for per-area management |
| `burnTypes` | client direct | |
| `farms` | client direct | `userId`-owned |
| `documents` | Function only (`POST /api/documents`) | has `storagePath` pointing into Cloud Storage |
| `apiUsageLogs` | Function only (rate-limit logger) | server-only, TTL 30d needs manual setup in console |

## Two data paths — important

This is dual-path by design. Respect it:

1. **Client SDK direct:** Most day-to-day operations (apply for permit, manage
   farms, approve as area manager via UI) go client → Firestore SDK → Firestore.
   **Firestore rules are the only line of defense** for these.
2. **Function-backed `/api/*`:** Admin operations, historical reports (>100
   results), document upload/download, and external API consumers
   (`api-user` role) go client → Hosting → rewrite → Cloud Function → Admin
   SDK → Firestore. Admin SDK bypasses rules.

## Firestore rules summary

Baseline: `users` read own + admin/area-manager; `burnPermits` read own or
(admin || area-manager-of-area); `burnPermits` create if authenticated; update
if admin, area-manager-of-area, or owner-while-pending; `farms` user-owned;
`documents` read if public or admin, write via Function only; `apiUsageLogs`
server-only. See `firestore.rules`.

## Deployed artifacts (as of 2026-04-15)

- **Cloud Function `api`** — `us-central1`, Node 20, 512MiB, 60s timeout,
  `invoker: "public"`, direct URL `https://api-xchyudtsiq-uc.a.run.app`
- **Preview channel `staging`** — `https://umpiluzi-fire-permits--staging-fxcvrnse.web.app`
  (expires 2026-05-15)
- **Production hosting** — `https://umpiluzi-fire-permits.web.app`
  (and `umpiluzifpa.org` after DNS cutover)
- **Cloud Storage bucket** — `gs://umpiluzi-fire-permits.firebasestorage.app`,
  `documents/{docId}/{filename}` keys

## Decisions made during brainstorming (2026-04-15)

These are locked in — don't revisit unless there's a real reason.

1. **Compute target: Cloud Functions 2nd gen** (not App Hosting). Wrapped
   Express app, auto-scales to zero, cheap.
2. **Dual-path kept** (client-direct + Function). Funneling all writes through
   Functions was considered and deferred as a follow-up.
3. **Document storage fixed as part of migration**, not preserved 1:1. The
   placeholder-text bug is gone.
4. **URL preserved.** External API consumers keep hitting `umpiluzifpa.org/api/*`
   via Hosting rewrite. No coordination with third parties needed.
5. **Rate-limit enforcement stays OFF** during migration (logger stays ON).
   Preserves current production behavior. Enable in a later PR.
6. **14-day Replit dual-run**, DNS TTL 300s, tag commit `pre-firebase-migration`
   for rollback.
7. **No Sentry**, no external error tracking — Cloud Logging only.
8. **No secrets** beyond the default service account. Client Firebase config is
   non-secret and committed.

## What is still pending (post-cutover work)

1. **User performs DNS cutover** on `umpiluzifpa.org` (see `MIGRATION.md`).
2. **Set Firestore TTL on `apiUsageLogs.timestamp` (30d)** via Firebase console
   — CLI can't do this.
3. **Confirm `umpiluzifpa.org` is in Firebase Auth authorized domains** before
   cutover.
4. **Cleanup PR after 14 clean days:**
   - Delete `server/`, `drizzle.config.ts`, `server/storage.ts`, `shared/schema.js*`
     (stray compile outputs if any remain).
   - Remove from root `package.json`: `drizzle-orm`, `drizzle-zod`, `drizzle-kit`,
     `@neondatabase/serverless`, `passport`, `passport-local`, `express-session`,
     `connect-pg-simple`, `memorystore`, `@types/connect-pg-simple`,
     `@types/passport`, `@types/passport-local`, `@types/express-session`, `ws`.
   - Remove Replit Vite plugins if fully off Replit.
   - Tear down Replit deployment.
5. **Upgrade `firebase-functions`** to latest when convenient.
6. **Enable `checkRateLimit` enforcement** — import + `app.use` in
   `functions/src/routes.ts` after traffic-based tuning.
7. **Consider funneling client writes through Functions** for stronger
   server-side validation (auto-approval, ban checks currently run on client).

## Known gotchas for future work

- **2nd-gen function invoker:** if you ever recreate the function, it defaults
  to **private**. `invoker: "public"` in `functions/src/index.ts` must stay,
  otherwise Hosting rewrites get 403.
- **Functions compile separately** from the root TypeScript project. Do not add
  `../shared/**/*` to `functions/tsconfig.json` — it breaks `rootDir`.
  Schemas are duplicated in `functions/src/schema.ts` on purpose.
- **Predeploy hook** compiles functions automatically during `firebase deploy
  --only functions`. The root `npm run build` does NOT build functions.
- **Cloud Storage bucket name** is `umpiluzi-fire-permits.firebasestorage.app`
  (hardcoded in `functions/src/storage-service.ts`). If the bucket is ever
  renamed, update that constant.
- **Image caching:** Hosting headers set `immutable` cache on `.js`/`.css` but
  `no-cache` on `sw.js` — do not change this; the service worker must be
  always-fresh or PWA updates break.

## UI/UX overhaul (2026-04-15)

A 40-finding UI/UX audit was performed and all findings were fixed in-session.
Changes are deployed to Firebase Hosting production.

### Shared primitives added

| File | Purpose |
| --- | --- |
| `client/src/components/ui/confirm-dialog.tsx` | `ConfirmDialogProvider` + `useConfirm()` — promise-based AlertDialog wrapper replacing all native `window.confirm()` / `alert()` calls. Wired in `App.tsx`. |
| `client/src/components/ui/loading-spinner.tsx` | `LoadingSpinner` + `FullPageSpinner` — consistent loading indicators replacing ad-hoc Loader2 usage. |
| `client/src/components/ui/required-mark.tsx` | `<RequiredMark />` — red asterisk for required fields. |
| `client/src/components/ui/table-skeleton.tsx` | `TableSkeleton` + `CardGridSkeleton` — skeleton loaders for data tables. |
| `client/src/lib/format.ts` | `formatDate()`, `formatDateTime()`, `formatDateLong()` — en-ZA locale, Africa/Johannesburg timezone. All dates in the app now go through these. |

### Critical fixes (5)

1. **Replaced all `alert()`/`confirm()`** across MyPermits, ApplyPermit, ManageFarms with `useConfirm()` dialog + toast.
2. **Hero secondary button contrast** — was red text on transparent bg (~1.8:1); now white text on translucent bg.
3. **Lat/Lng placeholder-only labels** in ApplyPermit — added visible FormLabel, `<RequiredMark />`, helper text ("Decimal degrees, e.g. -26.2330"), `inputMode="decimal"`.
4. **ApplyPermit farm-less guard** — previously rendered the full form during a 2.5s redirect; now shows a clean empty state with "Register a farm" CTA.
5. **Admin/Area-Manager nav links** visually distinguished (red badge + Shield icon for Admin, orange + LayoutDashboard for Area Manager) on desktop and mobile.

### High-severity fixes (10)

- Mobile menu button: `aria-label`, `aria-expanded`, `aria-controls`, 44px hit target.
- All Leaflet MapContainer elements: `role="region"` + descriptive `aria-label`.
- MyPermits + UserReports tables: dual mobile-card / desktop-table rendering (`block md:hidden` / `hidden md:block`).
- MyPermits history: paginated with "Load more" (20 per page).
- Dark mode primary color: lightened to `0 85% 62%` for ~5.5:1 contrast on dark backgrounds.
- Dates localized to `en-ZA` format (DD/MM/YYYY) across all permit views.
- PWA install prompt TTL reduced from 7 days to 48 hours.
- ApplyPermit disclaimer: `Collapsible` wrapper replaces nested scroll on mobile.
- Skeleton loaders on initial data fetches (PermitReports, MyPermits).
- Consistent `LoadingSpinner` / `FullPageSpinner` replacing ad-hoc Loader2 variants.

### Medium-severity fixes (10)

- Required-field asterisks via `<RequiredMark />` on Farm, Burn Type, Lat, Lng, Disclaimer checkbox.
- Focus-first-error on ApplyPermit submit failure.
- Geolocation loading state (spinner + "Locating…" label on button).
- `autoComplete` attributes on all AuthForms inputs (email, current-password, new-password, name).
- 44px button heights on all primary CTAs.
- Decorative icons marked `aria-hidden="true"`.
- Checkbox label fully clickable with `htmlFor` binding.
- Header dropdown: truncated email gets native `title` tooltip.

### Low/polish fixes (15)

- Footer links: raised to gray-300, added `hover:underline`, `focus-visible:ring-2`.
- Dark mode: `--muted-foreground` lightened, `--border`/`--input` raised for visibility.
- Global `*:focus-visible` outline added via CSS for keyboard users.
- Disabled input opacity raised from 0.5 to 0.7 for readable helper/error text.

### Home page modernization (2026-04-15)

Complete redesign of the landing page while preserving all content:

- **Hero** — dark gradient background (`#1a1a1a` → `#4a1410`), subtle dot-grid texture, warm glow blurs. Logo small and centered at top. Single centered headline "Burn permits, without the paperwork." One primary CTA ("Apply for a permit"). 3 stat blocks (Compliant, Apply time, Approval speed).
- **New section: "How it works"** (`HowItWorks.tsx`) — 3 numbered step cards: Register farm → Apply → Burn with confidence. CTA bar at bottom.
- **PermitsInfo** redesigned — 5-card grid (Safe burns, Prevent wildfires, Legal compliance, Regional coordination, Emergency awareness) replacing a single bullet list.
- **About** redesigned — 4 icon-driven service cards (Planning, Preparedness, Coordination, Advice) + side-by-side Aims / "What UFPA does not do" panels + full service list in a collapsible Accordion. Member benefits CTA at bottom.
- **Contact** redesigned — 4-card grid with tap-to-call/email/map-link + fire emergency callout.
- **Typography system** — consistent "eyebrow → h2 → lead paragraph" pattern across all home sections.
- Removed: `CallToAction.tsx` and `FireSafety.tsx` (content folded into redesigned sections).

### Files added/changed in this round

New files:
- `client/src/components/HowItWorks.tsx`
- `client/src/components/ui/confirm-dialog.tsx`
- `client/src/components/ui/loading-spinner.tsx`
- `client/src/components/ui/required-mark.tsx`
- `client/src/components/ui/table-skeleton.tsx`
- `client/src/lib/format.ts`

Heavily rewritten:
- `client/src/components/Hero.tsx` (complete rewrite)
- `client/src/components/About.tsx` (complete rewrite)
- `client/src/components/PermitsInfo.tsx` (complete rewrite)
- `client/src/components/Contact.tsx` (complete rewrite)
- `client/src/pages/ApplyPermit.tsx` (~20 edits: confirm dialog, empty state, form fixes)
- `client/src/pages/MyPermits.tsx` (~15 edits: mobile cards, pagination, dialog, dates)
- `client/src/pages/UserReports.tsx` (mobile card fallback, date localization, map a11y)
- `client/src/pages/TodaysPermits.tsx` (map a11y, date localization, loading states)
- `client/src/pages/PermitReports.tsx` (skeleton loaders)
- `client/src/components/Header.tsx` (admin nav styling, menu a11y, email tooltip)
- `client/src/components/AuthForms.tsx` (autoComplete attributes)
- `client/src/components/Footer.tsx` (focus rings, link contrast)
- `client/src/components/UmpiluziFMUMap.tsx` (map a11y)
- `client/src/components/PWAInstallPrompt.tsx` (TTL reduction)
- `client/src/index.css` (dark-mode colors, focus-visible, disabled-input opacity)
- `client/src/App.tsx` (ConfirmDialogProvider)
- `client/src/pages/Home.tsx` (added HowItWorks, reordered sections)
- `client/src/pages/ManageFarms.tsx` (confirm dialog)

## Superadmin + Paystack subscription system (2026-04-16)

### What was added

A `superadmin` role, Paystack-powered subscription billing, and soft-lock
infrastructure — modeled on the FirePermits project (`~/Projects/FirePermits`).

### Role hierarchy (current)

```
superadmin  →  full system owner (willem@alasia.co.za)
   ├── manage all users + promote/demote admins
   ├── billing: configure Paystack, assign billing access, toggle isFree, toggle soft-lock
   └── everything admin can do
admin  →  same as before + optional billing capability (canManageBilling flag)
area-manager  →  same as before + optional billing capability
user  →  unchanged
api-user  →  unchanged
```

`UserRole`: `'superadmin' | 'admin' | 'area-manager' | 'user' | 'api-user'`.
Superadmin inherits all admin permissions in Firestore rules, Cloud Function
middleware, and client-side guards.

### Firestore documents added

- **`system/subscription`** — single doc tracking billing state:
  `subscriptionStatus`, `isFree` (boolean), `softLockEnabled` (boolean),
  `subscriptionCode`, `subscriptionEmailToken`, `subscriptionPlan`,
  `currentPeriodEnd`, `paystackCustomerCode`, `lastWebhookEventId`.
  Initial state: `{ subscriptionStatus: "free", isFree: true, softLockEnabled: false }`.

- **`system/paystackConfig`** — superadmin-configurable:
  `publicKey`, `monthlyPlanCode`, `annualPlanCode`. Plan codes stored in
  Firestore, not hardcoded. Superadmin sets them from `/superadmin` → Paystack
  Config tab.

- **`users/{uid}`** gained `canManageBilling?: boolean` field.

### Payment model

- Single FPA subscription — UFPA (the organisation) pays. Farmers don't.
- Pricing: R250/month (`PLN_g12pb6e89lwhtch`) or R2,250/year.
- Payment via Paystack inline popup (v2 API: `new PaystackPop().newTransaction()`).
- Paystack inline JS loaded from `client/index.html`.
- `PAYSTACK_SECRET_KEY` stored in Google Secret Manager via
  `firebase functions:secrets:set`.

### Webhook flow

`POST /api/paystack/webhook` — public endpoint, HMAC SHA512 verified.

| Event | Action |
| --- | --- |
| `subscription.create` | → status `active`, store codes |
| `invoice.update` (success) | → extend `currentPeriodEnd` |
| `invoice.payment_failed` | → status `past_due` |
| `subscription.disable` / `subscription.not_renew` | → status `cancelled` |

All writes to `system/subscription` via Admin SDK. Idempotency via
`lastWebhookEventId`.

### Soft-lock (built, off by default)

When `softLockEnabled: true` AND subscription not active/free:
- Client: `SoftLockBanner` shows on all pages. ApplyPermit submit disabled.
- Server: `requireActiveSubscription` middleware returns 402 on
  `PATCH /api/permits/:id` and `POST /api/documents`. Superadmin exempt.

When `softLockEnabled: false` (default): zero enforcement. System works
exactly as before.

### Files added

| File | Purpose |
| --- | --- |
| `functions/src/superadmin-routes.ts` | User mgmt, subscription toggles, Paystack config CRUD |
| `functions/src/subscription-routes.ts` | Initialize, cancel, resubscribe, status |
| `functions/src/paystack-webhook.ts` | HMAC-verified webhook handler |
| `functions/src/subscription-middleware.ts` | `requireActiveSubscription` soft-lock middleware |
| `client/src/pages/SuperAdmin.tsx` | 3-tab dashboard (Users, Subscription, Paystack Config) |
| `client/src/components/SubscriptionManager.tsx` | Billing page with pricing cards (R250/R2,250) |
| `client/src/components/SoftLockBanner.tsx` | Conditional soft-lock alert |
| `client/src/hooks/useSubscriptionStatus.ts` | React Query hook, 5-min stale time |
| `scripts/migrate-superadmin.ts` | One-time: set superadmin + seed system docs |

### Files modified

- `functions/src/schema.ts` — `superadmin` in role enum, `SubscriptionState`, `PaystackConfig` interfaces, `canManageBilling` on UserProfile
- `functions/src/auth-middleware.ts` — `requireSuperAdmin`, `requireBillingAccess`, updated `requireAdmin`/`requireManagerAccess` to include superadmin
- `functions/src/firebase-service.ts` — returns `canManageBilling` in getUserProfile
- `functions/src/routes.ts` — mounts superadmin, subscription, webhook routes + soft-lock on permit/document write endpoints
- `functions/src/index.ts` — declares `PAYSTACK_SECRET_KEY` secret
- `client/src/lib/roles.ts` — `superadmin` in UserRole, `isSuperAdmin()`, updated `isAdmin()`/`hasManagerAccess()`
- `client/src/lib/AuthContext.tsx` — `isSuperAdmin`, `canManageBilling` flags
- `client/src/lib/firebase.ts` — `canManageBilling` on UserProfile interface
- `client/src/App.tsx` — `/superadmin` + `/billing` routes, `SoftLockBanner`
- `client/src/components/Header.tsx` — Super Admin (purple badge) + Billing (credit card) nav links
- `client/src/pages/ApplyPermit.tsx` — soft-lock guard on submit
- `client/index.html` — Paystack inline JS script tag
- `firestore.rules` — `isSuperAdmin()` helper, `isAdmin()` includes superadmin, `system/{docId}` collection rules
- `shared/schema.ts` — `superadmin` in role enum

### PWA icon update (2026-04-16)

Replaced `icon-192.png` and `icon-512.png` with new fire emblem design
(resized from `generated-icon.png` via ImageMagick).

### Decisions to remember

- Paystack plan codes are **not hardcoded** — superadmin sets them from the dashboard.
  If plans change, update in Paystack dashboard + SuperAdmin → Paystack Config.
- `isFree: true` is the default. Superadmin flips it off when ready to charge.
- `softLockEnabled: false` is the default. Turn on separately from billing.
- The billing page displays R250/month and R2,250/year. These are display-only;
  actual charge amounts come from the Paystack plan configuration.
- Only superadmin can promote users to `admin` or `superadmin`.
- The `canManageBilling` flag can be set on any role by superadmin.
- Migration script (`scripts/migrate-superadmin.ts`) has already been run.
  Re-running is safe (uses `merge: true`).

## Post-deployment fixes (2026-04-16)

Bugs found during live testing and fixed same-day:

1. **Paystack v2 API** — `PaystackPop.setup()` + `openIframe()` were deprecated.
   Replaced with `new PaystackPop().newTransaction()`. File: `SubscriptionManager.tsx`.
2. **Subscribe button missing** — when `isFree` toggled off, `subscriptionStatus`
   was still `"free"` (seed value). Added `"free"` to `showSubscribe` conditions.
3. **Billing page too bare** — redesigned with side-by-side pricing cards
   (R250/month, R2,250/year), feature lists, active plan details grid, and
   contextual alerts. No more plain card with a single button.
4. **Documents 500 error** — missing composite index (`isPublic` + `uploadedAt`)
   and superadmin role not included in admin document access checks. Fixed both.
   Added index to `firestore.indexes.json`.
5. **DialogTitle warning** — login dialog (`LoginButton.tsx`) missing
   `<DialogTitle>` for Radix accessibility. Added with `VisuallyHidden` wrapper.
6. **Auth error messages** — login/register errors now show inline on the form
   (red alert box) in addition to console logging. Errors clear when switching
   tabs. All Firebase Auth error codes already mapped in `getAuthErrorMessage()`.
7. **Post-login redirect** — users auto-redirect after login based on role:
   superadmin → `/superadmin`, admin → `/admin`, area-manager → `/area-manager`,
   api-user → `/api-docs`, user → `/apply-permit`. Only fires on fresh sign-in
   from the home page (not on reload or deep links). File: `AuthContext.tsx`.
8. **Missing nav links** — desktop and mobile nav were missing several
   role-appropriate links. Fixed:
   - Desktop: added User Reports, Billing (with CreditCard icon) for billing users
   - Mobile: added Reports, User Reports, Billing, Super Admin links
     (previously only in the avatar dropdown)
9. **PWA icons** — replaced with new fire emblem design from `generated-icon.png`.

### Navigation link visibility by role (current)

| Link | user | area-manager | admin | superadmin |
| --- | --- | --- | --- | --- |
| Home, Safety Hub | yes | yes | yes | yes |
| My Permits, Apply, Farms, Today's Map | yes | yes | yes | yes |
| Manage Areas | — | yes | — | — |
| Admin Panel | — | — | yes | yes |
| Reports, User Reports | — | yes | yes | yes |
| Billing | — | if `canManageBilling` | if `canManageBilling` | yes |
| Super Admin | — | — | — | yes |

### What's pending

- Create annual Paystack plan and add plan code via SuperAdmin dashboard.
- DNS cutover for `umpiluzifpa.org` (see `docs/MIGRATION.md`).
- 14-day Replit dual-run then teardown.
- Firestore TTL on `apiUsageLogs.timestamp` (30d) — set via console.
- Cleanup PR: remove dead Drizzle/Postgres/Passport deps + `server/` directory.
- Enable `checkRateLimit` enforcement in a later PR.
- Consider funneling client-direct Firestore writes through Functions for
  stronger server-side validation (future).

## Tech stack quick reference

- Node 20, TypeScript 5.6, ESM everywhere except Cloud Functions (CommonJS in
  `functions/`)
- React 18 + Vite 5 + Wouter
- shadcn/ui on Radix + Tailwind 3
- React Query 5 (client state)
- Zod 3 for validation (shared + functions)
- firebase-admin 13, firebase-functions 6 (server), firebase 11 (client)
- Leaflet + react-leaflet + shpjs for mapping
- Express 4 + multer inside the function

## Contact / ownership

- Git user: Willem Oosthuizen — `willem@alasia.co.za`
- Firebase project owner: same

## Useful commands (from repo root)

```bash
firebase use umpiluzi-fire-permits        # select project
npm run build                              # build client → dist/public/
firebase deploy                            # deploy everything
firebase deploy --only functions           # functions only
firebase deploy --only hosting             # hosting only (prod)
firebase hosting:channel:deploy <name>     # preview channel
firebase functions:log                     # tail function logs
firebase emulators:start                   # local Hosting + Functions + Firestore
```
