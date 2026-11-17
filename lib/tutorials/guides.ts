/**
 * Tutoriais de primeira vez. Cada ferramenta tem um guia curto, apresentado por alguém da turma
 * (Mochi recebe, Daru organiza, Fuku explica). Aparece aberto só na primeira visita; depois fica
 * no botão "Como usar". As chaves são gravadas em `profiles.tutorials_seen` (função set_tutorial_seen).
 */

export type GuideWho = "mochi" | "daru" | "fuku";
export type Guide = { title: string; who: GuideWho; intro: string; steps: string[] };

export const WELCOME_KEY = "boas-vindas";

/** Passos do tour de boas-vindas (modal, só no primeiro acesso). */
export const WELCOME_STEPS: { who: GuideWho; title: string; text: string }[] = [
  {
    who: "mochi",
    title: "Bem-vindo ao Gabarita!",
    text: "Eu sou a Mochi. Em quatro passos eu te mostro como o Gabarita funciona. Dá para pular quando quiser.",
  },
  {
    who: "daru",
    title: "1. Crie uma matéria",
    text: "Cada prova é uma matéria (um caderno). Coloque a data da prova e quantas horas por dia você tem: com isso eu monto o seu plano até o dia.",
  },
  {
    who: "mochi",
    title: "2. Adicione o material",
    text: "PDF, slides, Word, fotos do caderno, áudio da aula, link de página ou vídeo do YouTube. O botão vermelho “Adicionar material” fica sempre no alto da tela.",
  },
  {
    who: "fuku",
    title: "3. Estude com o material",
    text: "Eu crio questões com a página de onde saíram, resumo, flashcards, e respondo suas dúvidas citando o material. Na Trilha, explico passo a passo.",
  },
  {
    who: "daru",
    title: "4. Volte todo dia",
    text: "“Revisar hoje” traz o que você está quase esquecendo, e cada dia estudado ganha um selo. Em cada ferramenta nova, um de nós explica como usar.",
  },
];

