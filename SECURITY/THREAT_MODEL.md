# GarageSathi Threat Model

**Status:** Draft — reflects the implemented codebase as of the audit date.  
**Scope:** The GarageSathi monorepo (React 19 client + Express 5 API), running locally in mock mode by default. Live Gnani calls are gated and not part of automated testing.  
**Method:** OWASP-inspired threat modeling (assets, actors, trust boundaries, entry points, threats, mitigations). Verification status is noted per item.

---

## 1. Assets

| Asset | Sensitivity | Where it lives |
|---|---|---|
| Gnani API key (STT + TTS scopes) | Critical | Root `.env` (gitignored), server process memory only |
| MongoDB connection string (`MONGODB_URI`) | High | Root `.env` (gitignored), server process memory |
| Session secret / signing key | High | Server environment (not yet implemented) |
| Job cards (customer name, phone, vehicle, complaint, transcript, estimate) | High | `data/db.json` (file store, single process) or MongoDB Atlas |
| Service catalogue (prices in paise, aliases) | Medium | `data/db.json` or MongoDB |
| Garage identity (name, owner, phone) | Medium | Browser `localStorage` only (`garage.identity`) |
| Audio (recorded WAV) | Medium | Browser memory only; never persisted to disk |
| Transcript text | Medium | Job card document; never raw audio |
| Logs (request IDs, errors) | Low/Medium | Server stdout; must not contain secrets or PII |

---

## 2. Trust Boundaries

```
Browser (React SPA)  ──HTTPS/fetch──►  Express API  ──fetch──►  Gnani Prisma/Timbre
        │                                  │
        │                                  ▼
        │                          data/db.json  or  MongoDB Atlas
        │                                  │
        ▼                                  ▼
 localStorage (garage identity)      Server process memory (key, session secret)
```

- **Browser ↔ API:** fetch calls to `VITE_API_URL`. No secrets cross this boundary.
- **API ↔ Gnani:** server-side only; key never reaches the browser.
- **API ↔ datastore:** file store (single process) or MongoDB (if `MONGODB_URI` set).
- **Git remote:** none configured (no GitHub remote). Local git only.

---

## 3. Threat Actors

| Actor | Capability | Motivation |
|---|---|---|
| Unauthenticated internet user | Send HTTP requests to the API | Read/modify job cards, abuse paid Gnani API, reset data |
| Authenticated local user (mechanic/owner) | Use the UI from the same browser | Escalate privileges, modify prices, reset demo data |
| Malicious insider | Direct file/system access | Read `data/db.json`, `.env`, exfiltrate job cards |
| Compromised dependency | Supply-chain via npm | Exfiltrate key, capture request bodies |
| Someone with repository access | Read local git + working tree | Find `.env` if committed, inspect commit history |

---

## 4. Entry Points

| Entry point | Auth required? | Validation? | Notes |
|---|---|---|---|
| `POST /api/jobs` | No | Zod | Core product path; creates job cards |
| `POST /api/jobs/preview` | No | Zod | Estimate generation |
| `PATCH /api/jobs/:id/status` | No | Zod | Status lifecycle changes |
| `GET /api/jobs`, `GET /api/jobs/:id` | No | — | Read job cards (PII) |
| `POST /api/services`, `PATCH /api/services/:id` | No | Zod | Price/catalogue changes |
| `GET /api/services` | No | — | Read catalogue |
| `POST /api/voice/transcribe` | No | Multer + WAV header check | Audio upload |
| `POST /api/voice/speak` | No | Zod (text ≤600) | TTS — paid API abuse surface |
| `POST /api/ai/smoke-test` | No | Gated by `ALLOW_GNANI_LIVE_TESTS` + live mode | Paid API abuse surface |
| `POST /api/demo/reset` | No | Gated by `DEMO_MODE` | Destructive data wipe |
| `GET /api/health`, `GET /api/ai/status` | No | — | Config exposure (booleans only) |

---

## 5. Likely Risks (OWASP-aligned)

