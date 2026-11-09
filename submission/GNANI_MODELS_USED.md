# Gnani Models Used

## Summary

| Capability | Model | Status in this build |
|---|---|---|
| Speech to text | **Gnani Prisma v3.0** (`prisma-v3.0`) | **Live verified** — one smoke test, correct English transcript; Telugu accuracy unmeasured |
| Text to speech | **Gnani Timbre v2.5** (`timbre-v2.5`), voice **Varuni** | **Live verified** — one smoke test returned a 48 kHz mono WAV |
| Optional reasoning | Gnani Evon v3.3 30B-A3B | **Not configured**, not used by the product flow |

A single deliberate live smoke test was executed on 2026-11-08: one Prisma request and one Timbre request. Both returned HTTP 200. The STT input was English speech, so this proves the integration and response handling, not Telugu accuracy. Details and the saved audio are in `../BRAIN/TEST_LOG.md` and `live-smoke-tts.wav`.

## 1. Gnani Prisma v3.0 — speech to text

**Purpose:** turn a mechanic's Telugu / Telugu-English complaint into a transcript.

**Endpoint:** `POST https://api.vachana.ai/stt/v3` (`multipart/form-data`)
**Auth header:** `X-API-Key-ID: <secret>` (server only)

**Fields sent:**

| Field | Value | Why |
|---|---|---|
| `audio_file` | 16-bit PCM WAV, ≤30 s, ≤5 MB | Browser-encoded, no ffmpeg dependency |
| `model` | `prisma-v3.0` | Current Prisma generation |
| `language_code` | `te-IN,en-IN` | Handles code-mixed workshop speech |
| `format` | `transcribe` (`codemix` configurable) | Readable output for the mechanic to correct |
| `keyterms` | two-wheeler vocabulary (JSON array) | Biases recognition toward clutch, brake, silencer, puncture, etc. |
| `topic` | "Telugu-English two-wheeler repair complaints and garage service requests" | Domain context |

**Response handling:** reads `transcript` with defensive fallbacks (`text`, `data.transcript`), plus detected language. Errors surface status + short body; no automatic retry, so credits are not burned silently.

**Where it lives:** `server/src/providers/gnani.ts`, called through `server/src/providers/ai.ts`.

## 2. Gnani Timbre v2.5 — text to speech

**Purpose:** speak the approved job total back to the customer in Telugu.

**Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference` (`application/json`)

**Body:**

```json
{
  "text": "<Telugu confirmation sentence>",
  "model": "timbre-v2.5",
  "voice": "Varuni",
  "language": "te-IN",
  "speed": 1.0,
  "audio_config": {
    "sample_rate": 48000,
    "num_channels": 1,
    "sample_width": 2,
    "encoding": "linear_pcm",
    "container": "wav"
  }
}
```

**Response:** raw `audio/wav` binary — parsed as bytes, never as JSON.

**Voice choice:** `Varuni` from the documented v2.5 Telugu set (Varuni, Suhana, Lehara, Lavanya, Yukti). The server allow-lists these.

**Text generation:** `server/src/telugu.ts` builds the sentence and converts the amount to Telugu number words, so the customer hears "rupees five hundred and fifty" in Telugu rather than digits.

## 3. Gnani Evon v3.3 — optional, disabled

Model card: `gnani/gnani-evon-v3.3-30B-A3B`. There is no hosted internship API for it. The repository contains an optional OpenAI-compatible adapter that activates only with `EVON_ENABLED=true` and a `EVON_BASE_URL`. Its output is validated and can never set a price or approve a job.

**Status: not configured, not used.** The product does not depend on it: extraction and matching are deterministic by design.

## 4. Credit-safety design

- Default `AI_PROVIDER_MODE=mock`; no network call unless live is explicitly chosen.
- Live requires **both** live mode and a key. Missing either yields a clear error, never a quiet mock.
- The one-time smoke test additionally requires `ALLOW_GNANI_LIVE_TESTS=true`.
- Automated tests never invoke Gnani; they run entirely against mock providers.
- In-flight dedupe per operation prevents double submissions.
- Single attempt per user action; no retry loop.
- The UI always shows the active mode; mock transcripts and mock audio are labelled.

## 5. Live verification record

Executed 2026-11-08 with the real key, one call per model:

| Check | Result |
|---|---|
| Prisma endpoint + auth | HTTP 200 |
| Transcript | `Ravi Kumar, Honda Activa brake sound is coming. Please change the engine oil.` |
| Detected language | `en-IN` |
| Provider request ID | `01a1bc47-965a-7105-9d4a-1b9db5043075` |
| Timbre endpoint + auth | HTTP 200, `audio/wav` |
| Audio | 276,524 bytes, 48 kHz mono 16-bit, ≈2.88 s (`live-smoke-tts.wav`) |

Still to verify before claiming a complete live product:

1. A real **Telugu** clip through the live flow, with accuracy notes.
2. A listening check of the Varuni confirmation.
3. The full live UI flow: record → transcript → approve → job → speak.

`ALLOW_GNANI_LIVE_TESTS` is back to `false`; the smoke test cannot be repeated accidentally. Rotate the key after the demo because it was shared in a chat session.

Until steps 1–3 are recorded, the correct claim is: **live API integration verified; Telugu quality pending.**

## 6. References

- Prisma v3: https://docs.gnani.ai/api/STT/models/prisma-v3
- Speech to text: https://docs.gnani.ai/api/STT/speech-to-text
- TTS inference: https://docs.gnani.ai/api/TTS/tts-inference
- Available voices: https://docs.gnani.ai/api/TTS/available-voices
- Evon model card: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B
