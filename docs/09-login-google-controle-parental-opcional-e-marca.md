# Fase 9 — Login Google, controle parental opcional, painel flutuante e nova marca

**Status:** concluída (login Google funcional só depois que `VITE_GOOGLE_CLIENT_ID` for configurado — ver pendências no fim)

## Login com Google (importar inscrições/playlists)

- `src/lib/googleAuth.ts` — usa o **Google Identity Services** (script
  carregado sob demanda de `accounts.google.com/gsi/client`), fluxo de
  token client (sem backend). Escopos: `youtube.readonly` (leitura) +
  `openid email profile` (nome/foto/e-mail, usados só para exibir a conta
  conectada, nunca enviados a nenhum servidor nosso).
- `getAccessToken()`/`isTokenValid()` controlam a expiração de ~1h do
  token (padrão do Google — sem backend não há refresh token, é uma
  restrição de segurança do próprio Google, não uma limitação nossa).
- **Reconexão por clique**: se o token expirar, a UI mostra "Conexão
  expirou — toque para reconectar" em vez de tentar renovação silenciosa
  via iframe invisível — decisão deliberada porque o Brave (navegador
  alvo deste app) tende a bloquear esse tipo de mecanismo por ser visto
  como rastreamento cross-site.
- `src/lib/googleYoutube.ts` — `listMySubscriptions`, `listMyPlaylists`,
  `listPlaylistVideos`, todas autenticadas com o token do usuário.
  **Não existe endpoint de histórico de vídeos assistidos na API do
  YouTube** — isso não é oferecido a nenhum app de terceiros, com ou sem
  login, por política do Google.
- Vídeos escolhidos são importados para o catálogo local existente
  (mesmo mecanismo de sempre — `addToCatalog`, IndexedDB); depois de
  importado, não há mais nenhuma ligação com a conta Google.

## Controle parental — agora opcional (desligado por padrão)

- `src/lib/storage.ts`: nova flag `isParentalControlEnabled()` /
  `setParentalControlEnabled()`.
- **Ligar é livre**: se ainda não existe PIN, cria um na hora; se já
  existe, liga direto.
- **Desligar exige estar dentro do painel já desbloqueado** (ou seja, já
  provou saber o PIN para chegar até ali).
- Quando desligado: `App.tsx` (`limitReachedNow`) não bloqueia
  reprodução, e `Player.tsx` não conta minutos de uso — o app fica
  totalmente livre, sem PIN em lugar nenhum.
- Quando ligado: comportamento igual ao da fase anterior (PIN protege o
  painel, limite diário bloqueia reprodução).

## Painel de conta flutuante (substitui a aba "Configurações")

- `src/components/AccountPanel.tsx` — botão circular fixo no canto
  inferior direito. Mostra a foto do Google quando conectado, ou um
  ícone genérico quando não. Ao clicar, expande um painel com: conta
  Google (conectar/desconectar, inscrições, playlists, importar
  vídeos selecionados) e controle parental (toggle, PIN, limite diário).
- `TopBar.tsx` perdeu o item "Configurações" — sobrou só Catálogo e
  Favoritos.
- `Settings.tsx` (antigo) foi removido, sua lógica foi incorporada ao
  `AccountPanel.tsx`.

### Bug encontrado e corrigido durante o teste

Ao testar no preview, descobri que fechar e reabrir o painel **não**
pedia o PIN de novo dentro da mesma sessão de página — o estado
"desbloqueado" ficava preso no componente (que fica sempre montado,
só o painel visualmente esconde/mostra). Corrigido com uma função
`closePanel()` que sempre reseta `unlocked` para `false` ao fechar,
tanto pelo botão flutuante quanto pelo clique fora do painel
(backdrop). Reproduzido e confirmado corrigido via testes automatizados
no preview antes de publicar.

## Nova identidade visual

- `assets-src/icon.svg` e `icon-maskable.svg` redesenhados: mesma
  composição do logo clássico do YouTube (retângulo arredondado +
  triângulo de play), na cor roxa/violeta da marca do app em vez de
  vermelho.
- Novo `assets-src/og-image.svg` (1200×630) para pré-visualização ao
  compartilhar o link (WhatsApp, etc.).
- `scripts/generate-icons.mjs` atualizado para gerar também
  `og-image.png`, além dos ícones de sempre (192, 512, maskable,
  apple-touch-icon).
- `index.html`: adicionadas meta tags Open Graph e Twitter Card
  (`og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`)
  apontando para a nova imagem — isso é o que faz o WhatsApp (e outros
  apps) mostrarem uma prévia bonita do link em vez de nada.

## CSP atualizada (`vercel.json`)

Liberado o necessário para o login Google funcionar, mantendo tudo o
resto restrito:
- `script-src`: `+ https://accounts.google.com` (script do Google
  Identity Services)
- `connect-src`: `+ https://accounts.google.com`
- `img-src`: `+ https://*.googleusercontent.com` (foto de perfil do
  Google)
- `frame-src`: `+ https://accounts.google.com`

## Pendências para o login Google funcionar de verdade

1. Criar um **ID de cliente OAuth 2.0** (tipo "Aplicativo da Web") no
   mesmo projeto do Google Cloud, com origem JavaScript autorizada
   `https://yt-pwa-nine.vercel.app`.
2. Adicionar `VITE_GOOGLE_CLIENT_ID` no `.env` local e como variável de
   ambiente de produção no Vercel, depois publicar de novo.

Sem isso, o botão "Conectar com Google" mostra um aviso claro
("VITE_GOOGLE_CLIENT_ID não configurado...") em vez de falhar
silenciosamente — comportamento testado e confirmado no preview.
