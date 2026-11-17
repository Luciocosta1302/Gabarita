-- Tutoriais de primeira vez e slides (PPTX) como material.

-- ---------------------------------------------------------------------------
-- Tutoriais: quais o aluno já viu (boas-vindas + um por ferramenta)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column tutorials_seen text[] not null default '{}'
  constraint profiles_tutorials_seen_max check (cardinality(tutorials_seen) <= 100);

-- O aluno não edita a coluna direto: só por esta função, com chave curta e conhecida no formato.
create or replace function public.set_tutorial_seen(p_key text, p_seen boolean default true)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text[];
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_key = '*' and not p_seen then
    -- "ver os tutoriais de novo": limpa tudo
    update public.profiles set tutorials_seen = '{}' where id = auth.uid() returning tutorials_seen into result;
    return result;
  end if;
  if p_key !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'chave inválida';
  end if;
  update public.profiles
  set tutorials_seen = case
    when p_seen then (select array_agg(distinct k) from unnest(tutorials_seen || p_key) as k)
    else array_remove(tutorials_seen, p_key)
  end
  where id = auth.uid()
  returning tutorials_seen into result;
  return result;
end;
$$;
revoke execute on function public.set_tutorial_seen(text, boolean) from public, anon;
grant execute on function public.set_tutorial_seen(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Slides (PowerPoint/Google Slides exportado em PPTX)
-- ---------------------------------------------------------------------------
alter table public.materials drop constraint materials_type_check;
alter table public.materials add constraint materials_type_check
  check (type in ('pdf', 'image', 'docx', 'pptx', 'text', 'audio', 'youtube', 'web', 'past_exam'));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
  'audio/ogg', 'audio/webm', 'audio/aac',
  'text/plain'
]
where id = 'materials';
