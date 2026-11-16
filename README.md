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

## Agendadores (cron)

Configure chamadas com `Authorization: Bearer $JOBS_SECRET`:

| Rota | Frequência | Para quê |
|---|---|---|
| `/api/jobs/process` | a cada minuto | fila de processamento (upload, tópicos, provas antigas, caderno de erros) |
