# TASK BOARD

Statuses: NOT_STARTED / IN_PROGRESS / BLOCKED / COMPLETED / VERIFIED

## Repository inspection
- [x] VERIFIED — directory inspected (empty workspace, no git). Fresh build chosen.

## Brain
- [x] VERIFIED — BRAIN/ docs, AGENTS.md, .env.example, .gitignore.

## Foundation
- [x] VERIFIED — monorepo workspaces, TS, Tailwind v4, Express, env loading.
- [x] VERIFIED — health endpoint, request IDs, error envelope.
- [x] VERIFIED — JSON file store + Mongoose store switch.

## Gnani proof of concept
- [x] COMPLETED — Prisma provider (multipart, language list, format, keyterms, topic, timeout).
- [x] COMPLETED — Timbre provider (JSON, binary WAV, voice allow-list, dedupe).
- [x] VERIFIED — Mock providers + credit guards (tests).
- [x] VERIFIED — Live Prisma call: one deliberate smoke test, HTTP 200, correct transcript, `en-IN` detected.
- [x] VERIFIED — Live Timbre call: one deliberate smoke test, 48 kHz mono WAV returned (Varuni).
- [ ] NOT_STARTED — Telugu clip accuracy + audio listening check + full live UI flow.

## Business operations
- [x] VERIFIED — catalogue + Telugu-English alias matching, unresolved flags.
- [x] VERIFIED — server-side pricing in paise, quantity clamp, unknown service rejection.
- [x] VERIFIED — preview, approval, unique `GS-` job IDs, status history, lifecycle rules.
- [x] VERIFIED — dashboard aggregation.

## Frontend
- [x] VERIFIED — dashboard, voice intake, transcript review, job preview, jobs list/detail, catalogue, settings, AI status.
- [x] VERIFIED — responsive layout, mode badge, loading/empty/error states, toasts.
- [x] VERIFIED — CSS pipeline restored: Tailwind v4 was missing `@import "tailwindcss";` in `client/src/index.css`, so its utilities, preflight and theme variables were not emitted. The shared browser now applies the Ice Silver background, Aubergine text, Inter typography and generated utilities.
- [x] VERIFIED — New Job voice-powered orb renders through OGL/WebGL and responds to normalized RMS levels from the existing recording stream; microphone capture, upload and transcription controls remain unchanged.

## UI/UX enhancement (interaction engineering)
- [x] VERIFIED — collapsible desktop sidebar (persisted in localStorage) + mobile drawer with Escape/focus restore/`aria-expanded`.
- [x] VERIFIED — command palette (Ctrl/Cmd+K, `?`) with combobox/listbox semantics, arrow/Enter/Escape, no capture while typing.
- [x] VERIFIED — global shortcuts `g d/j/s/a` and `n`; verified in browser at 1440×900.
- [x] VERIFIED — skeleton loading states on dashboard, jobs, job detail, services.
- [x] VERIFIED — jobs table sort (aria-sort), debounced search, pagination, row/page selection, bulk status with per-record partial-success reporting.
- [x] VERIFIED — new-job draft autosave to sessionStorage (24 h TTL, text only), recovery banner, restore/discard, discard confirm.
- [x] VERIFIED — name/phone/price smart validation with `aria-invalid` and `role="alert"` errors.
- [x] VERIFIED — accessible `Modal`/`ConfirmDialog` (focus trap, Escape, focus restore, backdrop inert for destructive actions).
- [x] VERIFIED — 409 conflict refetch on job status change; save failure keeps the filled form and shows inline error.
- [x] VERIFIED — typography/telugu font token, focus-visible ring, `prefers-reduced-motion` disables transitions and page animation.
- [x] VERIFIED — persistent sidebar command-search field removed; Ctrl/Cmd+K palette still works by shortcut or deliberate menu action.
- [x] VERIFIED — AI integration diagnostics moved to Advanced/Developer Settings; only visible to authorized admin session; no secrets exposed.
- [x] VERIFIED — primary navigation trimmed: Dashboard, New Job, Job Cards, Service Catalogue, Garage Settings.
- [x] VERIFIED — MOCK/Local badges removed from main chrome; environment indicator only in Advanced Settings.
- [x] VERIFIED — AI config card removed from primary sidebar; moved to Advanced/Developer diagnostics for authorized owners.
- [x] VERIFIED — New catalogue service form removed; backend blocks arbitrary service creation; only price editing exposed.
- [x] VERIFIED — service catalogue rebuilt as searchable predefined services with Telugu/English aliases.
- [x] VERIFIED — garage price editing: inline or compact dialog, read-only name/category, save/cancel, audit metadata, per-garage price overrides.
- [x] VERIFIED — job price snapshots preserved; later price changes never rewrite old jobs.
- [x] VERIFIED — Ice Silver / Deep Aubergine / Marigold palette restored as the brand foundation with semantic glass tokens and selective, high-readability glass surfaces.
- [x] VERIFIED — glass panels, navigation, mobile toolbar, command palette, service picker, skeletons, toasts and dialogs use shared surface classes; blur has a no-support fallback and reduced-motion disables shimmer/card motion.
- [x] VERIFIED — routes checked in browser: dashboard, New Job, jobs, job detail, services, settings, AI status, login and not-found; tested 360/390/430/768/1024/1440 widths with no horizontal overflow.
- [x] VERIFIED — responsive layout tested desktop/tablet/mobile; no horizontal overflow; touch-friendly.
- [x] VERIFIED — 81 automated tests pass (51 server + 30 client); typecheck and production build pass after glass surface changes.
- [ ] NOT_STARTED — browser-verified bulk mutation (UI tested; server path covered by tests).
- [ ] NOT_STARTED — Playwright E2E suite (manual browser validation done only).

