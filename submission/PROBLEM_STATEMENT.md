# Problem Statement

## The setting

India has hundreds of thousands of small two-wheeler workshops. Most are one to three people, run from a roadside shed, and serve customers who speak Telugu, Tamil, Hindi, or a mix of the local language and English. The two-wheeler is often the household's only vehicle, so a missed brake complaint or a disputed bill is not a small inconvenience.

## The problems, concretely

1. **Complaints are captured verbally and lost.** The mechanic hears "brake sound vastundi, oil kuda marchali" and writes three words on a paper card — or nothing. The next visit starts from zero.
2. **Estimates are verbal and negotiable after the fact.** The customer is told a number at drop-off and a different number at pickup. There is no record of what was approved.
3. **Software assumes typing, English, and a desk.** Garage management tools want VINs, typed customer records, and a monthly subscription. A mechanic with greasy hands and a phone does not use them.
4. **Owners cannot see the business.** No reliable count of jobs, no approved revenue, no view of which services actually sell.
5. **Customers are not told what is happening.** "Call me tomorrow" is the entire status system.

## Who feels it

- **Mechanic:** re-explains every job, forgets details, absorbs blame for unclear estimates.
- **Owner:** no numbers to plan with; no proof of what was promised.
- **Customer:** uncertain price, uncertain status, no record to point to.

## Why voice, and why Telugu first

The mechanic's hands are busy and their literacy in English is limited. Speaking is the interface they already use all day. Telugu-first with Telugu-English code-mixing matches how workshops actually talk ("brake check cheyandi, oil change kuda"). An English-only keyboard-first tool asks them to change their behaviour before it delivers any value.

## What a good solution must do

- Accept a short spoken complaint without special hardware.
- Transcribe Telugu and code-mixed speech faithfully enough to be corrected by the mechanic.
- Turn the transcript into structured fields the garage can act on — without inventing services or prices.
- Price only from the garage's own catalogue, in a currency-safe representation, on the server.
- Require a human approval step before anything is committed.
- Confirm the agreed amount back to the customer in Telugu.
- Keep the whole thing usable on a mid-range phone, with mock mode so it can be demonstrated and tested without burning API credits.

## Scope for this challenge

In: voice intake, transcription, deterministic extraction, catalogue pricing, approval, job cards, status lifecycle, Telugu confirmation, dashboard.

Out: payments, SMS/WhatsApp delivery, multi-tenant auth, inventory, payroll, automated diagnosis, permanent audio storage.

## What "solved" looks like

A mechanic speaks for fifteen seconds and ends up with a job card the customer has heard and approved, in under a minute, without typing a sentence in English.
