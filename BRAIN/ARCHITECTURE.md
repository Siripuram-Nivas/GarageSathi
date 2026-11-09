# ARCHITECTURE

## Diagram

```mermaid
flowchart LR
  B[Browser<br/>React SPA] -->|WAV blob + JSON| A[Express API]
  A --> V[Validation / Zod]
  V --> X[Extraction engine<br/>deterministic]
  X --> M[Catalogue matcher<br/>aliases + fuzzy]
  M --> P[Pricing engine<br/>paise, server-side]
  P --> DB[(MongoDB / JSON store)]
  A -->|live only| PR[Gnani Prisma v3.0]
  A -->|live only| TB[Gnani Timbre v2.5]
  A -.->|optional, disabled| EV[Evon v3.3<br/>remote endpoint]
  W[AudioContext PCM] -->|encode 16-bit WAV| B
  TB -->|audio/wav| A --> B
```

## Frontend

- Vite SPA, React Router, no SSR. Layout with collapsible sidebar (persisted), mobile drawer, and command palette.
- `lib/api.ts` typed fetch wrapper (timeouts, CSRF echo, `ApiError`), `lib/audio.ts` recording + WAV encoding, `lib/format.ts` INR/paise/date helpers.
- Interaction helpers: `lib/jobs.ts` (filter/sort/paginate), `lib/draft.ts` (sessionStorage draft with TTL), `lib/commands.ts` (palette entries), `lib/hooks.ts` (persisted state, debounce).
- Reusable UI in `components/ui.tsx`: buttons, fields with `aria-invalid` + `role="alert"`, `Skeleton`, focus-trapped `Modal`, `ConfirmDialog`.
- Server state fetched per page with small hooks; no global store, no TanStack Query (not needed at this size).
- Mock/Live badge from `/api/health`.
- Accessibility: global `:focus-visible` ring, `aria-sort` on sortable headers, combobox/listbox semantics in the palette, `prefers-reduced-motion` disables transitions and page animation.

## Backend

- Express app (`src/app.ts`) exported for tests; `src/index.ts` boots + seeds.
- Layered: routes → validators (Zod) → domain modules (`extraction`, `catalogue`, `pricing`, `telugu`) → data layer.
- Data layer interface `DataLayer` with two implementations: Mongoose (`db/mongo.ts`) and JSON file (`db/file.ts`, default when `MONGODB_URI` is empty).
- Request ID per request, structured `{ error: { code, message, details? }, requestId }` errors, 404 handler, no stack traces in production.

## Database

- Collections: `services`, `jobcards`, `counters`.
- `jobcards.jobId` unique index. Timestamps enabled.
- File store writes `data/db.json` with a serialized write queue.

## Gnani integration

- `providers/gnani.ts`: Prisma multipart transcription (`audio_file`, `model`, `language_code`, `format`, optional `keyterms`, `topic`), Timbre JSON inference returning binary audio.
- Timeouts with `AbortSignal.timeout`, single attempt per user action, no retry loops, in-flight dedupe per operation type.
- Live requires `AI_PROVIDER_MODE=live` **and** a configured key; otherwise a clear 503/`mock` result.
- `providers/evon.ts` optional OpenAI-compatible chat completion, disabled unless `EVON_ENABLED=true` and `EVON_BASE_URL` set; output validated; never approves prices.

## Voice flow

1. Browser mic → AudioContext ScriptProcessor → Float32 chunks (max 30 s).
2. `encodeWav` produces 16-bit PCM WAV (mono, 16 kHz target via `OfflineAudioContext`? no — native rate) — avoids WebM and ffmpeg entirely.
3. Uploaded files are decoded with `decodeAudioData` and re-encoded to WAV.
4. Server validates RIFF/WAVE header, size ≤ 5 MB, duration ≤ 30 s.

## Pricing & approval

- Service prices only from `services.pricePaise`. Frontend quantities are clamped 1..20; totals recomputed server-side.
- Preview is provisional (`approvalStatus: PENDING`); saving requires `mechanicApproved=true`, produces `APPROVED`, records `approvedAt` + status history.

## Backend

- Express app (`src/app.ts`) exported for tests; `src/index.ts` boots + seeds.
- Layered: routes → validators (Zod) → domain modules (`extraction`, `catalogue`, `pricing`, `telugu`) → data layer.
- Data layer interface `DataLayer` with two implementations: Mongoose (`db/mongo.ts`) and JSON file (`db/file.ts`, default when `MONGODB_URI` is empty).
- Request ID per request, structured `{ error: { code, message, details? }, requestId }` errors, 404 handler, no stack traces in production.

### Authentication (opt-in)

- `src/auth.ts`: Argon2id password hashing (OWASP baseline: 19 MiB, 2 iterations, 1 parallelism), one-time owner bootstrap via `GARAGE_SETUP_TOKEN`, session-user helpers.
- `src/authRoutes.ts`: `POST /api/auth/setup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `src/middleware.ts`: `requireAuth`, `requireOwner`, double-submit CSRF (`X-CSRF-Token`), stricter audio rate limit.
- Opt-in via `AUTH_ENABLED=true` + `AUTH_SESSION_SECRET`. When disabled (default), all existing frontend behavior is unchanged.
- Protected write routes (when enabled): `POST/PATCH /api/services`, `POST /api/demo/reset`, `PATCH /api/jobs/:id/status`, `POST /api/ai/smoke-test`. Require an owner session + CSRF token.

## Security / privacy

- Key only on server; `.env` gitignored; health exposes booleans only.
- Audio is processed in memory and never persisted.
- CORS allow-list (explicit origins, no wildcard with credentials), rate limits on write + AI routes, upload MIME + magic byte checks, Zod validation, demo reset gated by `DEMO_MODE`.
- Helmet security headers: CSP (`defaultSrc 'self'`, `frameAncestors 'none'`, restricted `connectSrc`), `X-Content-Type-Options: nosniff`, referrer policy. HSTS intentionally omitted until HTTPS is confirmed on the deployment.
- Session cookies: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 8-hour max age, rotating session ID on login.

## Deployment

- Frontend: Vercel static build with `VITE_API_URL`.
- Backend: Node host (Render/Railway/Fly free tier), root `.env` variables.
- DB: MongoDB Atlas free tier (or file store for a demo instance; note ephemeral disk).
