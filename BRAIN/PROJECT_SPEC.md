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
5. **Service catalogue loads predefined services**; mechanic selects from searchable picker.
6. Preview computes line items and totals **on the server** from catalogue prices + garage overrides.
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

## UI/UX enhancement (implemented)

- Collapsible desktop sidebar with persisted preference; mobile drawer with Escape/focus handling.
- Command palette (Ctrl/Cmd+K or `?`) and `g d/j/s/a` + `n` keyboard shortcuts.
- Skeleton loaders, page transitions, reduced-motion support, Telugu font token.
- Sortable, debounced-search, paginated job table with row/page selection and bulk status updates.
- New-job draft autosave/recovery (text only), inline validation, save-failure recovery.
- Accessible modal + confirmation dialog for destructive actions; 409 conflict refetch.

## Visual design system

- The brand palette is Ice Silver `#DDE3E8`, Deep Aubergine `#3A0F34`, and Marigold `#EAAA00`, with white/high-opacity surfaces for readability.
- `client/src/index.css` owns semantic glass tokens and shared classes: `app-canvas`, `glass-panel`, `glass-panel-subtle`, `glass-card-interactive`, `glass-nav`, `glass-toolbar`, `glass-popover`, `glass-dialog`, `glass-toast`, and `glass-skeleton`.
- Blur is selective and feature-detected. Unsupported browsers retain opaque/high-opacity surfaces. Dense tables, controls, and text-heavy content stay solid for contrast; reduced-motion disables shimmer and card transitions.

## Non-functional

- No secrets in the frontend or logs.
- Integer paise money; server-authoritative pricing.
- Zod validation on every write; structured error envelope with request ID.
- Responsive layout; empty/loading/error states; toasts; accessible contrast.
- Keyboard-operable controls, visible focus rings, `aria-invalid`/`aria-sort`/dialog semantics, `prefers-reduced-motion` respected.
- No storage of raw customer recordings.

## Submission requirements

`submission/` documents + honest demo script + screenshots + test results + deployment guide.

## Explicitly excluded from MVP

- Payments, SMS/WhatsApp delivery, multi-tenant auth, inventory, attendance/payroll, real customer data, permanent audio storage, automated diagnosis, Evon local deployment.

## Product decisions
1. GarageSathi owns the predefined service catalogue.
2. Garage owners do not write service names, categories or aliases.
3. Garage owners can edit their own service prices.
4. Garage-specific price overrides do not change central defaults.
5. Approved job cards retain historical price snapshots.
6. Service selection supports search, click/tap and optional drag-and-drop.
7. AI technical diagnostics are moved out of the primary garage-owner UI.
8. The persistent sidebar command-search field is removed, but keyboard command-palette access is retained.
9. The brand palette is Ice Silver, Deep Aubergine and Marigold; use restrained, selective glass surfaces without reducing readability.
10. Existing security and Gnani integrations must remain functional.
