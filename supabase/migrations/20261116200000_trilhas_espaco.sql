-- Gabarita — páginas propostas pelo usuário: Trilhas + Tutor IA e Espaço de estudos.

-- ---------------------------------------------------------------------------
-- questions: questões criadas pelo tutor dentro de uma etapa da trilha
-- ---------------------------------------------------------------------------
alter table public.questions drop constraint questions_origin_check;
alter table public.questions add constraint questions_origin_check check (origin in ('quiz', 'followup', 'tutor'));

-- ---------------------------------------------------------------------------
-- learning_paths: trilha de aprendizagem montada pela IA para um objetivo
-- ---------------------------------------------------------------------------
create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  goal text not null check (char_length(goal) between 1 and 300),
  title text not null,
  created_at timestamptz not null default now()
);
create index learning_paths_subject_idx on public.learning_paths (subject_id);

alter table public.learning_paths enable row level security;
create policy "learning_paths: dono" on public.learning_paths
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_subject(subject_id));

-- ---------------------------------------------------------------------------
-- path_steps: etapas da trilha, com pré-requisitos; liberadas pelo desempenho
-- ---------------------------------------------------------------------------
create table public.path_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  position integer not null,
  title text not null,
  objective text not null,
  level text not null default 'basico' check (level in ('basico', 'intermediario', 'avancado')),
  topic_ids uuid[] not null default '{}',
  prerequisites integer[] not null default '{}',   -- posições de etapas anteriores
  status text not null default 'locked' check (status in ('locked', 'available', 'in_progress', 'done')),
  correct_streak integer not null default 0,
  attempts_count integer not null default 0,
  completed_at timestamptz,
  unique (path_id, position)
);

alter table public.path_steps enable row level security;
create policy "path_steps: dono" on public.path_steps
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.learning_paths p where p.id = path_id and p.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- tutor_messages: conversa do tutor em cada etapa (explicações, questões, diagnósticos, dúvidas)
-- ---------------------------------------------------------------------------
create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step_id uuid not null references public.path_steps (id) on delete cascade,
  role text not null check (role in ('tutor', 'student')),
  kind text not null check (kind in ('explanation', 'question', 'feedback', 'diagnosis', 'chat', 'done')),
  content_json jsonb not null default '{}'::jsonb,
  question_id uuid references public.questions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tutor_messages_step_idx on public.tutor_messages (step_id, created_at);

alter table public.tutor_messages enable row level security;
create policy "tutor_messages: dono" on public.tutor_messages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.path_steps s where s.id = step_id and s.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- study_sessions: blocos de foco do Pomodoro (Espaço de estudos)
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  focus_minutes integer not null check (focus_minutes between 1 and 180),
  goals_json jsonb not null default '[]'::jsonb,
  scene text,
  ended_at timestamptz not null default now()
);
create index study_sessions_user_idx on public.study_sessions (user_id, ended_at desc);

alter table public.study_sessions enable row level security;
create policy "study_sessions: dono" on public.study_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (subject_id is null or public.owns_subject(subject_id)));
