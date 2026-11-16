-- Gabarita — conquistas já anunciadas ao aluno (para avisar só das novas).
create table public.achievements_seen (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  badge_id text not null check (char_length(badge_id) <= 40),
  seen_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.achievements_seen enable row level security;
create policy "achievements_seen: dono" on public.achievements_seen
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
