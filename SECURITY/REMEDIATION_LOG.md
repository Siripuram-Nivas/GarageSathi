# GarageSathi Security Remediation Log

**Purpose:** Record every security-related change made during the audit, with reason, files changed, tests, and rollback considerations.

---

| # | Date | File(s) | Change | Reason | Tests | Rollback |
|---|---|---|---|---|---|---|
| 1 | 2026-11-08 | `server/src/auth.ts` (new) | Argon2id password hashing, owner bootstrap, session-user helpers | Passwords must not be plaintext; first-owner setup must be one-time | `auth.integration.test.ts` | Revert file (no data migrated yet) |
| 2 | 2026-11-08 | `server/src/authRoutes.ts` (new) | `/api/auth/setup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Server-verified authentication with generic failure messages | `auth.integration.test.ts` | Revert file |
| 3 | 2026-11-08 | `server/src/middleware.ts` | Added `csrfProtection`, `issueCsrfToken`, `requireAuth`, `requireOwner`, `audioRateLimit`, `AuthedSession` type | CSRF defense, auth enforcement, stricter audio rate limits | `security.test.ts` | Revert to pre-audit middleware |
| 4 | 2026-11-08 | `server/src/app.ts` | Added `helmet()` with CSP, `express-session`, strict CORS allowlist, `authRouter` mount | Security headers, session management, explicit CORS | Build + typecheck | Revert to pre-audit app.ts |
| 5 | 2026-11-08 | `server/src/routes.ts` | Write routes guarded by `ownerWrite()` (auth + CSRF when `AUTH_ENABLED`); removed `audioBase64` from smoke-test response; transcribe/speak use `audioRateLimit` | Prevent unauthenticated writes; reduce TTS abuse surface | `auth.integration.test.ts`, `api.test.ts` | Revert routes (removes auth protection) |
| 6 | 2026-11-08 | `server/src/config.ts` | Added `auth` config (enabled, sessionSecret, cookieName, cookieMaxAgeMs), `setupToken`, `isAuthEnabled()` | Configure opt-in auth and bootstrap token | typecheck | Revert config |
| 7 | 2026-11-08 | `server/src/db/types.ts` | Added `OwnerRecord` interface and `auth` collection to `DataLayer` | Store owner credentials | typecheck (file + mongo impl) | Revert types (breaks file/mongo impl) |
| 8 | 2026-11-08 | `server/src/db/file.ts` | Implemented `auth.get/create/reset` on the JSON file store | Owner persistence in file-store mode | `auth.integration.test.ts` | Revert file (loses owner data) |
| 9 | 2026-11-08 | `server/src/db/mongo.ts` | Added `Owner` model and `auth.get/create/reset` for MongoDB | Owner persistence in MongoDB mode | typecheck | Revert mongo |
| 10 | 2026-11-08 | `server/tests/security.test.ts` (new) | Unit tests for auth middleware, CSRF, rate limiting | Verify security controls in isolation | 11 tests pass | N/A (test file) |
| 11 | 2026-11-08 | `server/tests/auth.integration.test.ts` (new) | End-to-end auth tests (setup, login, logout, protected routes) with `AUTH_ENABLED=true` | Verify auth works end to end | 8 tests pass | N/A (test file) |
| 12 | 2026-11-08 | `client/src/lib/api.ts` | Added `api.auth.{login,logout,me,setup}` methods | Frontend can authenticate | typecheck | Revert api.ts |
| 13 | 2026-11-08 | `client/src/pages/LoginPage.tsx` (new) | Login form | Owner sign-in UI | typecheck | N/A (new page) |
| 14 | 2026-11-08 | `client/src/App.tsx` | Added `/login` route | Expose login page | typecheck | Revert App.tsx |
| 15 | 2026-11-08 | `client/src/components/Layout.tsx` | Auth state (`/api/auth/me`), login/logout UI in header | Surface auth status to the user | typecheck | Revert Layout |
| 16 | 2026-11-08 | `.env.example` | Added `AUTH_ENABLED`, `AUTH_SESSION_SECRET`, `GARAGE_SETUP_TOKEN` placeholders | Document required production env vars | N/A | Revert .env.example |

**Dependencies added (production):** `express-session`, `argon2`, `helmet`  
**Dependencies added (dev):** `@types/express-session`, `@types/argon2`

**Rollback note:** All changes are additive or backward-compatible when `AUTH_ENABLED=false` (the default). Reverting restores the original unauthenticated behavior. No data migrations were performed (no owner accounts existed before this audit).
