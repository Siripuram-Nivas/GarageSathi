# Individual Contribution

**Participant:** Solo developer
**Event:** Great Indian AI Internship Challenge 2026 — Real Deal Award

## What I built

I designed and implemented the entire submission in this repository:

- **Product definition:** problem framing, target user, scope cut, and the decision that AI transcribes and speaks but never prices or approves.
- **Frontend:** React 19 + Vite + TypeScript SPA — dashboard with charts, voice intake with browser PCM recording and in-page WAV encoding, transcript review, editable job preview and estimate, job list/detail with status lifecycle, service catalogue editing, settings, and an AI integration status page. Responsive layout with a mobile drawer.
- **Backend:** Express 5 + TypeScript API — Zod validation, request IDs, structured errors, rate limits, CORS, multipart WAV validation, mock and live provider switch, in-flight dedupe, credit gates, deterministic extraction and catalogue matching, integer-paise pricing, job IDs (`GS-####`), approval enforcement, status history, dashboard aggregation, and a gated one-shot live smoke test.
- **Data:** a `DataLayer` interface with two implementations — Mongoose for MongoDB Atlas, and a serialized JSON-file store so the app runs with zero cloud credentials.
- **Gnani integration:** Prisma v3.0 multipart STT and Timbre v2.5 binary TTS against the official docs, plus an optional, disabled Evon adapter.
- **Telugu output:** confirmation sentence construction with Telugu number words.
- **Honesty mechanics:** mock labels in UI and headers, no silent live→mock fallback, two-layer live gate, no raw audio persistence, secrets only server-side.
- **Quality:** 47 server tests, 18 client tests, typecheck, production build, and manual browser passes through the whole workflow including mobile.
- **Documentation:** `BRAIN/` (spec, architecture, API contracts, decisions, task board, test log, handoff), `README.md`, `DEPLOYMENT.md`, and this submission pack.

## How I used AI tooling

I used an AI coding agent as an implementation assistant in the same way I would use a fast typist with good recall: to scaffold files, write boilerplate, and iterate on code I directed and reviewed. The product decisions — the AI/no-AI boundary, server-authoritative paise pricing, mandatory mechanic approval, mock-first credit safety, browser-side WAV encoding, and the zero-credential JSON store — were mine, and I verified the behaviour by running the app and the test suite rather than trusting generated code.

I did not use AI to fabricate test results, screenshots, or integration claims. The screenshots are from the running app; the test counts are from `npm test`; the live Gnani paths are marked unverified because I never had a secret to run them.

## What I did not do

- I ran one deliberate live smoke test per model (English speech in, real Telugu audio out). I did not run a full live Telugu job flow or a listening check.
- I did not deploy the app. `DEPLOYMENT.md` is a procedure, not a record.
- I did not configure Evon; the flow does not need it.
- I did not add authentication, payments, WhatsApp delivery, or inventory. They are explicitly out of scope.
- I did not write automated Playwright E2E tests; I validated the flow manually in a browser.

## What I would do next, in order

1. Run a real Telugu complaint through the live UI flow and record the transcript accuracy and audio result.
2. Deploy API + client + Atlas and put the live URL in the README.
3. Add auth and per-garage tenancy before any real customer data.
4. Add Playwright coverage for the voice → approval → job path.
5. Replace demonstration catalogue prices with a real garage's prices and aliases.
