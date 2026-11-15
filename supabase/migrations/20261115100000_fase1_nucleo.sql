-- Gabarita — Fase 1 (núcleo): ingestão, quizzes, resumos, caderno de erros e fila de jobs.

-- ---------------------------------------------------------------------------
-- materials: mensagem de erro do processamento (mostrada na tela)
-- ---------------------------------------------------------------------------
alter table public.materials add column error text;

-- ---------------------------------------------------------------------------
-- chunks: ordem dentro do material (para mostrar o trecho com os vizinhos)
-- ---------------------------------------------------------------------------
alter table public.chunks add column chunk_index integer not null default 0;
create index chunks_material_order_idx on public.chunks (material_id, chunk_index);

-- ---------------------------------------------------------------------------
-- questions (D1): citação literal do trecho que embasa a questão
-- origin: 'quiz' (gerada a pedido) ou 'followup' (questão parecida do caderno de erros)
-- ---------------------------------------------------------------------------
alter table public.questions add column source_quote text;
alter table public.questions add column origin text not null default 'quiz'
  check (origin in ('quiz', 'followup'));

-- ---------------------------------------------------------------------------
-- quizzes: um conjunto de questões geradas de uma vez
-- ---------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  title text not null,
  difficulty text not null default 'misturada' check (difficulty in ('facil', 'media', 'dificil', 'misturada')),
  question_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index quizzes_subject_id_idx on public.quizzes (subject_id, created_at desc);

alter table public.quizzes enable row level security;
create policy "quizzes: dono" on public.quizzes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_subject(subject_id));

-- attempts: de qual quiz veio a tentativa (null = questão avulsa, ex.: caderno de erros)
alter table public.attempts add column quiz_id uuid references public.quizzes (id) on delete set null;
create index attempts_quiz_id_idx on public.attempts (quiz_id);

drop policy "attempts: dono" on public.attempts;
create policy "attempts: dono" on public.attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.questions q where q.id = question_id and q.user_id = (select auth.uid()))
    and (quiz_id is null or exists (
      select 1 from public.quizzes z where z.id = quiz_id and z.user_id = (select auth.uid())
    ))
  );

-- ---------------------------------------------------------------------------
-- error_notebook (D6): estado da questão parecida e se o aluno já resolveu
-- ---------------------------------------------------------------------------
alter table public.error_notebook
  add column followup_status text not null default 'pending' check (followup_status in ('pending', 'ready', 'error')),
  add column resolved_at timestamptz,
  add constraint error_notebook_attempt_unique unique (attempt_id);
create index error_notebook_followup_idx on public.error_notebook (followup_question_id);

-- ---------------------------------------------------------------------------
-- summaries: resumo de um material (um por material; regerar substitui)
-- ---------------------------------------------------------------------------
create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  material_id uuid not null unique references public.materials (id) on delete cascade,
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.summaries enable row level security;
create policy "summaries: dono" on public.summaries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_subject(subject_id));

-- ---------------------------------------------------------------------------
-- jobs: pega os próximos da fila sem dois processadores pegarem o mesmo.
-- Jobs "running" há mais de 10 min (processo morreu) voltam para a fila.
-- Só o servidor (service role) chama.
-- ---------------------------------------------------------------------------
create or replace function public.claim_jobs(n integer default 5, p_user_id uuid default null)
returns setof public.jobs
language sql
security definer
set search_path = ''
as $$
  update public.jobs j
  set status = 'running', attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select q.id from public.jobs q
    where (q.status = 'queued' or (q.status = 'running' and q.updated_at < now() - interval '10 minutes'))
      and (p_user_id is null or q.user_id = p_user_id)
    order by q.created_at
    limit least(greatest(n, 1), 50)
    for update skip locked
  )
  returning j.*;
$$;

revoke execute on function public.claim_jobs(integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_jobs(integer, uuid) to service_role;
