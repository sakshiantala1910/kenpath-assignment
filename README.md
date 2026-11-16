# आय प्रमाण पत्र — कार्य डेस्क (Income Certificate Work Desk)

A Hindi-first workflow tool for the revenue officers who process **income certificate** (आय प्रमाण पत्र) applications in a Uttar Pradesh tehsil: the **Lekhpal**, who checks documents and verifies on the ground, and the **Tehsildar**, who decides. AI helps at every step, and the officer always makes the final call.

- **Live demo:** _add link after deploying_
- **Demo logins:** Lekhpal `lekhpal` / `Lekhpal@2026` · Tehsildar `tehsildar` / `Tehsildar@2026` (the login page also has one-tap demo buttons)
- **Language:** Hindi by default, with an English toggle in the header

---

## 1. The problem and who it affects

An income certificate is one of the most requested documents at a tehsil. Families need it for post-matric scholarships, EWS reservation, old-age and widow pensions, school and college admission, fee waivers and many state schemes. Most applicants are poor households, and each application usually has its own deadline (a scholarship portal closes, an admission window ends).

**How it works on the ground** (modelled on the UP e-District flow as commonly practised; details vary by district):

1. The applicant applies at a Jan Seva Kendra (CSC) with Aadhaar, a ration card or family register copy, a signed self-declaration of family income, and proof for each income source (a salary slip for salaried work, a khatauni land record for farm land).
2. The **Lekhpal** of that village's halqa scrutinises the documents.
3. The Lekhpal visits the village, asks neighbours, looks at land and assets, and writes an **आख्या** (field report) with the verified annual family income. In many tehsils this goes through a Revenue Inspector (राजस्व निरीक्षक) before the Tehsildar. This app folds that check into the Tehsildar step to keep the flow small.
4. The **Tehsildar** approves (the certificate states the *verified* income), rejects, or sends it back.

Public-service guarantee laws (in UP, the Janhit Guarantee Adhiniyam) set a time limit for this service. The app uses **15 days**; this is one constant per application (`slaDays`) and should be checked against the currently notified limit.

**Where it goes wrong today:**

- **The Lekhpal is the bottleneck.** One Lekhpal covers several villages and also handles land records, disaster relief, election duty and more. Files pile up with no clear sense of which one is about to breach its deadline or block a student's scholarship.
- **Paperwork is checked by eye.** Name spelling differences across Hindi and English documents, income sources that don't add up, or a salary slip that contradicts the declared income are easy to miss on a busy day, and are caught late or not at all.
- **The aakhya takes time to write.** Field notes are scribbled in Hinglish on paper, then typed up formally in Hindi at the office. That delay is often the longest step.
- **Applicants get vague rejections.** "दस्तावेज़ अपूर्ण" (documents incomplete) without saying which one, which leads to repeated trips to the CSC.
- **The Tehsildar signs in bulk** with little time per file, so risky files (where the verified income is very different from the declared one) get the same attention as clean ones.

## 2. What the application does

### Work queue (dashboard)
- Shows only what is **waiting on the signed-in officer**, ranked by urgency: **the earlier of** the service deadline and the applicant's own deadline (e.g. a scholarship closing date).
- Each file shows plain-language reasons why it is near the top: "समय-सीमा 3 दिन पार", "छात्रवृत्ति — 3 दिन में अंतिम तिथि", "1 दस्तावेज़ कम", "सत्यापित आय घोषित से भिन्न".
- Tiles at the top: pending with me, past deadline, due in 3 days, pending with applicant. There are tabs for all files, returned, and closed, plus search.

### The workflow (3 steps + outcomes)

