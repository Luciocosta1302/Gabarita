# Gabarita — Plano de construção (para colar no Claude Code)

> Cole este arquivo na raiz de um repositório vazio como `CLAUDE.md` (ou mande no primeiro prompt) e diga:
> **"Leia o CLAUDE.md e execute a Fase 0. Pare no fim de cada fase, rode os testes e me mostre o que foi feito antes de seguir."**

---

## 1. O produto

**Nome:** Gabarita (de "gabaritar a prova"). Verificar domínio `gabarita.app` / `gabarita.com.br` e o INPI antes de lançar.

**Frase:** "Manda seu material e a data da prova. O Gabarita monta o plano, as questões e te avisa o que você ainda não sabe."

**Diferença do StudyAI:** o StudyAI transforma PDF/foto em questões de múltipla escolha. O Gabarita faz isso **e** organiza o estudo até o dia da prova, aprende o estilo do professor/banca, mostra onde estão as lacunas e corrige respostas abertas.

**Público:** universitários e estudantes de ENEM/concurso no Brasil.

**Design:** não importa agora. Usar shadcn/ui padrão, sem tempo gasto em visual.

---

## 2. Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Supabase**: Auth (e-mail + Google), Postgres, Storage, **pgvector**, Row Level Security em todas as tabelas
- **IA**: camada `lib/ai/` com interface própria (`generateJSON`, `generateText`, `embed`, `transcribe`) para trocar de fornecedor sem mexer no resto
  - Geração: Claude API (`claude-sonnet-5-5`; `claude-haiku-5-5` para tarefas baratas)
  - Embeddings: OpenAI `text-embedding-3-small` (1536 dim) ou Voyage
  - Transcrição de áudio: Whisper (OpenAI)
  - Todas as respostas da IA em **JSON validado com Zod**; se falhar a validação, tenta de novo 1x
- **Extração**: `pdf-parse` para PDF com texto; foto/PDF escaneado vai para a IA com visão (OCR)
- **Jobs em segundo plano**: tabela `jobs` + rota processadora (ou Inngest/Trigger.dev). Upload nunca trava a tela
- **Pagamento** (fase 4): Mercado Pago (Pix + cartão)
- **Testes**: Vitest (unidade) + Playwright (1 fluxo ponta a ponta por fase)
- `.env.example` com todas as chaves; nada de chave no código

---

## 3. Funcionalidades

### 3.1 Base (paridade com o concorrente)
1. **Upload** de PDF, fotos (várias de uma vez), DOCX, texto colado
2. **Processamento**: extrai texto → divide em trechos (~800 tokens, sobreposição 100) → embedding → salva com nº da página
3. **Geração de questões de múltipla escolha** a partir do material, com quantidade e dificuldade escolhidas
4. **Resumo** e **flashcards**
5. **Chat com o material** (RAG), sempre citando página/trecho
6. Histórico e pontuação

### 3.2 Diferenciais (o que faz o Gabarita ganhar)

