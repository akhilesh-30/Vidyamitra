-- =====================================================================
-- VIDYAMITRA schema — verbatim from the PRD (Section 3).
--
-- If your Supabase project was created with this SQL already, DO NOT run
-- it again. This file exists so a fresh project (or the local Supabase
-- CLI) can reproduce the exact schema. The app adds no tables and alters
-- no tables.
-- =====================================================================

-- Students
create table students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text,
  class_level int not null,          -- e.g. 8
  board text not null,               -- 'CBSE' | 'MAHARASHTRA'
  created_at timestamptz default now()
);

-- Syllabus structure
create table subjects (
  id uuid primary key default gen_random_uuid(),
  board text not null,
  class_level int not null,
  name text not null
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  name text not null,
  sequence int
);

-- Content links (seeded, not live-fetched per user)
create table content_links (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  type text not null,                -- 'pdf' | 'youtube'
  title text,
  url text not null
);

-- Practice questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  question_text text not null,
  options jsonb,
  correct_option text,
  difficulty int default 1
);

-- Attempts (raw event log — mastery + stress are both derived from this)
create table attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  question_id uuid references questions(id),
  is_correct boolean,
  time_taken_seconds int,
  attempted_at timestamptz default now()
);

-- Derived mastery score per student per topic
create table mastery_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  topic_id uuid references topics(id),
  mastery float default 0,           -- 0.0 to 1.0
  updated_at timestamptz default now()
);

-- Derived stress log
create table stress_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  stress_score text,                 -- 'low' | 'medium' | 'high'
  signals jsonb,                     -- {accuracy_drop, avg_latency, late_night, abandon_rate}
  logged_at timestamptz default now()
);

-- Mood check-ins / private chat
create table checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  mood_emoji text,
  note text,
  flagged boolean default false,
  created_at timestamptz default now()
);

-- Escalations to counsellor/teacher
create table escalations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  checkin_id uuid references checkins(id),
  reason text,
  status text default 'open',        -- 'open' | 'reviewed' | 'closed'
  created_at timestamptz default now()
);
