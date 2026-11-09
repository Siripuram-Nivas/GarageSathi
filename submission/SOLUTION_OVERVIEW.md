# Solution Overview

## Shape of the product

GarageSathi is a single-garage operations app with one main path:

```
voice → transcript → extracted fields → priced preview → mechanic approval → job card → Telugu confirmation
```

Everything else — dashboard, job list, catalogue, settings, AI status — supports that path.

## Architecture

```
Browser (React 19 + Vite)
  mic / WAV upload ──► 16-bit PCM WAV encoded in-page
        │
        ▼  multipart
Express 5 API
  Zod validation → rate limit → provider switch
        │
        ├─ mock provider  → labelled demo transcript / tone
        └─ Gnani Prisma v3.0  → transcript (live, gated)
        │
        ▼
Deterministic extraction (no model)
  vehicle make/model · registration · complaint · symptoms · services · unresolved terms
        │
        ▼
Catalogue matcher (Telugu + English aliases, limited fuzzy)
        │
        ▼
Pricing engine (integer paise, server-side, quantity clamp)
        │
        ▼
Preview (PENDING) ── mechanic approves ──► Job card (APPROVED, GS-####)
        │
        ├─ JSON store (default) or MongoDB Atlas
        └─ Gnani Timbre v2.5 → Telugu WAV (mock: labelled tone)
```

## Why the AI boundary is drawn there

| Step | AI? | Reason |
|---|---|---|
| Speech to text | Yes — Prisma | Genuinely hard; code-mixed Telugu is the core value |
| Field extraction | No | Must be reproducible and auditable; a wrong extraction is visible and editable |
| Service matching | No | Catalogue aliases are deterministic; unmatched terms are surfaced, not guessed |
| Pricing | No | Money must never be model-generated |
| Approval | No | Legal/trust boundary; the mechanic is accountable |
| Confirmation speech | Yes — Timbre | Natural Telugu output the customer can hear |

The model is used where it is strong and excluded where correctness is non-negotiable. This also means the app remains fully demonstrable and testable with no key.

## Key product decisions

1. **Server-authoritative money.** The client sends service IDs and quantities only. The server reads `service.pricePaise`, clamps quantity to 1–20, and recomputes totals. Jobs snapshot the unit price at approval so later catalogue edits never rewrite history.
2. **Mandatory approval.** `POST /api/jobs` rejects any request without `mechanicApproved: true`. A preview is explicitly provisional.
3. **Flag, don't hallucinate.** Terms that do not match the catalogue appear as unresolved so the mechanic can add or ignore them. No invented line items.
4. **Two-layer live gate.** Live calls need `AI_PROVIDER_MODE=live` **and** a key. The one-shot smoke test additionally needs `ALLOW_GNANI_LIVE_TESTS=true`. There is no silent fallback to mock.
5. **No raw audio storage.** Audio is validated in memory, sent to the provider, and dropped. Only the transcript and derived fields persist.
6. **Honest mock output.** Mock transcripts are labelled in the UI; mock TTS is a generated tone marked "Mock audio", never synthetic speech pretending to be Gnani.
7. **Zero-dependency start.** No MongoDB? A JSON file store. No key? Mock mode. `npm install && npm run dev` is the whole setup.
8. **Browser-side WAV encoding.** Avoids shipping ffmpeg and avoids sending a WebM container the STT API may reject.

## Feature map

| Screen | What it proves |
|---|---|
| Dashboard | Jobs, approved revenue, recent activity, service/status charts |
| New job | Record/upload, transcript review, extraction, estimate, approval, save, confirmation |
| Jobs | Search by customer/vehicle/job ID, status filters, empty states |
| Job detail | Snapshot line items, mechanic notes, status timeline, status transitions, re-speak |
| Services | Price editing in paise, aliases, active flag, seed restore |
| AI status | Mode, key presence as a boolean, model/voice config, live-test gate, one smoke test |
| Settings | Garage identity, mode badge, model/voice reference, demo reset |

## Data model

- `services`: name, description, aliases, `pricePaise`, category, active flag.
- `jobcards`: `jobId`, customer, vehicle, transcript, language, complaint, symptoms, line items with `unitPricePaise`, total, approval status, mechanic notes, status history, timestamps.
- `counters`: monotonic sequence for `GS-####`.

## Failure handling

- Every request gets an ID; errors return `{ error: { code, message }, requestId }`.
- Provider timeouts use `AbortSignal.timeout`; one attempt per user action, no retry storms.
- In-flight dedupe prevents double-click duplicate billable calls.
- Upload validation checks size, MIME, and RIFF/WAVE magic bytes before any provider call.
- Express 5 async errors are caught centrally; stack traces are hidden in production.

## Security and privacy

- The Gnani key exists only in the root `.env` / host secret store; health and AI-status endpoints expose booleans, not values.
- CORS allow-list, rate limits on writes and AI routes, Zod on every write.
- `DEMO_MODE` gates the destructive reset endpoint and must be off in production.
- No auth in the MVP: the app is designed for one garage and must not hold real customer data until auth is added.

## Known limitations

- Prisma and Timbre are live-verified at the API level (one smoke test each). Telugu accuracy, a listening check, and the full live UI flow are still unverified.
- Mock TTS is a tone, not speech; it is labelled as such.
- The JSON store is single-process and not suitable for shared hosting.
- Photo attachments, WhatsApp delivery, payments, and multi-user roles are out of scope.
- Catalogue prices are demonstrations; a real garage must set its own.
