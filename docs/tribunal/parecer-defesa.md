# Parecer da DEFESA — Gabarita (27 funcionalidades)

Consultado: o caso inteiro, CLAUDE.md §8, telas `inicio-conversas.png`, `anim-erro.png`, `noticia-conferida.png`, `validateQuestions` em `lib/generate/questions.ts`, inventário de testes em `tests/` (unit, integration, e2e cobrem praticamente todas as fases e páginas extras).

Tese geral: o núcleo (material → questão com fonte → erro → revisão → plano) é um ciclo fechado em que cada peça alimenta a seguinte. A defesa é forte aí e mais fraca nas peças de "vitrine" (comunidade, notícias, avatar).

**1. Envio de material** — Valor: porta de entrada; aceita o que o aluno realmente tem (PDF, slides, foto do caderno, áudio, YouTube). Diferencial: StudyAI aceita PDF/foto; aqui também PPTX, áudio, link e vídeo; botão "+ Material" fixo no topo. Evidência: e2e `links.spec.ts`, `fase1.spec.ts`; proteção SSRF; "Tentar de novo". Fortalecer: progresso por etapa e tempo estimado. Riscos: áudio/YouTube dependem do Gemini grátis; vídeo longo não testado; muitos formatos = muitos modos de falha.

**2. Cada arquivo vira uma conversa + pastas opcionais** — Valor: tira o atrito de organizar antes de usar. Diferencial: padrão NotebookLM com resposta citando página. Evidência: "Conversas" no Início e "Sem pasta / organize depois"; `pastas.test.ts`. Fortalecer: sugerir pasta pelo conteúdo. Riscos: chat RAG não é diferencial; Gemini lento atrapalha.

**3. Questões com fonte (D1)** — Valor: ataca o maior medo (questão inventada). Diferencial: citação conferida no texto e questão sem prova descartada — garantia verificável. Evidência: "Ver no material (p. 1)"; testes `quote.test.ts`, `validation.test.ts`. Fortalecer: selo "conferida no material" e contagem de descartadas. Riscos: a citação confere, mas o raciocínio da alternativa correta ainda pode errar; descartar reduz quantidade.

**4. Medidor de falsa certeza (D7)** — Valor: revela ilusão de competência (metacognição). Diferencial: confiança alimenta também o FSRS. Fortalecer: alerta direto "você tem certeza em X e erra 40%: revise X hoje". Riscos: um clique a mais por questão; precisa de volume para o número ter sentido.

**5. Caderno de erros (D6)** — Valor: transforma erro em ação; aluno raramente mantém um sozinho. Diferencial: automático, com "por que errou" + questão parecida, resolve ao acertar. Fortalecer: agrupar por tópico e tipo de erro. Riscos: chamada de IA por erro pesa na cota; discursiva fica de fora.

**6. Repetição espaçada FSRS (D3)** — Valor: é o que faz a memória durar até a prova; técnica com mais evidência científica da lista. Diferencial: FSRS > SM-2, mistura cartões e erros, nota derivada da confiança. Fortalecer: limitar a fila diária perto da prova. Riscos: sem hábito, a fila acumula; sem WhatsApp, sumiu o lembrete externo.

**7. Mapa de domínio (D8)** — Valor: responde "onde estudar agora". Diferencial: tópicos do material do próprio aluno. Fortalecer: renomear/juntar tópicos. Riscos: agrupamento da IA pode ficar estranho; "sem dados" até o aluno responder bastante.

**8. Plano reverso (D2)** — Valor: resolve "por onde começo" e "atrasei, e agora?"; coração da frase do produto. Diferencial: determinístico (sem IA), proporcional ao que falta dominar; "Não fiz" redistribui. Evidência: `planner.test.ts`. Fortalecer: notificação do dia (push web) e aviso de plano apertado. Riscos: depende de o aluno informar a data; com "Sem pasta", muitos podem nunca chegar ao plano.

**9. Simulado + estilos de banca (D16, D5)** — Valor: treina ritmo; o formato da banca (Cebraspe) muda a estratégia. Diferencial: abre o público de concurso; cronômetro no servidor e relatório por tópico. Fortalecer: comparar com nota de corte histórica. Riscos: "estilo de banca" gerado por IA é aproximação.

**10. Prova do Professor (D4)** — Valor: "como ESSE professor cobra" é a pergunta nº 1 do universitário. Diferencial: não há concorrente que faça; o diferencial mais defensável. Evidência: perfil com pegadinhas e tópicos prováveis ligados ao material; +75% no plano. Fortalecer: deixar os "tópicos com mais chance" visíveis e compartilháveis na turma. Riscos: com 1–2 provas a previsão é frágil e precisa avisar; depende de ter provas antigas.

**11. Discursivas com rubrica (D10)** — Valor: faculdade e concurso cobram discursiva e ninguém corrige. Diferencial: nota por critério + resposta-modelo. Evidência: `rubricScore` testado. Fortalecer: rubrica do edital/professor; marcar onde perdeu ponto. Riscos: correção por modelo lite inconsistente; aluno confiar demais.

**12. Modo Feynman (D9)** — Valor: testa entendimento. Diferencial: compara com o material, aceita voz. Fortalecer: sugerir Feynman no tópico com falsa certeza alta. Riscos: nicho; transcrição real não testada.

