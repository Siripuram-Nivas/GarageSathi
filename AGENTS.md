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
