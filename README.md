# YT — PWA de vídeos sem propaganda

PWA pessoal para assistir vídeos do YouTube sem propaganda, usando o
navegador Brave (Brave Shields bloqueia os anúncios) e um catálogo
curado com favoritos, histórico e limite de tempo de uso.

Documentação completa em [`docs/`](docs/00-intencao-e-escopo.md) —
comece por [`docs/00-intencao-e-escopo.md`](docs/00-intencao-e-escopo.md)
para entender intenção, escopo e tecnologias, e depois os arquivos
`docs/0N-*.md` na ordem, um por fase de desenvolvimento.

## Rodando localmente

```bash
npm install
npm run dev
```

Para busca funcionar, copie `.env.example` para `.env` e preencha
`VITE_YOUTUBE_API_KEY` (veja instruções em `docs/00-intencao-e-escopo.md`).

## Build de produção

```bash
npm run build
npm run preview
```

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + `vite-plugin-pwa` + IndexedDB
(`idb`) + YouTube Data API v3 / YouTube IFrame Embed. Sem backend — tudo
roda no dispositivo.