```
 Jan Seva Kendra
      │ submitted
      ▼
 ┌────────────────┐  return (reason)   ┌───────────────┐
 │ 1. दस्तावेज़ जाँच │ ─────────────────▶ │ आवेदक के पास  │ ── resubmits ──┐
 │    Lekhpal      │                    │  (returned)   │                │
 └────────────────┘ ◀──────────────────────────────────────────────────┘
      │ forward (all required docs ticked)        reject ──▶ अस्वीकृत
      ▼
 ┌────────────────┐  return (reason) ──▶ आवेदक के पास
 │ 2. स्थलीय सत्यापन │
 │    Lekhpal      │ ◀──────────── return for re-verification ─┐
 └────────────────┘                                            │
      │ aakhya + verified income                               │
      ▼                                                        │
 ┌────────────────┐ ───────────────────────────────────────────┘
 │ 3. निर्णय        │ ── approve ──▶ स्वीकृत (certificate at verified income)
 │    Tehsildar    │ ── reject  ──▶ अस्वीकृत (reason required)
 └────────────────┘
```

| Step | Who | What the officer does | Guard rails |
|---|---|---|---|
| 1. Document check | Lekhpal | Opens each document, ticks the ones in order, adds remarks. Then **forwards**, **returns to applicant** with a reason, or **rejects**. | Cannot forward until every *required* document is ticked. Return/reject need a written reason. Required documents depend on the declared income sources. |
| 2. Field verification | Lekhpal | Types or **dictates** (Hindi voice input) field notes, writes the aakhya, and enters the **verified annual income**. Then forwards to the Tehsildar or returns to the applicant. | Report and verified income are mandatory to forward. |
| 3. Decision | Tehsildar | Reads declared vs verified income (gap highlighted) and the aakhya. **Approves** (a certificate is generated), **rejects**, or **returns to the Lekhpal** for re-verification. | Reject/return need a reason. Every action asks for confirmation. |

Role checks run **on the server** for every action: a Lekhpal cannot decide, a Tehsildar cannot do the Lekhpal's steps, and a file can only move from the step it is in.

### History
Each file has a timeline of every transition: who, when, the remark, and **how AI was used** for that action (accepted as is / edited / overridden / not used). This is the audit trail a Tehsildar or an appeal officer would want, and it feeds the impact numbers below.

### Also included
- A printable certificate preview (marked DEMO) for approved files.
- A demo button that simulates an applicant resubmitting a returned file, so the whole loop can be tested.
- An **Impact** page computed from the event log (see section 4).

## 3. Where AI helps, and why there

The rule was **AI only where it saves the officer real time or catches something a tired human misses, never as the decision-maker.** Each AI step is a button the officer chooses to press. It returns a suggestion and a draft, and nothing is saved until the officer acts.

| Step | AI assistance | Why it helps | What stays deterministic |
|---|---|---|---|
| 1. Document check | **Cross-checks the documents against each other:** names across scripts (सीता देवी = Seeta Devi is fine, a different name is not), relation and village, whether the sources add up, and whether income proof contradicts the declaration (e.g. a salary slip showing ₹26,000/month against a declared ₹1.2 lakh/year). It suggests forward, return or reject and **drafts the SMS to the applicant** that says exactly what to fix. | Cross-reading 4–5 OCR'd documents is slow and error-prone. Specific return reasons cut repeat trips. | Required-document list, the sum check and the "can't forward until ticked" rule are plain code (`src/lib/rules.ts`) and always run, with or without AI. |
| 2. Field verification | **Turns rough Hinglish or dictated notes into a formal Hindi aakhya**, breaks down income by source **with the arithmetic** (₹200/day × 240 days = ₹48,000), flags discrepancies with the declaration, and lists **what to still ask on site**. | Writing the aakhya is the slowest part of the Lekhpal's day. Showing the arithmetic makes the estimate checkable. | The officer must type the verified income; the AI figure is only pre-filled when they choose "use this draft". |
| 3. Decision | **Summarises the file** for the Tehsildar: declared vs verified, consistency checks, risks, a recommendation with reasoning, and a **draft order**. | It lets the Tehsildar spend attention on risky files instead of reading every one in full. It also reminds them that an income gap means certifying the verified figure, not rejecting. | The decision buttons, confirmation and mandatory reason. |

