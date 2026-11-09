# LinkedIn Post (draft)

> Replace `[repo link]` and `[video link]` before publishing. Do not add a live/deployment claim until either is true.

---

A mechanic in a two-wheeler workshop does not want to type an English form. He wants to say:

"Ravi Kumar Honda Activa, brake sound vastundi, oil kuda marchali."

That is the sentence I built around.

**GarageSathi** — my submission for the Great Indian AI Internship Challenge 2026 (Real Deal Award) — turns a spoken Telugu/Telugu-English complaint into an approved job card and a Telugu confirmation.

How it works:

🎙 The mechanic records up to 30 seconds. The browser encodes 16-bit WAV in-page, so there is no ffmpeg dependency.
🗣 **Gnani Prisma v3.0** transcribes Telugu + Indian English, biased with two-wheeler keyterms.
🧩 Extraction and catalogue matching are **deterministic** — vehicle, complaint, services, and anything unmatched is flagged, not invented.
💰 Prices come only from the garage's catalogue, in integer paise, recomputed on the server. The client cannot send a price.
✅ A job is saved only after the mechanic approves it. The AI never approves.
🔊 **Gnani Timbre v2.5** (voice Varuni) reads the agreed amount in Telugu. The amount is converted to Telugu number words, not digits.
📊 Dashboard, job lifecycle, search, price editing, and an AI status page with a two-layer live-call gate.

Two decisions I would defend in any review:

1. **The model does not touch money or approval.** It is excellent at speech; it is not accountable for a bill.
2. **Mock-first, and mock is labelled.** The whole workflow runs and is tested with zero credits. Mock transcripts and mock audio are marked as such on screen.

Where it honestly stands:

✅ Mock workflow verified end to end in a browser, including mobile
✅ 27 backend + 4 frontend tests, typecheck, production build
✅ One live smoke test passed: Prisma returned the right transcript, Timbre returned real 48 kHz audio
⚠️ Telugu transcription accuracy and the full live UI flow are still unverified — I tested the API with an English clip, so I am not claiming more than that
⚠️ Not deployed yet; the deployment guide is in the repo

Everything — architecture, API contracts, decisions, test log, demo script — is documented in the repo. The next commit is a real Gnani smoke test, then a public URL.

Repo: [repo link]
Demo: [video link]

#GarageSathi #Gnani #SpeechAI #Telugu #VoiceAI #BuildInPublic #GreatIndianAIInternship
