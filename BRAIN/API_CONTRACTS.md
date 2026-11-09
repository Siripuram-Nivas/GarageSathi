# API_CONTRACTS

Verified against official docs on **2026-11-08**. One deliberate live smoke test was executed on 2026-11-08 (one Prisma request + one Timbre request) and passed; see `TEST_LOG.md`. Telugu-language accuracy has not been measured yet.

## Gnani authentication

- Base URL: `https://api.vachana.ai`
- Header: `X-API-Key-ID: <GNANI_API_KEY_ID>`
- Key name `GarageSathi`, scopes STT + TTS, created 2026-11-08 (dashboard-confirmed).
- Secret is **not** recorded anywhere in this repository.

## Prisma v3.0 — speech to text

- Docs: https://docs.gnani.ai/api/STT/models/prisma-v3 and https://docs.gnani.ai/api/STT/speech-to-text
- `POST /stt/v3`, `multipart/form-data`
- Fields used: `audio_file` (required), `model=prisma-v3.0`, `language_code=te-IN,en-IN`, `format=transcribe`, `keyterms` (JSON array string, optional), `topic` (optional).
- Output styles: `transcribe` (default), `codemix` (alternative setting), `verbatim`, `transliterate`. Do not send `codemix` to v2.5.
- Max 30 s per clip. Supported formats per current docs; GarageSathi always sends 16-bit PCM WAV.
- Response fields consumed: `transcript` (string), `detected_language_code`, `request_id`, `status`. Exact response shape is tolerated defensively (`transcript|text|data.transcript`).
- Errors: non-2xx → provider error with status + short body, no retry.
- **Integration status: verified live (single English-input smoke test). Telugu accuracy unmeasured.**

## Timbre v2.5 — text to speech

- Docs: https://docs.gnani.ai/api/TTS/tts-inference and https://docs.gnani.ai/api/TTS/available-voices
- `POST /api/v1/tts/inference`, `application/json`
- Body: `text`, `model=timbre-v2.5`, `voice=Varuni`, `language=te-IN`, `speed=1.0`, `audio_config={sample_rate:48000,num_channels:1,sample_width:2,encoding:"linear_pcm",container:"wav"}`.
- Response: raw `audio/wav` binary (do **not** parse as JSON).
- Voices validated against the documented v2.5 Telugu list: Varuni, Suhana, Lehara, Lavanya, Yukti.
- **Integration status: verified live (one request, Varuni, 48 kHz WAV returned).**

## Evon v3.3 (optional)

- Model card: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B
- No hosted internship API. Adapter uses `POST {EVON_BASE_URL}/chat/completions` with bearer `EVON_API_KEY` only when `EVON_ENABLED=true`.
- Status: **NOT CONFIGURED** by default; its output can never set prices or approve a job.

## Authentication (opt-in)

Authentication is disabled by default (`AUTH_ENABLED=false`) and preserves existing frontend behavior. Enable in production with `AUTH_ENABLED=true` + `AUTH_SESSION_SECRET`.

- `POST /api/auth/setup` — one-time owner bootstrap. Requires `GARAGE_SETUP_TOKEN` in body + valid token; disabled after first use (409 on repeat). Rate-limited 5/min.
- `POST /api/auth/login` — creates a server session (`gs_session` cookie). Generic failure message (no account enumeration). Rate-limited 10/min.
- `POST /api/auth/logout` — destroys the session. Rate-limited 20/min.
- `GET /api/auth/me` — returns the current session user or 401.

**Access control (when `AUTH_ENABLED=true`):**
- Protected write routes require an owner session + `X-CSRF-Token` header: `PATCH /api/services/:id/price`, `POST /api/demo/reset`, `PATCH /api/jobs/:id/status`, `PATCH /api/jobs/bulk-status`, `POST /api/ai/smoke-test`.
- There is no owner-facing route to create, rename or deactivate a catalogue service. Canonical definitions are seeded by the platform and are not editable through the API.
- Read routes and job creation remain public (single-garage, voice-first design).
- CSRF token is issued on every response as the `X-CSRF-Token` header when sessions are active; clients must echo it on state-changing requests.
- Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 8-hour max age, rotated on login.

