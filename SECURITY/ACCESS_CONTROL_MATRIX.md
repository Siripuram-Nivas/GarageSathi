# GarageSathi Access Control Matrix

**Status:** Draft.  
**Model:** Single-garage, single-operator. No multi-tenant data model exists. Roles are: `owner` (garage owner/mechanic) and `unauthenticated` (visitor).  
**Principle:** Deny by default on protected routes. Identity is derived server-side from the session (not yet implemented). Frontend UI hiding is never treated as authorization.

---

## 1. Route access matrix

| Method | Path | Public? | Required identity | Required role | Tenant/ownership rule | Test case |
|---|---|---|---|---|---|---|
| GET | `/api/health` | Yes | None | — | None | Returns 200 without secrets |
| GET | `/api/ai/status` | Yes | None | — | None | Returns booleans only, no key |
| GET | `/api/services` | Yes | None | — | None | Returns active services |
| GET | `/api/jobs` | Yes | None | — | None | Returns all jobs (single garage) |
| GET | `/api/jobs/:id` | Yes | None | — | None | Returns job by ID or jobId |
| POST | `/api/voice/transcribe` | Yes | None | — | None | WAV upload, mock/live by config |
| POST | `/api/voice/speak` | Yes | None | — | None | TTS for a job or arbitrary text |
| POST | `/api/jobs/preview` | Yes | None | — | None | Provisional estimate, no write |
| POST | `/api/jobs` | Yes | None | — | None | Creates job; requires `mechanicApproved=true` |
| POST | `/api/services` | No* | Session | `owner` | N/A (single garage) | 401 without session; 403 wrong role |
| PATCH | `/api/services/:id` | No* | Session | `owner` | N/A | 401/403 as above |
| POST | `/api/demo/reset` | No* | Session | `owner` | N/A | 401 without session; 403 when `DEMO_MODE=false` |
| PATCH | `/api/jobs/:id/status` | No* | Session | `owner` | N/A | 401 without session |
| POST | `/api/ai/smoke-test` | No* | Session | `owner` | N/A | 401 without session; gated by live mode |
| POST | `/api/auth/login` | Yes | None | — | None | Issues session |
| POST | `/api/auth/logout` | Yes | Session | any | None | Invalidates session |
| POST | `/api/auth/setup` | Yes† | None | — | None | One-time bootstrap; disabled after use |

\* Protected only when `AUTH_ENABLED=true` (config). Default `false` preserves existing frontend behavior; must be enabled for production.

† `setup` requires a one-time bootstrap token (`GARAGE_SETUP_TOKEN`) and is disabled once an owner exists.

---

## 2. Roles

| Role | Can |
|---|---|
| `unauthenticated` | Read dashboard/jobs/catalogue; create jobs; transcribe audio; play confirmation |
| `owner` | All of the above + edit service catalogue, reset demo data, run smoke test, change job status |
| (no `admin` role separate from owner — single-garage model) | — |

No route allows a user to self-assign `owner` role. Role is set only during one-time bootstrap.

---

## 3. Ownership / tenant rules

- Single garage: no `garageId` field exists on jobs or services. All data belongs to the one garage.
- When `AUTH_ENABLED`, the session's `owner` flag gates write routes. No cross-tenant check is needed today; if multi-tenancy is added, every `jobs`/`services` query must be scoped to a server-derived `garageId`.

---

## 4. Authorization enforcement points (to implement)

- `requireAuth` middleware — session present, else 401.
- `requireOwner` middleware — `session.user.role === 'owner'`, else 403.
- Applied to: `POST /api/services`, `PATCH /api/services/:id`, `POST /api/demo/reset`, `POST /api/ai/smoke-test`, `PATCH /api/jobs/:id/status` (when `AUTH_ENABLED=true`).
- NOT applied to: read routes and job-creation routes (preserves product behavior; documented as a scope decision, see THREAT_MODEL T-01 / T-02).

---

## 5. Tests to run (SECURITY_TEST_MATRIX.md)

- Unauthenticated `POST /api/services` → 401 (when auth enabled)
- Unauthenticated `PATCH /api/services/:id` → 401
- Unauthenticated `POST /api/demo/reset` → 401
- Unauthenticated `PATCH /api/jobs/:id/status` → 401
- Wrong-role session → 403
- Valid owner session → 200
- Second bootstrap attempt → 403/409 (disabled)
- Login with invalid credentials → generic 401 (no account enumeration)
