# API_CONTRACTS

Verified against official docs on **2026-11-08**. No live call has been made yet.

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
- **Integration status: implemented, NOT verified live.**

## Timbre v2.5 — text to speech

- Docs: https://docs.gnani.ai/api/TTS/tts-inference and https://docs.gnani.ai/api/TTS/available-voices
- `POST /api/v1/tts/inference`, `application/json`
- Body: `text`, `model=timbre-v2.5`, `voice=Varuni`, `language=te-IN`, `speed=1.0`, `audio_config={sample_rate:48000,num_channels:1,sample_width:2,encoding:"linear_pcm",container:"wav"}`.
- Response: raw `audio/wav` binary (do **not** parse as JSON).
- Voices validated against the documented v2.5 Telugu list: Varuni, Suhana, Lehara, Lavanya, Yukti.
- **Integration status: implemented, NOT verified live.**

## Evon v3.3 (optional)

- Model card: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B
- No hosted internship API. Adapter uses `POST {EVON_BASE_URL}/chat/completions` with bearer `EVON_API_KEY` only when `EVON_ENABLED=true`.
- Status: **NOT CONFIGURED** by default; its output can never set prices or approve a job.

## Internal API

All responses JSON unless noted. Errors: `{ "error": { "code": string, "message": string, "details"?: unknown }, "requestId": string }`.

| Method | Path | Body / query | Notes |
|---|---|---|---|
| GET | `/api/health` | — | db status, mode, gnaniConfigured, evon status, mock flag |
| GET | `/api/services` | `?includeInactive=1` | catalogue list |
| POST | `/api/services` | `{name, description?, aliases?[], pricePaise, category?, isActive?}` | 201 |
| PATCH | `/api/services/:id` | same, partial | price changes affect future previews only |
| POST | `/api/voice/transcribe` | multipart `audio` (≤5 MB, WAV) + `language?`, `format?` | mock/live by config; no persistence |
| POST | `/api/voice/speak` | `{jobId?}` or `{text?}` | `audio/wav`; `X-AI-Mode` header |
| POST | `/api/jobs/preview` | `{transcript, format?, customerName?, vehicleMake?, vehicleModel?, registrationNumber?, serviceItems?[{serviceId,quantity}], includedServiceIds?[], mechanicNotes?}` | provisional estimate, no writes |
| POST | `/api/jobs` | preview payload + `{customerName, mechanicApproved:true, customerPhone?, registrationNumber?, mechanicNotes?}` | 201; jobId `GS-1001…` |
| GET | `/api/jobs` | `?status=&q=` | list, newest first |
| GET | `/api/jobs/:id` | — | by `jobId` or id |
| PATCH | `/api/jobs/:id/status` | `{status, note?}` | lifecycle validated |
| GET | `/api/dashboard` | — | counts, revenue, recent, breakdowns |
| POST | `/api/demo/reset` | `{confirm:true}` | requires `DEMO_MODE=true` |
| GET | `/api/ai/status` | — | provider readiness, no billable calls |
| POST | `/api/ai/smoke-test` | multipart `audio` + `text?` | requires live + `ALLOW_GNANI_LIVE_TESTS=true` |

Lifecycle: `RECEIVED → INSPECTION → AWAITING_APPROVAL → APPROVED → IN_PROGRESS → READY_FOR_DELIVERY → COMPLETED`; `CANCELLED` from any non-terminal state.
