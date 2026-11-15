-- Gabarita — schema inicial
-- Regra: toda tabela tem user_id e RLS "usuário só vê o que é dele" (salas são a exceção).

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  daily_quota_used integer not null default 0,
  whatsapp_phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: ver o próprio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: editar o próprio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- O usuário só pode mudar nome e telefone; plano e cota só pelo servidor (service role).
revoke update on public.profiles from authenticated, anon;
grant update (name, whatsapp_phone) on public.profiles to authenticated;

-- Cria o perfil automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- subjects (matéria / prova)
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  exam_date date,
  hours_per_day numeric(4, 2) check (hours_per_day is null or (hours_per_day > 0 and hours_per_day <= 24)),
  exam_style text not null default 'livre'
    check (exam_style in ('livre', 'enem', 'cebraspe', 'fgv', 'fcc', 'vunesp', 'discursiva')),
  created_at timestamptz not null default now()
);
create index subjects_user_id_idx on public.subjects (user_id);

alter table public.subjects enable row level security;
create policy "subjects: dono" on public.subjects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Função auxiliar: owns_subject
-- ---------------------------------------------------------------------------

-- Verdadeiro se a matéria pertence ao usuário logado. Usada nos "with check"
-- para impedir que alguém pendure dados na matéria de outra pessoa.
create or replace function public.owns_subject(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subjects s
    where s.id = p_subject_id and s.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- materials
-- ---------------------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  type text not null check (type in ('pdf', 'image', 'docx', 'text', 'audio', 'youtube', 'past_exam')),
  title text not null,
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  page_count integer,
  created_at timestamptz not null default now()
);
create index materials_subject_id_idx on public.materials (subject_id);

-- ---------------------------------------------------------------------------
-- topics
-- ---------------------------------------------------------------------------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null,
  summary text
);
create index topics_subject_id_idx on public.topics (subject_id);

-- ---------------------------------------------------------------------------
-- chunks (trechos do material + embedding)
-- subject_id é redundante (vem de materials) mas deixa a busca do RAG rápida.
-- ---------------------------------------------------------------------------
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  content text not null,
  page integer,
  topic_id uuid references public.topics (id) on delete set null,
  embedding extensions.vector(1536)
);
create index chunks_material_id_idx on public.chunks (material_id);
create index chunks_subject_id_idx on public.chunks (subject_id);
create index chunks_embedding_idx on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- teacher_profiles (D4)
-- ---------------------------------------------------------------------------
create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  style_json jsonb not null default '{}'::jsonb,
  likely_topics_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  chunk_id uuid references public.chunks (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  type text not null check (type in ('multiple_choice', 'true_false', 'open')),
  stem text not null,
  options_json jsonb,
  answer text not null,
  explanation text,
  difficulty text check (difficulty in ('facil', 'media', 'dificil')),
  style text,
  source_page integer,
  created_at timestamptz not null default now()
);
create index questions_subject_id_idx on public.questions (subject_id);

-- ---------------------------------------------------------------------------
-- attempts
-- ---------------------------------------------------------------------------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  answer text not null,
  correct boolean not null,
  confidence text check (confidence in ('chutei', 'acho', 'certeza')),  -- D7
  time_ms integer check (time_ms is null or time_ms >= 0),
  created_at timestamptz not null default now()
);
create index attempts_user_id_idx on public.attempts (user_id, created_at desc);
create index attempts_question_id_idx on public.attempts (question_id);

-- ---------------------------------------------------------------------------
-- flashcards
-- ---------------------------------------------------------------------------
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  chunk_id uuid references public.chunks (id) on delete set null,
  front text not null,
  back text not null,
  created_at timestamptz not null default now()
);
create index flashcards_subject_id_idx on public.flashcards (subject_id);

-- ---------------------------------------------------------------------------
-- reviews (D3 — FSRS)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('flashcard', 'question')),
  item_id uuid not null,
  fsrs_state_json jsonb not null default '{}'::jsonb,
  due_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);
create index reviews_due_idx on public.reviews (user_id, due_at);

-- ---------------------------------------------------------------------------
-- error_notebook (D6)
-- ---------------------------------------------------------------------------
create table public.error_notebook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  why_wrong text,
  followup_question_id uuid references public.questions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index error_notebook_user_id_idx on public.error_notebook (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- study_plans / plan_days (D2)
-- ---------------------------------------------------------------------------
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  generated_at timestamptz not null default now()
);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null references public.study_plans (id) on delete cascade,
  date date not null,
  tasks_json jsonb not null default '[]'::jsonb,
  done boolean not null default false,
  unique (plan_id, date)
);

-- ---------------------------------------------------------------------------
-- feynman_sessions (D9)
-- ---------------------------------------------------------------------------
create table public.feynman_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  transcript text not null,
  feedback_json jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- jobs (processamento em segundo plano)
-- Escrita de status/erro fica com o servidor (service role).
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on public.jobs (status, created_at) where status = 'queued';

-- ---------------------------------------------------------------------------
-- RLS das tabelas "do usuário"
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'materials', 'topics', 'chunks', 'teacher_profiles', 'questions', 'flashcards', 'study_plans'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- dono + a matéria também tem que ser dele
    execute format($p$
      create policy "%1$s: dono" on public.%1$I
        for all to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()) and public.owns_subject(subject_id))
    $p$, t);
  end loop;

  foreach t in array array['reviews', 'feynman_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$
      create policy "%1$s: dono" on public.%1$I
        for all to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $p$, t);
  end loop;
end
$$;

alter table public.attempts enable row level security;
create policy "attempts: dono" on public.attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.questions q where q.id = question_id and q.user_id = (select auth.uid()))
  );

alter table public.error_notebook enable row level security;
create policy "error_notebook: dono" on public.error_notebook
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  );

alter table public.plan_days enable row level security;
create policy "plan_days: dono" on public.plan_days
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = (select auth.uid()))
  );

alter table public.jobs enable row level security;
create policy "jobs: ver os próprios" on public.jobs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "jobs: criar os próprios" on public.jobs
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- rooms / room_members (D14) — exceção à regra: membros veem a sala.
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- security definer para não entrar em recursão de RLS entre rooms e room_members
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id and m.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.owner_id = (select auth.uid())
  );
$$;

alter table public.rooms enable row level security;
create policy "rooms: membros veem" on public.rooms
  for select to authenticated using (public.is_room_member(id));
create policy "rooms: dono cria" on public.rooms
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (subject_id is null or public.owns_subject(subject_id)));
create policy "rooms: dono altera" on public.rooms
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "rooms: dono apaga" on public.rooms
  for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.room_members enable row level security;
create policy "room_members: membros veem" on public.room_members
  for select to authenticated using (public.is_room_member(room_id));
-- Entrar numa sala pelo código será feito por uma rota do servidor (fase 4).
create policy "room_members: sair" on public.room_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RAG: busca por similaridade dentro de uma matéria
-- security invoker => o RLS de chunks continua valendo.
-- ---------------------------------------------------------------------------
create or replace function public.match_chunks(
  query_embedding extensions.vector(1536),
  p_subject_id uuid,
  k integer default 8
)
returns table (id uuid, material_id uuid, content text, page integer, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.material_id, c.content, c.page,
         1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.chunks c
  where c.subject_id = p_subject_id and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(k, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Storage: bucket privado; cada usuário só mexe em <user_id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 20971520)  -- 20 MB
on conflict (id) do nothing;

create policy "materials bucket: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "materials bucket: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "materials bucket: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
