# Vidyamitra — Seva Innovation Challenge 2026 pitch deck (AI brief)

**Use this file as the single source of truth for the deck.** Build exactly **6 slides**, in this order, matching the Seva Innovation Challenge 2026 reference template. Replace every `[bracketed]` placeholder with real content before export; if you do not have a real value, leave the placeholder visibly and do not invent a number.

---

## Global rules

- Output: a 6-slide deck (PowerPoint `.pptx` preferred; PDF acceptable only if the tool must flatten).
- Slide size: 16:9 widescreen (10 in × 7.5 in is fine; if target is 4:3, scale content down — but prefer 16:9).
- Tone: calm, honest, school-friendly. No hype, no made-up statistics.
- Sources: where the slide mentions evidence, the only named sources here are **NCERT school-learning / school-health guidance** and **Tele-MANAS 14416 (free, 24×7 government mental-health helpline)**. Do not fabricate other citations. If you want a specific NFHS/NCERT figure, the user must supply it — do not guess.
- Keep the bracketed guidance notes the template uses (e.g. "Focus on the root cause, not just the symptom") as small footer guidance, not as slide body.
- Leave clear empty space: Slide 3 needs room for a **prototype screenshot/photo**; Slide 6 needs room for **team photos**.
- All `[__]`, `[Your name]`, `[photo]` etc. in this file are intentional placeholders — keep them obvious so the human can fill them.

---

## Slide 1 — Title

- Eyebrow / header line: `Seva Innovation Challenge 2026  ·  Reference Pitch Deck`
- Headline (large): **Vidyamitra**
- One-liner (bold): `A calm study companion for Classes 5–10 (CBSE & Maharashtra State Board)`
- Sub-line (regular): `that pairs Maths & Science practice with daily mental-health check-ins, an adaptive plan that lightens on heavy days, an AI study companion, an anonymous peer space, and a counsellor console for the cases that need a human.`
- Footer meta (to fill):
  - `Built by:  [Your name]`
  - `Contact:  [your email / mobile]`
- Slide footer guidance: `Seva Innovation Challenge 2026  |  Replace all bracketed text with your own content.`

---

## Slide 2 — The Problem

Header: **What real challenge are we solving?**

### Left block — "The Problem"
- Indian middle-school students carry two pressures at once: rising academic load in Maths and Science, and unspoken stress that rarely gets noticed until it becomes a crisis.
- Schools track marks but rarely track **how a student is actually doing day to day.**
- Teachers and parents see the scores, **not the stress.**
- Where counsellors exist at all, **they get involved only after something has already gone wrong.**
- Closing line (italic): "In most schools, a student's mental state is invisible until it is too late — there is no daily, low-effort signal."

### Right block — "Who is affected, and where?"
- Students of Classes 5–10 in CBSE and Maharashtra State Board schools — in classrooms, tuition, and at home.
- Teachers, parents and counsellors across those schools.

### Right block — "Evidence (use your own numbers if you have them)"
- Rising anxiety and exam stress among school students have been flagged in NCERT school-learning and school-health guidance.
- Tele-MANAS 14416 is the government's free 24×7 mental-health helpline — a sign that student and youth distress is now a recognised, high-volume need.
- `[__] students affected every year in the target area  (fill with your own estimate / survey, sample size and date)`

### Right block — "Why it matters:" (lead line, red/rose accent)
- "when academic stress goes unseen, it shows up later as burnout, dropping performance, absenteeism, and — in serious cases — a crisis a school is forced to respond to with far less time and far more cost."

Slide footer guidance: `Focus on the root cause, not just the symptom. Add photos of field visits or your prototype wherever possible.`

---

## Slide 3 — Our Solution & Innovation

Header: **What have we built, how does it work, and what is new?**

### "Our solution in brief" block
- Vidyamitra is a calm study companion for Classes 5–10 that pairs real Maths & Science practice with mental-health awareness in one place. Every day a student checks in with their mood, and the system adapts: on heavy days it lightens the plan, on good days it keeps going.
- It has a full syllabus with live mastery bars, AI practice quizzes, AI revision sheets and timed test papers, an AI study companion ('Mitra') for doubts and feelings, an anonymous peer feed, a box-breathing and gratitude 'Mind Gym', and a counsellor console that quietly receives the cases that need a human.

Leave a clear empty panel/box labelled **[ add prototype screenshot ]** for the photo the template asks for.

### "How it works" — 3 numbered panels
1. **Input** — A student signs in, does one daily mood check-in, and works through today's plan of Maths/Science questions, revision sheets or timed tests.
2. **Process** — Mood + stress data shape the adaptive plan; a rule quietly flags sustained low mood; the counsellor console receives flagged cases; the AI features answer in plain language.
3. **Output** — The student gets a plan that fits how they really feel that day, picks up mastery on weak topics, and — when needed — is connected to a counsellor instead of falling through the cracks.

Slide footer guidance: `Add a photo, sketch or screenshot of the prototype on the right of the text if available.`

---

## Slide 4 — Feasibility & Implementation

Header: **How ready is the solution, and what will it take to put it on the ground?**

Badges / callouts:
- **CURRENT STAGE: Working Prototype** (prominent)
- Follow-up line: "Built and compiling — all flows are live: today/dashboard, learn, practice, exam, check-in, Mitra, community, games, progress, badges and the counsellor console."

### Left column — Technology
- Web app on Next.js (React), runs locally at http://localhost:3000.
- Student sign-in via Supabase — every data read/write goes through server route handlers that re-verify the session, so tables are never exposed to the browser.
- 10 tables — students, subjects, topics, content links, questions, attempts, mastery scores, stress logs, check-ins, escalations.
- AI features use Groq server-side only — the key never leaves the server; quiz/revision/Mitra degrade gracefully with a friendly message when it is missing.

