# UmpiluziFirePermits — Firebase Migration Guide

Operational guide for the Replit → Firebase migration. Use this for the cutover,
rollback, and ongoing deploys.

## URLs

| What | URL |
| --- | --- |
| Firebase project | `umpiluzi-fire-permits` |
| Production domain (post-cutover) | `https://umpiluzifpa.org` |
| Firebase default hosting URL | `https://umpiluzi-fire-permits.web.app` |
| Preview channel (`staging`, 30d) | `https://umpiluzi-fire-permits--staging-fxcvrnse.web.app` |
| Cloud Function direct URL | `https://api-xchyudtsiq-uc.a.run.app` |
| Firebase console | `https://console.firebase.google.com/project/umpiluzi-fire-permits/overview` |

## Pre-cutover checklist

Run every check against the **preview URL** with a real user account:

- [ ] Sign in with Google
- [ ] Sign in with email/password
- [ ] Apply for a permit (tests client-direct Firestore writes against new rules)
- [ ] My Permits page loads
- [ ] Today's Permits page loads (tests `GET /api/permits`)
- [ ] Admin: approve a permit (`PATCH /api/permits/:id`)
- [ ] Admin: upload a document (bytes land in Cloud Storage; Firestore gets `storagePath`)
- [ ] Download that document — real file, not placeholder text
- [ ] Permit Reports over a wide date range (tests 5000-limit historical query)
- [ ] User Reports
- [ ] Burn ban creation blocks an overlapping permit
- [ ] Map loads FMU GeoJSON
- [ ] PWA installs from the preview URL
- [ ] Firebase Auth → Settings → **Authorized domains** contains `umpiluzifpa.org`
  and `umpiluzi-fire-permits.web.app`. If not, add them **before** DNS cutover
  or sign-in will fail on the new domain.

## DNS cutover

1. **48 hours before cutover:** drop the current DNS TTL on `umpiluzifpa.org` to
   300s at your DNS provider (while it still points at Replit). This makes
   rollback fast if needed.
2. Firebase console → Hosting → **Add custom domain** → enter `umpiluzifpa.org`.
3. Firebase gives you A records (and a TXT record for verification). Add them
   at your DNS provider, remove the old Replit A record.
4. Wait for Firebase to show the domain as `Connected`.
5. Test `https://umpiluzifpa.org/` and `https://umpiluzifpa.org/api/health` —
   both should work with the issued certificate.
6. Leave the DNS TTL low for 48 hours after cutover in case rollback is needed.

External API consumers hitting `https://umpiluzifpa.org/api/*` continue working
unchanged — Hosting rewrites `/api/**` to the Cloud Function.

## 14-day dual-run

- Keep the Replit deployment running for 14 days after DNS cutover.
- Firestore is shared — writes on Firebase are instantly visible to Replit and
  vice versa. Both deploys observe consistent data.
- Rollback path: point DNS back at Replit (TTL still low). No data loss.
- After 14 clean days:
  - Tear down Replit deployment.
  - Raise DNS TTL back up.
  - Open the cleanup PR (dead deps and `server/` removal — see History doc).

## Ongoing deploys

From repo root, with `firebase use umpiluzi-fire-permits` active:

| Deploy | Command |
| --- | --- |
| Everything | `firebase deploy` |
| Functions only | `firebase deploy --only functions` |
| Hosting to production | `firebase deploy --only hosting` |
| Hosting to preview channel | `firebase hosting:channel:deploy <name> --expires 30d` |
| Firestore rules + indexes | `firebase deploy --only firestore` |
| Storage rules | `firebase deploy --only storage` |

Build outputs: client → `dist/public/`, functions → `functions/lib/`.
The `predeploy` hook in `firebase.json` runs `npm --prefix functions run build`
automatically before functions deploy. Client must be built manually
(`npm run build` at repo root) before hosting deploy.

## Rollback

**DNS rollback (fastest, use this first):** at your DNS provider, point
`umpiluzifpa.org` back at the Replit A record. Propagation ≤ 5 min with 300s TTL.

**Hosting version rollback:** Firebase console → Hosting → Release history →
select a previous version → **Rollback**. Functions are versioned separately; to
roll those back, `git checkout <pre-migration-tag>` in the `functions/` directory
and redeploy, or use the Cloud Run console to route traffic to a prior revision.

**Data:** Firestore data was never migrated — same project, same collections.
Nothing to restore.

## Post-migration tasks (not blocking cutover)

- Set Firestore **TTL policy** on `apiUsageLogs.timestamp` — 30 days.
  Firestore console → TTL → Add policy → collection `apiUsageLogs`, field
  `timestamp`. Can't be set from CLI.
- Upgrade `firebase-functions` package when convenient (warning on v6 deploy was
  cosmetic — deploy still succeeded).
- Cleanup PR: remove Drizzle/Postgres/Passport/Neon dependencies from root
  `package.json`, delete `drizzle.config.ts`, `server/`. See `docs/HISTORY.md`
  for the full dead-code list.
- Enable `checkRateLimit` enforcement in a separate PR (attach to `/api/*`
  after a week of monitoring real traffic against current limits).

## Troubleshooting

**Function returns 403 Forbidden.** The Cloud Run service lost its public
invoker. `invoker: "public"` is already set in `functions/src/index.ts`; redeploy
functions. If persistent, grant `roles/run.invoker` to `allUsers` on the `api`
service via Cloud Run console.

**Firestore write denied in the client.** Check the role field on the user's
`users/{uid}` document. Rules use `get(/databases/.../users/$uid).data.role`.
Rules are in `firestore.rules` — keep client and server behavior in sync.

**Document upload succeeds but download returns 410.** The upload succeeded at
Firestore level but storage save failed. Inspect Cloud Logging for the `api`
function and verify the Cloud Storage bucket `umpiluzi-fire-permits.firebasestorage.app`
is reachable.

**"npm --prefix functions run build" fails during deploy.** Run it manually from
the repo root to see the TypeScript errors. `functions/` has its own
`package.json` and must have `node_modules/` installed locally
(`npm --prefix functions install`).

**401 on `/api/*` when you expected success.** Auth middleware expects a Firebase
ID token in `Authorization: Bearer <token>`. The client gets this from
`firebase.auth().currentUser.getIdToken()` — verify the client is sending it.
