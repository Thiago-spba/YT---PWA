# Fase 14 — Shorts, navegação, autoatualização e correções

**Status:** concluída

## Auto-atualização do PWA (resolve "versão antiga em cache")

O usuário relatou ver a interface antiga mesmo após publicar. Causa:
`registerType: 'autoUpdate'` sozinho não garante verificação frequente
nem recarrega a página quando encontra versão nova.

- `vite.config.ts`: `injectRegister: false` (paramos de usar o script
  de registro automático padrão).
- `src/lib/pwaUpdate.ts` (novo): registra o service worker manualmente
  via `virtual:pwa-register`, checando por atualização **a cada 60s**
  enquanto o app está aberto, e recarregando sozinho
  (`updateSW(true)`) assim que encontra uma versão nova — sem precisar
  o usuário limpar cache manualmente.

## Catálogo não atualizava após importar do Google

Bug real: `AccountPanel` importava para o IndexedDB corretamente, mas
`Catalog.tsx` só buscava os dados uma vez, no mount — se o painel de
conta era usado sem sair da tela de Catálogo, a lista não refletia o
que acabou de ser importado.

Corrigido com um contador `catalogVersion` em `App.tsx`, incrementado
via callback `onCatalogChanged` toda vez que `AccountPanel` importa
algo (um vídeo, uma playlist inteira, ou tudo). `key={catalogVersion}`
no `<Catalog>` força remontagem e nova busca sempre que muda.

## Miniaturas em branco em vídeos importados

Alguns itens de playlist vêm da API do Google sem o campo `thumbnails`
preenchido (mais comum em canais "Topic"), resultando em `thumbnailUrl`
vazio e miniatura quebrada no catálogo.

- `src/lib/thumbnail.ts` (novo): `resolveThumbnail(id, thumbnails)` —
  usa o que a API devolveu, e cai para a URL previsível
  `https://i.ytimg.com/vi/{id}/mqdefault.jpg` (funciona pra qualquer
  vídeo do YouTube) quando a API não devolve nada.
- Aplicado em todos os pontos que constroem `Video`
  (`youtube.ts`, `googleYoutube.ts`) e defensivamente também no
  `VideoCard.tsx` (cobre itens antigos já salvos sem miniatura, de
  antes dessa correção).

## Checagem de "incorporável" antes de adicionar

Vídeos com incorporação desativada pelo dono davam erro só na hora de
assistir. Agora checa antes:

- `getVideoById` (usado ao colar link) e `getVideoFlags` (usado na
  importação em lote do Google) passam a pedir `part=status` e checar
  `status.embeddable`. Se `false`, o vídeo **não é adicionado**, com
  mensagem clara em vez de silenciosamente virar um item quebrado no
  catálogo.
- Isso não impede 100% dos casos (um vídeo pode ser removido *depois*
  de já estar no catálogo), mas evita a maioria — por isso a tela de
  erro "vídeo indisponível" no `Watch.tsx` (fase 11) continua existindo
  como rede de segurança.

## Campo de busca com sugestões (autocomplete)

`Catalog.tsx`: enquanto digita (e não é um link reconhecível), busca
depois de meio segundo sem digitação e mostra um dropdown com até 6
sugestões (miniatura + título + canal). Clicar numa sugestão adiciona
direto ao catálogo.

## Aba de Shorts (vídeos curtos)

Nova aba entre Catálogo e Favoritos, feed vertical estilo YouTube
Shorts:

- **Detecção automática**: ao adicionar um vídeo (link, sugestão do
  campo de busca, ou importação do Google), a duração é consultada
  (`contentDetails.duration`, convertida de ISO 8601) — vídeos de até
  60 segundos são marcados `isShort: true` e aparecem só na aba Shorts.
- **Busca dedicada** (`searchShorts`): usa `videoDuration=short` da API
  (filtro grosso, até 4 min) e depois confirma a duração exata
  (≤60s) e se é incorporável antes de mostrar como resultado.
- **Feed vertical** com scroll/arraste (mobile) e **setas visíveis**
  de anterior/próximo (funciona em qualquer dispositivo, não só touch).
- Mudo por padrão (exigência dos navegadores para autoplay), com botão
  de ativar som, favoritar, e loop automático do vídeo atual.

### Bug crítico encontrado e corrigido durante o teste

Erro `NotFoundError: Failed to execute 'removeChild'` ao trocar de
vídeo no Shorts — mesma causa raiz do bug de tela cheia da fase 12: a
API do YouTube substitui o `<div>` do container por um `<iframe>` por
fora do React; se esse `<div>` for condicionalmente desmontado (um
player por item, trocando `active`), o React tenta remover um nó que
já não existe mais do jeito que ele esperava.

**Correção:** reescrito para usar **um único player persistente**
(mesmo padrão do `Watch.tsx`) — a lista de itens mostra só miniaturas,
e um player flutuante sobreposto (sempre na mesma posição de tela,
que coincide com o item ativo por causa do scroll-snap) troca de
vídeo via `loadVideoById`. Testado trocando de vídeo repetidamente sem
erro depois da correção.

## Setas de anterior/próximo no Watch

Pilha de navegação (estilo histórico de navegador) somada à lista
"Mais vídeos" já existente: `Watch.tsx` mantém uma pilha de vídeos
assistidos nesta sessão — "Anterior" volta exatamente para onde você
estava, "Próximo" avança de novo (se já tinha ido pra frente) ou pega
o primeiro item da lista de sugestões. Aparecem tanto no modo janela
quanto no modo tela cheia (mesmo container do player, sem duplicar
código).

## Testes realizados (preview, com captura de erros JS)

- Shorts: troca de vídeo (setas e visualização) repetida sem erros,
  confirmado por hook `window.onerror` que não havia exceções.
- Watch: tela cheia entra/sai mantendo o mesmo player (sem regressão),
  setas de anterior/próximo navegam corretamente.
- Miniaturas: confirmado via inspeção do DOM que nenhum `<img>` fica
  com `src` vazio, mesmo para itens antigos sem dado de thumbnail.
- Autocomplete e importação em lote: testados até o ponto possível
  localmente (bloqueados por CORS de domínio da chave de API, como
  documentado desde a fase 0 — comportamento esperado, não é bug).
