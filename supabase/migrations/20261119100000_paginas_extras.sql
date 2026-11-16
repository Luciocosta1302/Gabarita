-- Gabarita — páginas da proposta do usuário: Diário, Anotações, Comunidade e Biblioteca (chat por documento).

-- ---------------------------------------------------------------------------
-- Diário de aprendizagem
-- ---------------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  learned text not null check (char_length(learned) between 1 and 3000),
  difficulties text check (difficulties is null or char_length(difficulties) <= 3000),
  mood text not null check (mood in ('otimo', 'bem', 'ok', 'cansado', 'frustrado')),
  focus_minutes integer check (focus_minutes is null or focus_minutes between 0 and 1440),
  created_at timestamptz not null default now()
);
create index journal_entries_user_idx on public.journal_entries (user_id, created_at desc);
alter table public.journal_entries enable row level security;
create policy "journal_entries: dono" on public.journal_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (subject_id is null or public.owns_subject(subject_id)));

create table public.journal_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  content_json jsonb not null,
  created_at timestamptz not null default now()
);
create index journal_reflections_user_idx on public.journal_reflections (user_id, created_at desc);
alter table public.journal_reflections enable row level security;
create policy "journal_reflections: dono" on public.journal_reflections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Anotações (por matéria = pasta)
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  title text not null default 'Sem título' check (char_length(title) between 1 and 200),
  content text not null default '' check (char_length(content) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, updated_at desc);
alter table public.notes enable row level security;
create policy "notes: dono" on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (subject_id is null or public.owns_subject(subject_id)));

-- ---------------------------------------------------------------------------
-- Comunidade: todo aluno logado lê; cada um escreve/apaga só o seu
-- ---------------------------------------------------------------------------
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null,
  category text not null check (category in ('duvida', 'dica', 'material', 'grupo')),
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index community_posts_created_idx on public.community_posts (created_at desc);
alter table public.community_posts enable row level security;
create policy "community_posts: todos leem" on public.community_posts for select to authenticated using (true);
create policy "community_posts: autor cria" on public.community_posts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "community_posts: autor apaga" on public.community_posts for delete to authenticated using (user_id = (select auth.uid()));

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index community_comments_post_idx on public.community_comments (post_id, created_at);
alter table public.community_comments enable row level security;
create policy "community_comments: todos leem" on public.community_comments for select to authenticated using (true);
create policy "community_comments: autor cria" on public.community_comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "community_comments: autor apaga" on public.community_comments for delete to authenticated using (user_id = (select auth.uid()));

create table public.community_likes (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.community_likes enable row level security;
create policy "community_likes: todos leem" on public.community_likes for select to authenticated using (true);
create policy "community_likes: curtir" on public.community_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "community_likes: descurtir" on public.community_likes for delete to authenticated using (user_id = (select auth.uid()));

-- O nome mostrado vem do perfil (o aluno não escolhe se passar por outro).
create or replace function public.set_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.author_name := coalesce((select p.name from public.profiles p where p.id = new.user_id), 'Aluno');
  return new;
end;
$$;
create trigger community_posts_author before insert on public.community_posts for each row execute function public.set_author_name();
create trigger community_comments_author before insert on public.community_comments for each row execute function public.set_author_name();

-- ---------------------------------------------------------------------------
-- Biblioteca: busca dentro de um único material (chat por documento)
-- ---------------------------------------------------------------------------
create or replace function public.match_material_chunks(
  query_embedding extensions.vector(1536),
  p_material_id uuid,
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
  where c.material_id = p_material_id and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(k, 1), 50);
$$;
