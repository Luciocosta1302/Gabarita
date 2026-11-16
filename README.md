# Gabarita

Manda seu material e a data da prova. O Gabarita monta o plano, as questões e te avisa o que você ainda não sabe.

O plano completo do produto e das fases está em [`CLAUDE.md`](./CLAUDE.md).

## Rodar localmente

Precisa de Node 22+ e Docker.

```bash
npm install
npx supabase start            # sobe Postgres + Auth + Storage locais (Docker)
cp .env.example .env.local    # preencha NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
npx supabase status           #   ← os valores estão aqui
npm run dev                   # http://localhost:3000
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Testes de unidade (Vitest) |
| `npm run test:db` | Testes de RLS contra o Supabase local |
| `npm run test:e2e` | Fluxo ponta a ponta (Playwright). Rode `npm run build` antes |
| `npm run db:reset` | Recria o banco local aplicando as migrations |
| `npm run db:types` | Gera `lib/supabase/database.types.ts` a partir do banco |

## IA real

Por padrão `AI_PROVIDER=mock`: tudo funciona de ponta a ponta com respostas falsas e sem custo
(cada prompt em `lib/ai/prompts/` tem a sua resposta de teste).

**Grátis (Google Gemini):** crie a chave em https://aistudio.google.com → *Get API key* (só precisa de conta
Google, sem cartão) e no `.env.local`:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

Na cota grátis há limite de pedidos por minuto/dia e o Google pode usar o conteúdo enviado para melhorar
os produtos dele. Para produção com alunos de verdade, prefira um plano pago.

**Pago (Claude + OpenAI):** no `.env.local`:

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...   # geração (Sonnet 5.5) e OCR de fotos/PDF escaneado (Haiku 5.5)
OPENAI_API_KEY=...      # embeddings text-embedding-3-small (1536 dim) e Whisper
```

Trocar de mock para real **não** reaproveita os trechos já processados: os embeddings falsos não servem
para a busca real. Reenvie os materiais (ou rode `npm run db:reset`).

## Processamento em segundo plano

Upload, OCR, embeddings e a "questão parecida" do caderno de erros rodam como jobs (tabela `jobs`).
Eles começam logo depois da requisição (`after()` do Next) e, se algo travar, a própria tela cutuca
`/api/jobs/process`. Em produção, configure também um cron chamando essa rota a cada minuto com
`Authorization: Bearer $JOBS_SECRET` (na Vercel, `CRON_SECRET` + `vercel.json`).

## Login com Google

1. Crie um OAuth Client (Web) no Google Cloud. Redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.
2. Preencha `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e `_SECRET` no ambiente, mude `enabled = true` em
   `[auth.external.google]` no `supabase/config.toml` e reinicie o Supabase.
3. Ponha `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` no `.env.local` para mostrar o botão.

## Pagamentos (Mercado Pago)

O Pro é um pagamento avulso de R$ 19,90 por 30 dias (Pix ou cartão), feito pelo Checkout Pro.

1. No painel do Mercado Pago, crie uma aplicação e copie o **Access Token** de produção para `MERCADOPAGO_ACCESS_TOKEN`.
2. Em *Webhooks*, cadastre `<APP_URL>/api/payments/webhook` com o evento **Pagamentos** e copie a
   **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET`.
3. Configure `APP_URL` com o endereço público do app.

O webhook confere a assinatura e consulta o pagamento na API do Mercado Pago antes de liberar o Pro.
Sem chave, com `PAYMENTS_SIMULATION=true` (só dev/testes), o botão de assinar abre uma tela que simula o Pix.

## WhatsApp (5 questões por dia)

1. Crie um app na Meta com o produto WhatsApp e copie `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`.
2. Webhook: `<APP_URL>/api/whatsapp/webhook`, com o token de verificação em `WHATSAPP_VERIFY_TOKEN`
   e o App Secret em `WHATSAPP_APP_SECRET`; assine o campo `messages`.
3. Aprove um template de mensagem (categoria utilidade, 1 parâmetro = primeiro nome), por exemplo
   "Bom dia, {{1}}! Suas 5 questões do Gabarita chegaram. Responda COMEÇAR." e coloque o nome em `WHATSAPP_TEMPLATE_DAILY`.

Sem as chaves, com `WHATSAPP_SIMULATION=true`, as mensagens aparecem na tela de Perfil.

## Agendadores (cron)

Configure chamadas com `Authorization: Bearer $JOBS_SECRET`:

| Rota | Frequência | Para quê |
|---|---|---|
| `/api/jobs/process` | a cada minuto | fila de processamento (upload, tópicos, provas antigas, caderno de erros) |
| `/api/whatsapp/daily` | a cada hora | convites das 5 questões do dia (na hora escolhida por cada aluno) |
