# GarageSathi Security Audit Report

**Status:** PASS WITH DOCUMENTED LIMITATIONS  
**Date:** 2026-11-08  
**Audited commit:** `4970ed7` (plus uncommitted security-hardening changes in the working tree)  
**Branch:** `main`  
**Auditor:** Security audit session (single session, no production access)

---

## 1. Executive summary

GarageSathi is a Telugu-first, voice-powered garage operations platform (React 19 + Vite client, Express 5 API, MongoDB/JSON file store). The application was built end to end and functionally verified, but it shipped with **no authentication or authorization** — every API route, including destructive ones, was publicly accessible.

This audit added a server-side session authentication system (argon2id password hashing, express-session, one-time owner bootstrap), CSRF protection, Helmet security headers, a strict CORS allowlist, stricter rate limiting for audio/TTS endpoints, and removal of raw audio from the smoke-test response. All existing functionality is preserved: authentication is **opt-in** (`AUTH_ENABLED=true`) so the current frontend keeps working out of the box; it MUST be enabled before any production deployment.

No live Gnani API calls were made during automated testing (mock mode enforced). The Gnani key that was temporarily added to the local `.env` for a manual smoke test has been confirmed to remain out of Git and out of this report.

**Overall status: PASS WITH DOCUMENTED LIMITATIONS.** The application is not "guaranteed secure"; residual risks remain and are listed in Section 7.

---

## 2. Scope

**In scope:**
- `server/` — Express 5 API, routes, middleware, providers, data layer (file + Mongo)
- `client/` — React 19 + Vite SPA, API client, pages, components
- Configuration: `.env`, `.env.example`, `config.ts`
- Tests: `server/tests/`, `client/src/lib/*.test.ts`

**Out of scope:**
- Production hosting / infrastructure (no deployment exists)
- The Gnani provider service itself (integration verified once manually, not part of this audit)
- Mobile native applications (web-only)

---

## 3. Stack and version baseline

| Layer | Technology |
|---|---|
| Runtime | Node.js v24.12.0 |
| Package manager | npm 11.6.2 (`package-lock.json`) |
| Frontend | React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router 7 |
| Backend | Express 5, TypeScript, Zod 3, Multer 2 |
| Database | Mongoose 8 (MongoDB Atlas) or local JSON file store (`data/db.json`) |
| Auth (added) | express-session, argon2 (Argon2id) |
| Security headers (added) | helmet |
| Tests | Vitest + Supertest (server), Vitest (client) |
| CI/CD | None configured |

---

## 4. Findings by severity

### Critical

**F-01: No authentication or authorization on any API route**
- Evidence: `server/src/routes.ts` — all 15 endpoints (including `POST /api/services`, `PATCH /api/services/:id`, `POST /api/demo/reset`, `PATCH /api/jobs/:id/status`, `POST /api/ai/smoke-test`) are publicly accessible with no identity check.
- Impact: Any caller can create/modify job cards, change service prices, wipe all data via demo reset, and trigger paid Gnani calls.
- Fix: Added `server/src/auth.ts` (argon2id hashing, bootstrap), `server/src/authRoutes.ts` (login/logout/setup/me), `requireAuth`/`requireOwner` middleware in `server/src/middleware.ts`, and conditional protection of write routes in `routes.ts` (guarded by `AUTH_ENABLED`). First-owner bootstrap via one-time `GARAGE_SETUP_TOKEN`.
- Status: Fixed (opt-in; must be enabled via `AUTH_ENABLED=true` in production).

### High

**F-02: No CSRF protection for cookie-based session state changes**
- Evidence: `server/src/middleware.ts` had no CSRF middleware; `app.ts` set `credentials` unset on CORS.
- Impact: If sessions are introduced, a malicious site could forge state-changing requests from a logged-in user's browser.
- Fix: Added double-submit CSRF protection (`csrfProtection`, `issueCsrfToken` middleware) requiring `X-CSRF-Token` header on POST/PUT/PATCH/DELETE when `AUTH_ENABLED=true`. Token issued on every response and bound to the session.
- Status: Fixed.

**F-03: CORS allowed all origins in non-production**
- Evidence: `server/src/app.ts` — `if (!origin || !config.isProd || config.corsOrigins.includes(origin)) return callback(null, true);`
- Impact: In development, any origin could call the API; combined with no auth, this is broad exposure.
- Fix: CORS now uses an explicit allowlist from `CORS_ORIGIN` for all environments; no-request-origin allowed only in non-prod (narrower). `credentials` enabled only when `AUTH_ENABLED`. Methods restricted to GET/POST/PATCH/OPTIONS.
- Status: Fixed.

### Medium

**F-04: No security headers (CSP, X-Content-Type-Options, frame protection, etc.)**
- Evidence: `server/src/app.ts` only disabled `x-powered-by`; no Helmet or equivalent.
- Impact: Browser-level content-type sniffing, clickjacking, and inline-script execution not mitigated.
- Fix: Added `helmet()` with a Content-Security-Policy (`defaultSrc 'self'`, `frameAncestors 'none'`, restricted `connectSrc`), `nosniff`, referrer policy, and other Helmet defaults. HSTS intentionally omitted until HTTPS is confirmed on the deployment.
- Status: Fixed.