**Design choices around AI:**
- **Advisory and visible.** Every AI panel says "AI केवल सुझाव देता है। अंतिम निर्णय आपका है।" (AI only suggests; the decision is yours), and the source documents are always one tap away.
- **Grounded.** The prompt tells the model to use only the documents and notes, cite which document a point comes from, and say what to check rather than guess. Outputs are **structured JSON** (Claude structured outputs with a Zod schema), so the UI never parses free text.
- **Graceful without AI.** If there is no API key, or the call fails or is refused, each step falls back to rule-based suggestions, clearly labelled. The workflow never blocks on AI.
- **Measured.** Each action records whether the officer accepted, edited, overrode or ignored the AI suggestion (`ai_use` in the event log).
- **Low effort for speed.** These are short, bounded tasks, so the model runs at low effort to keep responses quick on a field connection.

## 4. Measuring impact

The tool logs every transition with timestamps, so the core numbers come from **its own event log** with no extra data collection. The **Impact** page already computes them:

| Metric | Why it matters | Source |
|---|---|---|
| **Average days from submission to decision**, and **average days per step** | The citizen's real wait, and which step is the bottleneck | events |
| **% closed within the service deadline** | The legal service guarantee | events + `slaDays` |
| **% of files returned to the applicant**, and resubmission rounds | Each return is another trip to the CSC; a good document check should reduce *repeat* returns | events |
| **AI acceptance:** accepted / edited / overridden / ignored | Whether the AI is actually useful. Many overrides on one step means that prompt or rule needs work | `ai_use` per action |

**How I would run the evaluation:**
1. **Baseline.** Take 2–3 months of e-District MIS data for the pilot tehsil(s): turnaround, deadline breaches, return rate.
2. **Pilot.** Give the tool to half the Lekhpal halqas in one tehsil and compare against the other half over the same period (same season, same Tehsildar), so a scholarship rush affects both groups equally.
3. **Quality, not just speed.** Each month, have the Tehsildar or SDM re-check a random sample of approved files: was the certified income right? Also track appeals and complaints. A faster process that certifies wrong incomes is a failure.
4. **Officer feedback.** Measure time-on-task per file (from opening a file to acting on it; this needs a small "file opened" event added to the log). Hold short monthly conversations with Lekhpals about which AI panels they skip and why.

