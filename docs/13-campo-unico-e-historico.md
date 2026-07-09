# Fase 13 — Campo único estilo YouTube e aba de Histórico

**Status:** concluída

## Campo de busca/adicionar unificado

Os dois campos empilhados ("colar link" + "buscar", cada um com seu
próprio botão) foram substituídos por **um único campo estilo YouTube**
(pill arredondado, ícone de lupa, centralizado no topo). O mesmo campo
detecta a intenção automaticamente ao enviar:

1. Tenta extrair um ID de vídeo (`extractVideoId`) — se reconhecer um
   link/ID válido do YouTube, adiciona direto ao catálogo.
2. Se não for um link reconhecível e a busca estiver configurada
   (`VITE_YOUTUBE_API_KEY`), trata como busca por texto.
3. Se não for link e a busca não estiver configurada, mostra uma
   mensagem explicando em vez de falhar silenciosamente.

Isso elimina a necessidade de dois campos/botões separados — visual
mais limpo, mais parecido com a barra de busca real do YouTube.

## Aba de Histórico

Descoberta durante a conversa: o app já gravava histórico de vídeos
assistidos desde a fase 4 (`recordHistory`, chamado toda vez que o
player abre), mas **nunca existiu uma tela pra ver isso** — os dados
ficavam só guardados, sem uso visível.

- `src/components/History.tsx` (novo), no mesmo padrão de
  `Favorites.tsx`: grade de vídeos assistidos, ordenados do mais
  recente pro mais antigo, com botão de remover item e "Limpar
  histórico" (esvazia tudo).
- `src/lib/db.ts`: adicionadas `removeHistoryEntry` e `clearHistory`.
- Nova aba "Histórico" no `TopBar`, junto de Catálogo e Favoritos.

## Teste realizado

Confirmado no preview que o campo único detecta corretamente um link
colado (tenta adicionar, mostra erro claro quando a API bloqueia por
domínio — comportamento esperado em ambiente local) e que a aba
Histórico lista corretamente vídeos assistidos em sessões anteriores.
