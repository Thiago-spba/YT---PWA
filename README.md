# YT — PWA de vídeos sem propaganda

## Finalidade

App pessoal (pai e filho) para assistir vídeos do YouTube sem propaganda,
instalado como PWA através do navegador Brave — o bloqueio de anúncios vem
do **Brave Shields**, não de código deste app. Inclui catálogo curado
manualmente (colar link de vídeo), busca opcional via YouTube Data API,
favoritos, histórico, login opcional com Google (importar inscrições e
playlists) e controle parental opcional (PIN + limite diário de tempo,
desligado por padrão). Sem backend: tudo roda no dispositivo/navegador.
Configurações e conta ficam no ícone flutuante no canto inferior da tela,
não numa aba separada.

Documentação completa em [`docs/`](docs/00-intencao-e-escopo.md) —
comece por [`docs/00-intencao-e-escopo.md`](docs/00-intencao-e-escopo.md)
para entender intenção, escopo e tecnologias, e depois os arquivos
`docs/0N-*.md` na ordem, um por fase de desenvolvimento.

## Onde está

- **Código-fonte:** local, em `C:\Users\Home\Projects\yt-pwa` (pode ser
  aberto direto no VS Code — é uma pasta de projeto Node/Vite comum).
  Versionado com Git local (`git log` mostra o histórico), mas **ainda
  não está publicado no GitHub nem em nenhum outro remoto** — existe
  apenas nesta máquina.
- **App publicado:** https://yt-pwa-nine.vercel.app (deploy feito via
  Vercel CLI, ligado à conta `thiago-spba`).

## Rodando localmente

```bash
npm install
npm run dev
```

Para busca funcionar, copie `.env.example` para `.env` e preencha
`VITE_YOUTUBE_API_KEY` (veja instruções em `docs/00-intencao-e-escopo.md`).
Como a chave está restrita ao domínio de produção, a busca só funciona
rodando localmente se você usar uma chave separada sem restrição, ou
testar direto em produção.

Para o login com Google funcionar, preencha também `VITE_GOOGLE_CLIENT_ID`
(veja `docs/09-login-google-controle-parental-opcional-e-marca.md`) — sem
isso, o botão "Conectar com Google" mostra um aviso e não quebra o app.

## Build de produção

```bash
npm run build
npm run preview
```

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + `vite-plugin-pwa` + IndexedDB
(`idb`) + YouTube Data API v3 / YouTube IFrame Embed. Sem backend — tudo
roda no dispositivo.