**Why I think it will work:** the biggest delays are in steps that are mostly *reading and writing*: cross-checking papers and typing up the aakhya. Language models are good at exactly that, especially across Hindi, English and Hinglish. The *judgement* (is this family's income really ₹1.4 lakh?) stays with the person who visited the village. Ranking by the applicant's own deadline targets the cases where delay does the most harm (a missed scholarship), rather than first-in-first-out.

**Targets I would set for a pilot:** median turnaround down by a third, deadline breaches halved, repeat returns (second return of the same file) down by half, and AI drafts used (accepted or edited) in over 60% of field reports. If the edit and override rates stay high, the prompts need work before scaling.

## 5. Main technical decisions

| Decision | Why |
|---|---|
| **Next.js 16 (App Router) + TypeScript**, server components and server actions | One deployable unit. Pages render on the server (fast on low-end phones, little JS). Mutations are server actions that **re-check the session and role** before changing anything. |
| **Claude (`claude-opus-5-5`) via the official Anthropic SDK**, structured outputs (`betaZodOutputFormat`), low effort, server-side refusal fallback | Strong Hindi and Hinglish handling. Schema-validated JSON keeps the UI simple and safe. Low effort keeps latency reasonable. The API key stays on the server. |
| **Deterministic rules alongside AI** (`src/lib/rules.ts`) | Things that must always be true (required documents, sums, deadlines, priority) shouldn't depend on a model. AI adds judgement on top. |
| **libSQL / SQLite** (`@libsql/client`) | Zero-setup locally (a file DB created and seeded on first request). The same client points at Turso for a persistent hosted DB with one env var. |
| **Application stored as a JSON document + an append-only `events` table** | The application form is a document. Stage and dates are real columns for sorting. History is never rewritten: each transition writes the new state **and** its event in one batch. In production the application would be normalised into proper tables. |
| **Stateless signed-cookie sessions** (`jose`, httpOnly, 12h) + bcrypt passwords | Simple and secure enough for two roles. Real deployment would use the state's SSO (e.g. e-District login). |
| **Hindi-first i18n** with a typed dictionary (`src/lib/i18n.ts`) | Every UI string exists in both languages. TypeScript fails the build if a Hindi key is missing in English. Official texts (aakhya, orders, SMS to applicants) are always Hindi. |
| **Mobile-first, high-contrast light UI**, Noto Sans Devanagari, 44px touch targets, browser **Hindi voice dictation** (`hi-IN` Web Speech API) | Lekhpals work on phones, outdoors, often typing in Hinglish. Dictation is offered when the browser supports it and hidden otherwise. |

### Code map
```
src/
  app/
    actions.ts                 server actions: login, AI calls, step transitions (role-checked)
    page.tsx                   work queue / dashboard
    applications/[id]/         file view, stepper, history
      DocCheckPanel.tsx        step 1 UI
      FieldPanel.tsx           step 2 UI (+ voice dictation)
      DecisionPanel.tsx        step 3 UI
      AiCard.tsx               shared AI panel + hook
      certificate/             printable certificate
    impact/page.tsx            impact metrics
  lib/
    ai.ts                      prompts, schemas, Claude calls, rule-based fallbacks
    rules.ts                   required documents, checks, priority ranking
    metrics.ts                 impact metrics from the event log
    repo.ts / db.ts / seed.ts  data access, schema, demo data
    i18n.ts                    Hindi + English dictionary
    auth.ts                    session cookie
```

## 6. Running locally

Requires Node.js 20.9+ (tested on 22).

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY to enable AI (optional)
npm run dev
```

Open http://localhost:3000 and log in with the demo accounts above. The SQLite database is created and filled with demo data in `./data/app.db` on the first request. To start fresh:

```bash
npm run reset-db
```

Other scripts: `npm run build && npm start` (production), `npm run lint`, `npm run typecheck`.

**A good demo path** (the AI findings below need `ANTHROPIC_API_KEY`; without it you see the rule-based suggestions):
1. As **Lekhpal**, open *मोहम्मद आरिफ़* (overdue). Run the AI document check and see it catch the salary slip contradicting the declared income.
2. Open *पूजा कुमारी*. Missing documents are flagged. Use the AI-drafted message to return the file to the applicant.
3. Open *राजेश सिंह* (step 2). Type or dictate notes, for example `0.5 hectare kheti, gehu dhan, saal me 40 hazar, beta alag rehta hai`. Draft the aakhya with AI, edit it, and send it.
4. Log in as **Tehsildar**. Open *शबनम बानो* (declared ₹50,000, verified ₹1,40,000). Ask AI for the summary, then approve and view the certificate.
5. Check **Impact** and the file history to see how each AI suggestion was used.

## 7. Deployment

`render.yaml` deploys this as a Node web service on Render (set `ANTHROPIC_API_KEY` in the dashboard). With the default file database, data resets to the demo seed whenever the instance restarts, which suits a review demo. For persistent data, set `DATABASE_URL`/`DATABASE_AUTH_TOKEN` to a Turso database. Any Node host works (`npm run build && npm start`).

## 8. Limitations and next steps

- Documents are represented by their **extracted text**. The real e-District uploads are scans. Next step: send the scan images to Claude's vision input to extract and check them directly, keeping the same schema.
- The Revenue Inspector step is folded into the Tehsildar's. Adding it is one more stage plus an owner role.
- No offline mode yet. Field verification in low-connectivity villages would benefit from saving notes offline (PWA) and syncing later.
- The deadline is counted in calendar days from the first submission and does not reset on resubmission. The exact rule should follow the notified service guarantee.
- SMS to the applicant is drafted, not sent. Integration would go through the state's SMS gateway.