**13. Foto da questão (D11)** — Valor: o uso mais frequente de IA entre estudantes. Diferencial: une resolução a "onde estudar no SEU material". Fortalecer: "virar flashcard/entrar na revisão". Riscos: concorre com ChatGPT/Gemini/Photomath; usa conhecimento geral (fora da garantia D1); modelo lite pode errar em exatas.

**14. Resumo, áudio e flashcards** — Valor: paridade com o concorrente; áudio no ônibus. Diferencial: limitado (TTS grátis; flashcards direto no FSRS). Fortalecer: flashcards com fonte. Riscos: commodity; voz depende do aparelho.

**15. Trilhas + Tutor IA** — Valor: caminho guiado com adaptação ao erro. Diferencial: só avança com 2 acertos; questões com fonte; pedagogicamente sólido. Fortalecer: unir trilha e plano (tarefa do dia = próxima etapa). Riscos: sobrepõe o plano; muitas chamadas de IA por etapa.

**16. Espaço de estudos** — Valor: lugar para "sentar e estudar"; o Pomodoro conta como dia estudado. Diferencial: áudio gerado no navegador (sem custo/direitos); cenários próprios reforçam a identidade. Fortalecer: meta da sessão abrir a tarefa do plano. Riscos: há muitos apps de Pomodoro; o valor depende da integração.

**17. Desempenho** — Valor: "o que fazer agora" reúne os sinais. Fortalecer: levar isso para o Início. Riscos: sobrepõe mapa e conquistas; relatórios costumam ter pouco uso.

**18. Diário** — Valor: reflexão e humor; o acompanhamento detecta frustração repetida. Diferencial: baixo custo. Fortalecer: registro de 10 s no fim do Pomodoro. Riscos: defesa limitada; exige disciplina; candidato a secundário.

**19. Conquistas, XP e níveis** — Valor: retenção (modelo Duolingo); selos da semana dão objetivo diário. Diferencial: casam com a identidade; custo zero de manutenção. Fortalecer: pesar mais ações que geram aprendizado. Riscos: gamificação mal calibrada estimula "farmar XP".

**20. Perfil e avatar** — Valor: identidade e motivo para subir de nível. Fortalecer: avatar no ranking da turma. Riscos: defesa fraca para um produto em lançamento; não melhora o estudo; valor só com rede social ativa.

**21. Turmas (D14)** — Valor: mecanismo de crescimento ("1 aluno traz a sala"). Diferencial: material importado já processado; gabarito protegido. Fortalecer: convite com prévia e Prova do Professor compartilhada. Riscos: precisa de massa crítica; turma vazia é tela morta; direitos autorais de material compartilhado.

**22. Comunidade** — Valor: tirar dúvida entre alunos. Diferencial: quase nenhum frente a Discord/WhatsApp/Brainly. Fortalecer: restringir à turma ou à pasta. Riscos: defesa limitada; sem moderação humana, com público menor de idade, é risco legal e de imagem.

**23. Biblioteca** — Valor: achar "onde estava aquilo"; busca por sentido. Fortalecer: unir com Início/Pastas. Riscos: sobrepõe pastas e conversas.

**24. Anotações** — Valor: "virar material" fecha o ciclo. Fortalecer: anotar a partir de um trecho. Riscos: concorre com Notion/Keep.

**25. Notícias** — Valor: para concurseiro, edital na hora importa. Diferencial: resumo conferido frase a frase, fonte sempre visível — cuidado raro contra desinformação. Fortalecer: ligar a notícia à pasta ("edital saiu → criar pasta com data"). Riscos: fora do foco central; feeds não conferidos em produção; manutenção.

**26. Personagens, animações e sons** — Valor: emoção e vontade de voltar; erro acolhedor. Diferencial: identidade marcante ("menos cara de IA"). Fortalecer: variar falas; nada atrasar a próxima questão. Riscos: peso em celular fraco; som (desligável).

**27. Tutoriais** — Valor: com 27 funcionalidades o aluno se perde; o guia é necessário. Diferencial: tour pergunta o objetivo e termina em "Adicionar material". Fortalecer: tour mais curto e foco no primeiro sucesso em < 2 min. Riscos: sintoma de excesso de funcionalidades.

## Ranking da Defesa (mais → menos defendida)
1. Questões com fonte (3) · 2. Prova do Professor (10) · 3. Caderno de erros (5) · 4. FSRS (6) · 5. Plano reverso (8) · 6. Envio de material (1) · 7. Conversa por arquivo (2) · 8. Falsa certeza (4) · 9. Simulado + banca (9) · 10. Mapa de domínio (7) · 11. Turmas (21) · 12. Personagens/sons (26) · 13. Tutoriais (27) · 14. Discursivas (11) · 15. Foto da questão (13) · 16. Trilhas (15) · 17. Espaço (16) · 18. Conquistas (19) · 19. Resumo/flashcards (14) · 20. Desempenho (17) · 21. Feynman (12) · 22. Anotações (24) · 23. Biblioteca (23) · 24. Notícias (25) · 25. Diário (18) · 26. Avatar (20) · 27. Comunidade (22).

Fecho: os itens 1–10 formam um ciclo coerente e testado que nenhum concorrente brasileiro entrega junto; do 16 em diante agregam identidade/retenção, mas disputam a atenção do aluno e do único mantenedor.
