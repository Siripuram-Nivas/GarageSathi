# GarageSathi Environment Audit

**Status:** Draft.  
**Rule:** This file contains variable names, purposes, exposure classifications, and presence status only. **No actual values, key suffixes, passwords, tokens, or connection strings appear here.**

---

## 1. Environment files present

| File | Tracked by Git? | Ignored by `.gitignore`? | Notes |
|---|---|---|---|
| `.env` (root) | No | Yes (`.env` pattern) | Local-only; contains live-mode config and the Gnani key when set by the developer |
| `.env.example` (root) | Yes | No | Safe template — placeholder names only, no real values |
| `.env.local`, `.env.development`, `.env.production` | Not present | Covered by `.env.local` pattern | — |
| `client/.env`, `client/.env.*` | Not present | Covered by root patterns | No Vite env files exist in the client |

## 2. Environment-variable inventory (redacted)

| Variable | Purpose | Exposure | Required? | Present? | Remediation |
|---|---|---|---|---|---|
| `PORT` | API listen port | Server only | Optional | Yes | Keep default 4000 |
| `NODE_ENV` | Runtime mode (`development`/`production`) | Server only | Optional | Yes | Set `production` in hosting |
| `MONGODB_URI` | MongoDB Atlas connection string | Server only | Optional (file store fallback) | Present (empty) | Hosting secret manager; never client |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | Server only | Optional | Yes (`http://localhost:5173`) | Production must list real frontend origin |
| `DEMO_MODE` | Enables destructive `POST /api/demo/reset` | Server only | Optional | Yes (`true`) | Set `false` in production |
| `AI_PROVIDER_MODE` | `mock` or `live` — controls Gnani calls | Server only | Optional | Yes | `mock` default; `live` only deliberately |
| `GNANI_API_KEY_ID` | Gnani STT + TTS secret key | **Server only — never client** | Optional | Present (set by developer) | Rotate after any chat exposure; hosting secret manager |
| `ALLOW_GNANI_LIVE_TESTS` | Extra gate for one-time live smoke test | Server only | Optional | Yes (`false`) | `false` except during a deliberate test |
| `GNANI_STT_MODEL` | Prisma model name | Server only | Optional | Yes | Config only, not secret |
| `GNANI_STT_LANGUAGE` | STT language list | Server only | Optional | Yes | Config only |
| `GNANI_STT_FORMAT` | STT output format | Server only | Optional | Yes | Config only |
| `GNANI_STT_KEYTERMS_ENABLED` | STT keyterms toggle | Server only | Optional | Yes | Config only |
| `GNANI_STT_TOPIC` | STT topic string | Server only | Optional | Yes | Config only |
| `GNANI_TTS_MODEL` | Timbre model name | Server only | Optional | Yes | Config only |
| `GNANI_TTS_VOICE` | Timbre voice (from documented list) | Server only | Optional | Yes | Config only |
| `GNANI_TTS_LANGUAGE` | TTS language | Server only | Optional | Yes | Config only |
| `EVON_ENABLED` | Optional Evon adapter toggle | Server only | Optional | Yes (`false`) | Keep disabled unless needed |
| `EVON_BASE_URL` | Evon endpoint base URL | Server only | Optional | Present (empty) | Not secret unless configured |
| `EVON_API_KEY` | Evon bearer key | Server only | Optional | Present (empty) | Hosting secret manager if used |
| `EVON_MODEL` | Evon model name | Server only | Optional | Yes | Config only |
| `VITE_API_URL` | Frontend API base URL | **Build-time, embedded in client bundle** | Optional | Commented out in example | Not a secret; must be a public URL |
| `DATA_DIR` | File-store directory path | Server only | Optional | Not set | Defaults to `../data` |

### Exposure classification

- **Server-only secrets:** `GNANI_API_KEY_ID`, `MONGODB_URI`, `EVON_API_KEY` — must never appear in frontend code, `VITE_*` variables, client bundles, logs, or API responses.
- **Server-only config:** All other non-`VITE_` variables.
- **Client-exposed (build-time):** `VITE_API_URL` only — non-secret, public API URL.

## 3. Frontend build-time variables

The client uses `import.meta.env.VITE_API_URL` (read at build time, embedded in the bundle). No `VITE_GNANI_*`, `VITE_MONGODB_*`, or any secret-carrying prefix is used. Confirmed by grep: no `VITE_GNANI`, no `process.env.GNANI` in `client/src`.

## 4. Secret exposure check (redacted result)

- `.env` is gitignored and not tracked (`git ls-files` does not list it).
- `.env.example` is tracked and contains placeholder names only.
- No `GNANI_API_KEY`, `MONGODB_URI`, or secret-like strings appear in `client/src`, `server/src`, `submission/`, or `BRAIN/`.
- No real key value appears in any screenshot under `submission/screenshots/`.
- The local `.env` currently holds a real Gnani key (set by the developer for live testing) — it is **not** in Git and **not** in this report.

## 5. Git tracking verification

- `git check-ignore .env` → ignored (not tracked).
- `git ls-files | grep -i env` → only `.env.example` (placeholder template).
- `git ls-files | grep -i '\.env'` → no `.env.local`, `.env.production`, etc.

## 6. Remediation actions

| Action | Owner | Status |
|---|---|---|
| Confirm `.env` never committed | Developer | Verified (gitignored) |
| Rotate Gnani key after any chat/session exposure | Developer (Gnani dashboard) | Pending — key was shared in chat |
| Set `DEMO_MODE=false` in production | Developer | Pending |
| Set `CORS_ORIGIN` to real frontend origin in production | Developer | Pending |
| Store `MONGODB_URI` and `GNANI_API_KEY_ID` in hosting secret manager | Developer | Pending (not deployed) |
| Add `NODE_ENV=production` in production hosting | Developer | Pending |
| Add `AUTH_SESSION_SECRET` + `AUTH_ENABLED` for production | Developer | Pending (auth not yet implemented) |
