# Tribunal de Ideias

A Defesa e a Acusação recebem a mesma proposta e analisam o caso separadamente. O Juiz recebe os dois pareceres e decide se vale avançar, testar, reformular ou arquivar por enquanto.

## Como usar

1. Extraia os arquivos na raiz de um projeto para o Tribunal, mantendo a pasta `.claude/agents/`.
2. Abra uma nova sessão do Claude Code nesse projeto. No celular, coloque os arquivos no repositório conectado e inicie uma sessão do Claude Code na nuvem com esse repositório.
3. Envie a ideia no chat. Objetivo, público e restrições ajudam quando já estiverem definidos.

Exemplo de primeira mensagem

> Tribunal de Ideias, julgue esta proposta. Quero vender chaveiros personalizados em impressão 3D para turmas de formatura em Marabá. Vou começar com uma impressora e atender por encomenda.

O Claude Code faz três chamadas a subagentes em contextos próprios. Os três usam o modelo selecionado na sessão (`model: inherit`). O envio da ideia e dos pareceres acontece dentro da sessão, sem chave de API adicional configurada pelo projeto.

Se a sessão já estava aberta antes de copiar os arquivos, abra uma sessão nova para carregar os subagentes.