| # | Funcionalidade | O que faz | Por que é útil |
|---|---|---|---|
| D1 | **Toda questão tem fonte** | Cada questão guarda `chunk_id` + página. Botão "ver no material" abre o trecho exato | Acaba com questão inventada pela IA; aluno confia |
| D2 | **Plano reverso até a prova** | Usuário informa data da prova + horas/dia. Gera plano diário (tópicos, nº de questões, revisões). Se o aluno falta um dia, o plano se reorganiza sozinho | Ninguém sabe por onde começar; isso resolve |
| D3 | **Repetição espaçada (FSRS)** | Flashcards e questões erradas voltam no momento certo. Usar a lib `ts-fsrs` | Memoriza de verdade, não só "faz questão" |
| D4 | **Modo "Prova do Professor"** | Usuário sobe provas antigas. A IA extrai o estilo (tipo de questão, tamanho do enunciado, pegadinhas, tópicos mais cobrados) e salva um "perfil de professor". Novas questões seguem esse perfil + mostra **"tópicos com mais chance de cair"** | Ninguém faz isso. É o maior diferencial |
| D5 | **Estilo de banca** | Presets: ENEM, Cebraspe (certo/errado), FGV, FCC, Vunesp, discursiva | Abre o mercado de concurso, que paga |
| D6 | **Caderno de erros automático** | Toda questão errada vai pro caderno com: por que errou, explicação, trecho do material e **uma questão parecida nova** para tentar de novo | Transforma erro em aprendizado |
| D7 | **Medidor de falsa certeza** | Antes de responder, o aluno marca a confiança (chutei / acho / tenho certeza). O sistema mostra "você tem certeza e erra em X%" por tópico | O aluno descobre o que acha que sabe mas não sabe |
| D8 | **Mapa de domínio** | Cada trecho vira tópico (a IA agrupa). Mapa de calor por tópico: domínio 0–100% | Mostra exatamente onde estudar |
| D9 | **Modo Feynman** | O aluno explica o conceito por texto ou **áudio**. A IA compara com o material e devolve: o que acertou, o que faltou, o que está errado | Testa entendimento, não decoreba |
| D10 | **Correção de discursivas com rubrica** | Questões abertas corrigidas com nota por critério (conteúdo, clareza, uso de termos) | Faculdade e concurso cobram discursiva |
| D11 | **Foto da questão → resolução** | Tira foto de uma questão qualquer: resolve passo a passo **e procura no seu material** onde está a matéria | Junta "tirar dúvida" e "estudar" |
| D12 | **Aula gravada vira material** | Sobe áudio da aula (ou link do YouTube, fase 3) → transcreve → vira material normal | Ninguém revisa áudio de 1h |
| D13 | **Resumo em áudio** | Resumo lido em voz (Web Speech API, grátis) para ouvir no ônibus | Estudo em tempo morto |
| D14 | **Sala da turma** | Cria sala, compartilha link. A turma junta materiais, faz simulado junto e tem ranking semanal | Crescimento viral: 1 aluno traz a sala |
| D15 | **5 questões por dia no WhatsApp** | Questões do plano chegam no WhatsApp, responde lá mesmo (WhatsApp Cloud API) | Brasileiro vive no WhatsApp; mantém o hábito |
| D16 | **Simulado cronometrado** | Simulado com tempo real da prova e relatório no final (tempo por questão, tópicos fracos) | Treina ritmo de prova |

---

## 4. Banco de dados (Supabase)

Todas com `user_id` e RLS "usuário só vê o que é dele" (exceto salas, ver abaixo).

```
profiles(id, name, plan, daily_quota_used, whatsapp_phone, created_at)
subjects(id, user_id, name, exam_date, hours_per_day, exam_style)        -- matéria/prova
materials(id, user_id, subject_id, type, title, storage_path, status, page_count, created_at)
chunks(id, material_id, content, page, topic_id, embedding vector(1536))
topics(id, subject_id, name, summary)
teacher_profiles(id, subject_id, style_json, likely_topics_json)          -- D4
questions(id, subject_id, chunk_id, topic_id, type, stem, options_json, answer, explanation, difficulty, style, source_page)
attempts(id, user_id, question_id, answer, correct, confidence, time_ms, created_at)
flashcards(id, subject_id, chunk_id, front, back)
reviews(id, user_id, item_type, item_id, fsrs_state_json, due_at)         -- D3
error_notebook(id, user_id, attempt_id, why_wrong, followup_question_id)  -- D6
study_plans(id, subject_id, generated_at) / plan_days(id, plan_id, date, tasks_json, done)  -- D2
feynman_sessions(id, user_id, topic_id, transcript, feedback_json)        -- D9
rooms(id, owner_id, subject_id, invite_code) / room_members(room_id, user_id)  -- D14
jobs(id, user_id, kind, payload_json, status, error, created_at)
```

Função SQL `match_chunks(query_embedding, subject_id, k)` para a busca do RAG.

---

## 5. Estrutura de pastas

```
app/
  (auth)/login, signup
  (app)/dashboard, subjects/[id], subjects/[id]/plan, quiz/[id], review, errors, chat/[subjectId], rooms/[code]
  api/ upload, jobs/process, generate/questions, generate/flashcards, chat, feynman, solve-photo, whatsapp/webhook, payments/webhook
lib/
  ai/ (provider.ts, prompts/, schemas.ts)
  ingest/ (extract.ts, chunk.ts, embed.ts)
  rag/ (search.ts)
  srs/ (fsrs.ts)
  planner/ (plan.ts)
  supabase/ (client.ts, server.ts)
supabase/migrations/
tests/
```

