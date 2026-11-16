-- Gabarita — histórico do chat com o material (por matéria; ou por documento, na Biblioteca).
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  material_id uuid references public.materials (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  citations_json jsonb not null default '[]'::jsonb,
  has_basis boolean not null default true,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages (user_id, subject_id, material_id, created_at desc);
alter table public.chat_messages enable row level security;
create policy "chat_messages: dono" on public.chat_messages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_subject(subject_id));