**F-05: Destructive demo reset enabled by default**
- Evidence: `config.ts` — `demoMode: process.env.DEMO_MODE !== 'false'` (defaults true); `POST /api/demo/reset` wipes all jobs and reseeds the catalogue.
- Impact: Accidental or malicious data loss in any running instance.
- Fix: Now additionally protected by `requireAuth`/`requireOwner` when `AUTH_ENABLED=true`. Documentation stresses `DEMO_MODE=false` in production.
- Status: Fixed (auth-gated; `DEMO_MODE` default behavior documented).

**F-06: Smoke-test response returned raw Gnani audio as base64**
- Evidence: `server/src/routes.ts` — `tts.audioBase64: tts.audio.toString('base64')` in `/api/ai/smoke-test` response.
- Impact: The paid TTS audio could be harvested/replayed via the smoke-test endpoint (rate-limited to 3/min and gated, but still an abuse surface).
- Fix: Removed `audioBase64` from the response; returns `bytes` and `contentType` only.
- Status: Fixed.

**F-07: Rate limiting is in-memory and IP-spoofable**
- Evidence: `server/src/middleware.ts` — `buckets` Map keyed by `req.ip`; `app.set('trust proxy', 1)` makes `req.ip` come from `X-Forwarded-For`, which a direct client can spoof.
- Impact: An attacker can rotate `X-Forwarded-For` to evade per-IP limits on paid Gnani endpoints.
- Fix: Added stricter `audioRateLimit` (8/min) for transcribe/speak; documented that production behind a reverse proxy must configure proxy trust and use a shared rate-limit store (Redis) for multi-instance deployments.
- Status: Partially fixed (documented residual risk).

### Low / Info

**F-08: Dependency vulnerabilities (dev tooling + zod)**
- `npm audit` reports 7 findings: `esbuild`/`tinypool` (via vitest, dev-only build tooling), `zod <4.6.6` (production; memory exhaustion on oversized constrained collections).
- Impact: `zod` finding is mitigated by the existing 120kb JSON body limit and array-size caps (max 20 items). `esbuild`/`tinypool` are dev dependencies, not shipped.
- Fix: Documented; not force-upgraded (zod fix is a major breaking change to v4). Recommended: review on next dependency cycle.
- Status: Documented residual risk.

**F-09: File-store data not encrypted at rest**
- Evidence: `server/src/db/file.ts` — `data/db.json` holds customer names, phones, transcripts, estimates in plain JSON.
- Impact: Anyone with filesystem access can read customer PII.
- Fix: Documented; production should use MongoDB Atlas with encryption at rest and least-privilege DB user.
- Status: Documented residual risk.

**F-10: No CI/CD or secret scanning**
- Evidence: No GitHub Actions/workflows exist; no local repository is configured.
- Impact: Secrets committed in future would not be automatically detected.
- Fix: Documented as a manual action (enable GitHub secret scanning/push protection if the repo is hosted).
- Status: Documented residual risk.

---

## 5. Verified fixes

| Fix | File(s) | Test |
|---|---|---|
| Session-based auth (express-session) | `server/src/app.ts`, `server/src/auth.ts`, `server/src/authRoutes.ts` | `server/tests/auth.integration.test.ts` |
| Argon2id password hashing (19 MiB, 2 iterations, 1 parallelism) | `server/src/auth.ts` | `auth.integration.test.ts` (login success/failure) |
| One-time owner bootstrap (`GARAGE_SETUP_TOKEN`) | `server/src/auth.ts`, `server/src/authRoutes.ts` | `auth.integration.test.ts` (setup, repeat-setup → 409, bad token → 401) |
| Login/logout with generic failure messages | `server/src/authRoutes.ts` | `auth.integration.test.ts` (wrong creds → 401 generic) |
| `requireAuth` / `requireOwner` middleware | `server/src/middleware.ts` | `server/tests/security.test.ts` (unit) |
| CSRF double-submit protection | `server/src/middleware.ts` | `security.test.ts` (missing/mismatched/matching token) |
| Auth-gated write routes (services, demo reset, status, smoke test) | `server/src/routes.ts` | `auth.integration.test.ts` (unauthenticated → 401) |
| CSRF token header issued on responses | `server/src/app.ts`, `server/src/middleware.ts` | `auth.integration.test.ts` (read `X-CSRF-Token`) |
| Helmet security headers + CSP | `server/src/app.ts` | Build + manual header inspection |
| Strict CORS allowlist | `server/src/app.ts` | Build + config review |
| Removed `audioBase64` from smoke test | `server/src/routes.ts` | Code review (response shape) |
| Stricter audio rate limit (8/min) | `server/src/middleware.ts`, `server/src/routes.ts` | `security.test.ts` (rate-limit unit) |
| Auth data layer (`auth` collection) | `server/src/db/types.ts`, `file.ts`, `mongo.ts` | `auth.integration.test.ts` |

