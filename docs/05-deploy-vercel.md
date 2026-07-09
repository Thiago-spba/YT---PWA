# Fase 5 — Deploy no Vercel

**Status:** concluída

## O que foi feito

- Deploy de produção feito via `npx vercel --prod` (conta já existente:
  `thiago-spba`, projeto vinculado a `thiago-spbas-projects/yt-pwa`).
- Vercel detectou o projeto Vite automaticamente (`vite build`, saída em
  `dist`), sem configuração manual necessária.
- `.gitignore` recebeu a entrada `.vercel` automaticamente (metadados locais
  de link do projeto — não deve ser versionado).

## URL de produção

**https://yt-pwa-nine.vercel.app**

## Verificação

- `GET /` → `200`.
- `GET /manifest.webmanifest` → `200`, `content-type:
  application/manifest+json`, conteúdo confere com o configurado no
  `vite.config.ts` (nome "YT", ícones, `display: standalone`).
- HTTPS automático (obrigatório para instalação de PWA fora de
  `localhost`).

## Por que este passo veio antes da chave da API do YouTube

A chave da YouTube Data API deve ser restrita por **HTTP referrer** ao
domínio final — por isso o deploy aconteceu antes de criar a chave (ver
[docs/00-intencao-e-escopo.md](00-intencao-e-escopo.md)). Próximo passo:
criar a chave restrita a `yt-pwa-nine.vercel.app`, adicionar
`VITE_YOUTUBE_API_KEY` nas variáveis de ambiente do projeto no painel do
Vercel e rodar `vercel --prod` novamente para publicar com a busca ativa.

## Pendente

- Testar a instalação do PWA no Brave (Android e desktop) usando a URL de
  produção acima.
- Configurar a chave da API do YouTube (passo seguinte).