export const GUIDES = {
  adicionar: {
    title: "Adicionar material",
    who: "mochi",
    intro: "Tudo o que você mandar vira material de estudo: a IA lê, separa por assunto e guarda a página de cada trecho.",
    steps: [
      "Escolha a matéria (ou crie uma nova).",
      "Escolha como enviar: arquivo (PDF, slides, Word, fotos, áudio), link/YouTube ou texto colado.",
      "Espere o selo “pronto” no material — dá para continuar usando o app enquanto isso.",
    ],
  },
  materia: {
    title: "Página da matéria",
    who: "daru",
    intro: "Aqui fica tudo de uma prova: materiais, plano, questões, flashcards e o seu domínio por assunto.",
    steps: [
      "Comece adicionando o material em “Materiais”.",
      "Depois gere questões: escolha quantidade, dificuldade e a banca.",
      "Abra o plano para ver o que estudar em cada dia até a prova.",
    ],
  },
  plano: {
    title: "Plano até a prova",
    who: "daru",
    intro: "Eu divido a matéria pelos dias que faltam, com revisão todo dia e um simulado na véspera.",
    steps: [
      "Marque cada tarefa como feita quando terminar.",
      "Não deu para estudar? Toque em “Não fiz”: eu redistribuo o que ficou para os próximos dias.",
      "Mudou a data da prova ou as horas por dia? Edite a matéria e o plano se ajusta.",
    ],
  },
  quiz: {
    title: "Responder questões",
    who: "fuku",
    intro: "Antes de responder, diga o quanto tem certeza: assim eu descubro o que você acha que sabe mas ainda não sabe.",
    steps: [
      "Marque a confiança (chutei, acho ou tenho certeza) e depois a alternativa.",
      "Toda questão tem “Ver no material”: abre a página exata de onde ela saiu.",
      "Errou? A questão vai para o Caderno de erros com uma parecida para tentar de novo.",
    ],
  },
  simulado: {
    title: "Simulado cronometrado",
    who: "daru",
    intro: "É um ensaio da prova: tempo de verdade e nada de resposta até entregar.",
    steps: [
      "O relógio já está correndo: administre o tempo como no dia da prova.",
      "Pode pular e voltar nas questões; deixar em branco também vale.",
      "Ao entregar (ou quando o tempo acabar), veja o relatório: tempo por questão e assuntos fracos.",
    ],
  },
  espaco: {
    title: "Espaço de estudos",
    who: "mochi",
    intro: "Um cantinho para focar: Pomodoro, música lo-fi e chuva. Eu cochilo aqui do lado enquanto você estuda.",
    steps: [
      "Toque em “Começar” para um foco de 25 minutos (dá para mudar nos ajustes do relógio).",
      "Ligue a música ou a chuva no painel “Sessão” e escolha metas do plano de hoje.",
      "Cada foco concluído conta para a sequência e libera cenários novos.",
    ],
  },
  trilhas: {
    title: "Trilhas",
    who: "fuku",
    intro: "Uma trilha é um caminho pela matéria, do básico ao avançado. Cada etapa só abre quando você domina a anterior.",
    steps: [
      "Escolha a matéria e diga seu objetivo (ex.: “entender do zero”).",
      "Em cada etapa eu explico, faço uma questão e ajusto a próxima ao seu desempenho.",
      "Dois acertos seguidos concluem a etapa.",
    ],
  },
  tutor: {
    title: "Etapa com a tutora",
    who: "fuku",
    intro: "Eu explico o assunto citando o seu material e depois confiro se ficou claro.",
    steps: [
      "Leia a explicação; os números entre colchetes abrem a página do material.",
      "Responda a questão. Se errar, eu explico de outro jeito e faço uma mais fácil.",
      "Ficou dúvida? Escreva na caixa de baixo a qualquer momento.",
    ],
  },
  revisao: {
    title: "Revisar hoje",
    who: "fuku",
    intro: "Aqui voltam os flashcards e as questões que você errou, no momento em que estão quase sendo esquecidos.",
    steps: [
      "Leia o cartão, pense na resposta e toque em “Mostrar resposta”.",
      "Diga como foi (errei, difícil, bom, fácil): isso decide quando o item volta.",
      "Fazer um pouquinho todo dia vale mais do que muito de uma vez.",
    ],
  },
  erros: {
    title: "Caderno de erros",
    who: "daru",
    intro: "Toda questão errada vem para cá com o porquê do erro, a explicação e o trecho do material. Cair faz parte: o importante é levantar.",
    steps: [
      "Leia “por que errei” e abra o trecho do material.",
      "Tente a questão parecida: acertou, o erro fica resolvido.",
    ],
  },
  resolver: {
    title: "Foto da questão",
    who: "fuku",
    intro: "Tire foto de qualquer questão: eu resolvo passo a passo e mostro onde estudar isso no seu material.",
    steps: [
      "Tire a foto ou escolha da galeria (uma questão por foto, bem enquadrada).",
      "Escolha a matéria para eu procurar no material certo.",
      "Confira o grau de confiança da resolução e os links para as páginas.",
    ],
  },
  biblioteca: {
    title: "Biblioteca",
    who: "fuku",
    intro: "Todos os seus materiais, separados por matéria, com busca dentro do texto.",
    steps: [
      "Busque uma palavra para achar a página onde ela aparece.",
      "A busca “por sentido” encontra trechos parecidos mesmo com outras palavras.",
      "“Conversar com este documento” abre um chat só com aquele material.",
    ],
  },
  anotacoes: {
    title: "Anotações",
    who: "mochi",
    intro: "Um caderno para suas notas, que salva sozinho.",
    steps: [
      "Crie uma nota e escreva; use # para títulos e - para listas.",
      "Veja a nota formatada na aba ao lado.",
      "“Transformar em material” faz a nota virar material de estudo, com questões e tudo.",
    ],
  },
  diario: {
    title: "Diário de aprendizagem",
    who: "mochi",
    intro: "Ao fim de cada sessão, registre o que aprendeu e o que foi difícil.",
    steps: [
      "Escreva em poucas frases o que aprendeu e o que travou.",
      "Marque como você se sentiu.",
      "Com 2 registros na semana, peça o acompanhamento: a IA mostra avanços e próximos passos.",
    ],
  },
  desempenho: {
    title: "Desempenho",
    who: "daru",
    intro: "Seus números da semana e o que fazer agora.",
    steps: [
      "Comece pelo quadro “O que fazer agora”.",
      "Os gráficos mostram questões por semana e o aproveitamento.",
      "“Falsa certeza” é quando você marca certeza e erra: estude esses assuntos primeiro.",
    ],
  },
  conquistas: {
    title: "Conquistas",
    who: "mochi",
    intro: "Cada coisa que você faz rende XP e selos. Os selos apagados ainda estão por vir.",
    steps: ["Passe o dedo ou o mouse num selo para ver o que ele significa.", "Suba de nível estudando um pouco todo dia."],
  },
  salas: {
    title: "Turmas",
    who: "daru",
    intro: "Estude com a sua turma: materiais juntos, simulados e ranking da semana.",
    steps: [
      "Crie uma turma e mande o link de convite, ou entre com um código.",
      "Compartilhe materiais: os colegas importam para as matérias deles.",
      "Façam simulados juntos; o ranking zera toda segunda.",
    ],
  },
  comunidade: {
    title: "Comunidade",
    who: "mochi",
    intro: "Tire dúvidas, compartilhe dicas e encontre grupos de estudo com alunos de todo lugar.",
    steps: ["Escolha a categoria certa ao postar.", "Seja gentil. Viu algo errado? Use “Denunciar”."],
  },
  chat: {
    title: "Chat com o material",
    who: "fuku",
    intro: "Pergunte qualquer coisa sobre o seu material. Eu só respondo com base nele e mostro a página de cada informação.",
    steps: ["Escreva a pergunta como falaria com um professor.", "Toque nas fontes para abrir a página citada.", "Se o material não fala do assunto, eu aviso."],
  },
  feynman: {
    title: "Modo Feynman",
    who: "fuku",
    intro: "Explique o assunto com suas palavras, como se ensinasse alguém. Quem explica bem, entendeu de verdade.",
    steps: [
      "Escolha o tópico e escreva ou grave sua explicação (até 3 minutos).",
      "Eu comparo com o material e mostro o que acertou, o que faltou e o que está errado.",
    ],
  },
  professor: {
    title: "Prova do Professor",
    who: "fuku",
    intro: "Mande provas antigas deste professor ou banca: eu aprendo o estilo e mostro os assuntos com mais chance de cair.",
    steps: [
      "Envie uma ou mais provas antigas (PDF, slides, Word ou fotos).",
      "Veja o perfil: tipos de questão, pegadinhas e tópicos prováveis.",
      "Gere questões no estilo “Prova do professor” na página da matéria.",
    ],
  },
  flashcards: {
    title: "Flashcards",
    who: "mochi",
    intro: "Cartões de pergunta e resposta feitos do seu material.",
    steps: ["Toque no cartão para virar.", "Eles entram sozinhos na revisão de cada dia."],
  },
} satisfies Record<string, Guide>;

export type GuideId = keyof typeof GUIDES;
