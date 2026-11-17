# PROJECT_DESIGN — Movimento e som (Gabarita)

Brief da skill `tasteful-ui` (modo production_ui_implementation). A identidade visual já está decidida
("caderno de selos": washi, tinta sumi, vermelho-selo, índigo, seigaiha; turma Mochi/Daru/Fuku — ver CLAUDE.md §8).
Este brief cobre só **movimento, celebração e som**. Escolha do usuário: **“bem expressiva”** e **sons ligados com botão para desligar**.

## 1. Contexto
- Público: universitários e concurseiros estudando no celular, muitas vezes cansados.
- Tarefa principal: responder questões, revisar, seguir o plano. O movimento existe para **recompensar o esforço e mostrar estado**, nunca para atrasar a tarefa.
- Sucesso: o aluno sente que o app "responde" (toque, acerto, erro, fim de etapa) e quer voltar amanhã.

## 2. Tese
> Papel e tinta que ganham vida: carimbos batem, pétalas de sakura caem, os personagens respiram, piscam e reagem.
Movimento sempre **físico** (peso, mola, papel) — nada de brilho, neon, degradê animado ou blobs.

## 3. Regras de movimento
| Uso | Animação | Duração |
|---|---|---|
| Entrar numa página | sobe 8 px + aparece | 0,3 s |
| Toque em botão/cartão | afunda (sombra dura) + mola | 0,08–0,2 s |
| Personagem parado | respira, pisca a cada ~4 s; Daru balança (daruma tem o peso embaixo); Mochi mexe o rabinho/acena; Fuku inclina a cabeça | loop lento |
| Personagem muda de humor | "pulinho" (pop) | 0,35 s |
| Acerto | alternativa pula, carimbo 合 bate, pétalas, "+5 XP" sobe, som de acerto (sobe de tom a cada acerto seguido) | ≤ 0,8 s |
| Erro | alternativa balança, Fuku explica, som grave curto | 0,4 s |
| Fim de quiz / revisão / plano do dia | tela cheia de comemoração: Mochi + Daru, selo 合格, nota contando, chuva de pétalas, botão "Continuar" | até o aluno tocar |
| Selos da semana | carimbam um por um ao abrir o Início | 60 ms entre selos |
| Cadernos (matérias) | levantam e inclinam ao passar o dedo/mouse | 0,2 s |
- `prefers-reduced-motion`: tudo vira estado final sem animação (pétalas e balanço desligados).
- Nada bloqueia: celebração pequena não impede clicar; a grande tem "Continuar" e Esc.

## 4. Som
- Gerado no navegador (Web Audio, sem arquivos). Timbre de koto/sino: escala pentatônica japonesa (miyako-bushi).
- Eventos: toque (clique suave), acerto, erro, carimbo, conclusão (arpejo), fim do Pomodoro (sino de templo).
- Ligado por padrão; botão de som no quiz/revisão e em Perfil → "Sons e animações". Preferência no navegador.
- Volume baixo (o app é usado em público).

## 5. Atalhos (UX)
- Quiz/revisão: teclas 1–5 ou A–E escolhem a alternativa, Enter responde/avança.

## 6. Evitar
- Confete colorido genérico, brilho, partículas neon, animação em loop chamando atenção para o que não é tarefa.
- Sons altos ou repetitivos em navegação comum.