**Prompts da IA** ficam em arquivos separados em `lib/ai/prompts/`, um por tarefa, com o schema Zod correspondente. Regra em todos: "use apenas o material fornecido; se não houver base, diga que não há".

---

## 6. Fases (executar em ordem, parar no fim de cada uma)

### Fase 0 — Esqueleto
- Projeto Next.js + TS + Tailwind + shadcn, Supabase local (CLI), migrations, Auth, RLS
- Camada `lib/ai` com mock para testes
- **Pronto quando:** login funciona, criar uma "matéria", testes passam

### Fase 1 — Núcleo (MVP lançável)
- Upload + extração + chunks + embeddings via job (status na tela: processando/pronto/erro)
- Questões de múltipla escolha **com fonte (D1)**, resumo, flashcards
- Chat RAG com citação de página
- Responder quiz, salvar tentativas, **medidor de confiança (D7)**
- **Caderno de erros (D6)**
- **Pronto quando:** subir um PDF de 20 páginas, gerar 10 questões, cada uma abre o trecho certo; errar uma e ela aparecer no caderno com questão parecida

### Fase 2 — O que prende o aluno
- **Repetição espaçada FSRS (D3)** com tela "Revisar hoje"
- **Tópicos + mapa de domínio (D8)**
- **Plano reverso (D2)** com replanejamento automático
- **Simulado cronometrado (D16)**
- **Estilos de banca (D5)**
- **Pronto quando:** criar matéria com data da prova daqui 14 dias gera plano; marcar um dia como não feito redistribui as tarefas

### Fase 3 — Diferenciais fortes
- **Prova do Professor (D4)**
- **Discursivas com rubrica (D10)**
- **Modo Feynman (D9)** com texto e áudio
- **Foto da questão (D11)**
- **Áudio de aula → material (D12)** e **resumo em áudio (D13)**

### Fase 4 — Crescimento e dinheiro
- **Salas da turma (D14)** com ranking semanal
- **WhatsApp diário (D15)**
- **Planos e limites**: Grátis (2 materiais/mês, 30 questões/dia) / Pro (~R$ 19,90/mês, ilimitado + D4, D9, D15). Mercado Pago com Pix
- Controle de custo: contar tokens por usuário em `profiles`, cache de embeddings, Haiku para tarefas simples

---

## 7. Regras para o Claude Code

- Trabalhar **uma fase por vez**; no final de cada fase: rodar `lint`, `typecheck`, testes, e listar o que foi feito e o que falta
- Não instalar biblioteca sem dizer para que serve
- Toda chamada de IA passa por `lib/ai` e tem schema Zod
- Toda tabela nova tem RLS e migration
- Toda rota de API valida entrada com Zod e checa o usuário logado
- Limite de upload: 20 MB por arquivo, 100 páginas no plano grátis
- Commits pequenos, mensagem em português
- Design mínimo: funcional primeiro

---

## 8. Estado do projeto (atualizar ao fim de cada fase)

- **Fase 0 — concluída.** Ver README para comandos.
- Decisões tomadas na Fase 0:
  - Todas as tabelas da seção 4 já existem na migration inicial (com `user_id` e RLS), para as fases seguintes só adicionarem colunas/políticas.
  - `chunks` tem `subject_id` redundante para a busca do RAG não precisar de join.
  - Políticas das tabelas filhas checam também se a matéria/questão/tentativa pertence ao usuário (`owns_subject`).
  - `profiles.plan` e `daily_quota_used` só mudam pelo servidor (service role); o usuário só edita `name` e `whatsapp_phone`.
  - Bucket `materials` privado, 20 MB, caminho `<user_id>/...`.
  - `lib/ai`: interface `AIProvider` (generateText, embed, transcribe) + `generateJSON` com Zod e 1 nova tentativa. `AI_PROVIDER=mock` em dev/testes. Fornecedores reais entram na Fase 1.
  - Componentes shadcn em `components/ui` (estilo new-york). Para adicionar mais: `npx shadcn@latest add <nome>`.
