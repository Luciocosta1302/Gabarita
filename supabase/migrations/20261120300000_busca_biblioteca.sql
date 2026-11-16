-- Gabarita — Biblioteca: busca por sentido em todos os materiais do aluno.
create index if not exists chunks_user_id_idx on public.chunks (user_id);

create or replace function public.match_user_chunks(query_embedding extensions.vector(1536), k integer default 10)
returns table (id uuid, material_id uuid, subject_id uuid, content text, page integer, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.material_id, c.subject_id, c.content, c.page,
         1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.chunks c
  where c.user_id = (select auth.uid()) and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(k, 1), 30);
$$;
