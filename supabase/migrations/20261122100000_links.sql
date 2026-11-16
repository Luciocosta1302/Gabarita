-- Gabarita — links como material: páginas da web (e PDFs por link) e vídeos do YouTube.
alter table public.materials add column source_url text check (source_url is null or char_length(source_url) <= 2000);
alter table public.materials drop constraint materials_type_check;
alter table public.materials add constraint materials_type_check
  check (type in ('pdf', 'image', 'docx', 'text', 'audio', 'youtube', 'web', 'past_exam'));
