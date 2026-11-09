# TEST LOG

Environment: Windows, Node 24.12.0, local dev servers (`API :4000`, `Vite :5173`), `AI_PROVIDER_MODE=mock`, file store `data/db.json`. Gnani live smoke test executed once (English input), then returned to mock mode.

## 2026-11-08 — Automated suite

`npm test` at repository root:

- **Server — 38 passed / 38** (3 files, Vitest 2.1.9)
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
  - `tests/security.test.ts` — 11 tests:
    - `requireAuth` rejects missing session user / passes with user
    - `requireOwner` rejects missing user / non-owner / passes owner
    - CSRF: missing token, mismatched token, matching token, ignores GET
    - `issueCsrfToken` creates and returns token
    - rate limit: 429 after exceeding limit
  - `tests/auth.integration.test.ts` — 8 tests:
    - setup creates first owner; repeat setup → 409; invalid token → 401
    - login wrong creds → generic 401; login success → session cookie
    - authenticated owner creates service (with CSRF token)
    - unauthenticated service creation → 401
    - logout clears session (subsequent create → 401)
- **Client — 4 passed / 4** (2 files)
  - WAV encoding produces a valid RIFF/WAVE header, 16-bit mono PCM
  - INR formatting; human status labels; valid next statuses only

`npm run typecheck`: passes for server and client.

`npm run build`: passes — server `tsc`, client `vite build`. Only warning: Vite chunk-size advisory.

`npm audit`: 7 findings (all dev-tooling `esbuild`/`tinypool` via vitest, plus production `zod <4.6.6` mitigated by 120kb body limit and array caps; NOT force-fixed — zod fix is a major breaking change).


Gate: `AI_PROVIDER_MODE=live` + `ALLOW_GNANI_LIVE_TESTS=true` for this single run, then `ALLOW_GNANI_LIVE_TESTS` reset to `false`. Key lives only in the root `.env`; the value is not recorded in the repository or this log.

- **Input:** 4.4 s 16-bit PCM WAV generated locally with Microsoft Zira (English). No Telugu recording was available in this session.
- **Prisma v3.0:** HTTP 200. Transcript: `Ravi Kumar, Honda Activa brake sound is coming. Please change the engine oil.` Detected language `en-IN`. Provider request ID `01a1bc47-965a-7105-9d4a-1b9db5043075`.
- **Timbre v2.5, voice Varuni:** HTTP 200, `audio/wav`, 276,524 bytes, 48 kHz mono 16-bit, ≈2.88 s. Saved as `submission/live-smoke-tts.wav`.
- **Proven:** credentials, endpoints, multipart/JSON request shapes, response parsing, and binary audio handling against the live API.
- **Still unverified:** Telugu transcription accuracy (input was English), a listening check of the Telugu confirmation, and the full live job flow through the UI.
- Note: the returned WAV header uses `0xFFFFFFFF` as the data-chunk size (streaming placeholder). Common players tolerate it; patch the RIFF/data sizes in the proxy if a browser refuses to play it.

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

## 2026-11-09 — UI/UX enhancement suite

`npm test` at repository root — **65 passed / 65** (10 files):

- **Server — 47 passed / 47** (4 files)
  - `tests/api.test.ts` — 16 tests (was 15): added bulk status partial-success, invalid-transition per-record failure, and empty-list 400.
  - `tests/units.test.ts` — 12 tests.
  - `tests/security.test.ts` — 11 tests.
  - `tests/auth.integration.test.ts` — 8 tests.
- **Client — 18 passed / 18** (6 files, was 4/2):
  - `lib/api.test.ts` (3): CSRF token echoed only on write methods; aborted request → `TIMEOUT`; network failure and error envelopes → `ApiError`.
  - `lib/jobs.test.ts` (5): cross-field search, status filter, numeric job sorting, estimate/status sorting, page clamping.
  - `lib/draft.test.ts` (3): draft round-trip + clear, rejects expired/corrupt/foreign drafts, empty form is not recoverable content.
  - `lib/commands.test.ts` (3): palette filtering by label/hint, empty query, no-match.
  - `lib/format.test.ts` (3), `lib/audio.test.ts` (1): unchanged.

