-- Decisão do Tribunal de Ideias + usuário: perfil não é público para qualquer conta.
-- Nome, @, avatar, bio e XP só aparecem para o próprio aluno e para colegas de alguma turma em comum.
-- (Fora da turma, a Comunidade mostra só o nome gravado no post e o avatar padrão.)

create or replace function public.shares_room(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_other = auth.uid() or exists (
    select 1
    from public.room_members a
    join public.room_members b on b.room_id = a.room_id
    where a.user_id = auth.uid() and b.user_id = p_other
  );
$$;
revoke execute on function public.shares_room(uuid) from public, anon;
grant execute on function public.shares_room(uuid) to authenticated;

create or replace function public.public_profiles(p_ids uuid[])
returns table (id uuid, name text, username text, bio text, avatar_json jsonb, xp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(p.name, 'Aluno'), p.username, p.bio, p.avatar_json, p.xp_cached
  from public.profiles p
  where p.id = any(p_ids) and public.shares_room(p.id)
  limit 200;
$$;

create or replace function public.public_profile_by_username(p_username text)
returns table (id uuid, name text, username text, bio text, avatar_json jsonb, xp integer, created_at timestamptz, posts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(p.name, 'Aluno'), p.username, p.bio, p.avatar_json, p.xp_cached, p.created_at,
    (select count(*) from public.community_posts c where c.user_id = p.id and not c.hidden)
  from public.profiles p
  where p.username = lower(p_username) and public.shares_room(p.id);
$$;

-- Notícias sem resumo de IA (decisão do usuário): apaga as colunas do resumo.
alter table public.news_items drop column if exists summary_json, drop column if exists summarized_at;
