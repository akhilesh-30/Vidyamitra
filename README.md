# Vidyamitra

A calm study companion for **Classes 5–10 (CBSE & Maharashtra State Board)** that pairs
Maths & Science practice with mental-health awareness: daily mood check-ins, an adaptive
plan that lightens on heavy days, an AI study companion, an anonymous peer space, and a
counsellor console for the cases that need a human.

## Features

| Area | What it does |
| --- | --- |
| Today (`/dashboard`) | Mood check-in, streak, 7-day accuracy, weakest topics, and a daily plan shaped by mood + stress |
| Learn (`/learn`) | Full syllabus (Classes 5–10, both boards) with live mastery bars, chapter videos, and AI practice quizzes |
| Practice (`/practice`) | Adaptive question session — difficulty fit, spaced review, mastery updated on every answer |
| Exam (`/exam`) | AI revision sheets (points, formulas, mnemonics) and timed chapter test papers |
| Mood (`/checkin`) | One check-in a day + a two-week visual history |
| Lily Ai (`/mitra`) | Streaming AI companion for doubts and feelings, with a safety screen |
| Unburden (`/community`) | Anonymous peer feed with stable masks; distress quietly reaches a counsellor |
| Mind Gym (`/games`) | Box breathing and a daily gratitude note |
| Progress (`/progress`) | Mastery by subject, stress history, today's adaptive plan |
| Badges (`/badges`) | Effort-based badges — no leaderboard |
| Counsellors (`/counsellor`) | Flagged cases, class stress trends, case workflow (open → reviewed → closed) |

## Run it

**Windows shortcuts:** double-click `start-vidyamitra.bat` to run the app, and
`stop-vidyamitra.bat` to stop it and free the port.

The starter checks for Node, installs dependencies on first run, frees anything
still holding port 3000, pins `next dev` to that port, and only opens the browser
once the server actually answers — so <http://localhost:3000> always matches the
running server instead of showing "refused to connect".

Manually:

```bash
npm install
npm run dev        # next dev on port 3000 + opens the browser when ready
npm run dev:plain  # next dev only (no port pinning, no auto-open)
npm run stop       # stop the server and free the port
```

Health checks:

```bash
npm run check:env   # are the env values set, and does Supabase answer?
npm run smoke       # end-to-end: signup -> onboarding -> every API -> cleanup
```

Both read `.env.local` directly and never print key values. `smoke` needs the dev
server running (`npm run dev:plain` in another terminal) and cleans up the
throwaway account it creates; if one is ever left behind, remove it with
`node scripts/cleanup-smoke.mjs`.

### If the browser says "refused to connect"

Something else was already on port 3000, so `next dev` moved to a random port.
Run `stop-vidyamitra.bat` (or `npm run stop`) and start again — the launcher now
frees the port and pins the server to 3000, so the address always matches.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`,
`npm test`, `npm run seed`, `npm run seed:clear`, `npm run recompute`.

## Environment (`.env.local`)

```ini
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
COUNSELLOR_ACCESS_CODE=...   # optional: enables /counsellor activation
```

The Supabase anon key is used only for auth in the browser. Every data read/write goes
through server route handlers that re-verify the session with the service-role key, so
tables are never exposed to the client. The Groq key stays server-side too.

## Data

`supabase/schema.sql` is the canonical schema (10 tables, no extras). `supabase/hardening.sql`
contains the RLS hardening. The syllabus itself lives in code under `lib/curriculum/` and is
synced lazily into `subjects`/`topics` the first time a student opens Learn, Practice or
Progress — so a fresh database works without seeding.

`lib/store/community.ts` keeps the anonymous feed in `.data/community.json` (git-ignored).

## Making a counsellor

1. Sign up normally, then open `/counsellor`.
2. Enter the school access code (`COUNSELLOR_ACCESS_CODE`) and the school name.
3. The server sets `app_metadata.role = "counsellor"` — students cannot self-promote.

## Notes

- Not a medical service. In crisis, Tele-MANAS **14416** (free, 24×7) is always shown.
- AI features degrade gracefully: quiz/revision endpoints return a friendly message when
  `GROQ_API_KEY` is missing, and Lily Ai still replies with safety guidance.