### Left column — Estimated cost
- Very low — it is software. Cost per student is essentially the running cost of the app plus the AI calls for the features a student actually uses. For one school pilot, the main cost is setup time and a small server/AI bill — no per-student hardware.

### Right column — Timeline
- **3 months** — pilot in one school: onboard a small group, run daily check-ins and adaptive practice, and have the counsellor console receive the first real flagged cases.
- **6 months** — refine from pilot feedback; stabilise the syllabus for both boards; add a real persistent peer store; begin teacher/parent visibility views.
- **12 months** — roll out to more schools/classes; formalise the counsellor workflow with the school; add whatever certification or IP makes sense.

### Right column — Partners
- A willing school (or a block/district education office) to pilot; a designated counsellor or school counsellor to man the console; ideally a faculty mentor and, later, a CSR or education department to take it further.

Slide footer guidance: `Show how it is affordable. Mark where you are today; list milestones for 3, 6 and 12 months.`

---

## Slide 5 — Impact & Scalability

Header: **What change will this create, and how can it grow?**

### KPI tiles (three, clearly marked as fill-ins)
- `[__]` — Beneficiaries reached in first year (fill with your pilot number)
- `[__%]` — Saving in cost / time vs current practice (use a real number only if you have one)
- `[__]` — Jobs or livelihoods created or supported (fill only if you can)

### Social impact
- **Quality of life & safety:** students get a calm daily space and a 14-day mood history; sustained low mood is quietly seen, not ignored.
- **Inclusion:** works for both CBSE and Maharashtra State Board, Classes 5–10; anonymous peer space is low-barrier; the crisis line Tele-MANAS 14416 (free, 24×7) is always visible.
- **Honest scope:** it is explicitly not a medical service — it is a school-facing early-signal and study companion.

### Sustainability
- Software-led, very low marginal cost per student. Long-term it can run on a school's own budget, a department budget, or CSR support; AI features are used selectively so cost stays tied to actual use.

### Scale-up plan
- Replicate to other schools/districts by onboarding per school with its counsellor and access code.
- Syllabus already covers both boards and Classes 5–10, so the content lift is mainly per-board/per-class additions, not a rebuild. Need: pilot feedback, a partner school/department, light incubation support.

Slide footer guidance: `Be specific about beneficiaries, savings and jobs — use real numbers where you have them.`

---

## Slide 6 — Team / Individual & Support Required

Header: **Who is behind the idea — and what help do we need?**

### The team (three rows — fill each)
For each row, include a `[photo]` placeholder box plus:
- `[Your Name 1]` — `[Role in team — e.g. Founder / Builder]` — `[Qualification / expertise]`
- `[Name 2]` — `[Role in team]` — `[Qualification / expertise]`
- `[Name 3]` — `[Role in team]` — `[Qualification / expertise]`

Mentor line: `Mentor / faculty guide, if any:  [Name, designation]`

### Support we are seeking
- Mentorship & technical guidance
- Pilot with a government department / school
- Funding / grant support
- Incubation & workspace
- Testing, certification or IP support

### One-line close (the template's "in one line" requirement)
- "How the Challenge support will take this to the next stage: With mentorship, a school pilot and incubation, Vidyamitra moves from a working prototype in one school to a tested, low-cost early-signal and study companion that a department or CSR can adopt across more schools and classes."

### Thank-you strip
- `Thank you  ·  [your contact email / mobile]`

Slide footer guidance: `Replace bracketed team details with real names, roles and qualifications. Add photos where possible.`

---

## Facts about the project (for accuracy, not for copy-pasting as marketing claims)

- The app is a web app built on **Next.js (React)**, student sign-in via **Supabase**, and data goes through **server route handlers that re-verify the session** so the database is never exposed to the browser.
- There are **10 tables**: students, subjects, topics, content_links, questions, attempts, mastery_scores, stress_logs, checkins, escalations.
- AI features are **Groq server-side only**; the key lives in `.env.local` and never reaches the browser. Quiz, revision and Mitra give a friendly fallback message when the key is missing.
- The app covers **Classes 5–10, both CBSE and Maharashtra State Board**.
- Key student-facing surfaces: Today/dashboard, Learn (full syllabus with mastery bars + AI quizzes), Practice (adaptive questions), Exam (AI revision sheets + timed tests), Check-in (one mood a day + 14-day history), Mitra (AI companion), Unburden/community (anonymous peer feed), Mind Gym (box breathing + gratitude), Progress, Badges.
- The staff side is the **Counsellor console**: flagged cases from check-ins/peer posts/Mitra safety screen, with open → reviewed → closed workflow; class stress trend; by-class summary. New counsellors activate with a school access code (`COUNSELLOR_ACCESS_CODE`).
- Not a medical service. In crisis, **Tele-MANAS 14416** (free, 24×7) is always shown.
- Current stage: **Working Prototype** — the build compiles and all routes are present. Not yet rolled out in a school.

---

## Placeholders the human must fill before submission

- `Built by:  [Your name]`
- `Contact:  [your email / mobile]`
- Slide 2 evidence: `[__] students affected every year in the target area  (fill with your own estimate / survey, sample size and date)`
- Slide 5 KPIs: `[__]` beneficiaries, `[__%]` saving, `[__]` jobs/livelihoods
- Slide 6 team: `[Your Name 1]`, `[Name 2]`, `[Name 3]`, each role and qualification, plus the mentor line
- Slide 3: add the prototype screenshot/photo in the reserved space
- Slide 6: add team photos in the reserved spaces

Do not auto-fill any of the above with invented values. Where the user has not supplied a real value, keep the placeholder visible.
