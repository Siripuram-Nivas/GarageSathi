# PROJECT_SPEC

## Problem

Small two-wheeler garages run on handwritten job cards and verbal estimates. Complaints are mis-recorded, details forgotten, customers get no clear update, conventional software is too expensive or too English/typing-heavy for mechanics.

## Target users

- Independent two-wheeler mechanics and small repair shops.
- Garage owners who prefer speaking over typing.
- Customers who speak Telugu / Telugu-English.

## Objective

Record a spoken complaint, transcribe it with Gnani Prisma, extract vehicle + service details deterministically, match a priced service catalogue, produce a mechanic-approved estimate, persist a job card with a unique ID, and generate a Telugu confirmation with Gnani Timbre.

## Core workflow

1. Mechanic records or uploads ≤30 s of audio.
2. Prisma transcribes (live) or the mock provider returns a labelled demo transcript.
3. Mechanic reviews/edits the transcript.
4. Deterministic extractor finds vehicle, complaint, symptoms, services, unresolved terms.
5. Preview computes line items and totals **on the server** from catalogue prices.
6. Mechanic corrects fields, adjusts quantities, approves.
7. Job is saved with `GS-<n>` ID, price snapshot and status history.
8. Mechanic updates status through the allowed lifecycle.
9. Telugu confirmation audio is generated (Timbre live / mock tone) and played.
10. Dashboard aggregates live database values.

## Required features (implemented)

- Dashboard with counts, estimated approved revenue, recent jobs, service + status charts.
- Voice intake with mic permission handling, 30 s cap, playback, re-record, upload.
- Transcript review with language label and re-transcribe.
- Editable job-card preview with matched services, unresolved flags, estimate.
- Mandatory mechanic approval.
- Job list + search + filters, job detail with status timeline and status updates.
- Service catalogue CRUD (price in paise, aliases, active flag).
- Settings: garage identity, mode badge, model/voice, setup instructions, demo reset.
- AI Integration Status: provider health, live-test gate, one deliberate smoke test.
- Mock/Live mode with credit guards (no auto calls, in-flight dedupe).

## Non-functional

- No secrets in the frontend or logs.
- Integer paise money; server-authoritative pricing.
- Zod validation on every write; structured error envelope with request ID.
- Responsive layout; empty/loading/error states; toasts; accessible contrast.
- No storage of raw customer recordings.

## Submission requirements

`submission/` documents + honest demo script + screenshots + test results + deployment guide.

## Explicitly excluded from MVP

- Payments, SMS/WhatsApp delivery, multi-tenant auth, inventory, attendance/payroll, real customer data, permanent audio storage, automated diagnosis, Evon local deployment.
