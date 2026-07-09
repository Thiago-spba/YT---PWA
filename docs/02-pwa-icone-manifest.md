# Fase 2 — PWA, ícone e manifest

**Status:** concluída

## O que foi feito

- Ícone fonte criado em `assets-src/icon.svg` (fundo roxo em degradê,
  texto "YT") e `assets-src/icon-maskable.svg` (versão com mais respiro
  para a "safe zone" de ícones maskable no Android).
- Script `scripts/generate-icons.mjs` (usa `sharp`) gera os PNGs em
  `public/icons/`: `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` e `apple-touch-icon.png`. Rodar
  `node scripts/generate-icons.mjs` novamente sempre que o ícone mudar.
- `vite.config.ts` configurado com `VitePWA`:
  - `manifest.name` / `short_name`: `YT`
  - `display: 'standalone'`, `start_url: '/'`, `scope: '/'`
  - ícones `any` (192/512) e `maskable` (512)
  - `registerType: 'autoUpdate'` — o service worker atualiza sozinho quando
    uma nova versão é publicada, sem exigir ação do usuário.
- `index.html` atualizado: título "YT", `theme-color`, ícone e
  `apple-touch-icon` referenciados.

## Verificação

`npm run build` gera `dist/manifest.webmanifest`, `dist/sw.js` e
`dist/workbox-*.js` sem erros.

## Pendente / próximos passos possíveis

- Testar a instalação real no Brave (Android e desktop) e confirmar que o
  ícone "YT" aparece corretamente na tela inicial/launcher.
