# GarageSathi Security Test Matrix

**Purpose:** Record each security test case, setup, expected result, actual result, and status.

**How tests run:** `npm test` (all suites) — mock mode only, no Gnani credits consumed.

| ID | Area | Test case | Setup | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| S-01 | Auth middleware | `requireAuth` throws 401 when no session user | Mock req/res/next | Throws 401 | Threw 401 | PASS |
| S-02 | Auth middleware | `requireAuth` passes when session user exists | Session with user | Calls next() | Called next() | PASS |
| S-03 | Auth middleware | `requireOwner` throws 401 when no user | Empty session | Throws 401 | Threw 401 | PASS |
| S-04 | Auth middleware | `requireOwner` throws 403 for non-owner | Session with viewer role | Throws 403 | Threw 403 | PASS |
| S-05 | Auth middleware | `requireOwner` passes for owner | Session with owner role | Calls next() | Called next() | PASS |
| S-06 | CSRF | `csrfProtection` throws 403 for missing token (POST) | POST, session has token, header undefined | Throws 403 | Threw 403 | PASS |
| S-07 | CSRF | `csrfProtection` throws 403 for mismatched token | POST, header != session token | Throws 403 | Threw 403 | PASS |
| S-08 | CSRF | `csrfProtection` passes with matching token | POST, header == session token | Calls next() | Called next() | PASS |
| S-09 | CSRF | `csrfProtection` ignores GET | GET method | Calls next() | Called next() | PASS |
| S-10 | CSRF | `issueCsrfToken` creates and returns token | Empty session | Sets `csrfToken` + `X-CSRF-Token` header | Set both | PASS |
| S-11 | Rate limit | 429 after exceeding limit | Limit 2/min, 3 requests | 3rd call → err.status 429 | 429 | PASS |
| S-12 | Auth integration | Setup creates first owner | `AUTH_ENABLED=true`, valid bootstrap token | 201, owner returned | 201 | PASS |
| S-13 | Auth integration | Setup disabled after first use | Owner already exists | 409 | 409 | PASS |
| S-14 | Auth integration | Setup rejects invalid bootstrap token | Wrong token | 401 | 401 | PASS |
| S-15 | Auth integration | Login rejects wrong credentials (generic) | Wrong password | 401 `INVALID_CREDENTIALS` | 401 | PASS |
| S-16 | Auth integration | Login succeeds + session cookie | Correct credentials | 200, `gs_session` cookie set | 200 + cookie | PASS |
| S-17 | Auth integration | Authenticated owner can create a service | Logged in + CSRF token | 201 | 201 | PASS |
| S-18 | Auth integration | Unauthenticated service creation rejected | No session | 401 | 401 | PASS |
| S-19 | Auth integration | Logout clears session | Log in, then log out | 200, subsequent create → 401 | 200 + 401 | PASS |
| S-20 | API (existing) | Health does not leak secrets | Mock mode | Body excludes GNANI_API_KEY | Passed | PASS |
| S-21 | API (existing) | Unknown service IDs rejected | `serviceItems: [{serviceId:'invented'}]` | 422 `UNKNOWN_SERVICE` | Passed | PASS |
| S-22 | API (existing) | Mechanic approval required to save | No `mechanicApproved` | 400 `VALIDATION_ERROR` | Passed | PASS |
| S-23 | API (existing) | Live smoke test blocked when gate off | `ALLOW_GNANI_LIVE_TESTS` unset | 403 `LIVE_TESTS_DISABLED` | Passed | PASS |
| S-24 | API (existing) | Status lifecycle enforced | Invalid transition | 409 `INVALID_TRANSITION` | Passed | PASS |
| S-25 | Client (existing) | WAV encoding produces valid RIFF/WAVE | `encodeWav` | Valid 16-bit mono PCM header | Passed | PASS |

**Suites run:**
- `server/tests/units.test.ts` — 12 passed
- `server/tests/security.test.ts` — 11 passed
- `server/tests/auth.integration.test.ts` — 8 passed
- `server/tests/api.test.ts` — 16 passed
- `client/src/lib/*.test.ts` — 18 passed
- **Total: 65 passed, 0 failed** (updated 2026-11-09; the security suite itself is unchanged at 19 tests)

**Not automated (manual next steps):**
- CORS disallowed-origin rejection (requires a real cross-origin test client)
- Security header presence on live responses (requires a running server + curl)
- `DEMO_MODE=false` in production (deployment config)
- Telugu transcription accuracy with a real Telugu clip (live mode, manual)