- **Fase 1 — concluída** (com IA de teste; a IA real ainda não foi rodada contra as APIs).
- Decisões tomadas na Fase 1:
  - Migration `20261115100000_fase1_nucleo.sql`: `quizzes`, `summaries`, `attempts.quiz_id`, `questions.source_quote/origin`, `chunks.chunk_index`, `materials.error`, `error_notebook.followup_status/resolved_at` e a função `claim_jobs` (só service role).
  - Upload: o navegador manda o arquivo direto para o Storage em `<user_id>/<material_id>/001.ext` (nomes definidos pelo servidor) e chama `/api/upload/complete`. Texto colado vira `001.txt`. Fotos: várias por material, cada foto = 1 página.
  - Jobs (`lib/jobs/queue.ts`): `ingest_material` e `error_followup`. Rodam no `after()` da requisição, pela tela (`/api/jobs/process` como usuário) ou por cron (`JOBS_SECRET`). 3 tentativas; `UserFacingError` não tenta de novo e a mensagem aparece na tela.
  - Extração: `pdf-parse` por página; página com menos de 40 caracteres vai para OCR da IA (PDF inteiro como documento, 10 páginas por chamada). Fotos são reduzidas com `sharp` (1568 px) e lidas pela IA. DOCX/texto viram "partes" de ~3000 caracteres. Limite: 100 páginas (grátis) / 300 (Pro).
  - Trechos: ~800 tokens (aprox. 4 caracteres/token, sem tokenizer) e 100 de sobreposição; cada trecho guarda a página onde começa.
  - D1: a IA devolve número do trecho + citação literal; `validateQuestions` confere a citação no trecho (corrige o trecho ou descarta a questão). Alternativas são embaralhadas no servidor. O navegador nunca recebe o gabarito antes de responder. "Ver no material" = `/chunks/<id>?q=<questão>` → material com o trecho e a citação destacados (+ link do PDF original na página).
  - D6: errou → entrada no caderno + job que gera "por que errou" e questão parecida no mesmo trecho; acertar a parecida marca como resolvido.
  - D7: confiança obrigatória antes de responder; medidor por matéria e por quiz (por tópico entra com os tópicos, Fase 2).
  - IA real: `AnthropicProvider` (Sonnet 5.5 com fallback no servidor para recusas; Haiku 5.5 para OCR/flashcards/resumo parcial) + `OpenAIEmbeddings` (REST, sem SDK). `AI_PROVIDER=mock` usa a função `mock()` de cada prompt.
  - Tema visual inicial (pedido do usuário): paleta lo-fi japonesa (creme, ameixa, rosé, cartões pastel) em `app/globals.css`, menu lateral ameixa. Sem ilustrações ainda.
