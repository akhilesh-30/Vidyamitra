-- =====================================================================
-- VIDYAMITRA — RLS hardening (run once, top to bottom, in the Supabase
-- SQL editor).
--
-- The whole script runs as ONE transaction: it either applies fully or
-- not at all — a mid-script error can never leave a half-applied state.
-- The SELECT at the end prints a report; run it and check the result
-- panel says applied=true before moving on.
--
-- Security model:
--   • content tables  (subjects, topics, content_links, questions)
--                      are read-only for signed-in students,
--   • every personal table is reachable only for the student it belongs
--                      to (via auth_user_id on `students`, then via
--                      student_id linkage for the rest),
--   • escalations      is NOT reachable by students at all (only the
--                      server's service-role key can touch it),
--   • nobody deletes history: `delete` is never granted to clients.
--
-- Creates NO tables and does NOT alter any table definition — it only
-- turns on row-level security and adds policies/grants on top of the
-- PRD schema. Safe to re-run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0) Helper used by every "this row belongs to me" policy.
--    security definer + pinned search_path so students can never smuggle
--    a search_path change into the policy check.
-- ---------------------------------------------------------------------
create or replace function public.is_own_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from students s
    where s.id = target_student_id
      and s.auth_user_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------
-- 1) Turn RLS on for every table.
-- ---------------------------------------------------------------------
alter table students       enable row level security;
alter table subjects       enable row level security;
alter table topics         enable row level security;
alter table content_links  enable row level security;
alter table questions      enable row level security;
alter table attempts       enable row level security;
alter table mastery_scores enable row level security;
alter table stress_logs    enable row level security;
alter table checkins       enable row level security;
alter table escalations    enable row level security;

-- ---------------------------------------------------------------------
-- 2) Tighten grants (what each role may do at all, before row filters).
--    service_role is never mentioned → it keeps full access for the
--    server route handlers and scheduled jobs.
-- ---------------------------------------------------------------------

-- Content: read-only for signed-in students. The anon key may also read
-- (RLS returns [] until someone signs in — never an error) but can write
-- nothing.
revoke all on subjects, topics, content_links, questions from anon, authenticated;
grant select on subjects, topics, content_links, questions to anon, authenticated;

-- Personal tables: the anon key (nobody signed in) has no business here.
revoke all on students, attempts, mastery_scores, stress_logs, checkins from anon;

-- Students keep history honest: they may add and read, never delete.
grant select on students        to authenticated;
grant update on students        to authenticated;
grant select, insert on attempts  to authenticated;
grant select on mastery_scores  to authenticated;
grant select on stress_logs     to authenticated;
grant select, insert on checkins  to authenticated;

-- Escalations: students may not even see the table. Server-only.
revoke all on escalations from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Content policies — any signed-in student may read.
-- ---------------------------------------------------------------------
drop policy if exists "content is student-readable" on subjects;
drop policy if exists "content is student-readable" on topics;
drop policy if exists "content is student-readable" on content_links;
drop policy if exists "content is student-readable" on questions;
create policy "content is student-readable"
  on subjects for select to authenticated using (true);
create policy "content is student-readable"
  on topics for select to authenticated using (true);
create policy "content is student-readable"
  on content_links for select to authenticated using (true);
create policy "content is student-readable"
  on questions for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 4) `students` — a student sees, creates and edits only their own row
--    (auth_user_id linkage; they cannot rewrite the linkage itself).
-- ---------------------------------------------------------------------
drop policy if exists "own student row select" on students;
drop policy if exists "own student row insert" on students;
drop policy if exists "own student row update" on students;
create policy "own student row select"
  on students for select to authenticated
  using (auth_user_id = auth.uid());
create policy "own student row insert"
  on students for insert to authenticated
  with check (auth_user_id = auth.uid());
create policy "own student row update"
  on students for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5) Everything that hangs off a student_id belongs to the student whose
--    `students.auth_user_id` matches the signed-in user.
-- ---------------------------------------------------------------------

-- attempts — the raw practice log (student inserts each answer attempt).
drop policy if exists "own attempts read" on attempts;
drop policy if exists "own attempts write" on attempts;
create policy "own attempts read"
  on attempts for select to authenticated
  using (public.is_own_student(student_id));
create policy "own attempts write"
  on attempts for insert to authenticated
  with check (public.is_own_student(student_id));

-- checkins — mood log (student inserts; the server flips `flagged`).
drop policy if exists "own checkins read" on checkins;
drop policy if exists "own checkins write" on checkins;
create policy "own checkins read"
  on checkins for select to authenticated
  using (public.is_own_student(student_id));
create policy "own checkins write"
  on checkins for insert to authenticated
  with check (public.is_own_student(student_id));

-- mastery_scores / stress_logs — derived by the server's scheduled job;
-- students only ever read their own.
drop policy if exists "own mastery read" on mastery_scores;
drop policy if exists "own stress read" on stress_logs;
create policy "own mastery read"
  on mastery_scores for select to authenticated
  using (public.is_own_student(student_id));
create policy "own stress read"
  on stress_logs for select to authenticated
  using (public.is_own_student(student_id));

-- ---------------------------------------------------------------------
-- 6) Indexes the derivation jobs rely on (safe to re-run).
-- ---------------------------------------------------------------------
create index if not exists idx_attempts_student_time
  on attempts (student_id, attempted_at);
create index if not exists idx_mastery_student_topic
  on mastery_scores (student_id, topic_id);
create index if not exists idx_stress_student_time
  on stress_logs (student_id, logged_at);
create index if not exists idx_checkins_student_time
  on checkins (student_id, created_at);
create index if not exists idx_escalations_status
  on escalations (status);

-- ---------------------------------------------------------------------
-- 7) Counsellor access (F8). Deliberately NOT wired up above: /counsellor
--    reads escalations through the server's service-role key, which RLS
--    cannot block. If we later let counsellors query the browser client
--    directly, add policies gated on
--        auth.jwt() -> 'app_metadata' -> 'role' = 'counsellor'
--    for escalations/checkins/stress_logs, e.g.:
--
-- create policy "counsellor reads escalations"
--   on escalations for select to authenticated
--   using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'counsellor');
--
-- and mark the account in the dashboard Auth > Users > edit metadata,
-- or with the UPDATE shown in docs/F8-COUNSELLOR.md.
-- ---------------------------------------------------------------------

commit;

-- ---------------------------------------------------------------------
-- 8) Report — the result panel should show: helper_fn = 1,
--    policies = 14, and one row per table with rls = true.
--    If the transaction failed, NOTHING below ran — check the error
--    message above and re-run the whole script.
-- ---------------------------------------------------------------------
select
  true as applied,
  (select count(*) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_own_student') as helper_fn,
  (select count(*) from pg_policies where schemaname = 'public') as policies,
  (select count(*) from pg_tables
    where schemaname = 'public' and rowsecurity) as tables_with_rls;
