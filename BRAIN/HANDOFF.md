# HANDOFF

Last updated: 2026-11-08.

## Where the project stands

GarageSathi is built end to end and runs locally in mock mode. The full workflow was validated in a browser; 46 automated tests pass (27 server + 11 security + 8 auth integration + 4 client); typecheck and production build pass. Documentation, the submission pack, and the security audit pack are written.

**Security hardening applied (opt-in, off by default):**
- Argon2id password hashing + one-time owner bootstrap (`server/src/auth.ts`, `server/src/authRoutes.ts`)
- Session-based auth (`express-session`), login/logout/me, CSRF double-submit protection (`X-CSRF-Token`)
- Write routes (`POST/PATCH /api/services`, `POST /api/demo/reset`, `PATCH /api/jobs/:id/status`, `POST /api/ai/smoke-test`) require owner session + CSRF when `AUTH_ENABLED=true`
- Helmet security headers + CSP; strict CORS allowlist; stricter audio rate limit; smoke test no longer returns raw audio base64

**Not done:** Telugu-clip verification through the live UI, enabling auth in production, deployment, demo video, automated E2E.

A single live smoke test on 2026-11-08 passed: Prisma transcribed English speech correctly (`en-IN`) and Timbre returned a 48 kHz WAV. See `TEST_LOG.md`; audio at `submission/live-smoke-tts.wav`.

## Run it

```bash
npm install
# root .env already exists locally; copy from .env.example on a new machine
npm run dev
```

- Client http://localhost:5173
- API http://localhost:4000
- Health `http://localhost:4000/api/health`

Useful: `npm test`, `npm run typecheck`, `npm run build`, `npm run seed`.

To try auth locally: set `AUTH_ENABLED=true`, `AUTH_SESSION_SECRET=<random>`, `GARAGE_SETUP_TOKEN=<random>` in `.env`, restart, then call `POST /api/auth/setup`, `POST /api/auth/login`.

## Current local data state

File store `data/db.json` (gitignored) holds one demo job: `GS-1001`, Ravi Kumar, Honda Activa, ₹550, `IN_PROGRESS`. Catalogue restored to seed prices. Use Settings → Reset demo data while `DEMO_MODE=true` to clear.

## Environment

Root `.env` exists and is gitignored. It holds the Gnani key with `AI_PROVIDER_MODE=mock` and `ALLOW_GNANI_LIVE_TESTS=false`. **Do not read, print, or commit it.** Template: `.env.example`. Rotate the Gnani key after the demo — it was shared in a chat session.

New auth-related variables (placeholders in `.env.example`): `AUTH_ENABLED`, `AUTH_SESSION_SECRET`, `GARAGE_SETUP_TOKEN`.

## Next actions, in order

1. **Verify live Telugu (next).** With live mode on, record a real 5–10 s Telugu complaint in **New job**, check the transcript, save the job, and play the Varuni confirmation. Record accuracy notes in `TEST_LOG.md` and `submission/GNANI_MODELS_USED.md`.
2. **Keep the gate closed.** `ALLOW_GNANI_LIVE_TESTS` stays `false`; the smoke test has already passed and should not be repeated. Switch `AI_PROVIDER_MODE=mock` when you do not want to spend credits.
3. **Enable auth for production.** Set `AUTH_ENABLED=true` + `AUTH_SESSION_SECRET`, run `POST /api/auth/setup` with `GARAGE_SETUP_TOKEN` to create the owner, then rotate/remove the token. Set `DEMO_MODE=false` and real `CORS_ORIGIN`.
4. **Deploy** following `DEPLOYMENT.md` (Atlas + Render/Railway + Vercel). Set `NODE_ENV=production`, real `CORS_ORIGIN`, `VITE_API_URL`. Record URLs here and in `README.md`.
5. **Record the demo video** using `submission/DEMO_SCRIPT.md`.
6. **Publish** the LinkedIn post with the honest status line (replace placeholders), then rotate the Gnani key.
7. Optional hardening: Playwright E2E for voice → approve → job; Mongo integration test; GitHub secret scanning/push protection.

## Things that will bite you

- **Mock vs live claims.** Never call the mock transcript Gnani output. The UI labels it; keep that in any edit.
- **Do not add a silent live→mock fallback.** Failures must stay visible.
- **Money.** All prices are integer paise; only the server computes totals; jobs snapshot unit prices.
- **Approval.** `POST /api/jobs` must keep rejecting `mechanicApproved !== true`.
- **Audio.** No persistence. Browser encodes WAV; no ffmpeg dependency — do not reintroduce one.
- **File store** is single-process only. Use MongoDB for anything shared or long-lived.
- **Auth is opt-in.** `AUTH_ENABLED=false` preserves existing frontend behavior; enable before production and add the frontend login flow (already built: `/login` page + Layout sign-in/sign-out).
- **CSRF token.** When auth is enabled, the frontend must send `X-CSRF-Token` on POST/PATCH/DELETE (Layout reads it from responses automatically).
- **Dev servers** may still be running from the previous session (API 4000, Vite 5173). Check ports before starting again.
- **Playwright/MCP refs** go stale after HMR; re-snapshot before clicking if that tooling is used again.

## Key files

- `server/src/routes.ts` — endpoints, preview/save, lifecycle, smoke gate, auth-guarded writes
- `server/src/auth.ts` — argon2id hashing, bootstrap, session helpers
- `server/src/authRoutes.ts` — `/api/auth/setup`, `/login`, `/logout`, `/me`
- `server/src/middleware.ts` — CSRF, requireAuth, requireOwner, audioRateLimit
- `server/src/app.ts` — helmet, session, CORS, authRouter mount
- `server/src/providers/gnani.ts` — live Prisma/Timbre
- `server/src/providers/ai.ts` — mock/live switch, dedupe, status
- `server/src/catalogue.ts` — seeds + alias/fuzzy matching
- `server/src/telugu.ts` — confirmation text + number words
- `client/src/pages/LoginPage.tsx` — sign-in page
- `client/src/components/Layout.tsx` — nav, auth state, sign-in/sign-out
- `client/src/pages/NewJobPage.tsx` — intake → preview → approval → saved
- `client/src/lib/audio.ts` — PCM recording + WAV encode/decode
- `BRAIN/API_CONTRACTS.md` — canonical API reference (incl. auth endpoints)
- `SECURITY/SECURITY_AUDIT.md` — full audit report
- `SECURITY/THREAT_MODEL.md` — threat model
- `SECURITY/ENVIRONMENT_AUDIT.md` — redacted env-variable inventory
- `SECURITY/ACCESS_CONTROL_MATRIX.md` — route access matrix
- `SECURITY/REMEDIATION_LOG.md` — every change made
- `SECURITY/SECURITY_TEST_MATRIX.md` — test results