---

## 6. Tests run and results

| Suite | Result |
|---|---|
| `server/tests/units.test.ts` | 12 passed |
| `server/tests/api.test.ts` | 16 passed |
| `server/tests/security.test.ts` (new) | 11 passed |
| `server/tests/auth.integration.test.ts` (new) | 8 passed |
| `client/src/lib/*.test.ts` | 18 passed |
| **Total** | **65 passed, 0 failed** (2026-11-09; security-specific suites unchanged) |
| `npm run typecheck` | Passed (server + client) |
| `npm run build` | Passed (server + client; Vite chunk-size warning only) |

Automated tests run in **mock mode** (`AI_PROVIDER_MODE=mock`). No Gnani credits were consumed. The local `.env` was restored to `AI_PROVIDER_MODE=mock` before running the suite.

---

## 7. Residual risks (not remediated in this session)

| Risk | Why it remains | Required action |
|---|---|---|
| Authentication is off by default | `AUTH_ENABLED=false` preserves existing frontend behavior | Developer must set `AUTH_ENABLED=true` + `AUTH_SESSION_SECRET` before production |
| First-owner bootstrap not yet run | No owner account exists yet | Developer runs `POST /api/auth/setup` with `GARAGE_SETUP_TOKEN`, then rotates/removes the token |
| Multi-tenancy not implemented | Single-garage model; no `garageId` scoping | If multi-garage is added, scope all data queries to server-derived `garageId` |
| In-memory rate limiting | Not shared across instances; IP spoofable via X-Forwarded-For | Use Redis/shared store + correct proxy trust in multi-instance production |
| File store PII not encrypted | `data/db.json` plaintext | Use MongoDB Atlas with encryption at rest for production |
| `zod` <4.6.6 vulnerability | Fix is a major breaking change (v4) | Review on next dependency cycle; body/array limits mitigate |
| No CI / secret scanning | No GitHub Actions configured | Enable GitHub secret scanning + push protection if hosted |
| HSTS not enabled | HTTPS not confirmed on deployment | Enable `helmet.hsts()` once the public endpoint is confirmed HTTPS |
| Live Gnani Telugu quality | Smoke test used English input | Verify with a real Telugu clip before claiming Telugu transcription quality |

---

## 8. Manual actions required (developer)

1. Set `AUTH_ENABLED=true` and a strong `AUTH_SESSION_SECRET` in the production environment.
2. Set `GARAGE_SETUP_TOKEN`, run `POST /api/auth/setup` once to create the owner, then rotate/remove the token.
3. Set `DEMO_MODE=false` and `CORS_ORIGIN=<real frontend origin>` in production.
4. Set `NODE_ENV=production` and confirm HTTPS; then consider enabling HSTS.
5. Store `GNANI_API_KEY_ID` and `MONGODB_URI` in the hosting provider's secret manager (never in `.env` or Git).
6. Rotate the Gnani API key (it was temporarily present in a chat session).
7. Enable GitHub secret scanning and push protection if the repository is hosted on GitHub.
8. Verify Telugu transcription quality with a real Telugu audio clip through the live flow.

---

## 9. Files changed

**New:**
- `server/src/auth.ts`
- `server/src/authRoutes.ts`
- `server/tests/security.test.ts`
- `server/tests/auth.integration.test.ts`
- `client/src/pages/LoginPage.tsx`
- `SECURITY/THREAT_MODEL.md`
- `SECURITY/ENVIRONMENT_AUDIT.md`
- `SECURITY/ACCESS_CONTROL_MATRIX.md`
- `SECURITY/SECURITY_AUDIT.md` (this file)
- `SECURITY/REMEDIATION_LOG.md`
- `SECURITY/SECURITY_TEST_MATRIX.md`

**Modified:**
- `server/src/config.ts` (auth config, setupToken, isAuthEnabled)
- `server/src/app.ts` (helmet, session, CORS fix, CSP, authRouter mount)
- `server/src/middleware.ts` (CSRF, requireAuth, requireOwner, audioRateLimit)
- `server/src/routes.ts` (auth-guarded write routes, removed audioBase64)
- `server/src/db/types.ts` (OwnerRecord, auth collection)
- `server/src/db/file.ts` (auth store)
- `server/src/db/mongo.ts` (auth store)
- `client/src/lib/api.ts` (auth API methods)
- `client/src/pages/LoginPage.tsx` (new page — listed above as new; App/Layout reference it)
- `client/src/App.tsx` (login route)
- `client/src/components/Layout.tsx` (login/logout UI, auth state)
- `.env.example` (auth variable placeholders)
- `AGENTS.md` (security invariants — updated)
- `BRAIN/*.md` (architecture, task board, test log, handoff — updated)
