# TEST LOG

Environment: Windows, Node 20+, local dev servers (`API :4000`, `Vite :5173`), `AI_PROVIDER_MODE=mock`, file store `data/db.json`, no Gnani key.

## 2026-11-08 — Automated suite

`npm test` at repository root:

- **Server — 27 passed / 27** (2 files, Vitest 2.1.9)
  - `tests/api.test.ts` — 15 tests:
    - health without secret leakage
    - seeded catalogue
    - labelled mock transcription; rejection without audio
    - preview extraction + server-side estimate
    - unknown service IDs rejected (no invented prices)
    - save requires mechanic approval
    - unique `GS-` job ID + price snapshot
    - sequential next ID
    - read by job ID and search list
    - status lifecycle enforcement
    - dashboard aggregation
    - mock confirmation audio as WAV, marked
    - live smoke test blocked without the developer gate
    - demo reset
  - `tests/units.test.ts` — 12 tests:
    - Telugu-English alias matching, Telugu script aliases, no false positive on unrelated text
    - unresolved-term flags + vehicle detection
    - code-mixed language/complaint extraction
    - paise line totals; quantity clamp 1..20; unknown service rejection
    - real PCM WAV accepted with duration; renamed non-WAV rejected
    - Telugu number words; job confirmation text
- **Client — 4 passed / 4** (2 files)
  - WAV encoding produces a valid RIFF/WAVE header, 16-bit mono PCM
  - INR formatting; human status labels; valid next statuses only

`npm run typecheck`: passes for server and client.

`npm run build`: passes — server `tsc`, client `vite build`. Only warning: Vite chunk-size advisory.

## 2026-11-08 — Manual browser pass (mock mode)

Executed in the running app:

1. Uploaded a 3 s WAV → mock transcript returned and visibly labelled.
2. Edited the transcript → extracted vehicle/complaint updated; stale-complaint bug found and fixed (`complaintDirty` guard).
3. Preview → matched services, total **₹550**, quantities editable, total recomputed.
4. Approval unchecked → save blocked. Checked → job saved as **`GS-1001`**.
5. Confirmation audio → generated tone, labelled **Mock audio** (not speech).
6. Status → `IN_PROGRESS`; timeline recorded the transition.
7. Dashboard → 1 job, ₹550 approved revenue, recent job listed.
8. Catalogue → edited a price, confirmed new preview used it, reverted to seed.
9. Settings → garage identity saved.
10. Jobs → search and status filter returned the expected job.
11. Mobile width → sidebar hid correctly, drawer opened/closed (bug found and fixed: `hidden`/`flex` classes).

Also fixed during this pass: detected language now passed through from Prisma response; stale `dbPath()` call; Express 5 async error propagation; fuzzy-match false positive on "check"; smoke test now additionally requires live mode.

## Screenshots (from the running app)

`submission/screenshots/01-dashboard.png` … `07-mobile-menu.png` (7 files).

## NOT verified

| Item | Reason |
|---|---|
| Live Gnani Prisma v3.0 call | No `GNANI_API_KEY_ID` in this build; never executed |
| Live Gnani Timbre v2.5 call | Same |
| Real Telugu transcript accuracy | Cannot be measured without live STT |
| Real Telugu audio quality | Cannot be measured without live TTS |
| Deployment | Not deployed; no hosting credentials/approval |
| Playwright E2E | Not written; flow validated manually |
| MongoDB/Mongoose path | Not exercised against a real cluster; file store used |

Any statement that live Gnani integration works is unsupported until the smoke test is run and recorded above.
