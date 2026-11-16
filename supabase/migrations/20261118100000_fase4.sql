-- Gabarita — Fase 4: salas da turma, WhatsApp diário, planos/pagamento e controle de custo.

-- ---------------------------------------------------------------------------
-- profiles: Pro com validade, preferências do WhatsApp
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column pro_until timestamptz,
  add column whatsapp_opt_in boolean not null default false,
  add column whatsapp_hour integer not null default 8 check (whatsapp_hour between 0 and 23);
grant update (whatsapp_opt_in, whatsapp_hour) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- rooms (D14): nome da sala; entrar pelo código; materiais e simulados da turma
-- ---------------------------------------------------------------------------
alter table public.rooms add column name text not null default 'Minha turma' check (char_length(name) between 1 and 80);

-- Entrar numa sala pelo código do convite (o código é o "segredo"; quem tem o link entra).
create or replace function public.join_room(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'login necessário';
  end if;
  select id into v_room from public.rooms where invite_code = lower(trim(p_code));
  if v_room is null then
    return null;
  end if;
  insert into public.room_members (room_id, user_id) values (v_room, (select auth.uid()))
  on conflict do nothing;
  return v_room;
end;
$$;
revoke execute on function public.join_room(text) from public, anon;
grant execute on function public.join_room(text) to authenticated;

-- O dono sempre vê a própria sala (no insert ... returning ele ainda não virou membro pelo gatilho).
drop policy "rooms: membros veem" on public.rooms;
create policy "rooms: membros veem" on public.rooms
  for select to authenticated using (owner_id = (select auth.uid()) or public.is_room_member(id));

-- Dono entra como membro ao criar a sala.
create or replace function public.add_room_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.room_members (room_id, user_id) values (new.id, new.owner_id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_room_created after insert on public.rooms for each row execute function public.add_room_owner();

-- Materiais compartilhados com a turma (só título/descrição; o conteúdo é copiado pelo servidor ao importar).
create table public.room_materials (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  shared_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  unique (room_id, material_id)
);
alter table public.room_materials enable row level security;
create policy "room_materials: membros veem" on public.room_materials
  for select to authenticated using (public.is_room_member(room_id));
create policy "room_materials: membro compartilha o que é dele" on public.room_materials
  for insert to authenticated
  with check (
    shared_by = (select auth.uid())
    and public.is_room_member(room_id)
    and exists (select 1 from public.materials m where m.id = material_id and m.user_id = (select auth.uid()))
  );
create policy "room_materials: quem compartilhou remove" on public.room_materials
  for delete to authenticated using (shared_by = (select auth.uid()));

-- Simulado da turma: enunciados/alternativas visíveis aos membros; gabarito em tabela separada (só servidor).
create table public.room_quizzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  questions_json jsonb not null,           -- [{id, stem, options, source_page}]
  time_limit_s integer not null check (time_limit_s > 0),
  created_at timestamptz not null default now()
);
create index room_quizzes_room_idx on public.room_quizzes (room_id, created_at desc);
alter table public.room_quizzes enable row level security;
create policy "room_quizzes: membros veem" on public.room_quizzes
  for select to authenticated using (public.is_room_member(room_id));

create table public.room_quiz_keys (
  room_quiz_id uuid primary key references public.room_quizzes (id) on delete cascade,
  answers_json jsonb not null              -- {questionId: {answer, explanation}}
);
alter table public.room_quiz_keys enable row level security; -- sem políticas: só service role

create table public.room_attempts (
  id uuid primary key default gen_random_uuid(),
  room_quiz_id uuid not null references public.room_quizzes (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  correct integer not null,
  total integer not null,
  time_ms integer,
  answers_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (room_quiz_id, user_id)
);
alter table public.room_attempts enable row level security;
create policy "room_attempts: membros veem" on public.room_attempts
  for select to authenticated using (public.is_room_member(room_id));
-- gravação só pelo servidor (corrige com o gabarito)

-- Ranking semanal (semana começa na segunda, fuso de São Paulo):
-- pontos = acertos nos simulados da sala + acertos da semana nas próprias questões (qualquer matéria:
-- cada colega estuda pelas próprias matérias).
create or replace function public.room_weekly_ranking(p_room_id uuid)
returns table (user_id uuid, name text, points bigint, room_correct bigint, own_correct bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with week as (
    select (date_trunc('week', (now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo') as start
  ),
  members as (
    select m.user_id from public.room_members m where m.room_id = p_room_id
  ),
  room_pts as (
    select a.user_id, sum(a.correct) as pts
    from public.room_attempts a, week
    where a.room_id = p_room_id and a.created_at >= week.start
    group by a.user_id
  ),
  own_pts as (
    select at.user_id, count(*) as pts
    from public.attempts at, week
    where at.correct and at.created_at >= week.start and at.user_id in (select user_id from members)
    group by at.user_id
  )
  select mb.user_id,
         coalesce(p.name, 'Aluno'),
         coalesce(r.pts, 0) + coalesce(o.pts, 0) as points,
         coalesce(r.pts, 0),
         coalesce(o.pts, 0)
  from members mb
  left join public.profiles p on p.id = mb.user_id
  left join room_pts r on r.user_id = mb.user_id
  left join own_pts o on o.user_id = mb.user_id
  where public.is_room_member(p_room_id)
  order by points desc, coalesce(p.name, '');
$$;
revoke execute on function public.room_weekly_ranking(uuid) from public, anon;
grant execute on function public.room_weekly_ranking(uuid) to authenticated;

-- Nomes dos colegas da sala (profiles só mostra o próprio perfil).
create or replace function public.room_member_names(p_room_id uuid)
returns table (user_id uuid, name text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(p.name, 'Aluno'), m.joined_at
  from public.room_members m
  left join public.profiles p on p.id = m.user_id
  where m.room_id = p_room_id and public.is_room_member(p_room_id)
  order by m.joined_at;
$$;
revoke execute on function public.room_member_names(uuid) from public, anon;
grant execute on function public.room_member_names(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- payments: pagamentos do Pro (Mercado Pago, Pix ou cartão)
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  amount_cents integer not null check (amount_cents > 0),
  period_days integer not null default 30,
  checkout_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
create policy "payments: ver os próprios" on public.payments
  for select to authenticated using (user_id = (select auth.uid()));
-- criação e atualização só pelo servidor

-- ---------------------------------------------------------------------------
-- WhatsApp (D15): sessão diária de 5 questões e registro das mensagens
-- ---------------------------------------------------------------------------
create table public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  question_ids uuid[] not null,
  current integer not null default 0,
  correct integer not null default 0,
  status text not null default 'invited' check (status in ('invited', 'active', 'done', 'expired')),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
alter table public.whatsapp_sessions enable row level security;
create policy "whatsapp_sessions: ver as próprias" on public.whatsapp_sessions
  for select to authenticated using (user_id = (select auth.uid()));

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  phone text not null,
  body text not null,
  provider_id text,
  created_at timestamptz not null default now()
);
create index whatsapp_messages_user_idx on public.whatsapp_messages (user_id, created_at desc);
alter table public.whatsapp_messages enable row level security;
create policy "whatsapp_messages: ver as próprias" on public.whatsapp_messages
  for select to authenticated using (user_id = (select auth.uid()));

-- telefone único (é como o webhook acha o usuário)
create unique index profiles_whatsapp_phone_idx on public.profiles (whatsapp_phone) where whatsapp_phone is not null;

-- ---------------------------------------------------------------------------
-- Controle de custo: tokens de IA por usuário/dia e cache de embeddings
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  calls integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage: ver o próprio" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- soma atômica (chamada pelo servidor)
create or replace function public.add_ai_usage(p_user uuid, p_day date, p_calls integer, p_in bigint, p_out bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_usage (user_id, day, calls, input_tokens, output_tokens)
  values (p_user, p_day, p_calls, p_in, p_out)
  on conflict (user_id, day) do update
    set calls = public.ai_usage.calls + excluded.calls,
        input_tokens = public.ai_usage.input_tokens + excluded.input_tokens,
        output_tokens = public.ai_usage.output_tokens + excluded.output_tokens;
$$;
revoke execute on function public.add_ai_usage(uuid, date, integer, bigint, bigint) from public, anon, authenticated;
grant execute on function public.add_ai_usage(uuid, date, integer, bigint, bigint) to service_role;

create table public.embedding_cache (
  key text primary key,                    -- sha256(modelo + texto)
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now()
);
alter table public.embedding_cache enable row level security; -- sem políticas: só service role
