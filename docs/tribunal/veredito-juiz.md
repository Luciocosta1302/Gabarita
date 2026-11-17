# Veredito do Juiz — Gabarita (27 funcionalidades)

Fatos conferidos pelo Juiz:
- **Item 3:** `validateQuestions` (`lib/generate/questions.ts`) confere que a citação existe no trecho e que as alternativas não se repetem — **não confere se o gabarito está certo**. A Acusação tem razão.
- **Item 20:** `public_profiles` / `public_profile_by_username` estão revogadas para `anon` — o perfil `/u/@` não é público na internet, mas qualquer pessoa que crie conta vê. Risco atenuado, não eliminado.

| Nº | Funcionalidade | Veredito | Próxima ação |
|---|---|---|---|
| 1 | Envio de material | AVANÇAR (com corte de risco) | Limitar YouTube/áudio por duração (ex.: 20 min); registrar sucesso/falha por formato |
| 2 | Conversa por arquivo + pastas | REFORMULAR | No arquivo pronto, "Gerar 10 questões" como ação primária, chat em segundo |
| 3 | Questões com fonte (D1) | AVANÇAR | Auditar 100 questões à mão + 2ª checagem barata (outra chamada responde sem ver o gabarito; divergência = descarta) |
| 4 | Medidor de falsa certeza (D7) | AVANÇAR (ajustar) | Só mostrar o % com 10+ respostas no tópico |
| 5 | Caderno de erros (D6) | AVANÇAR | Gerar a questão parecida só quando o aluno abrir o item |
| 6 | Repetição espaçada FSRS (D3) | AVANÇAR | Limite diário da fila (ex.: 40) e mensagem "fila em dia" |
| 7 | Mapa de domínio (D8) | AVANÇAR (discreto) | Renomear/juntar tópicos; checar tópicos em 3 PDFs reais |
| 8 | Plano reverso (D2) | AVANÇAR (subir de posição) | A tarefa de hoje do plano vira a ação principal do Início quando houver data |
| 9 | Simulado + bancas (D16, D5) | TESTAR | Manter ENEM, Cebraspe e geral; outras bancas marcadas como "aproximação" até teste cego |
| 10 | Prova do Professor (D4) | TESTAR | Mostrar nº de provas usadas e "estimativa, não pule matéria"; acompanhar 5 alunos numa prova real |
| 11 | Discursivas com rubrica (D10) | TESTAR | Teste de concordância (5 correções); variou > 1 ponto → só comentários, sem nota |
| 12 | Modo Feynman (D9) | ARQUIVAR POR ENQUANTO | Tirar do menu; sugerir só no tópico com falsa certeza alta |
| 13 | Foto da questão (D11) | REFORMULAR | "Onde está no seu material" primeiro; resolução marcada "IA geral, confira"; botão para levar à revisão |
| 14 | Resumo, áudio e flashcards | AVANÇAR (manutenção) | Limitar quantos flashcards geram de uma vez |
| 15 | Trilhas + Tutor IA | REFORMULAR (e congelar) | Esconder do menu; reaproveitar o "explicar de outro jeito" no caderno de erros |
| 16 | Espaço de estudos | REFORMULAR | Tirar do botão principal do Início; meta da sessão abre a tarefa do plano |
| 17 | Desempenho | REFORMULAR | Levar "o que fazer agora" ao Início; página secundária fora da barra |
| 18 | Diário de aprendizagem | ARQUIVAR POR ENQUANTO | Esconder; desligar acompanhamento por IA (dados sensíveis); se ficar, só registro local |
| 19 | Conquistas, XP e níveis | AVANÇAR (enxugar) | Mais XP para acertos e erros resolvidos, menos para gerar questões |
| 20 | Perfil e avatar | ARQUIVAR POR ENQUANTO (parte pública) | Perfil privado por padrão (só a turma vê); manter o editor de avatar |
| 21 | Turmas (D14) | TESTAR | Ranking só com simulados da turma; testar com 1–2 turmas reais |
| 22 | Comunidade | ARQUIVAR POR ENQUANTO | Tirar do menu; conversa entre alunos fica nas Turmas |
| 23 | Biblioteca | REFORMULAR (fundir) | Busca no topo do Início/Pastas; liberar o ícone da barra para Revisar ou Plano |
| 24 | Anotações | ARQUIVAR POR ENQUANTO | Esconder do menu; manter dados acessíveis |
| 25 | Notícias sobre estudos | ARQUIVAR POR ENQUANTO | Esconder; se voltar, só título, fonte e link, sem resumo |
| 26 | Personagens, animações e sons | AVANÇAR (com freio) | Tela cheia só em marcos (simulado, sequência, 100%); senão, carimbo rápido |
| 27 | Tutoriais | REFORMULAR | Tour de 2–3 passos até o 1º material; "Como usar" só nas ferramentas não óbvias |

Confiança: alta nos itens 1, 3, 6, 8, 14 e 22; média nos demais (faltam dados de uso real).

## Resumo geral
**Coração do produto:** material → questões com fonte → caderno de erros → revisão FSRS → plano até a prova (1, 3, 5, 6, 8; com 4 e 7 como sinais).

**Tirar/esconder agora:** Comunidade (22), Notícias (25), Diário (18), Anotações (24), Feynman (12), parte pública do Perfil (20); Trilhas (15) congelada e fora do menu; Biblioteca (23) e Desempenho (17) fundidos ao Início. Libera a cota grátis do Gemini e o tempo do único mantenedor.

**3 prioridades:**
1. Garantir que o gabarito está certo (item 3): auditoria de 100 questões + segunda checagem.
2. Plano e "o que fazer hoje" no centro do Início (8, 6, 17): uma fila única do dia no lugar do timer como ação principal.
3. Proteger a cota e medir (1, 5, 9, 10): limite de duração de vídeo/áudio, questão parecida sob demanda, sucesso por formato, testar Prova do Professor e bancas com alunos reais.
