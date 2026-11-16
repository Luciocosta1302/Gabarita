-- Gabarita — revisão de segurança: limite de requisições por aluno, tipos de arquivo aceitos no Storage
-- e funções internas fora do alcance de quem não está logado.

-- ---------------------------------------------------------------------------
-- Limite de requisições (rate limit) por aluno e por "balde" (geral, IA...), em janelas fixas
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null check (char_length(bucket) <= 40),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (user_id, bucket, window_start)
);
alter table public.rate_limits enable row level security; -- sem políticas: só a função abaixo mexe

-- Conta mais uma requisição do aluno logado; devolve false se passou do limite da janela.
create or replace function public.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_start timestamptz;
  v_hits integer;
begin
  if v_user is null then
    return false;
  end if;
  if p_window_seconds < 1 or p_limit < 1 then
    raise exception 'limite inválido';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (user_id, bucket, window_start, hits)
  values (v_user, p_bucket, v_start, 1)
  on conflict (user_id, bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- faxina ocasional das janelas antigas
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_limit;
end;
$$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.hit_rate_limit(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: só os tipos de arquivo que o app aceita (o tamanho já era limitado a 20 MB)
-- ---------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
  'audio/ogg', 'audio/webm', 'audio/aac',
  'text/plain'
]
where id = 'materials';

-- ---------------------------------------------------------------------------
-- Funções internas: quem não está logado não chama
-- ---------------------------------------------------------------------------
revoke execute on function public.owns_subject(uuid) from public, anon;
grant execute on function public.owns_subject(uuid) to authenticated;
revoke execute on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
-- funções de gatilho não são para chamar direto
revoke execute on function public.add_room_owner() from public, anon, authenticated;
revoke execute on function public.apply_community_report() from public, anon, authenticated;
revoke execute on function public.set_author_name() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
