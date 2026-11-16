-- Gabarita — Comunidade: denúncias. Com 3 denúncias de alunos diferentes, o post/resposta some
-- para todos (menos o autor, que vê o aviso). Reverter é pelo servidor (service role).
alter table public.community_posts add column hidden boolean not null default false;
alter table public.community_comments add column hidden boolean not null default false;

drop policy "community_posts: todos leem" on public.community_posts;
create policy "community_posts: todos leem" on public.community_posts
  for select to authenticated using (not hidden or user_id = (select auth.uid()));
drop policy "community_comments: todos leem" on public.community_comments;
create policy "community_comments: todos leem" on public.community_comments
  for select to authenticated using (not hidden or user_id = (select auth.uid()));

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id uuid references public.community_posts (id) on delete cascade,
  comment_id uuid references public.community_comments (id) on delete cascade,
  reason text not null check (reason in ('ofensivo', 'spam', 'golpe', 'dados_pessoais', 'outro')),
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
create unique index community_reports_post_uniq on public.community_reports (user_id, post_id) where post_id is not null;
create unique index community_reports_comment_uniq on public.community_reports (user_id, comment_id) where comment_id is not null;
alter table public.community_reports enable row level security;
create policy "community_reports: ver as próprias" on public.community_reports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "community_reports: denunciar o que é dos outros" on public.community_reports
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (post_id is null or exists (select 1 from public.community_posts p where p.id = post_id and p.user_id <> (select auth.uid())))
    and (comment_id is null or exists (select 1 from public.community_comments c where c.id = comment_id and c.user_id <> (select auth.uid())))
  );

create or replace function public.apply_community_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.post_id is not null and (select count(*) from public.community_reports r where r.post_id = new.post_id) >= 3 then
    update public.community_posts set hidden = true where id = new.post_id;
  end if;
  if new.comment_id is not null and (select count(*) from public.community_reports r where r.comment_id = new.comment_id) >= 3 then
    update public.community_comments set hidden = true where id = new.comment_id;
  end if;
  return new;
end;
$$;
create trigger community_reports_apply after insert on public.community_reports for each row execute function public.apply_community_report();