- Depois da Fase 1 (decisão do usuário: não quer pagar API agora): fornecedor `AI_PROVIDER=gemini` (`lib/ai/providers/gemini.ts`) faz tudo na cota grátis — geração com `gemini-flash-lite-latest` (o `gemini-flash-latest` levou 46–86 s por resposta na cota grátis; dá para escolher com `GEMINI_MODEL_SMART`), OCR de foto/PDF, transcrição e embeddings (`gemini-embedding-001` com 1536 dim). Usa o endpoint **compatível com OpenAI** do Gemini via `fetch` (chave em `Authorization: Bearer`; o endpoint nativo não aceita a chave assim no proxy da nuvem). Em 429/5xx espera 5/15/30 s e tenta de novo (timeout de 2 min por chamada); 429 persistente vira resposta 429 com mensagem amigável. Na nuvem do Claude Code, o Node só passa pelo proxy (que injeta a chave) com `NODE_USE_ENV_PROXY=1`. `embed()` ganhou `{ purpose: "document" | "query" }`. Claude/OpenAI continuam disponíveis com `AI_PROVIDER=anthropic`.
- **Fase 2 — concluída** (testada com IA de teste e conferida à mão com o Gemini real).
- Decisões tomadas na Fase 2:
  - Migration `20261116100000_fase2.sql`: `topics.position`, `reviews.subject_id/last_reviewed_at`, `study_plans` único por matéria + `params_json`, `plan_days.status` (pending/done/missed), `quizzes.mode/style/topic_id/time_limit_s/started_at/finished_at`.
  - D3 (`lib/srs/`): `ts-fsrs` 5.4.2 (retenção 90%, máx. 1 ano, sem fuzz). Entra na revisão: todo flashcard novo e toda questão errada. Resposta → nota: errou = again; acertou chutando = hard; achando = good; com certeza = easy. Acertar questão que nunca errou não entra na fila. Tela `/review` mistura cartões (mostrar resposta + nota) e questões.
  - D8 (`lib/topics/`): job `cluster_topics` (encadeado depois de `ingest_material`) manda o início de cada trecho sem tópico para a IA, que reaproveita tópicos existentes ou cria novos (lotes de 150). Trecho sem resposta herda o tópico do anterior. Domínio = média ponderada das últimas 10 respostas do tópico (recentes pesam mais; acerto chutado = 0,5); sem respostas = "sem dados". Falsa certeza (D7) também por tópico.
  - D2 (`lib/planner/plan.ts`, puro, sem IA): dias de hoje até a véspera; revisão diária fixa; estudo proporcional a (nº de trechos × o que falta dominar), quebrado no espaço livre do dia; 10 questões por tópico; revisitas +2 e +6 dias; penúltimo dia = pontos fracos, último = simulado. Sem material = plano genérico (refeito quando os tópicos chegam). "Não fiz" move as tarefas pendentes (menos a revisão diária) para os próximos dias, evitando a reta final; dias passados sem conclusão viram "não feito" sozinhos ao abrir o plano. Fuso: America/Sao_Paulo (`lib/dates.ts`).
  - D5 (`lib/exam-styles.ts`): cada banca tem formato, nº de alternativas, instruções para a IA e minutos por questão no simulado. Cebraspe = itens Certo/Errado (`type = true_false`, opções fixas, sem embaralhar). Discursiva gera objetivas até a Fase 3 (D10).
  - D16: simulado = quiz `mode = simulado` com tempo pela banca; cronômetro começa no servidor (`/api/simulado/start`), respostas ficam no navegador até entregar (`/api/simulado/finish` corrige tudo); tempo acabou = entrega sozinho. Relatório: aproveitamento, em branco, tempo usado, tempo por questão, tópicos fracos e nota Cebraspe (errada anula certa).
  - Registro de resposta centralizado em `lib/quiz/record.ts` (quiz, revisão, caderno e simulado).
- **Fase 3 — concluída** (testada com IA de teste e conferida à mão com o Gemini real; transcrição de áudio real não foi testada por falta de um áudio com fala).
- Decisões tomadas na Fase 3:
  - Migration `20261117100000_fase3.sql`: `teacher_profiles` único por matéria + `exams_count/updated_at`, `materials.extracted_text`, `questions.rubric_json`, `attempts.score/feedback_json`, `feynman_sessions.subject_id/mode/score`.
  - D4 (`lib/teacher/`, `/subjects/[id]/professor`): prova antiga = material `type = past_exam` (upload com `purpose: "past_exam"`), job `analyze_past_exam` extrai o texto (não vira trecho de estudo) e refaz o perfil com TODAS as provas da matéria. Perfil = tipos de questão, nº de alternativas, tamanho do enunciado, pegadinhas, marcas de estilo, exemplos e tópicos prováveis ligados aos tópicos do material (`mapLikelyTopics`). Questões "Prova do professor" (`style = "professor"`): instruções do estilo no prompt, nº de alternativas dele e trechos dos tópicos com peso ≥ 3. No plano, tópicos prováveis ganham até +75% de tempo. Quando surgem tópicos novos, o perfil é religado.
  - D10: estilo "discursiva" gera questões abertas (`type = open`, resposta-modelo em `answer`, pontos e termos esperados em `rubric_json`). Correção pela IA com rubrica fixa: conteúdo 50%, clareza 25%, termos técnicos 25% (`rubricScore`); nota ≥ 6 conta como acerto no domínio. Discursivas não entram no caderno de erros nem na revisão espaçada; no simulado, discursiva vira objetiva.
  - D9 (`lib/feynman/`, `/subjects/[id]/feynman`): texto ou voz (gravação no navegador, convertida para WAV 16 kHz mono em `lib/audio/wav.ts`, até 3 min); compara com até 6 trechos do tópico; nota 0–100 + acertou/faltou/errado/dica com links para o material.
  - D11 (`lib/solve/`, `/resolver`): foto reduzida no navegador → IA com visão transcreve e resolve passo a passo (com grau de confiança) → busca o assunto no material (matéria escolhida ou as 10 mais recentes). A resolução usa conhecimento geral; o material é só para "onde estudar".
  - D12: áudio de aula (MP3/WAV/M4A...) vira material `type = audio`: transcrição → "partes" de ~3000 caracteres → trechos normais. Com o Gemini grátis só MP3/WAV e até ~14 MB por arquivo (o pedido vai inteiro em base64). Link do YouTube **não** foi feito (baixar legendas/áudio do YouTube é frágil e esbarra nos termos de uso).
  - D13: botão "Ouvir resumo" (Web Speech API do navegador, voz pt-BR, velocidade ajustável).
