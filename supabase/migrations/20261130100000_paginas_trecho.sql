-- Um trecho (~800 tokens) pode atravessar várias páginas/slides. page_breaks guarda
-- [posição no conteúdo, página] de cada página que começa dentro do trecho, para a questão
-- apontar a página exata da citação (antes: só a página onde o trecho começava).
alter table public.chunks add column if not exists page_breaks jsonb not null default '[]'::jsonb;
alter table public.chunks add constraint chunks_page_breaks_array check (jsonb_typeof(page_breaks) = 'array');
