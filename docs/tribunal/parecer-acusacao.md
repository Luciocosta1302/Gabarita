# Parecer da ACUSAÇÃO — Gabarita (27 funcionalidades)

Consultado: o caso; telas `inicio-conversas.png`, `pasta-mobile.png`, `anim-celebracao.png`, `noticia-conferida.png`; `lib/generate/questions.ts` (validateQuestions); `lib/api/route.ts` (limites de IA 15/min, 400/dia por aluno); CLAUDE.md §8.

Tese geral: a promessa central depende de uma única cota grátis do Gemini compartilhada por todos os alunos e de uma única pessoa para manter. Com 27 frentes, cada uma que chama IA disputa essa cota com o caminho principal, e cada uma que não chama disputa a atenção do aluno e o tempo do mantenedor.

**1. Envio de material** — Problema real; acusação fraca no essencial. Riscos: 8 formatos; foto/áudio/YouTube passam pelo Gemini grátis — um vídeo de 40 min (~216 mil tokens) pode esgotar a cota de vários colegas no pico; YouTube em área cinzenta de direitos/Termos; áudio inteiro em base64 (~14 MB) pesa em internet ruim. Cada formato é um caminho de erro (PDF e sharp já derrubaram rotas). Mudaria de ideia com: taxa de sucesso por formato em produção > 95%.

**2. Conversa por arquivo + pastas** — Problema real. Riscos: modelo mental duplo ("Conversas" e "Suas pastas", com "Sem pasta" como capa de caderno); três caminhos para o mesmo material (Início, Biblioteca, Pasta); empurra o aluno para o chat, onde o ChatGPT já vence, afastando do diferencial plano + questões; mover reagrupa tópicos gastando IA. Mudaria com: dados de que quem começa pela conversa gera questões e volta no dia seguinte.

**3. Questões com fonte (D1)** — Problema real e principal argumento. Falha: `validateQuestions` (questions.ts:58) só confere que a citação existe; não confere se o gabarito está certo nem se as distratoras estão erradas — um trecho verdadeiro com alternativa errada passa, e o selo "tem fonte" dá confiança indevida. Descartes gastam cota. Ainda assim é a melhor ideia do app; a acusação é contra o tamanho da promessa. Mudaria com: auditoria humana de ~100 questões com gabarito correto > 95%, ou segunda checagem barata do gabarito.

**4. Falsa certeza (D7)** — Problema real. Riscos: toque extra obrigatório em toda questão cansa no celular; com poucas respostas o "%" é ruído. Custo baixo; acusação moderada. Mudaria com: abandono de quiz não subir e um mínimo de respostas antes de mostrar o %.

**5. Caderno de erros (D6)** — Problema real. Riscos: cada erro dispara IA (10 erros num simulado = 10 chamadas na cota compartilhada); a questão parecida herda a fraqueza do item 3 (gabarito errado ensina errado duas vezes); sobreposição com a revisão FSRS (o mesmo erro em dois lugares). Mudaria com: taxa de acerto da parecida > 50%.

**6. FSRS (D3)** — Problema real, base científica; acusação fraca. Riscos: pilha de revisões que o aluno abandona (efeito Anki); nota derivada da confiança não validada; concorre com plano e caderno em "o que fazer hoje". Mudaria com: retenção de 7/30 dias de quem revisa.

**7. Mapa de domínio (D8)** — Problema real. Fragilidade: tópicos por IA, trecho sem resposta herda o anterior → tópicos ruins; mover material refaz o agrupamento; "sem dados" por semanas. Mudaria com: avaliação humana de tópicos em PDFs reais.

**8. Plano reverso (D2)** — Problema real e central; puro, sem IA; acusação fraca no conceito. Fragilidade de produto: na tela da pasta, o plano está enterrado como um card depois de "Arquivos e conversas" — a espinha do app virou mais uma ferramenta numa grade de 8. Esforço proporcional a nº de trechos, sem calibração. Mudaria com: % de alunos com data de prova que abrem o plano 3+ dias/semana.

**9. Simulado + bancas (D16, D5)** — Problema real. Riscos: "estilo FGV/FCC/Vunesp" só por prompt num modelo lite → genérico, e o nome da banca sugere fidelidade que não há; simulado de 20 questões é geração grande (espera); discursiva vira objetiva no simulado (confuso). Mudaria com: teste cego com concurseiros reconhecendo a banca.

**10. Prova do Professor (D4)** — Problema real, promessa arriscada: estilo de 2–3 provas é estatística fraca; "tópicos com mais chance de cair" pode levar o aluno a pular matéria (risco ético e de reputação); provas podem ter direitos do professor/instituição; refaz o perfil com todas as provas a cada nova (custo cresce). Mudaria com: comparar previsto × cobrado após provas reais e aviso claro de incerteza.

**11. Discursivas com rubrica (D10)** — Problema real. Riscos: consistência baixa da nota da IA; rubrica 50/25/25 não é a da banca; aparência de correção oficial; chamada longa por correção; fora do caderno e da revisão (não entra no ciclo). Mudaria com: teste de concordância (5 correções, variação ≤ 1 ponto) e comparação com humano.

**12. Modo Feynman (D9)** — Bom pedagogicamente, pouco frequente. Riscos: áudio WAV de 3 min em internet ruim; transcrição real não testada; julgamento "errado" desanima; 2 chamadas; terceira forma de "a IA te avalia" (com discursivas e tutor). Mudaria com: uso recorrente (3+ vezes) e transcrição real funcionando.

