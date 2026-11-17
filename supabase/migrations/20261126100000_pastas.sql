-- Pastas opcionais: arquivo enviado sem pasta vai para a pasta "Sem pasta" do aluno (uma por aluno).
alter table public.subjects add column inbox boolean not null default false;
create unique index subjects_one_inbox_per_user on public.subjects (user_id) where inbox;
