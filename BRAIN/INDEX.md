# GarageSathi — Project Brain Index

> **Every AI coding agent or future development session must read `BRAIN/INDEX.md` first, followed by the relevant brain documents. Do not rediscover documented information unnecessarily. Update the brain when the implementation changes.**

## Project

- **Name:** GarageSathi
- **Tagline:** Your voice-powered garage operations assistant.
- **Purpose:** Telugu-first voice → job-card → approved estimate → Telugu audio confirmation workflow for small two-wheeler garages.
- **Target event:** Great Indian AI Internship Challenge 2026 — Real Deal Award.
- **Developer:** Solo participant.

## Status

- **Phase:** Phase 9 — implementation + competition preparation complete; live verification and deployment pending.
- **Application state:** Working locally. Mock AI mode by default. Live Gnani integration implemented but **NOT verified** (no key available in this session).
- **Verification:** 27 server + 4 client tests, typecheck, production build, and a manual browser pass — see `TEST_LOG.md`. Deployment: not deployed.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS v4, React Router, Lucide, Recharts |
| Backend | Node 20+ / Express 5 / TypeScript, Zod, Multer |
| Database | MongoDB Atlas via Mongoose; local JSON store fallback when `MONGODB_URI` is empty |
| Voice | Browser AudioContext PCM → 16-bit WAV (no ffmpeg), Gnani Prisma v3.0, Gnani Timbre v2.5 |
| Optional reasoning | Gnani Evon v3.3 remote OpenAI-compatible endpoint adapter (disabled by default) |
| Tests | Vitest, Supertest (backend), Vitest (frontend pure logic) |

## Directories

- `client/` — Vite SPA (`src/pages`, `src/components`, `src/lib`).
- `server/` — Express API (`src/db`, `src/providers`, `src/*.ts` logic, `tests`).
- `BRAIN/` — persistent project knowledge (this folder).
- `submission/` — competition documents.

## Key documents

- Product requirements → `PROJECT_SPEC.md`
- System design → `ARCHITECTURE.md`
- External + internal APIs → `API_CONTRACTS.md`
- Architecture decisions → `DECISIONS.md`
- Work state → `TASK_BOARD.md`, `TEST_LOG.md`, `HANDOFF.md`
- Run/deploy → root `README.md`, `DEPLOYMENT.md`
- Submission pack → `submission/`

## Current known issues

1. Live Gnani Prisma/Timbre calls have never been executed — no secret was provided. All live paths are implemented against the official docs but unverified.
2. TTS in mock mode plays a generated tone, clearly labelled mock (no fake speech).
3. No automated browser E2E; the flow was validated manually (desktop + mobile).
4. No deployment and no demo video yet; deployment steps are documented only.
5. MongoDB/Mongoose path is implemented but untested against a real cluster.

## Next steps

1. Developer adds `GNANI_API_KEY_ID` to root `.env`.
2. Set `AI_PROVIDER_MODE=live`, `ALLOW_GNANI_LIVE_TESTS=true`, run one deliberate smoke test from **AI Integration Status**, then turn allow-live off.
3. Update `TEST_LOG.md` / `submission/GNANI_MODELS_USED.md` with the real result.
4. Deploy (see `DEPLOYMENT.md`) and record real URLs in `README.md` and `HANDOFF.md`.
5. Record the demo video from `submission/DEMO_SCRIPT.md` and publish the LinkedIn draft.
