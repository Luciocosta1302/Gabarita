-- Notícias: site de origem de cada notícia (para mostrar a fonte e o ícone dela).
alter table public.news_items add column source_domain text;
-- resumos antigos (sem conferência com o texto) são descartados: serão refeitos com a verificação
update public.news_items set summary_json = null, summarized_at = null where summary_json is not null;
