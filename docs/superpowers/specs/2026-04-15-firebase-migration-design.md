# UmpiluziFirePermits — Replit → Firebase Migration Design

**Date:** 2026-04-15
**Status:** Approved (user)
**Target project:** `umpiluzi-fire-permits`
**Target domain:** `umpiluzifpa.org`

## Context

The app is already on Firestore + Firebase Auth. The migration moves compute off Replit onto Firebase Hosting + Cloud Functions 2nd gen. Data and auth are untouched.

## Final architecture

```
umpiluzifpa.org
      │
      ▼
Firebase Hosting ──(static)──►  dist/public/*
      │
      └─(rewrite /api/**)──►  Cloud Function "api" (2nd gen, Node 20, us-central1)
                                    │
                                    ├──► Firestore (existing collections)
                                    ├──► Cloud Storage (gs://umpiluzi-fire-permits.firebasestorage.app)
                                    └──► Firebase Auth (Admin SDK, default service account)
```

## Repo layout after migration

```
/
├── client/                      unchanged
├── shared/                      unchanged
├── functions/                   NEW
│   ├── src/
│   │   ├── index.ts             `export const api = onRequest(app)`
│   │   ├── app.ts               Express app
│   │   ├── routes.ts            (from server/routes.ts)
│   │   ├── firebase-service.ts  (from server/, minus env-key branch)
│   │   ├── auth-middleware.ts   (from server/)
│   │   ├── rate-limit-service.ts (from server/)
│   │   └── storage-service.ts   NEW — real Cloud Storage upload/download
│   ├── package.json
│   └── tsconfig.json
├── firebase.json                hosting + functions + rewrites
├── firestore.rules              NEW
├── firestore.indexes.json       NEW (captured from prod)
├── storage.rules                NEW
└── .firebaserc                  unchanged
```

`server/` deleted after `functions/` is verified.

## Components

1. **Hosting build** — `vite build` → `dist/public`. PWA service worker, manifest, icons.
2. **Cloud Function `api`** — single 2nd-gen HTTP function wrapping Express. `us-central1`, 512MB, 60s, min instances 0.
3. **Storage service** — `uploadDocument(buffer, metadata)` and `getSignedDownloadUrl(docId)` using Admin SDK. Replaces placeholder in `routes.ts`.
4. **Firestore rules** — per-collection, role-aware. Role lookup via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`. Regular users: own `burnPermits`, own `farms`, public `documents`. Admin/area-manager: full read on permits/areas/bans/documents; admin full write. `apiUsageLogs`: server-only.
5. **Storage rules** — `documents/**` authenticated read if metadata `isPublic` or admin; client writes denied (forces `/api/documents` path, which uses Admin SDK).
6. **Indexes** — captured live set + `burnPermits(status,createdAt desc)`, `documents(isPublic, uploadedAt desc)`, `apiUsageLogs(userId, timestamp)` and `(userId, endpoint, timestamp)` for rate-limit queries.

## Behavioral changes vs. Replit

| Area | Before | After |
| --- | --- | --- |
| Host | Replit autoscale, port 5000 | Firebase Hosting + Cloud Function |
| Service account | `FIREBASE_SERVICE_ACCOUNT_KEY` env | Default service account (no key) |
| Docs upload | multer memory only, bytes lost | Cloud Storage `documents/{id}/{name}` |
| Docs download | Placeholder text | Signed URL redirect (15-min) |
| Error handler | Re-throws after respond | Log + respond only |
| Rate limit | Logger on, enforcer dormant | Same (enforcer stays off) |
| `apiUsageLogs` | Unbounded growth | 30-day TTL on `timestamp` |
| `firebase.json` public | `dist` (wrong) | `dist/public` (correct) |

## Rate limiting

- Port `rateLimitMiddleware` exactly as today.
- `checkRateLimit` stays unattached (behavior preserved).
- Firestore TTL policy on `apiUsageLogs.timestamp` at 30d (set manually post-deploy via console).

## Secrets

None. Client config in `client/src/lib/firebase.ts` is non-secret. Function uses default service account.

## Dead code (cleanup PR after migration)

Remove from root `package.json`: `drizzle-orm`, `drizzle-zod`, `drizzle-kit`, `@neondatabase/serverless`, `passport`, `passport-local`, `express-session`, `connect-pg-simple`, `memorystore`, `@types/connect-pg-simple`, `@types/passport*`, `@types/express-session`, `ws`. Delete `drizzle.config.ts`, `server/storage.ts`, eventually `server/`.

## Rollback

- Pre-migration commit tagged `pre-firebase-migration`.
- Replit kept running 14 days post-cutover.
- DNS TTL lowered to 300s 48h before DNS flip.
- Rollback path: flip DNS back to Replit — Firestore data stays consistent across both.

## Phase ordering

1. Capture live indexes + rules baseline.
2. Scaffold `functions/`, port server code, add storage service.
3. Write rules + indexes.
4. Update `firebase.json`.
5. Build client + functions; fix errors.
6. Deploy rules, indexes, storage rules, functions, hosting (preview channel).
7. Smoke-test preview URL.
8. Hand off DNS cutover instructions.

## Verification checklist (pre-DNS-flip)

- [ ] Google + email/password sign-in
- [ ] `POST`-equivalent: apply for permit (client-direct Firestore write, rules allow)
- [ ] `GET /api/permits` returns today's permits
- [ ] `GET /api/permits?includeHistorical=true&startDate=...` returns range
- [ ] `PATCH /api/permits/:id` approves as admin
- [ ] `POST /api/documents` with file → bytes in Cloud Storage, metadata in Firestore
- [ ] `GET /api/documents/:id/download` returns real file
- [ ] `GET /api/umpiluzi-fmu-geojson` returns the FMU GeoJSON
- [ ] Burn-ban creation blocks overlapping permit
- [ ] PWA installs from preview URL
- [ ] `umpiluzifpa.org` added to Firebase Auth authorized domains
