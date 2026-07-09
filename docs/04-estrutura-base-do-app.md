# Fase 4 — Estrutura base do app

**Status:** concluída (MVP funcional testado no navegador)

## O que foi feito

### Camada de dados (`src/lib`)
- `storage.ts` — `localStorage`: flag de onboarding concluído, hash SHA-256
  do PIN (via `crypto.subtle`, nunca guarda o PIN em texto puro), limite
  diário de uso em minutos e contagem de uso do dia atual.
- `db.ts` — `IndexedDB` (via `idb`): catálogo, favoritos e histórico,
  cada um em seu próprio object store.
- `youtube.ts` — chamadas à YouTube Data API v3 (`search`, `videos`) e
  função `extractVideoId` que aceita link completo, `youtu.be/...` ou ID
  direto. Se `VITE_YOUTUBE_API_KEY` não estiver definida, lança
  `YoutubeApiError` com mensagem explicando o que falta.

### Componentes (`src/components`)
- `Onboarding.tsx` — tela única (controlada por flag em `localStorage`)
  orientando a instalar via Brave e checar o Shields.
- `TopBar.tsx` — navegação entre Catálogo / Favoritos / Configurações.
- `Catalog.tsx` — adicionar vídeo por link (funciona sem API key — usa
  thumbnail padrão do YouTube e título = ID), busca (só aparece se a API
  key estiver configurada), grade do catálogo com opção de remover.
- `VideoCard.tsx` — miniatura reutilizada em catálogo/busca/favoritos.
- `Player.tsx` — player embutido (`youtube-nocookie.com/embed`), botão de
  favoritar, grava entrada no histórico ao abrir.
- `Favorites.tsx` — lista de favoritos.
- `Settings.tsx` — fluxo de **criar PIN** (primeira vez) → **desbloquear
  com PIN** (vezes seguintes) → editar limite diário de uso.
- `App.tsx` — junta tudo: decide onboarding vs. app principal, troca de
  view, controla o player e **aplica o limite diário de uso**.

### Limite de tempo de uso — como funciona de fato
- Enquanto um vídeo está tocando, `Player` soma 1 minuto ao contador
  (`addUsageMinutes`) a cada 60 segundos.
- Se o total do dia atingir o limite definido em Configurações, o player
  fecha sozinho e aparece um aviso de "tempo esgotado".
- `App.tsx` também bloqueia a **abertura** de qualquer vídeo novo (catálogo
  ou favoritos) se o limite do dia já tiver sido atingido antes mesmo de
  começar a tocar.
- Sem limite definido (campo vazio em Configurações), não há bloqueio.

## Testes manuais realizados (via preview no navegador)

- Onboarding aparece na primeira visita e some depois de concluído.
- Adicionar vídeo por link funciona sem chave de API configurada
  (thumbnail carrega, título aparece como ID — comportamento esperado e
  documentado).
- Player abre, reproduz (autoplay) e favoritar funciona (estrela muda de
  estado, persiste em IndexedDB).
- Fluxo de criação de PIN → tela de configurações desbloqueada → salvar
  limite diário, testado e funcionando.
- Aba Favoritos reflete corretamente o vídeo favoritado.
- Layout testado também em viewport mobile (375×812) — responsivo, sem
  necessidade de ajuste.

## Limitações conhecidas / próximos passos possíveis

- Busca por texto só funciona com `VITE_YOUTUBE_API_KEY` configurada (ver
  [docs/00-intencao-e-escopo.md](00-intencao-e-escopo.md)).
- O player do YouTube pode sugerir "próximo vídeo" fora do catálogo curado
  ao final da reprodução — o parâmetro `rel=0` reduz mas não elimina
  totalmente esse comportamento (limitação do próprio YouTube, não do app).
- Sem sincronização entre dispositivos: favoritos/histórico/PIN ficam
  isolados por navegador/dispositivo, por ser tudo local (sem backend).
- Reset de PIN esquecido: hoje só é possível limpando os dados do site no
  navegador (não há fluxo de "esqueci o PIN"). Aceitável para uso pessoal,
  mas vale ter em mente.
