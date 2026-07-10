# Fase 15 — Mini-player persistente, Início, Playlist e correções

**Status:** concluída

## Sobre segundo plano com tela apagada

Esclarecido ao usuário: **não é possível forçar isso via código do
app**. É o sistema operacional/navegador que decide, por questão de
bateria — nenhum app web tem esse controle, e como o vídeo toca dentro
do player do YouTube (outra origem), o app nem consegue interferir.
Pode já funcionar sozinho no Android (o sistema de mídia costuma pegar
a reprodução automaticamente), mas isso não foi "implementado", é
comportamento do navegador — recomendado testar no aparelho real.

## Arquitetura de player persistente (mini-player)

Antes, `Watch.tsx` era renderizado **no lugar** do Catálogo/Favoritos/etc
— navegar para outra aba fechava o vídeo. Reescrito como
`PlayerHost.tsx`, sempre renderizado como uma camada por cima das
telas (nunca no lugar delas), com dois modos:

- **`expanded`**: cobre a tela inteira (`fixed inset-0`), igual ao
  Watch de antes — com sub-modo "tela cheia" (só vídeo) ou "janela"
  (com título, botões e "Mais vídeos").
- **`mini`**: caixinha pequena flutuante (canto inferior direito),
  mostrando só título + play + expandir + fechar.

Trocar de aba enquanto um vídeo toca agora só muda o **modo** para
`mini` (`handleChangeView` em `App.tsx`) — o vídeo continua tocando,
visível como caixinha, por cima de qualquer tela do app.

**Mesmo cuidado das fases anteriores**: uma única árvore de render
(nunca `if (modo) return (...)` separado) — o container do player não
pode ser desmontado ao trocar de modo, senão o React tenta remover um
nó que a API do YouTube já substituiu por fora (erro "removeChild").
Testado entrando/saindo de mini, expandido e tela cheia repetidamente
sem erro, com hook `window.onerror` confirmando ausência de exceções.

## Nova aba "Início"

Feed com vídeos recentes (`order=date` na API) de três buscas fixas
(música evangélica, adventista, católica), **misturados e embaralhados
num único grid, sem rótulo identificando o estilo** — o usuário pediu
explicitamente para não identificar os estilos separadamente. Vira a
aba padrão ao abrir o app.

## Nova aba "Playlist"

- Botão "+" adicionado em `VideoCard` (aparece em toda parte: Início,
  Meus Canais, Favoritos, Histórico) — alterna se o vídeo está na
  playlist.
- Nova store `playlist` no IndexedDB (banco subiu de versão 1 para 2,
  com upgrade que preserva os dados existentes).
- Lista ordenada com setas de mover para cima/baixo, remover
  individual, e botão "Reproduzir tudo" (toca o primeiro item e
  enfileira o resto — inclusive alimenta a seta "Próximo" e a
  reprodução automática do `PlayerHost`).

### Bug real encontrado e corrigido durante o teste

Ao adicionar dois vídeos à playlist rapidamente (dois cliques
seguidos), ambos ficavam com `position: 0` — uma condição de corrida:
`toggleInPlaylist` lia a lista atual e escrevia em duas chamadas
separadas ao banco; se a segunda chamada lia antes da primeira
terminar de escrever, as duas calculavam a mesma posição. Corrigido
unindo leitura e escrita **na mesma transação** do IndexedDB, que o
navegador serializa automaticamente entre transações concorrentes na
mesma store. Testado clicando dois "+" em sequência rápida e
confirmando posições distintas depois da correção.

## Bug real encontrado no Shorts: gesto de arrastar não rolava

O player flutuante sobreposto (da fase 14) tinha `pointer-events-auto`
cobrindo quase a tela inteira — isso "engolia" o toque antes dele
chegar à lista rolável por baixo, travando a rolagem em um vídeo só.
Corrigido trocando para `pointer-events-none` no container do player
(ele não precisa capturar toque — os controles continuam funcionando
via botões próprios com `pointer-events-auto` individual).

## Outras mudanças

- "Catálogo" renomeado para "Meus Canais" (label e título).
- Nova aba "Playlist" na navegação, entre Favoritos e Histórico.
- Revisão de z-index dos botões flutuantes (Configurações, Tema):
  permanecem visíveis e acessíveis em todas as telas normais;
  ficam propositalmente cobertos apenas quando o player está em modo
  expandido/tela cheia — mesmo comportamento de qualquer app de vídeo
  (a tela cheia deve cobrir a interface por cima).

## Testes realizados (preview, com captura de erros JS reais)

- Mini-player: navegar entre abas com vídeo tocando mantém a
  reprodução (mesmo iframe, sem recarregar), confirmado via inspeção
  do `widgetid`/`src` do iframe antes e depois.
- Tela cheia e modo janela dentro da nova arquitetura, sem regressão.
- Setas anterior/próximo consomem a fila da playlist corretamente.
- Shorts: rolagem entre vídeos confirmada via `scrollTo` + observer
  (mecanismo íntegro); causa raiz do travamento identificada e
  corrigida via CSS.
- Playlist: adicionar, reordenar, remover e "Reproduzir tudo"
  testados de ponta a ponta, incluindo o bug de corrida encontrado e
  corrigido.
- Banco de dados (IndexedDB v2): confirmado que, a partir de um estado
  realmente limpo, o próprio código do app cria as 4 stores
  corretamente (o problema encontrado durante o teste foi causado por
  scripts de diagnóstico próprios, não pelo código do app).
