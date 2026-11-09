# Project Description — GarageSathi

**Tagline:** Speak the complaint. Get an approved job card and a Telugu confirmation.

**Event:** Great Indian AI Internship Challenge 2026 — Real Deal Award
**Participant:** Solo developer

## The one-paragraph version

GarageSathi is a Telugu-first voice operations app for small two-wheeler garages. A mechanic speaks the customer's complaint in Telugu or Telugu-English; Gnani Prisma transcribes it; GarageSathi deterministically extracts the vehicle and the requested services, matches them to a garage-owned price catalogue, and produces a provisional estimate. The mechanic reviews and approves, and the job is saved as a `GS-####` job card with a locked price snapshot. Gnani Timbre then speaks the approved amount back in Telugu so the customer hears exactly what was agreed.

## Why this exists

Small garages run on handwritten job cards and verbal estimates. Complaints get mis-recorded, service history is lost, and customers leave without a clear price or status. Existing garage software assumes an English keyboard, a desktop, and a monthly budget that a two-wheeler workshop does not have.

The mechanic already knows how to explain the problem — by speaking. GarageSathi starts there.

## What the demo shows

1. Record or upload a ≤30 s complaint.
2. Review the transcript and its detected language.
3. See the extracted vehicle, complaint, matched services, and any unresolved terms.
4. Adjust quantities; totals come from the server catalogue in paise.
5. Approve; the job card is created with a unique ID and status history.
6. Generate the Telugu confirmation audio.
7. Track the job through `RECEIVED → … → COMPLETED` and see it on the dashboard.

## What is genuinely AI

- **Speech in:** Gnani Prisma v3.0, Telugu + Indian English code-mix, with keyterms biased toward two-wheeler vocabulary.
- **Speech out:** Gnani Timbre v2.5, Telugu voice `Varuni`, reading the confirmation sentence with the amount in Telugu number words.
- **Deliberately not AI:** extraction, matching, pricing, and approval are deterministic and server-side. The model never invents a price and never approves a job. This is a trust decision, not a technical shortcut.

## Stack

React 19 + Vite + TypeScript + Tailwind v4 on the client; Express 5 + TypeScript + Zod + Multer on the server; MongoDB via Mongoose, with a local JSON store as the zero-credential fallback. Mock providers make the app runnable and testable with no key and no credits.

## Honest verification status

| Claim | Status |
|---|---|
| End-to-end workflow in mock mode | **Verified** manually in a browser and by 31 automated tests |
| Server-side pricing and mandatory approval | **Verified** by tests |
| Live Gnani Prisma transcription | **Verified for connectivity** with one English-input smoke test; Telugu accuracy unverified |
| Live Gnani Timbre speech | **Verified** — one request returned real 48 kHz WAV audio |
| Public deployment | **Not deployed** |
| Evon reasoning model | **Not configured**, not used by the flow |

The live code paths are written against the official Gnani documentation and are gated twice. One deliberate smoke test on 2026-11-08 proved both endpoints; Telugu quality still needs a real recording.

## Impact if deployed

- A spoken complaint becomes a priced, approved record in under a minute.
- The customer hears the agreed price in Telugu instead of guessing.
- The garage gets searchable history and a dashboard without changing how it already talks to customers.
- The same pattern works for any low-literacy, voice-first service business.

## Repository map

- `README.md` — run it locally.
- `BRAIN/` — spec, architecture, API contracts, decisions, test log.
- `DEPLOYMENT.md` — Vercel + Node + Atlas procedure.
- `submission/` — this pack, demo script, model usage, screenshots.