## Garage scoping

- The deployment is single-garage. The server resolves the garage from `GARAGE_ID` (default `default`); a `garageId` sent by the browser is ignored and stripped by validation.
- Garage prices live in a separate `garagePrices` record keyed by `(garageId, serviceId)`. Central service definitions are never mutated by a price edit.

## Internal API

All responses JSON unless noted. Errors: `{ "error": { "code": string, "message": string, "details"?: unknown }, "requestId": string }`.

| Method | Path | Body / query | Notes |
|---|---|---|---|
| GET | `/api/health` | — | db status, mode, gnaniConfigured, evon status, mock flag |
| GET | `/api/services` | `?includeInactive=1` | catalogue list with this garage's effective `pricePaise`, plus read-only `defaultPricePaise` and `priceOverridden` |
| PATCH | `/api/services/:id/price` | `{pricePaise}` (integer, 0–10,000,000) | changes only this garage's price; central default unchanged; affects future previews only; requires owner session + CSRF when auth enabled |
| POST | `/api/voice/transcribe` | multipart `audio` (≤5 MB, WAV) + `language?`, `format?` | mock/live by config; no persistence; stricter audio rate limit |
| POST | `/api/voice/speak` | `{jobId?}` or `{text?}` | `audio/wav`; `X-AI-Mode` header; stricter audio rate limit |
| POST | `/api/jobs/preview` | `{transcript, format?, customerName?, vehicleMake?, vehicleModel?, registrationNumber?, serviceItems?[{serviceId,quantity}], includedServiceIds?[], mechanicNotes?}` | provisional estimate, no writes |
| POST | `/api/jobs` | preview payload + `{customerName, mechanicApproved:true, customerPhone?, registrationNumber?, mechanicNotes?}` | 201; jobId `GS-1001…` |
| GET | `/api/jobs` | `?status=&q=` | list, newest first |
| GET | `/api/jobs/:id` | — | by `jobId` or id |
| PATCH | `/api/jobs/:id/status` | `{status, note?}` | lifecycle validated; requires owner session + CSRF when auth enabled |
| PATCH | `/api/jobs/bulk-status` | `{jobIds: string[] (1–50), status, note?}` | per-record validation, partial success; requires owner session + CSRF when auth enabled; rate-limited 30/min |
| GET | `/api/dashboard` | — | counts, revenue, recent, breakdowns |
| POST | `/api/demo/reset` | `{confirm:true}` | requires `DEMO_MODE=true`; requires owner session + CSRF when auth enabled |
| GET | `/api/ai/status` | — | provider readiness, no billable calls |
| POST | `/api/ai/smoke-test` | multipart `audio` + `text?` | requires live + `ALLOW_GNANI_LIVE_TESTS=true`; requires owner session + CSRF when auth enabled |
| POST | `/api/auth/setup` | `{token, username, password}` | one-time bootstrap; requires `GARAGE_SETUP_TOKEN` |
| POST | `/api/auth/login` | `{username, password}` | issues session cookie; generic failure |
| POST | `/api/auth/logout` | — | destroys session |
| GET | `/api/auth/me` | — | returns current user or 401 |

Lifecycle: `RECEIVED → INSPECTION → AWAITING_APPROVAL → APPROVED → IN_PROGRESS → READY_FOR_DELIVERY → COMPLETED`; `CANCELLED` from any non-terminal state.

**Bulk status response** (`200`, not transactional — each record is validated independently):

```json
{
  "updated": 2,
  "failed": 1,
  "results": [
    { "jobId": "GS-1002", "ok": true, "job": { "...": "updated job" } },
    { "jobId": "GS-1003", "ok": false, "code": "INVALID_TRANSITION", "message": "Cannot move a job from COMPLETED to IN_PROGRESS." }
  ]
}
```

Duplicate `jobIds` are de-duplicated; unknown IDs return `ok: false` with `JOB_NOT_FOUND`. An empty `jobIds` array is a `400` validation error.
