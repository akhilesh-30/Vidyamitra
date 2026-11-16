# Contributing to Vidyamitra

Vidyamitra is a Next.js (App Router) + TypeScript app backed by Supabase, with Groq for
the AI features. This guide is the short version of how we work: never commit to `main`,
open a PR for everything, and let CI tell you whether it is safe to merge.

---

## 1. Setup

Requirements: **Node.js 20.9+** (22 LTS recommended) and **npm**.

```bash
git clone https://github.com/akhilesh-30/Vidyamitra.git
cd Vidyamitra
npm install
```

Create `.env.local` in the project root (it is git-ignored — never commit it):

```ini
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...              # optional: AI quiz/exam/Lily Ai degrade gracefully without it
COUNSELLOR_ACCESS_CODE=...    # optional: enables /counsellor activation
```

Ask a maintainer for the values — they are not pasted into chat, issues or PRs.

Run the app:

```bash
npm run dev          # port 3000, opens the browser once the server answers
npm run dev:plain    # next dev only
npm run stop         # stop the server and free port 3000
```

On Windows, `start-vidyamitra.bat` / `stop-vidyamitra.bat` do the same.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests in `tests/` (`node:test` via `tsx`) |
| `npm run build` | Production build |
| `npm run check:env` | Are env values set, and does Supabase answer? |
| `npm run smoke` | End-to-end: signup → onboarding → every API → cleanup (needs the dev server running) |

`check:env` and `smoke` read `.env.local` directly and never print key values.

---

## 2. Branching

`main` is always deployable. All work happens on a short-lived branch:

```bash
git switch main
git pull origin main
git switch -c feat/practice-hints        # then work here
```

Naming:

| Prefix | Use for | Example |
| --- | --- | --- |
| `feat/` | new feature or page | `feat/study-timer` |
| `fix/` | bug fix | `fix/mitra-stream-parsing` |
| `chore/` | tooling, deps, config | `chore/bump-next` |
| `docs/` | docs only | `docs/setup-notes` |
| `style/` | visual/CSS polish, no logic change | `style/hero-spacing` |

Keep one branch to one concern. If you notice an unrelated problem, fix it on its own
branch instead of growing the current PR.

---

## 3. Committing

Commit small and often — a commit should be one idea that could be reverted on its own.

```bash
git add app/(student)/practice/page.tsx
git commit -m "fix(practice): keep the chosen option after a refetch"
```

Message format: `type(scope): short imperative summary` (`feat`, `fix`, `chore`, `docs`,
`style`, `test`, `refactor`). Keep the subject under ~72 characters; use the body for
*why*, not *what*.

Before each commit, at minimum:

```bash
npm run typecheck
```

Before opening a PR, run the full local check suite:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Do **not** commit:

- `.env*` files or any key/token
- `node_modules/`, `.next/`, `.data/`, build output
- editor/OS clutter, scratch files, `.state*.txt`, logs

`.gitignore` already covers these; `git status` should never show them.

---

## 4. Pull requests

**Nobody pushes to `main` directly.** Push your branch and open a PR:

```bash
git push -u origin feat/practice-hints
```

Then open the PR against `main` on GitHub. The PR template asks for a description,
the changes made, and the testing you actually did — fill all three, check the boxes
you really ran.

A PR is ready to merge when:

1. `.github/workflows/ci.yml` is green — lint, typecheck, tests, build
2. At least one teammate has reviewed and approved it
3. The branch is up to date with `main`
4. No secrets or unrelated files are in the diff

Merging: squash-merge with a clear subject, then delete the branch.

### Reviewing

Review the diff, not just the title. Pull the branch and run it when the change is
visual or behavioural:

```bash
git switch feat/practice-hints
npm install     # only if package.json changed
npm run dev
```

Be specific and kind: say what you expected, what happened, and what would unblock it.

---

## 5. Good to know

- **Secrets stay server-side.** `SUPABASE_SERVICE_ROLE_KEY` and `GROQ_API_KEY` are only
  read in route handlers / server code. Never import them into a client component, and
  never prefix them with `NEXT_PUBLIC_`.
- **Data access goes through `/api/*`.** The browser client (`lib/supabase/browser.ts`)
  is for auth only; every read/write is a route handler that re-verifies the session.
- **Syllabus lives in code** (`lib/curriculum/`) and syncs into `subjects`/`topics`
  lazily, so a fresh database works without seeding.
- **Schema changes** go in `supabase/schema.sql` (plus `supabase/hardening.sql` for RLS)
  and in the same PR that uses them.
- **AI features must degrade gracefully.** If a key is missing, show a friendly message
  instead of a crash.
- **This is not a medical service.** Never remove the crisis line (Tele-MANAS 14416) or
  weaken the check-in safety screen in `lib/flagging.ts`.
- **Windows note:** `npm.ps1` may be blocked by execution policy — use `npm.cmd`, or the
  `.bat` launchers.
