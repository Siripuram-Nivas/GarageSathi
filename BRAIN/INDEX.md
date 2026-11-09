# GarageSathi — Project Brain Index

> **Every AI coding agent or future development session must read `BRAIN/INDEX.md` first, followed by the relevant brain documents. Do not rediscover documented information unnecessarily. Update the brain when the implementation changes.**

## Project

- **Name:** GarageSathi
- **Tagline:** Your voice-powered garage operations assistant.
- **Purpose:** Telugu-first voice → job-card → approved estimate → Telugu audio confirmation workflow for small two-wheeler garages.
- **Target event:** Great Indian AI Internship Challenge 2026 — Real Deal Award.
- **Developer:** Solo participant.

## Status

- **Phase:** Phase 9 — implementation + competition preparation complete; security hardening applied; deployment pending.
- **Application state:** Working locally. Mock AI mode by default. Live Gnani Prisma + Timbre verified with one deliberate smoke test (English input); Telugu accuracy still unmeasured. Opt-in session authentication implemented (off by default).
- **Verification:** 38 server + 4 client tests, typecheck, production build, a manual browser pass, and one live provider smoke test — see `TEST_LOG.md`. Security audit pack in `SECURITY/`. Deployment: not deployed.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS v4, React Router, Lucide, Recharts |
| Backend | Node 20+ / Express 5 / TypeScript, Zod, Multer, express-session, argon2, helmet |
| Database | MongoDB Atlas via Mongoose; local JSON store fallback when `MONGODB_URI` is empty |
| Voice | Browser AudioContext PCM → 16-bit WAV (no ffmpeg), Gnani Prisma v3.0, Gnani Timbre v2.5 |
| Optional reasoning | Gnani Evon v3.3 remote OpenAI-compatible endpoint adapter (disabled by default) |
| Auth (opt-in) | Server sessions, Argon2id passwords, one-time owner bootstrap, CSRF double-submit |
| Tests | Vitest, Supertest (backend), Vitest (frontend pure logic) |

## Directories

- `client/` — Vite SPA (`src/pages`, `src/components`, `src/lib`).
- `server/` — Express API (`src/db`, `src/providers`, `src/*.ts` logic, `tests`).
- `BRAIN/` — persistent project knowledge (this folder).
- `SECURITY/` — threat model, env audit, access matrix, audit report, remediation log, test matrix.
- `submission/` — competition documents.

## Key documents

- Product requirements → `PROJECT_SPEC.md`
- System design → `ARCHITECTURE.md`
- External + internal APIs → `API_CONTRACTS.md`
- Architecture decisions → `DECISIONS.md`
- Security report → `SECURITY/SECURITY_AUDIT.md`
- Work state → `TASK_BOARD.md`, `TEST_LOG.md`, `HANDOFF.md`
- Run/deploy → root `README.md`, `DEPLOYMENT.md`
- Submission pack → `submission/`

## Current known issues

1. Live Prisma/Timbre are verified for connectivity and response handling. Telugu transcription quality, a listening check of Varuni audio, and the full live job flow are still unverified.
2. TTS in mock mode plays a generated tone, clearly labelled mock (no fake speech).
3. No automated browser E2E; the flow was validated manually (desktop + mobile).
4. Authentication is opt-in (`AUTH_ENABLED=false` default). Enable before production and run first-owner bootstrap.
5. No deployment and no demo video yet; deployment steps are documented only.
6. MongoDB/Mongoose path is implemented but untested against a real cluster.

## Next steps

1. Run one real Telugu clip through the live flow in the UI, confirm the transcript and play the Varuni audio; record accuracy notes in `TEST_LOG.md`.
2. Keep `ALLOW_GNANI_LIVE_TESTS=false`; flip `AI_PROVIDER_MODE=live` only for deliberate live demos.
3. Enable auth for production: `AUTH_ENABLED=true`, `AUTH_SESSION_SECRET`, bootstrap owner via `GARAGE_SETUP_TOKEN`, `DEMO_MODE=false`.
4. Deploy (see `DEPLOYMENT.md`) and record real URLs in `README.md` and `HANDOFF.md`.
5. Record the demo video from `submission/DEMO_SCRIPT.md` and publish the LinkedIn draft.
6. Rotate the Gnani key after the demo, since it was shared in a chat session.
