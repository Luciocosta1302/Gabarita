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

## Login com Google

1. Crie um OAuth Client (Web) no Google Cloud. Redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.
2. Preencha `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e `_SECRET` no ambiente, mude `enabled = true` em
   `[auth.external.google]` no `supabase/config.toml` e reinicie o Supabase.
3. Ponha `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` no `.env.local` para mostrar o botão.
