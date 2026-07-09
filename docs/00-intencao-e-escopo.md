# YT — Intenção, finalidade e tecnologias

## Intenção

Um PWA (Progressive Web App) pessoal, instalado através do navegador Brave,
para assistir vídeos do YouTube sem propaganda, com um catálogo organizado
pensado para uso compartilhado entre pai e filho.

## Finalidade

- Servir como "casca" leve sobre o YouTube: o bloqueio de anúncios não é
  feito pelo app, e sim herdado do Brave Shields, que já bloqueia anúncios em
  qualquer página carregada no navegador — incluindo o player embutido do
  YouTube dentro desta PWA.
- Dar ao responsável controle simples sobre o que a criança acessa: catálogo
  próprio, favoritos, histórico, limite de tempo de uso e uma tela de
  configurações protegida por PIN.
- Funcionar nos três dispositivos da família: Android, tablet e PC, a partir
  de um único código-fonte (é isso que motiva a escolha por PWA em vez de
  apps nativos separados).

## Escopo desta primeira versão

Incluído:
- Onboarding único orientando a instalar a PWA pelo Brave e conferir o
  Shields ativo.
- Catálogo com adição manual de vídeos por link/ID.
- Busca no YouTube via API oficial (requer chave própria — ver abaixo).
- Player embutido (`youtube-nocookie.com/embed`).
- Favoritos e histórico salvos localmente (IndexedDB).
- Configurações protegidas por PIN, com limite diário de uso (minutos).

Fora do escopo por enquanto (avaliar depois, se necessário):
- Conta de usuário / sincronização entre dispositivos (exigiria backend).
- Notificações push de vídeo novo de canal favorito (exigiria backend).
- Filtros de conteúdo automatizados além do `safeSearch=strict` da API do
  YouTube — a curadoria fica a cargo do responsável.

## Por que não existe "integração" real com o Brave

Uma PWA não tem API para controlar configurações do navegador. O que
acontece, na prática, é:
- Se a PWA for instalada a partir do Brave, ela roda usando o mesmo motor e
  os mesmos Shields do Brave — por isso o bloqueio de anúncios funciona sem
  nenhum código adicional no app.
- Não existe embed de `youtube.com` completo (busca, home) em iframe — o
  Google bloqueia isso via `X-Frame-Options`. Por isso o player usa o
  endpoint de embed individual (`/embed/VIDEO_ID`), que é o único permitido.

## Tecnologias usadas

| Camada              | Escolha                                   | Por quê |
|---------------------|--------------------------------------------|---------|
| Build tool           | Vite                                        | Dev server rápido, build de produção otimizado e pequeno |
| UI                    | React + TypeScript                          | Facilita manter várias telas/funcionalidades organizadas |
| Estilo                | Tailwind CSS v4 (`@tailwindcss/vite`)       | Responsivo rápido sem escrever CSS customizado |
| PWA / Service Worker  | `vite-plugin-pwa` (Workbox)                 | Gera manifest e cache automaticamente |
| Armazenamento local   | IndexedDB via `idb`, `localStorage`         | Sem backend: favoritos, histórico, catálogo, PIN e limite de tempo ficam só no dispositivo |
| Dados de vídeo        | YouTube Data API v3 + YouTube IFrame Embed  | Busca de metadados e reprodução oficial, dentro dos Termos de Uso do YouTube |
| Hospedagem prevista   | Vercel ou Cloudflare Pages                  | Estático, grátis, HTTPS automático (exigido por PWA) |

Não há backend próprio nesta versão — o app roda inteiramente no
dispositivo/navegador.

## Configuração necessária antes de usar busca

A busca e o preenchimento automático de título/thumbnail ao adicionar vídeo
dependem de uma chave da YouTube Data API v3:

1. Criar um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ativar a "YouTube Data API v3".
3. Criar uma chave de API e restringi-la por **HTTP referrer** ao domínio
   onde o app será hospedado (evita que outra pessoa use sua cota).
4. Copiar `.env.example` para `.env` e preencher `VITE_YOUTUBE_API_KEY`.

Sem a chave configurada, o app continua funcional: dá para adicionar vídeos
por link manualmente (o título fica como o próprio ID até a chave ser
configurada), mas a busca fica desativada.