## Integration
- [x] VERIFIED — full mock flow: record/upload → transcript → preview → approve → save → status → audio.
- [x] VERIFIED — frontend ↔ backend proxy and production build.

## Quality
- [x] VERIFIED — backend unit + API tests, frontend logic tests, typecheck, production build.
- [x] VERIFIED — final baseline: 51 server tests + 30 client tests = 81 passing; typecheck (server + client) and production build pass.
- [ ] NOT_STARTED — automated Playwright E2E (manual browser validation done).

## Security (audit + hardening)
- [x] VERIFIED — Argon2id password hashing + one-time owner bootstrap (`auth.ts`, `authRoutes.ts`).
- [x] VERIFIED — Session-based auth (`express-session`), login/logout/me, opt-in via `AUTH_ENABLED`.
- [x] VERIFIED — CSRF double-submit protection (`X-CSRF-Token`) on state-changing routes.
- [x] VERIFIED — Auth-gated write routes (services, demo reset, status, smoke test).
- [x] VERIFIED — Helmet security headers + CSP; strict CORS allowlist.
- [x] VERIFIED — Removed `audioBase64` from smoke-test response; stricter audio rate limit.
- [x] VERIFIED — 11 security unit tests + 8 auth integration tests pass; typecheck + build pass.
- [x] VERIFIED — CSRF token echoed by the client on state-changing requests (unit test with mocked fetch); not yet exercised end-to-end with `AUTH_ENABLED=true`.
- [ ] NOT_STARTED — Telugu clip accuracy + audio listening check + full live UI flow (live Gnani, manual).
- [ ] NOT_STARTED — Enable GitHub secret scanning / push protection (if repo hosted).
- [ ] NOT_STARTED — Production: set `AUTH_ENABLED=true`, run bootstrap, `DEMO_MODE=false`, rotate Gnani key.

## Deployment
- [ ] NOT_STARTED — Vercel + Node host + Atlas. Developer approval required; no paid services.

## GitHub
- [x] VERIFIED — pushed `main` to `https://github.com/Siripuram-Nivas/GarageSathi` on 2026-11-09; remote verified (empty before push, now at commit `dcd30bd`).
- [x] VERIFIED — `.env` ignored and never committed; staged-diff and 6-commit history secret scans clean; `.env.example` contains placeholders only.
- [x] VERIFIED — pre-push gate: 65 tests, typecheck, build exit 0; `npm audit` 7 findings documented as residual risk (not force-fixed).

## Submission
- [x] VERIFIED — `submission/` documents written honestly (8 docs + 7 screenshots).
- [x] VERIFIED — `README.md` and `DEPLOYMENT.md`.
- [ ] NOT_STARTED — 60–90 s demo video + published LinkedIn post.
- [ ] NOT_STARTED — public deployment URL.

## Handoff
- [x] VERIFIED — `TEST_LOG.md` and `HANDOFF.md` reflect real results and next actions, including the live smoke test and security hardening.
