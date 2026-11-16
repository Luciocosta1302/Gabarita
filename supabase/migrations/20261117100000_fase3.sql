-- Gabarita — Fase 3: Prova do Professor, discursivas com rubrica, Feynman, áudio de aula.

-- ---------------------------------------------------------------------------
-- teacher_profiles (D4): um perfil por matéria, refeito a cada prova antiga enviada
-- ---------------------------------------------------------------------------
alter table public.teacher_profiles
  add constraint teacher_profiles_subject_unique unique (subject_id),
  add column exams_count integer not null default 0,
  add column updated_at timestamptz not null default now();

-- materials: texto extraído da prova antiga (não vira trecho de estudo; serve para o perfil)
alter table public.materials add column extracted_text text;

-- ---------------------------------------------------------------------------
-- questions (D10): rubrica e pontos esperados das discursivas
-- ---------------------------------------------------------------------------
alter table public.questions add column rubric_json jsonb;

-- attempts (D10): nota 0–10 e correção por critério das respostas abertas
alter table public.attempts
  add column score numeric(4, 2) check (score is null or (score >= 0 and score <= 10)),
  add column feedback_json jsonb;

-- ---------------------------------------------------------------------------
-- feynman_sessions (D9): matéria, nota e se veio de texto ou áudio
-- ---------------------------------------------------------------------------
alter table public.feynman_sessions
  add column subject_id uuid references public.subjects (id) on delete cascade,
  add column mode text not null default 'texto' check (mode in ('texto', 'audio')),
  add column score integer check (score is null or (score between 0 and 100));
create index feynman_sessions_subject_idx on public.feynman_sessions (subject_id, created_at desc);

drop policy "feynman_sessions: dono" on public.feynman_sessions;
create policy "feynman_sessions: dono" on public.feynman_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (subject_id is null or public.owns_subject(subject_id)));