**13. Foto da questão (D11)** — Problema real e frequente. Riscos: resolve com conhecimento geral — quebra a regra "só o material" e o diferencial de confiança; vira resolvedor genérico com modelo lite; facilita cola em provas online; visão na cota grátis. Mudaria com: medida de acerto e cliques em "onde estudar".

**14. Resumo, áudio, flashcards** — Paridade; acusação fraca. Riscos: resumo de material longo por partes pode omitir conteúdo; voz pt-BR do Android varia; flashcards em massa engordam a fila FSRS. Mudaria com: taxa de flashcards revisados, não só gerados.

**15. Trilhas + Tutor** — Problema já resolvido pelo plano; quatro respostas para "o que estudo agora" (trilha, plano, revisão, caderno). A mais faminta de IA (montar, explicar, gerar, diagnosticar, reexplicar) e mais dependente da qualidade do modelo; já teve bugs de estado. Custo de oportunidade alto. Mudaria com: quem usa trilha conclui etapas e melhora mais que quem usa só quiz + plano.

**16. Espaço de estudos** — Dezenas de apps grátis fazem isso. Riscos: "Começar a estudar" (vermelho) acima de "Revisar hoje" — a ação principal do Início é um timer, não o material/plano; música gerada perde para lo-fi do YouTube; cenários desbloqueáveis são manutenção de arte. Mudaria com: correlação entre uso do Espaço e sessões de questões.

**17. Desempenho** — Sobreposto a mapa, medidor e Início; gráficos de 8 semanas vazios no lançamento; quinta fonte de recomendação. Custo baixo; acusação moderada. Mudaria com: visitas e cliques no "o que fazer agora".

**18. Diário** — Suposição (poucos mantêm diário). Riscos: humor e dificuldades são dados pessoais sensíveis (LGPD) enviados a IA de terceiros na cota grátis (que pode servir para treinar modelos — conferir termos e informar); sugestão de pausa por frustração encosta em saúde mental sem salvaguarda. Mudaria com: retenção do diário e política de privacidade clara.

**19. Conquistas, XP, níveis** — 26 medalhas + XP + níveis + selos antes de haver usuários. Riscos: XP por atividade incentiva quantidade (e consome cota); kanji exige tooltip; manutenção da tabela de XP a cada ferramenta. Mudaria com: A/B de retenção.

**20. Perfil e avatar** — Suposição (desejo de quem faz, não dor de quem estuda). Riscos: perfil público `/u/@` com bio expõe alunos possivelmente menores, sem controle de privacidade; @ único abre impersonação e assédio; itens por nível = mais arte para manter; feito antes de haver usuários. Mudaria com: perfil privado por padrão e dados de uso.

**21. Turmas (D14)** — Hipótese de crescimento; acusação moderada. Riscos: importar material de colega copia conteúdo (apostilas pagas); ranking soma acertos nas próprias questões (inflável gerando questões fáceis); quem tem o link entra, sem moderação; Comunidade é um segundo espaço social. Mudaria com: coeficiente viral medido.

**22. Comunidade** — Suposição; espaço vazio é antipropaganda. Riscos graves: sem moderação humana, público possivelmente menor de idade → assédio, pirataria, golpes; 3 denúncias escondem (grupo pode calar alguém) e só o banco desfaz; manutenção contínua. Mudaria com: painel de moderação, termo de uso e massa crítica antes de abrir.

**23. Biblioteca** — Real mas pequeno; duplica Início, Pastas e Conversas; busca por sentido gasta embedding; ocupa 1 dos 4 ícones da barra do celular. Mudaria com: uso da busca vs. navegação por pastas.

**24. Anotações** — Concorre com Notion/Keep sem diferencial além de "virar material"; salvamento automático em internet ruim pode perder/sobrescrever. Acusação de dispersão. Mudaria com: uso recorrente e conversões em material.

**25. Notícias** — Existem sites e canais dedicados. Riscos legais/éticos: buscar e resumir texto de jornais pode violar direitos e paywall; o "Resumo da Fuku" com a marca do app faz o app virar fonte; a verificação confere literalidade, não contexto (frase verdadeira fora de contexto passa); feeds não conferidos em produção; proxy de favicon é superfície de ataque extra. Custo de oportunidade alto; sem relação com "estudar para a sua prova". Mudaria com: feeds funcionando, autorização das fontes e uso entre concurseiros.

**26. Personagens, animações, sons** — Identidade legítima e visual bom. Riscos: comemoração de tela cheia a cada quiz cansa e atrasa (clique extra); "Muito bem!" com 2/3 dilui o reforço; animações e Web Audio pesam em Android de entrada; três personagens = complexidade de roteiro. Moderada (reduzir movimento e som desligável). Mudaria com: medidas de desempenho num Android barato e preferência de usuários.

**27. Tutoriais** — Real, mas é sintoma: 27 funcionalidades pedem guia em cada tela. Tour de 6 passos adia o momento de valor; "Como usar" em tudo vira ruído. Mudaria com: conclusão do tour e tempo até o 1º material, com vs. sem tour.

## Ranking das mais problemáticas
1. Comunidade (22) · 2. Notícias (25) · 3. Prova do Professor (10) · 4. Trilhas + Tutor (15) · 5. Perfil público e avatar (20) · 6. Diário (18) · 7. Foto da questão (13) · 8. Discursivas (11) · 9. Espaço de estudos (16) · 10. Conversa por arquivo + pastas (2).

Acusações fracas (a ideia se sustenta): 1, 3, 6, 8, 14 — o caminho principal. Ressalva mais séria no item 3: a checagem confere a citação, não o gabarito; antes de vender "questões confiáveis", auditar se as respostas certas estão de fato certas.