- Pendências conhecidas: chat não guarda histórico no banco; páginas de DOCX/texto/áudio são aproximadas; IA real sem teste automatizado (precisa de chave); contagem de tokens por usuário fica para a Fase 4; editar data/horas da matéria só pela tela do plano; YouTube (D12) não feito.

## 9. Proposta de design e páginas novas (do usuário, ainda não priorizada)

Estética lo-fi japonesa aconchegante em todas as páginas: tons pastel, ilustrações, animações discretas, cenário que muda com o horário, cenários desbloqueáveis (biblioteca em Kyoto, quarto chuvoso em Tóquio, cafeteria à noite).
Páginas propostas e relação com o plano:
1. **Meu espaço de estudos**: Pomodoro, música lo-fi, sons de chuva, metas da sessão. *Novo.*
2. **Trilhas de aprendizagem + Tutor IA**: caminho com pré-requisitos, etapas liberadas pelo desempenho; o tutor explica, propõe exercício mais simples e só avança quando o aluno entende. *Novo; estende D2, D6 e D8.*
3. **Revisão inteligente**: é o D3 (FSRS, Fase 2).
4. **Biblioteca pessoal**: materiais por disciplina, busca, conversar com cada documento. *Parte já existe (materiais + chat); faltam pastas, busca e chat por documento.*
5. **Simulados com IA**: é o D16 + D5 (Fase 2).
6. **Diário de aprendizagem**: registro ao fim da sessão, IA acompanha a evolução. *Novo.*
7. Também no mock: Desempenho, Conquistas/sequência de dias, Comunidade, Anotações, Perfil. *Novos (Comunidade se aproxima do D14).*
Ordem sugerida pelo usuário: Trilhas + Tutor → Espaço de estudos → Revisão → Simulados → Desempenho.

**Feito depois da Fase 2 (pedido do usuário: "faça as duas"):**
- Migration `20261116200000_trilhas_espaco.sql`: `learning_paths`, `path_steps`, `tutor_messages`, `study_sessions` (todas com RLS) e `questions.origin` aceita `tutor`.
- **Trilhas + Tutor IA** (`lib/paths/`, `/trilhas`): a IA monta a trilha (3–10 etapas, níveis, pré-requisitos) a partir dos tópicos (D8) e do objetivo do aluno; `normalizePath` garante pré-requisitos só de etapas anteriores e todo tópico coberto. Etapa: explicação com citações → questão (`createQuestions`, mesma checagem de fonte D1) → errou: diagnóstico + explicação "de outro jeito" + questão fácil sobre o MESMO trecho; acertou: questão mais difícil. Conclui com 2 acertos seguidos e libera as dependentes. Respostas passam por `recordAttempt` (caderno de erros, FSRS, domínio). Dúvida livre e "explicar de outro jeito" a qualquer momento. Citações `[n]` ou `[T#]` viram link (`lib/text/citations.ts`).
- **Espaço de estudos** (`lib/focus/`, `/espaco`): Pomodoro (25/5, 50/10, 15/3; pausa longa a cada N focos), música lo-fi e chuva **gerados no navegador** (Web Audio, sem arquivos nem música de terceiros), cenário em SVG próprio que muda com o horário (madrugada/amanhecer/dia/entardecer/noite), 4 cenários desbloqueáveis por minutos de foco (0/100/300/600), metas da sessão (do plano de hoje ou livres, guardadas no navegador), sequência de dias. Cada foco concluído vira `study_sessions`.
- **Ainda não feitos da proposta:** Diário de aprendizagem, Desempenho, Conquistas além da sequência, Comunidade, Anotações, Perfil, biblioteca com pastas/busca/chat por documento.
