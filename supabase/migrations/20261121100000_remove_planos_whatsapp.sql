-- Gabarita — decisão do usuário: sem assinatura (tudo liberado para todos) e sem WhatsApp.
-- Remove pagamentos, planos e o envio diário pelo WhatsApp. O controle de uso de IA (ai_usage) continua.
drop table if exists public.whatsapp_messages;
drop table if exists public.whatsapp_sessions;
drop table if exists public.payments;

drop index if exists public.profiles_whatsapp_phone_idx;
alter table public.profiles
  drop column if exists whatsapp_phone,
  drop column if exists whatsapp_opt_in,
  drop column if exists whatsapp_hour,
  drop column if exists pro_until,
  drop column if exists plan,
  drop column if exists daily_quota_used;
