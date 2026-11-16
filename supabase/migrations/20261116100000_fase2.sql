-- Gabarita — Fase 2: tópicos/domínio, repetição espaçada, plano reverso, simulado e estilos de banca.

-- ---------------------------------------------------------------------------
-- topics (D8): ordem de exibição (ordem em que aparecem no material)
-- ---------------------------------------------------------------------------
alter table public.topics add column position integer not null default 0;
alter table public.topics add column created_at timestamptz not null default now();
create index chunks_topic_id_idx on public.chunks (topic_id);
create index questions_topic_id_idx on public.questions (topic_id);

-- ---------------------------------------------------------------------------
-- reviews (D3): matéria do item (para filtrar "Revisar hoje" por matéria)
-- ---------------------------------------------------------------------------
alter table public.reviews add column subject_id uuid references public.subjects (id) on delete cascade;
alter table public.reviews add column last_reviewed_at timestamptz;
create index reviews_subject_idx on public.reviews (subject_id);

drop policy "reviews: dono" on public.reviews;
create policy "reviews: dono" on public.reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (subject_id is null or public.owns_subject(subject_id)));

-- ---------------------------------------------------------------------------
-- study_plans / plan_days (D2): um plano por matéria; estado do dia
-- ---------------------------------------------------------------------------
alter table public.study_plans add constraint study_plans_subject_unique unique (subject_id);
alter table public.study_plans add column params_json jsonb not null default '{}'::jsonb;
alter table public.plan_days add column status text not null default 'pending'
  check (status in ('pending', 'done', 'missed'));

-- ---------------------------------------------------------------------------
-- quizzes: modo simulado cronometrado (D16) e estilo de banca (D5)
-- ---------------------------------------------------------------------------
alter table public.quizzes
  add column mode text not null default 'pratica' check (mode in ('pratica', 'simulado')),
  add column style text,
  add column topic_id uuid references public.topics (id) on delete set null,
  add column time_limit_s integer check (time_limit_s is null or time_limit_s > 0),
  add column started_at timestamptz,
  add column finished_at timestamptz;