`npm run typecheck`: passes for server and client.
`npm run build`: passes — server `tsc`, client `vite build`. Only warning: Vite chunk-size advisory (798 kB JS / 228 kB gzip).

### Manual browser pass (Playwright, mock mode, 1440×900 and 390×780)

Verified in the running app without mutating saved demo data:

1. Desktop sidebar collapse → 76 px; survives reload (localStorage `garagesathi.sidebarCollapsed`).
2. Ctrl+K toggles the palette; `?` opens it with focus in the search box.
3. Palette filter `serv` + Enter navigates to `/services`; Escape closes.
4. Shortcuts `g j` → `/jobs`, `n` → `/new`.
5. Mobile 390 px: no horizontal overflow; drawer opens, Escape closes and returns focus to the menu button.
6. Jobs search debounce: `activa` → 1 shown, `zzz` → 0 shown + empty state.
7. Services inline price validation sets `aria-invalid="true"` and shows the error; clearing fixes both.
8. Draft inject → recovery banner → Restore → review → preview; name/phone errors appear on blur and clear on valid input; Discard confirm clears `sessionStorage`.
9. Bulk selection bar shows eligible count; confirm dialog opens and Escape cancels (no mutation executed).
10. Settings reset confirm is not dismissed by a backdrop click; Cancel closes it.
11. Job status modal: focus enters the dialog, Escape closes and restores focus to the trigger.
12. `prefers-reduced-motion: reduce` → page animation `animation-name: none`.
13. API still returns only `GS-1001`; job count unchanged after the pass.

Console: only the expected `403 /api/auth/me` (`AUTH_DISABLED`) errors; no React or runtime errors.

### NOT verified in this pass

- Bulk status **mutation through the browser** — UI was cancelled at the confirm dialog to preserve demo data; the server path is covered by `api.test.ts`.
- CSRF end-to-end with `AUTH_ENABLED=true` — client behaviour covered by a unit test with mocked fetch only.
- No automated Playwright E2E suite — the browser pass was manual/scripted, not committed as tests.

## NOT verified

| Item | Reason |
|---|---|
| Telugu transcription accuracy | Smoke-test input was English; no Telugu clip was recorded in this session |
| Telugu audio listening check | Audio bytes verified, but no human listening test of Varuni output was done |
| Full live job flow through the UI (record → transcript → approve → status → speak) | Not exercised; smoke test covers only provider calls |
| Deployment | Not deployed; no hosting credentials/approval |
| Playwright E2E | Not written (manual validation only) |
| MongoDB/Mongoose path | Not exercised against a real cluster; file store used |
| Authentication enabled in production | `AUTH_ENABLED=false` default; not yet turned on for a real deployment |
| First-owner bootstrap run | No owner account created yet; requires `GARAGE_SETUP_TOKEN` + manual setup call |
| GitHub secret scanning / push protection | No repository hosted; not configured |

**Security findings remediated** (see `SECURITY/SECURITY_AUDIT.md`):
- F-01 No auth → opt-in session auth added (FIXED, off by default)
- F-02 No CSRF → double-submit CSRF added (FIXED)
- F-03 CORS all origins in dev → explicit allowlist (FIXED)
- F-04 No security headers → Helmet + CSP added (FIXED)
- F-05 Demo reset on by default → auth-gated when enabled (FIXED)
- F-06 Smoke test returned raw audio base64 → removed (FIXED)
- F-07 In-memory IP rate limit → stricter audio limit; shared-store guidance documented (PARTIAL)
- F-08/F-09/F-10 dependency vulns / file-store encryption / CI secret scanning → documented residual risks

Do not generalise the smoke test into "Telugu works end to end". It proves the API integration; Telugu quality still needs a real recording.
