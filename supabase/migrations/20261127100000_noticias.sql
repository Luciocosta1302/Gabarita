-- Notícias sobre estudos (RSS dos jornais escolhidos pelo aluno) + objetivo de estudo + cor da pasta.

-- Objetivo de estudo (perguntado no primeiro acesso): personaliza notícias e dicas.
alter table public.profiles
  add column study_goal text
  constraint profiles_study_goal check (study_goal is null or study_goal in ('vestibular', 'concurso', 'faculdade', 'pessoal', 'outro'));
grant update (study_goal) on public.profiles to authenticated;

-- Cor da capa da pasta (escolhida pelo aluno; sem cor = automática).
alter table public.subjects
  add column color text
  constraint subjects_color check (color is null or color in ('ai', 'shu', 'matcha', 'kin', 'sumi', 'sakura'));

-- Preferências de notícias do aluno.
create table public.news_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  sources text[] not null default '{}' constraint news_prefs_sources_max check (cardinality(sources) <= 30),
  custom_feeds text[] not null default '{}' constraint news_prefs_custom_max check (cardinality(custom_feeds) <= 5),
  state text constraint news_prefs_state check (state is null or state ~ '^[A-Z]{2}$'),
  city text constraint news_prefs_city check (city is null or char_length(city) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.news_prefs enable row level security;
create policy "news_prefs: dono" on public.news_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Notícias já lidas dos feeds (cache compartilhado: são públicas). Só o servidor grava.
create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  feed_key text not null,
  source_name text not null,
  url text not null unique,
  title text not null,
  snippet text,
  published_at timestamptz not null,
  tags text[] not null default '{}',
  summary_json jsonb,
  summarized_at timestamptz,
  created_at timestamptz not null default now()
);
create index news_items_feed_published on public.news_items (feed_key, published_at desc);
create index news_items_tags on public.news_items using gin (tags);
alter table public.news_items enable row level security;
create policy "news_items: logado lê" on public.news_items for select to authenticated using (true);

-- Quando cada feed foi lido pela última vez (para não buscar de novo a cada visita). Só o servidor.
create table public.news_feeds (
  feed_key text primary key,
  url text not null,
  fetched_at timestamptz,
  ok boolean,
  error text,
  item_count integer not null default 0
);
alter table public.news_feeds enable row level security;
create policy "news_feeds: logado lê" on public.news_feeds for select to authenticated using (true);
