# HANDOFF

Last updated: 2026-11-09.

## Where the project stands

GarageSathi is built end to end and runs locally in mock mode. The full workflow was validated in a browser; **65 automated tests pass (47 server + 18 client)**, and typecheck and production build pass. Documentation, the submission pack, and the security audit pack are written.

**Security hardening applied (opt-in, off by default):**
- Argon2id password hashing + one-time owner bootstrap (`server/src/auth.ts`, `server/src/authRoutes.ts`)
- Session-based auth (`express-session`), login/logout/me, CSRF double-submit protection (`X-CSRF-Token`)
- Write routes (`POST/PATCH /api/services`, `POST /api/demo/reset`, `PATCH /api/jobs/:id/status`, `PATCH /api/jobs/bulk-status`, `POST /api/ai/smoke-test`) require owner session + CSRF when `AUTH_ENABLED=true`
- Helmet security headers + CSP; strict CORS allowlist; stricter audio rate limit; smoke test no longer returns raw audio base64

**UI/UX enhancement (uncommitted):** collapsible sidebar with persistence, mobile drawer, command palette (Ctrl/Cmd+K, `?`), `g`-prefixed shortcuts, skeleton loaders, sortable/paginated jobs table with bulk status updates, draft autosave + recovery on the new-job flow, inline validation, accessible modals/confirm dialogs, reduced-motion support and a Telugu font token. Details in `TEST_LOG.md`.

**Not done:** Telugu-clip verification through the live UI, enabling auth in production, deployment, demo video, automated E2E, end-to-end CSRF check with auth on.

A single live smoke test on 2026-11-08 passed: Prisma transcribed English speech correctly (`en-IN`) and Timbre returned a 48 kHz WAV. See `TEST_LOG.md`; audio at `submission/live-smoke-tts.wav`.

## GitHub

- **Repository:** https://github.com/Siripuram-Nivas/GarageSathi (`origin`, verified before push).
- **Branch:** `main`, tracking `origin/main`.
- **Latest pushed commit:** `dcd30bd` — `feat: add accessible UI/UX layer and bulk job status updates`, pushed 2026-11-09.
- **Push history:** the remote was empty before this push, so the full history (`4970ed7` MVP, `22fff63` security hardening, `dcd30bd` UI/UX) is now on GitHub. Remote `refs/heads/main` and the GitHub commits API both report `dcd30bd`.
- **Files included:** 39 files — UI components/pages/helpers, client and server tests, `PATCH /api/jobs/bulk-status`, documentation updates, hardened `.gitignore`.
- **Intentionally excluded:** `.env` (ignored and never present in any commit), `data/`, `node_modules/`, `dist/`, coverage, Playwright artifacts, logs, private keys.
- **Secret scans:** custom 6-commit blob scan over `git rev-list --all` plus a staged-diff scan. No credentials found; the only match is the documented `mongodb+srv://USER:PASS@…` placeholder in `DEPLOYMENT.md`. `git check-ignore` confirms the env file is ignored and `.env.example` is not.
- **Gate before commit:** `npm test` 65/65, `npm run typecheck` pass, `npm run build` exit 0, `npm audit` 7 findings (dev tooling + zod major upgrade) documented as residual risk.
- **Author identity:** the GitHub account's "Keep my email addresses private" setting was turned off by the owner to allow the push, so `4970ed7` and `dcd30bd` are authored with `siripuramnivas53@gmail.com`. Repo-local identity is now `237404019+Siripuram-Nivas@users.noreply.github.com` for future commits; earlier `22fff63` already used it.

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

File store `data/db.json` (gitignored) holds one demo job: `GS-1001`, Ravi Kumar, Honda Activa, ₹550, `IN_PROGRESS`. Catalogue restored to seed prices. Use Settings → Reset demo data while `DEMO_MODE=true` to clear. UI/UX browser verification did not mutate saved data (bulk update and reset dialogs were cancelled).

## Environment

Root `.env` exists and is gitignored. It holds the Gnani key with `AI_PROVIDER_MODE=mock` and `ALLOW_GNANI_LIVE_TESTS=false`. **Do not read, print, or commit it.** Template: `.env.example`. Rotate the Gnani key after the demo — it was shared in a chat session.

New auth-related variables (placeholders in `.env.example`): `AUTH_ENABLED`, `AUTH_SESSION_SECRET`, `GARAGE_SETUP_TOKEN`.

## Next actions, in order

1. **Verify live Telugu (next).** With live mode on, record a real 5–10 s Telugu complaint in **New job**, check the transcript, save the job, and play the Varuni confirmation. Record accuracy notes in `TEST_LOG.md` and `submission/GNANI_MODELS_USED.md`.
2. **Keep the gate closed.** `ALLOW_GNANI_LIVE_TESTS` stays `false`; the smoke test has already passed and should not be repeated. Switch `AI_PROVIDER_MODE=mock` when you do not want to spend credits.
3. **Enable auth for production.** Set `AUTH_ENABLED=true` + `AUTH_SESSION_SECRET`, run `POST /api/auth/setup` with `GARAGE_SETUP_TOKEN` to create the owner, then rotate/remove the token. Set `DEMO_MODE=false` and real `CORS_ORIGIN`. Then re-test one GET and one write through the UI to confirm the CSRF round-trip.
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
- **CSRF token.** When auth is enabled, the frontend must send `X-CSRF-Token` on POST/PATCH/DELETE. `client/src/lib/api.ts` captures it from response headers and echoes it automatically — keep that behaviour if you refactor the fetch wrapper.
- **Bulk status.** `PATCH /api/jobs/bulk-status` validates each record independently and returns per-record results; it is not transactional. Do not change it to fail-all without updating the UI.
- **Draft autosave** stores text only in `sessionStorage`, never audio. Restoring a draft always drops to `review` so prices are re-fetched from the server.
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
- `client/src/components/Layout.tsx` — nav, auth state, sign-in/sign-out, sidebar collapse, shortcuts, mobile drawer
- `client/src/components/CommandPalette.tsx` — Ctrl/Cmd+K command palette
- `client/src/components/ui.tsx` — buttons, fields, skeletons, accessible modal + confirm dialog
- `client/src/pages/NewJobPage.tsx` — intake → preview → approval → saved, draft autosave/recovery
- `client/src/pages/JobsPage.tsx` — sortable/paginated table, selection, bulk status
- `client/src/lib/api.ts` — fetch wrapper: timeouts, CSRF echo, typed errors
- `client/src/lib/draft.ts` — draft serialize/validate/TTL
- `client/src/lib/jobs.ts` — filter/sort/paginate helpers
- `client/src/lib/commands.ts` — palette command list/filter
- `client/src/lib/hooks.ts` — persisted state + debounce hooks
- `client/src/lib/audio.ts` — PCM recording + WAV encode/decode
- `BRAIN/API_CONTRACTS.md` — canonical API reference (incl. auth endpoints)
- `SECURITY/SECURITY_AUDIT.md` — full audit report
- `SECURITY/THREAT_MODEL.md` — threat model
- `SECURITY/ENVIRONMENT_AUDIT.md` — redacted env-variable inventory
- `SECURITY/ACCESS_CONTROL_MATRIX.md` — route access matrix
- `SECURITY/REMEDIATION_LOG.md` — every change made
- `SECURITY/SECURITY_TEST_MATRIX.md` — test results