| ID | Threat | Likelihood | Impact | Current mitigations | Verified? | Gap / Required action |
|---|---|---|---|---|---|---|
| T-01 | **No authentication** — any caller can read/write job cards, prices, reset data | High | Critical | None | No | Implement server-side session auth + bootstrap |
| T-02 | **IDOR/BOLA** — change a job ID in the URL to access another garage's job | High | High | None (single garage, no tenant model) | No | Add ownership/tenant scoping if multi-user |
| T-03 | **Paid API abuse** — arbitrary TTS text or repeated STT calls exhaust Gnani credits | Medium | High | Single-flight dedupe, rate limit 10/min on speak/transcribe | Partial (rate limit exists) | Per-identity limits, remove `audioBase64` from smoke test |
| T-04 | **Destructive demo reset** — `POST /api/demo/reset` wipes all jobs (default ON in dev) | Medium | High | `DEMO_MODE` gate | Partial | Default `DEMO_MODE=false`, require auth |
| T-05 | **Secret disclosure** — Gnani key in `.env`, logs, or frontend bundle | Low | Critical | `.env` gitignored; health exposes booleans only | Partial | Verify `.env` not tracked; secret scan history |
| T-06 | **CORS allow-all in development** — any origin can call the API | Medium | Medium | `CORS_ORIGIN` allowlist in prod only | Partial | Explicit allowlist always; no `!isProd` bypass |
| T-07 | **Missing security headers** — no CSP, HSTS, X-Content-Type-Options | Low | Medium | `x-powered-by` disabled | No | Add Helmet/security headers |
| T-08 | **No CSRF protection** — state-changing cookie requests could be forged | Medium | Medium | None (no sessions yet) | No | Add CSRF when sessions introduced |
| T-09 | **In-memory rate limiting** — not shared across instances; IP spoofable via X-Forwarded-For | Medium | Medium | Per-IP+path buckets, `Retry-After` | Partial | Shared store for multi-instance; trust proxy review |
| T-10 | **File store data exposure** — `data/db.json` holds customer PII, not encrypted at rest | Medium | Medium | Gitignored, single-process | No | Encrypt/protect data dir; MongoDB for production |
| T-11 | **XSS** — stored/ reflected user text rendered in UI | Low | Medium | React auto-escapes; no `dangerouslySetInnerHTML` found | Partial (grep clean) | Keep CSP as defense-in-depth |
| T-12 | **NoSQL/query injection** — user input merged into DB filters | Low | Medium | Zod schemas; `mongoose.isValidObjectId`; string matching in file store | Partial | Keep allowlist-based query construction |
| T-13 | **Dependency supply chain** — vulnerable or unmaintained npm packages | Low | Medium | Lockfile present (`package-lock.json`) | No | Run `npm audit`; review findings |
| T-14 | **Verbose errors / debug info** — stack traces leaked to client | Low | Low | Generic 500 message; stack only in server console | Partial | Ensure `NODE_ENV=production` disables debug |

---

## 6. Mitigations and Verification Methods

| Mitigation | Applies to | How verified |
|---|---|---|
| Server-side session authentication | T-01, T-02 | Integration test: unauthenticated calls to protected routes return 401 |
| Argon2id password hashing | T-01 | Unit test: stored hash is not plaintext; verification works |
| First-owner bootstrap (one-time, token-gated) | T-01 | Test: second setup attempt rejected |
| CSRF double-submit token | T-08 | Test: state-changing request without token rejected |
| Explicit CORS allowlist | T-06 | Test: disallowed origin receives CORS error |
| Helmet security headers | T-07 | Test: response headers present |
| Per-endpoint rate limits + Retry-After | T-03, T-09 | Test: 429 after threshold |
| Remove `audioBase64` from smoke-test response | T-03 | Test: response no longer contains base64 audio |
| `DEMO_MODE=false` default + auth guard | T-04 | Test: reset returns 403 when disabled |
| Secret scanning of files + history | T-05 | Test: `git ls-files` shows no `.env`; gitleaks clean |
| `NODE_ENV=production` disables verbose errors | T-14 | Test: 500 response has no stack trace |

---

## 7. Single-Garage Model (documented decision)

GarageSathi is a **single-garage, single-operator** application. There is no multi-tenant data model and no concept of "Garage A vs Garage B" in the current code. The access model is therefore:

- **Unauthenticated visitor:** can read dashboard/jobs/catalogue and create jobs (the product's core value — voice-first, no login friction).
- **Authenticated owner/mechanic (when `AUTH_ENABLED=true`):** required for price changes, service catalogue writes, demo reset, and status transitions.

This is documented as a deliberate scope choice, not a missing multi-tenant implementation. If multi-tenancy is added later, every data query must be scoped to a server-derived `garageId`.
