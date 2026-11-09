# DECISIONS

Format: decision — reason — alternatives — consequences — date.

1. **Single monorepo with npm workspaces (`client`, `server`)** — simplest run/install story for a solo build — separate repos rejected — `npm install` + `npm run dev` at root — 2026-11-08.
2. **TypeScript on both sides** — shared shape safety, Zod inference — plain JS rejected — typecheck is part of the gate — 2026-11-08.
3. **Deterministic extraction instead of Evon for MVP** — zero cost, reproducible, testable, works offline — Evon local GPU rejected (cost/setup), hosted API does not exist — extraction is alias/keyword based; Evon remains an optional adapter — 2026-11-08.
4. **Prices only from the catalogue, computed server-side in integer paise** — never trust AI or frontend prices — float rupees rejected — jobs snapshot `unitPricePaise` at approval — 2026-11-08.
5. **Mandatory mechanic approval** — legal/trust boundary; AI never approves — auto-save rejected — `POST /api/jobs` requires `mechanicApproved:true` — 2026-11-08.
6. **Mock mode default, live gated twice** (`AI_PROVIDER_MODE=live` + key, smoke test also needs `ALLOW_GNANI_LIVE_TESTS=true`) — protects limited credits — auto-fallback rejected (silent misrepresentation) — UI always shows mode — 2026-11-08.
7. **Record PCM in the browser and encode WAV client-side** — Gnani needs a supported format, WebM needs ffmpeg; browser encoding removes a binary dependency — ffmpeg-static rejected (size/platform), renaming WebM rejected (invalid) — 30 s cap enforced at capture — 2026-11-08.
8. **Local JSON store fallback when `MONGODB_URI` is absent** — the app must run without cloud credentials — in-memory-only rejected (loses data on restart), SQLite rejected (extra native dep) — documented limitation: file store is single-instance only — 2026-11-08.
9. **No raw audio persistence** — privacy — storing recordings rejected — only transcript + derived fields saved — 2026-11-08.
10. **No shadcn/ui** — the needed primitives are ~6 small local components; avoids Radix install and CSS variable setup — shadcn rejected for size — custom `components/ui.tsx` follows the same design language — 2026-11-08.
11. **Mock TTS returns a generated tone, labelled MOCK, not fabricated speech** — honesty requirement — synthetic Telugu speech via another service rejected (unapproved dependency) — UI shows "Mock audio (tone)" — 2026-11-08.
12. **No auth in MVP, demo reset gated by `DEMO_MODE`** — single-garage competition scope — full auth rejected as out of scope — deployment must keep demo reset off or protected — 2026-11-08.
13. **Opt-in server-side session authentication added post-MVP** — `AUTH_ENABLED=false` default preserves existing frontend behavior; `AUTH_ENABLED=true` + `AUTH_SESSION_SECRET` required for production — argon2id password hashing (OWASP baseline), express-session cookies (HttpOnly/SameSite/Secure), one-time owner bootstrap via `GARAGE_SETUP_TOKEN`, CSRF double-submit on state-changing routes — full custom JWT rejected (sessions simpler for single-garage) — 2026-11-08.
14. **Helmet security headers + strict CSP** — clickjacking, content-type sniffing, and inline-script mitigation — HSTS omitted until HTTPS confirmed on deployment — 2026-11-08.
15. **Strict CORS allowlist (no `*` with credentials)** — `CORS_ORIGIN` env var controls allowed origins — no origin reflection — 2026-11-08.
16. **Smoke-test response excludes raw audio** — return `bytes`/`contentType` only, not `audioBase64` — reduces paid-audio abuse surface — 2026-11-08.
