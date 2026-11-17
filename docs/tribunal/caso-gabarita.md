# Caso: Gabarita — julgamento de todas as funcionalidades

## O produto
Gabarita (https://gabarita-6wt6.vercel.app) é um app web (celular primeiro) de estudos para brasileiros: universitários e quem faz ENEM/vestibular ou concurso.
Frase: "Manda seu material e a data da prova. O Gabarita monta o plano, as questões e te avisa o que você ainda não sabe."
Identidade: visual japonês "caderno de selos" (papel washi, carimbo 合), três personagens (Mochi, gatinha; Daru, daruma; Fuku, coruja professora), animações e sons no estilo Duolingo.

## Objetivo (hipótese explícita)
Ser o app em que o aluno confia para estudar para uma prova específica: material próprio → questões com fonte → plano até a prova → revisão do que esquece. Crescer por indicação (turmas). Hoje: projeto de uma pessoa, em fase de lançamento, sem usuários pagantes.

## Restrições
- Dono sem orçamento para IA paga agora: usa **Gemini na cota grátis** (lento às vezes, limite de chamadas por minuto/dia).
- Tudo gratuito para todos (assinatura e WhatsApp foram removidos por decisão do dono).
- Uma pessoa mantendo; hospedagem Vercel + Supabase (planos grátis).
- Público no celular, muitas vezes com internet ruim.

## Funcionalidades em julgamento
(“Onde” = tela; “Limites” = o que se sabe de fraco.)

1. **Envio de material** — PDF, slides PPTX, Word, fotos (OCR pela IA), áudio de aula (transcrição), link de página, YouTube (a IA assiste o vídeo), texto colado. Limite 20 MB/100 páginas. Onde: botão "Adicionar material" sempre visível, `/adicionar`. Limites: áudio/YouTube dependem do Gemini; vídeo > ~40 min não testado.
2. **Cada arquivo vira uma conversa + pastas opcionais** — enviar sem pasta ("Sem pasta"), mover depois; chat com o arquivo, sugestões de pergunta, respostas citando a página. Onde: Início → Conversas; `/chat`.
3. **Questões com fonte (D1)** — múltipla escolha geradas do material; cada questão guarda o trecho e a página; a citação é conferida no texto (questão sem prova é descartada); "Ver no material".
4. **Medidor de falsa certeza (D7)** — antes de responder, o aluno marca chutei/acho/tenho certeza; mostra "você tem certeza e erra X%".
5. **Caderno de erros (D6)** — toda questão errada vai para o caderno com "por que errou" e uma questão parecida nova.
6. **Repetição espaçada FSRS (D3)** — flashcards e questões erradas voltam na hora certa; tela "Revisar hoje".
7. **Mapa de domínio por tópico (D8)** — a IA agrupa os trechos em tópicos; domínio 0–100% por tópico.
8. **Plano reverso até a prova (D2)** — com data da prova e horas/dia, plano diário; "Não fiz" redistribui as tarefas.
9. **Simulado cronometrado + estilos de banca (D16, D5)** — ENEM, Cebraspe (certo/errado), FGV, FCC, Vunesp, discursiva; relatório de tempo e tópicos fracos.
10. **Prova do Professor (D4)** — subir provas antigas; a IA extrai o estilo e os tópicos com mais chance de cair; questões nesse estilo.
11. **Discursivas com rubrica (D10)** — questões abertas corrigidas por critério (conteúdo, clareza, termos).
12. **Modo Feynman (D9)** — o aluno explica por texto ou voz; a IA compara com o material e diz o que acertou/faltou/errou.
13. **Foto da questão (D11)** — foto de qualquer questão: resolução passo a passo + onde estudar isso no material.
14. **Resumo, resumo em áudio e flashcards** — resumo por material; leitura em voz pelo navegador; flashcards gerados.
15. **Trilhas + Tutor IA** — caminho por etapas com pré-requisitos; o tutor explica, faz questão, se errar explica de outro jeito; conclui com 2 acertos seguidos.
16. **Espaço de estudos** — Pomodoro, música lo-fi e chuva gerados no navegador, cenários ilustrados que mudam com a hora e são desbloqueados por minutos de foco, metas da sessão.
17. **Desempenho** — números, gráficos semanais, "o que fazer agora", falsa certeza.
18. **Diário de aprendizagem** — registro do que aprendeu/dificuldade/humor; a IA faz um acompanhamento semanal.
19. **Conquistas, XP e níveis** — 26 medalhas (selos com kanji), XP por atividade, selos da semana no Início.
20. **Perfil e avatar personalizável** — @, bio, XP/nível; avatar com personagem, cores e roupas liberadas por nível; perfil público `/u/@`.
21. **Turmas (D14)** — sala com convite; materiais compartilhados; simulado da turma; ranking semanal.
22. **Comunidade** — posts por categoria, respostas, curtidas, denúncia (3 denúncias escondem); sem painel de moderação humana.
23. **Biblioteca** — todos os materiais por pasta, busca por texto e "por sentido".
24. **Anotações** — notas por pasta com salvamento automático; virar material.
25. **Notícias sobre estudos** — fontes escolhidas (g1, Agência Brasil, Folha, MEC, Inep, Porvir, região via Google Notícias, RSS próprio), filtros por período/#etiqueta/busca; "Resumo da Fuku" conferido frase a frase com o texto (o que não confere é descartado); fonte, ícone e link sempre visíveis. Limites: feeds ainda não conferidos em produção.
26. **Personagens, animações e sons** — Mochi/Daru/Fuku falando e reagindo, pétalas, carimbos, comemoração de tela cheia, sons de koto (desligáveis).
27. **Tutoriais** — tour de boas-vindas (pergunta o objetivo de estudo) e guia "Como usar" na primeira visita de cada ferramenta.

## Onde olhar (opcional)
- Descrição técnica detalhada: `CLAUDE.md`, seção 8 (raiz do projeto).
- Telas (prints recentes, celular): pasta `/tmp/claude-0/-home-user-Gabarita/c27b6079-1d4e-570b-8383-4f8b44d2a895/scratchpad/ui/` — `inicio-conversas.png`, `add-mobile.png`, `chat-mobile.png`, `pasta-mobile.png`, `anim-acerto.png`, `anim-erro.png`, `anim-celebracao.png`, `espaco-img.png`, `perfil-topo.png`, `editor-mobile.png`, `noticias-lista.png`, `noticia-conferida.png`, `tour-1.png`.
- Código: `app/(app)/*` (telas), `lib/*` (regras).
