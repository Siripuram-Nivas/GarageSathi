# HANDOFF

Last updated: 2026-11-08.

## Where the project stands

GarageSathi is built end to end and runs locally in mock mode. The full workflow was validated in a browser; 31 automated tests pass; typecheck and production build pass. Documentation and the submission pack are written.

**Not done:** live Gnani verification, deployment, demo video, automated E2E.

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

## Current local data state

File store `data/db.json` (gitignored) holds one demo job: `GS-1001`, Ravi Kumar, Honda Activa, ₹550, `IN_PROGRESS`. Catalogue restored to seed prices. Use Settings → Reset demo data while `DEMO_MODE=true` to clear.

## Environment

Root `.env` exists and is gitignored. It is mock mode with an empty `GNANI_API_KEY_ID`. **Do not read, print, or commit it.** Template: `.env.example`.

## Next actions, in order

1. **Live smoke test (blocked on secret).** Ask the developer for `GNANI_API_KEY_ID`, set it plus `AI_PROVIDER_MODE=live` and `ALLOW_GNANI_LIVE_TESTS=true`, restart, run one smoke test from **AI Integration Status**, then set allow-live back to `false`. Record the result in `TEST_LOG.md` and `submission/GNANI_MODELS_USED.md`.
2. **Verify the live job path.** Transcribe a real Telugu clip, save a job, play the Timbre audio, confirm the amount is spoken correctly.
3. **Deploy** following `DEPLOYMENT.md` (Atlas + Render/Railway + Vercel). Set `DEMO_MODE=false`, real `CORS_ORIGIN`, `VITE_API_URL`. Record URLs here and in `README.md`.
4. **Record the demo video** using `submission/DEMO_SCRIPT.md`.
5. **Publish** the LinkedIn post with the honest status line (replace placeholders).
6. Optional hardening: Playwright E2E for voice → approve → job; Mongo integration test; auth before real data.

## Things that will bite you

- **Mock vs live claims.** Never call the mock transcript Gnani output. The UI labels it; keep that in any edit.
- **Do not add a silent live→mock fallback.** Failures must stay visible.
- **Money.** All prices are integer paise; only the server computes totals; jobs snapshot unit prices.
- **Approval.** `POST /api/jobs` must keep rejecting `mechanicApproved !== true`.
- **Audio.** No persistence. Browser encodes WAV; no ffmpeg dependency — do not reintroduce one.
- **File store** is single-process only. Use MongoDB for anything shared or long-lived.
- **Dev servers** may still be running from the previous session (API 4000, Vite 5173). Check ports before starting again.
- **Playwright/MCP refs** go stale after HMR; re-snapshot before clicking if that tooling is used again.

## Key files

- `server/src/routes.ts` — endpoints, preview/save, lifecycle, smoke gate
- `server/src/providers/gnani.ts` — live Prisma/Timbre
- `server/src/providers/ai.ts` — mock/live switch, dedupe, status
- `server/src/catalogue.ts` — seeds + alias/fuzzy matching
- `server/src/telugu.ts` — confirmation text + number words
- `client/src/pages/NewJobPage.tsx` — intake → preview → approval → saved
- `client/src/lib/audio.ts` — PCM recording + WAV encode/decode
- `BRAIN/API_CONTRACTS.md` — canonical API reference
