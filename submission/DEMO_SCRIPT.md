# Demo Script

**Target length:** 75–90 seconds. **Mode:** mock (unless a live key is present and the smoke test has passed).

## Before recording

- [ ] `npm run dev` running; both http://localhost:5173 and `GET /api/health` respond.
- [ ] Mode badge reads **Mock** — say so on camera; do not imply a live Gnani call.
- [ ] Demo data reset or a clean state: **Settings → Reset demo data** (only when `DEMO_MODE=true`).
- [ ] Catalogue at seed prices (Battery ₹100, Oil ₹450, Brake ₹150, Puncture ₹80, Chain ₹120, General ₹600).
- [ ] A prepared WAV clip and a quiet room; browser mic permission already granted.
- [ ] Zoom the browser to 110–125%; close unrelated tabs.
- [ ] Screenshots open in a second window as backup.

## Shot list

| Time | Screen | Action | Say |
|---|---|---|---|
| 0:00–0:08 | Dashboard | Show counts, revenue, recent jobs | "Small garages lose every complaint they only speak. GarageSathi starts with the voice." |
| 0:08–0:18 | New job | Click **Record**, speak: "Ravi Kumar Honda Activa, brake sound vastundi, engine oil kuda marchali" | "A mechanic speaks Telugu-English, the way the workshop already talks." |
| 0:18–0:26 | New job | Stop; show the **Mock** label on the transcript | "Prisma transcribes it. In mock mode we show a clearly labelled demo transcript — no credits, no pretending." |
| 0:26–0:36 | New job | Review transcript, vehicle and complaint; point at matched services | "Extraction is deterministic: vehicle, complaint, services. Anything unmatched is flagged, never invented." |
| 0:36–0:48 | Preview | Show line items and total; change a quantity and point at the recomputed total | "Prices come only from the garage's catalogue, in paise, recomputed on the server. The browser cannot set a price." |
| 0:48–0:56 | Preview | Tick the approval checkbox, click **Approve & save job** | "Nothing is saved until the mechanic approves. The AI never approves a job." |
| 0:56–1:04 | Job detail | Point at the `GS-` ID and the price snapshot; click **Speak confirmation** | "The job card keeps the agreed price. In live mode Timbre reads this in Telugu; here it is a labelled mock tone." |
| 1:04–1:14 | Job detail | Change status to **In progress**; show the timeline | "The job moves through a fixed lifecycle, with history." |
| 1:14–1:20 | Dashboard | Return; show updated counts and revenue | "The dashboard reflects the real database, not a mock-up." |
| 1:20–1:28 | AI status | Show mode, model, voice, key-present boolean, live-test gate | "The key never reaches the browser. Live calls need two explicit switches, so a demo cannot burn credits by accident." |
| 1:28–1:35 | Close | README or repo | "Mock-verified end to end. Live Gnani integration is implemented and gated, and the next step is a real smoke test — documented honestly in the repo." |

## Narration tips

- Never call the mock transcript "Gnani output". Say "labelled mock transcript".
- Never claim live transcription or live Telugu audio in this recording.
- Do not show the `.env` file or any terminal output containing a key.
- If something fails, cut and re-record; do not narrate around a broken flow.

## Fallbacks

- **Mic blocked:** use the prepared WAV upload instead of recording.
- **No audio device:** the flow still works via upload; say "audio is validated server-side as WAV".
- **Slow first request:** the free-tier API may cold-start; trim the pause in editing.

## 30-second version

Dashboard → record a Telugu complaint → labelled transcript → matched services and server-side total → approve → `GS-` job card → mock tone labelled → status change → dashboard updated. Close with: "AI transcribes and speaks; the mechanic prices and approves."

## What to send with the video

- Repository link.
- `submission/screenshots/` (7 images).
- Test evidence: 27 server + 4 client tests, typecheck, production build.
- One line on status: "Mock-verified end to end; live Gnani paths implemented but not yet verified."
