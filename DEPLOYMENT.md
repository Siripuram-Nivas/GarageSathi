# Deployment

GarageSathi is a static React build plus a Node API. This guide deploys:

- **Client** → Vercel (static)
- **API** → Render or Railway (Node)
- **Database** → MongoDB Atlas free tier

Nothing here has been deployed yet. This is the documented procedure, not a report of a live URL.

## 1. Prerequisites

- Node 20+ locally.
- Accounts: GitHub, Vercel, Render/Railway, MongoDB Atlas.
- A Gnani API key **only if** you intend to run live mode. The app runs fully in mock mode without one.

## 2. MongoDB Atlas

1. Create a free **M0** cluster.
2. Create a database user with a strong password.
3. Allow network access from your API host (`0.0.0.0/0` is acceptable for a demo, not for production).
4. Copy the connection string:
   `mongodb+srv://USER:PASS@cluster.mongodb.net/garagesathi?retryWrites=true&w=majority`
5. Keep the database name `garagesathi` so collections are predictable.

The server seeds the service catalogue on boot if it is empty.

## 3. API on Render (or Railway)

1. Push the repository to GitHub (never commit `.env`).
2. Create a **Web Service** from the repo.
3. Settings:
   - **Root directory:** repository root
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start`
   - **Health check path:** `/api/health`
4. Environment variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | leave unset (host injects it) |
| `MONGODB_URI` | Atlas connection string |
| `CORS_ORIGIN` | `https://your-client.vercel.app` |
| `DEMO_MODE` | `false` |
| `AI_PROVIDER_MODE` | `mock` (switch to `live` deliberately) |
| `GNANI_API_KEY_ID` | only if going live |
| `ALLOW_GNANI_LIVE_TESTS` | `false` unless running the one smoke test |

5. Deploy and confirm `GET https://your-api.onrender.com/api/health` returns `status: "ok"`.

Notes:
- `npm run start` expects `server/dist` from the build step.
- Free tiers sleep; the first request after idle is slow.
- **Do not** rely on the local JSON store in production. Without `MONGODB_URI`, data lives on the host's ephemeral disk and is lost on redeploy.

## 4. Client on Vercel

1. Import the same repository.
2. Settings:
   - **Framework preset:** Vite
   - **Root directory:** `client`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Environment variable: `VITE_API_URL=https://your-api.onrender.com`
4. Deploy, then set the API's `CORS_ORIGIN` to the final Vercel URL and redeploy the API.
5. `client/vercel.json` (or a dashboard rewrite) is not required for the SPA if Vercel's Vite preset handles fallback; if deep links 404, add a rewrite of `/(.*)` to `/index.html`.

## 5. Post-deploy verification

Run through this list and record the result:

1. `GET /api/health` → `status: ok`, `mode: mock`, `gnaniConfigured: false`.
2. Dashboard loads with zero or seeded jobs.
3. Voice intake: upload a short WAV → labelled mock transcript appears.
4. Preview shows catalogue prices; edit a quantity and confirm the total changes.
5. Approve → job saves with a `GS-` ID.
6. Job detail → change status → timeline records the change.
7. "Speak confirmation" plays a tone labelled **Mock audio**.
8. Catalogue price edit → new preview reflects the new price; the saved job keeps its snapshot.
9. Refresh after a redeploy: with Atlas, data persists; with the file store, it does not.
10. Confirm `/api/demo/reset` is disabled (`DEMO_MODE=false`) in production.

## 6. Going live with Gnani

1. Set `GNANI_API_KEY_ID` in the host's secret store and `AI_PROVIDER_MODE=live`.
2. Redeploy.
3. Confirm **AI Integration Status** shows Gnani configured and Live.
4. Set `ALLOW_GNANI_LIVE_TESTS=true` for one deliberate smoke test, then set it back to `false`.
5. Verify the returned Telugu transcript and audio are real, and update the docs with the result.

Until that is done, the honest public claim is: **mock-verified, live-integration implemented but untested.**

## 7. Rollback

- Vercel keeps previous deployments; promote the last good one.
- Render/Railway: redeploy the previous commit.
- Atlas: take a cluster snapshot before schema-affecting changes (there are none today; collections are created on first write).

## 8. Security checklist

- [ ] `GNANI_API_KEY_ID` exists only in the host secret store and local `.env`.
- [ ] `.env` is not in git (`git check-ignore .env`).
- [ ] `DEMO_MODE=false`.
- [ ] `CORS_ORIGIN` lists only the real client origin.
- [ ] Atlas user has minimal privileges and a non-default password.
- [ ] No stack traces returned in production (`NODE_ENV=production`).
- [ ] Add authentication before exposing real customer data; this MVP has none.
