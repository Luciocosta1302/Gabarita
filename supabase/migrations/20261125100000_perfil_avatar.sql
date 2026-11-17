-- Perfil personalizável: @usuário, bio, avatar (personagem + cores + roupas) e XP guardado para mostrar aos outros.

alter table public.profiles
  add column username text,
  add column bio text,
  add column avatar_json jsonb,
  add column xp_cached integer not null default 0,
  add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 160),
  add constraint profiles_avatar_size check (avatar_json is null or (jsonb_typeof(avatar_json) = 'object' and pg_column_size(avatar_json) <= 1024));

create unique index profiles_username_key on public.profiles (username);

-- O aluno edita os próprios campos públicos; o XP só o servidor grava (calculado das atividades).
grant update (username, bio, avatar_json) on public.profiles to authenticated;

-- Campos públicos de outros alunos (nome, @, avatar, bio, XP) para quem está logado:
-- Comunidade, ranking da turma e página /u/<usuario>. E-mail e o resto ficam de fora.
create or replace function public.public_profiles(p_ids uuid[])
returns table (id uuid, name text, username text, bio text, avatar_json jsonb, xp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(p.name, 'Aluno'), p.username, p.bio, p.avatar_json, p.xp_cached
  from public.profiles p
  where p.id = any(p_ids)
  limit 200;
$$;
revoke execute on function public.public_profiles(uuid[]) from public, anon;
grant execute on function public.public_profiles(uuid[]) to authenticated;

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
  where p.username = lower(p_username);
$$;
revoke execute on function public.public_profile_by_username(text) from public, anon;
grant execute on function public.public_profile_by_username(text) to authenticated;
