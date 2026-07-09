# Fase 1 — Scaffold e dependências

**Status:** concluída

## O que foi feito

- Projeto criado em `C:\Users\Home\Projects\yt-pwa` com
  `npm create vite@latest yt-pwa -- --template react-ts`.
- Dependências de runtime instaladas: `react`, `react-dom`, `idb`.
- Dependências de desenvolvimento instaladas: `vite-plugin-pwa`,
  `tailwindcss`, `@tailwindcss/vite`, `sharp` (usado só para gerar os
  ícones, ver fase 2).
- `.gitignore` ajustado para ignorar `.env` (a chave da API do YouTube nunca
  deve ser versionada).
- Criado `.env.example` documentando a variável `VITE_YOUTUBE_API_KEY`.

## Decisões

- Vite + React + TypeScript em vez de framework mais pesado (Next.js etc.):
  o app não precisa de servidor/SSR, é 100% client-side, então um bundler
  simples e rápido é suficiente e resulta em app mais leve.
