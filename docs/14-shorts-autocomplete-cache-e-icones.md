# Fase 14 — Shorts, autocomplete, correção de cache/atualização e navegação por ícones

**Status:** concluída

## Correção do cache do PWA que mostrava versão antiga

O `registerType: 'autoUpdate'` já existia, mas dependia do script
auto-injetado padrão do `vite-plugin-pwa`, que só checa por atualização
esporadicamente (no melhor caso, a cada navegação) e nem sempre reflete
rápido o suficiente. Trocado por registro manual
(`injectRegister: false` + `src/lib/pwaUpdate.ts` usando
`virtual:pwa-register`): agora o app checa por versão nova a cada 60
segundos enquanto está aberto, e recarrega sozinho assim que encontra
uma — sem precisar de Ctrl+Shift+R manual.

## Bug corrigido: catálogo não atualizava após importar do Google

Causa: `Catalog.tsx` buscava os dados do IndexedDB só uma vez, no
`useEffect` de montagem. Se o usuário importasse vídeos pelo painel de
conta **sem sair da tela de Catálogo**, a lista não se atualizava
sozinha (o painel flutua por cima, não desmonta o Catálogo). Corrigido
com um contador `catalogVersion` em `App.tsx`, incrementado pelo
`AccountPanel` (`onCatalogChanged`) após qualquer importação bem
sucedida, usado como `key` do `Catalog`/`Shorts` — força atualização
buscando do banco de novo.

## Campo com sugestões ao digitar (autocomplete)

`Catalog.tsx`: enquanto digita (e não parece um link), após 450ms sem
digitar, busca sugestões via API e mostra um dropdown com miniatura +
título + canal. Clicar numa sugestão adiciona direto ao catálogo (com
verificação de duração pra marcar Shorts). Fecha ao clicar fora ou ao
enviar o formulário.

## Página de Shorts (vídeos curtos)

Nova aba "Shorts" entre Catálogo e Favoritos:

- **Detecção automática**: ao adicionar um vídeo (por link ou pela
  sugestão do autocomplete), a duração é consultada via
  `contentDetails` da API (`getVideoById` agora pede esse campo) — se
  ≤ 60 segundos, marca `isShort: true` no vídeo salvo. Vídeos
  importados da conta Google passam por uma checagem em lote
  (`getShortFlags`, até 50 IDs por chamada) antes de salvar.
- **Feed vertical estilo YouTube Shorts**: rolagem com
  `scroll-snap-type: y mandatory`, um vídeo por tela (9:16, altura
  cheia). Só o vídeo atualmente visível (via `IntersectionObserver`,
  60% de visibilidade) carrega o player de verdade — os outros mostram
  só a miniatura, economizando recursos e evitando várias abas de
  áudio tocando ao mesmo tempo.
- Toca em loop, começa mudo (autoplay exige isso), com botão de
  ativar/desativar som e botão de favoritar sobrepostos.
- Sem vídeo curto no catálogo ainda, mostra mensagem explicando como
  eles aparecem (adicionar por link/busca ou importar da conta Google).

## Navegação por ícones no mobile

`TopBar.tsx`: cada aba (Catálogo, Shorts, Favoritos, Histórico) ganhou
um ícone SVG. O texto do rótulo agora usa `hidden sm:inline` — some em
telas pequenas (só ícone, com `title`/`aria-label` mantendo
acessibilidade e dica ao toque/mouse) e aparece a partir do breakpoint
`sm` (tablets/desktop).

## Testes realizados (preview)

- Autocomplete: confirmado que a chamada de busca dispara corretamente
  após a pausa na digitação (bloqueada por domínio localmente, como
  esperado — mesma limitação de sempre da chave restrita à produção).
- Shorts: testado com vídeo de teste marcado `isShort: true` — player
  carrega com os parâmetros corretos (loop, sem controles nativos,
  autoplay), botão de som alterna mudo/com som corretamente e de forma
  estável, favoritar funciona.
- Navegação: confirmado via inspeção que os rótulos ficam ocultos em
  viewport estreito (~390px) e os botões mantêm nome acessível via
  `aria-label`.
