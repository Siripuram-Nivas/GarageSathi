# GarageSathi

**Speak the complaint. Get an approved job card and a Telugu confirmation.**

GarageSathi is a Telugu-first voice operations app for small two-wheeler garages. A mechanic records a complaint in Telugu or Telugu-English, Gnani Prisma transcribes it, GarageSathi extracts the vehicle and services against a priced catalogue, the mechanic approves the estimate, and Gnani Timbre speaks the confirmation back in Telugu.

Built for the **Great Indian AI Internship Challenge 2026 — Real Deal Award**.

> **Current verification status:** the full workflow is verified in **mock mode** on a local machine. Live Gnani Prisma and Timbre paths are implemented but **have not been executed** in this build (no API secret was available). No public deployment exists. See `BRAIN/TEST_LOG.md` and `submission/FINAL_SUBMISSION_CHECKLIST.md`.

---

## What it does

1. **Voice intake** — record up to 30 s in the browser or upload a WAV. PCM is encoded to 16-bit WAV in the browser, so no ffmpeg is needed.
2. **Transcription** — Gnani Prisma v3.0 with `te-IN,en-IN`; in mock mode a clearly labelled demo transcript is returned instead.
3. **Deterministic extraction** — vehicle make/model, registration, complaint, symptoms, matched catalogue services, and unresolved terms that the mechanic must review.
4. **Server-side estimate** — line items and totals come only from the service catalogue in integer paise. The client never sends prices.
5. **Mandatory approval** — a job cannot be saved unless the mechanic explicitly approves it.
6. **Job card** — unique `GS-1001` ID, price snapshot, mechanic notes, status history.
7. **Telugu confirmation** — Gnani Timbre v2.5 (`Varuni`) speaks the approved amount; mock mode plays a generated tone clearly labelled **Mock audio**.
8. **Dashboard** — counts, approved revenue, recent jobs, service and status breakdowns.

## Screens

| | |
|---|---|
| Dashboard | `submission/screenshots/01-dashboard.png` |
| Job cards | `submission/screenshots/02-job-cards.png` |
| Service catalogue | `submission/screenshots/03-service-catalogue.png` |
| AI integration status | `submission/screenshots/04-ai-integration.png` |
| Settings | `submission/screenshots/05-settings.png` |
| Mobile voice intake | `submission/screenshots/06-mobile-voice-intake.png` |
| Mobile menu | `submission/screenshots/07-mobile-menu.png` |

## Stack

- **Client:** React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router 7, Lucide, Recharts.
- **Server:** Node 20+, Express 5, TypeScript, Zod, Multer.
- **Data:** MongoDB via Mongoose when `MONGODB_URI` is set; otherwise a local JSON store at `data/db.json`.
- **AI:** Gnani Prisma v3.0 (STT) and Gnani Timbre v2.5 (TTS). Optional Gnani Evon v3.3 adapter, disabled by default.
- **Tests:** Vitest + Supertest.

## Quick start

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4000

The app starts in **mock mode** with the six-service demo catalogue. No key, no network call, no credits.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + Vite together |
| `npm run dev:server` | API only |
| `npm run dev:client` | Vite only |
| `npm test` | Server (27) + client (4) tests |
| `npm run typecheck` | TypeScript on both workspaces |
| `npm run build` | Production build of server and client |
| `npm run start` | Run the built server |
| `npm run seed` | Reseed the service catalogue |

## Configuration

All variables live in the root `.env` (see `.env.example`). Never commit it.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `MONGODB_URI` | empty | MongoDB Atlas connection string; empty = local JSON store |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `DEMO_MODE` | `true` | Enables `POST /api/demo/reset`; keep `false` in production |
| `AI_PROVIDER_MODE` | `mock` | `mock` or `live` |
| `GNANI_API_KEY_ID` | empty | Gnani secret; **server only** |
| `ALLOW_GNANI_LIVE_TESTS` | `false` | Extra gate for the one-time smoke test |
| `GNANI_STT_MODEL` | `prisma-v3.0` | Prisma model |
| `GNANI_STT_LANGUAGE` | `te-IN,en-IN` | Language list |
| `GNANI_STT_FORMAT` | `transcribe` | `transcribe` / `codemix` |
| `GNANI_TTS_MODEL` | `timbre-v2.5` | Timbre model |
| `GNANI_TTS_VOICE` | `Varuni` | Voice from the documented Telugu list |
| `EVON_ENABLED` | `false` | Optional Evon adapter |

### Enabling live Gnani

Do this only when you are ready to spend credits:

1. Put the secret in the root `.env` as `GNANI_API_KEY_ID=...`.
2. Set `AI_PROVIDER_MODE=live`.
3. Restart the server. The nav badge and **AI Integration Status** page show Live.
4. Open **AI Integration Status**, set `ALLOW_GNANI_LIVE_TESTS=true` in `.env`, restart, and run the single smoke test.
5. Record the real result in `BRAIN/TEST_LOG.md`. Do not claim live support until this passes.

Automated tests never call Gnani. There is no automatic fallback from live to mock: a missing key or disabled gate returns an explicit error.

## Project structure

```
client/                  React SPA
  src/pages/             dashboard, intake, jobs, catalogue, settings, AI status
  src/lib/               typed API client, WAV encoding, INR helpers
server/                  Express API
  src/routes.ts          all endpoints
  src/catalogue.ts       seeds + Telugu/English alias matching
  src/extraction.ts      deterministic complaint parsing
  src/pricing.ts         paise estimate
  src/providers/         mock + live Gnani Prisma/Timbre, optional Evon
  src/db/                Mongoose and JSON-file stores
  tests/                 27 Vitest/Supertest tests
BRAIN/                   project memory: spec, architecture, APIs, decisions, logs
submission/              challenge documents and screenshots
```

## Design rules

- **Money is integer paise**, always computed on the server from `services.pricePaise`.
- **The AI never prices or approves.** Extraction is deterministic; unresolved services are flagged for the mechanic.
- **Mechanic approval is mandatory** before a job is persisted as approved.
- **No raw audio is stored.** Audio is processed in memory only.
- **Mock output is labelled** on screen and in the API (`X-AI-Mode`, `X-Audio-Mock`).
- **No secret reaches the browser**; health/AI-status endpoints expose booleans only.

## Docs

- Product and architecture: `BRAIN/PROJECT_SPEC.md`, `BRAIN/ARCHITECTURE.md`
- API contracts (Gnani + internal): `BRAIN/API_CONTRACTS.md`
- Decisions and trade-offs: `BRAIN/DECISIONS.md`
- Test evidence: `BRAIN/TEST_LOG.md`
- Deployment: `DEPLOYMENT.md`
- Submission pack: `submission/`

## Limitations

- Live Gnani calls are unverified; only mock mode is proven.
- No auth or multi-tenancy. Intended for a single garage.
- The JSON store is single-process; use MongoDB for anything shared.
- Evon is not configured and is not used by the product flow.
- Playwright is not wired into CI; the flow was validated manually in a browser.
- Demonstration catalogue prices must be reviewed before real use.
