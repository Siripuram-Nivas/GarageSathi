# AGENTS.md — GarageSathi

Instructions for any AI coding agent working in this repository.

1. **Read `BRAIN/INDEX.md` first**, then `BRAIN/HANDOFF.md`, then the brain document for the subsystem you touch.
2. Inspect the existing implementation before editing. Do not recreate working code, pages, providers or scripts.
3. Reuse existing dependencies and helpers (`client/src/lib/*`, `server/src/*`). Do not add a service or library without a technical reason.
4. Follow `BRAIN/API_CONTRACTS.md`. Never invent Gnani endpoints, parameters, model names or voices.
5. **Never print, log, document, commit or bundle secrets.** The Gnani key lives only in the root `.env` as `GNANI_API_KEY_ID`.
6. Default to `AI_PROVIDER_MODE=mock`. Never call live Gnani APIs unless the developer explicitly enables live mode and `ALLOW_GNANI_LIVE_TESTS=true`, and never during automated tests.
7. Keep mock output unmistakably labelled. Never present mock results as real model output.
8. Keep money in integer paise. Prices always come from the service catalogue on the server.
9. Mechanic approval is mandatory before a job is saved as approved.
10. Run `npm test` and `npm run typecheck` after modifying logic; run `npm run build` before declaring a phase done.
11. Update `BRAIN/TASK_BOARD.md`, `BRAIN/TEST_LOG.md` and `BRAIN/HANDOFF.md` before finishing a session.
12. Never push, deploy or rotate credentials without the developer's explicit approval.

## Security invariants (added by security audit)

13. **Authentication is opt-in (`AUTH_ENABLED=false` default).** Never enable auth on all routes without also adding a frontend login flow; otherwise the app breaks. When `AUTH_ENABLED=true`, write routes (`POST/PATCH /api/services`, `POST /api/demo/reset`, `PATCH /api/jobs/:id/status`, `POST /api/ai/smoke-test`) require an owner session + `X-CSRF-Token` header.
14. **Never store or log the Gnani key, session secret, or database URI.** Health and `/api/auth/me` endpoints expose booleans/non-secret data only. `.env` is gitignored; `.env.example` contains placeholders only.
15. **Server-authoritative pricing and approval remain intact.** Prices come only from `services.pricePaise`; `mechanicApproved=true` is required to save a job. Auth must never bypass these.
16. **No live Gnani calls in automated tests.** `AI_PROVIDER_MODE=mock` for `npm test`; `ALLOW_GNANI_LIVE_TESTS` must be `false` except during a deliberate manual smoke test.
17. **CSRF token required on state-changing routes when auth is enabled.** The frontend must read `X-CSRF-Token` from responses and send it back on POST/PATCH/DELETE.
18. **Do not weaken rate limits on `/api/voice/*` and `/api/ai/smoke-test`.** These call paid Gnani APIs; limits protect against credit exhaustion.

