# YT-PWA — Player de Vídeos sem Propaganda

PWA pessoal para assistir vídeos do YouTube sem propaganda, instalado via navegador Brave. O bloqueio de anúncios é feito pelo **Brave Shields** — não por código deste app. Desenvolvido para uso compartilhado entre pai e filho, com catálogo curado, controle parental e busca inteligente por IA.

**App publicado:** https://yt-pwa-nine.vercel.app
**Repositório:** https://github.com/Thiago-spba/YT---PWA

---

## Funcionalidades

- Catálogo de vídeos adicionados manualmente por link/ID
- Busca no YouTube via YouTube Data API v3
- Busca semântica com IA (Claude Haiku) para resultados mais precisos
- Player embutido via `youtube-nocookie.com/embed`
- Seção de Shorts com grade de descoberta
- Favoritos, histórico e playlist com ordenação manual
- Feed inicial inteligente baseado em interesses do usuário (sem IA, com decaimento temporal)
- Login opcional com Google (importar inscrições e playlists)
- Controle parental opcional: PIN + limite diário de tempo de uso
- Dark mode / Light mode
- Picture-in-Picture (PiP)
- Mini-player persistente
- PWA instalável — funciona nos três dispositivos da família (Android, tablet e PC)
- **Sem backend** — tudo roda no dispositivo via IndexedDB e localStorage

---

## Stack

| Camada | Tecnologia |
|---|---|
| Build | Vite |
| UI | React + TypeScript |
| Estilo | Tailwind CSS v4 |
| PWA | vite-plugin-pwa (Workbox) |
| Banco local | IndexedDB via `idb` + localStorage |
| Auth | Firebase Auth (Google OAuth) |
| Progresso de vídeo | Firebase Firestore (sync entre dispositivos) |
| Busca de vídeos | YouTube Data API v3 |
| Busca por IA | Anthropic Claude Haiku |
| Deploy | Vercel |

---

## Banco de Dados

O app usa duas camadas de armazenamento:

**IndexedDB (local, no navegador)** — principal banco do app:
- `catalog` — vídeos do catálogo curado
- `favorites` — vídeos favoritos
- `history` — histórico de reprodução
- `playlist` — fila de reprodução com ordem
- `interests` — categorias de interesse com pontuação e decaimento temporal (meia-vida de 14 dias)

**Firebase Firestore (nuvem)** — sincronização de progresso:
- `users/{userId}/videoProgress/{videoId}` — posição atual de cada vídeo por usuário

---

## Rodando localmente

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env` e preencha as variáveis necessárias.

---

## Variáveis de Ambiente

```env
VITE_YOUTUBE_API_KEY=       # YouTube Data API v3
VITE_GOOGLE_CLIENT_ID=      # Google OAuth (login opcional)
VITE_ANTHROPIC_API_KEY=     # Claude Haiku (busca por IA)
VITE_FIREBASE_API_KEY=      # Firebase
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> ⚠️ Nunca commite o arquivo `.env` — ele está no `.gitignore`.

---

## Build de produção

```bash
npm run build
npm run preview
```

---

## Arquitetura

```
src/
├── components/     # UI: TopBar, VideoCard, VideoPlayer, Shorts, etc.
├── config/         # firebase.ts
├── lib/            # db.ts, useAuth.tsx, firestore.ts, youtubePlayer.ts, aiSearch.ts
├── types.ts        # Tipos globais
└── App.tsx         # Roteamento principal entre telas
```

---

## Decisões de projeto

**Por que PWA e não app nativo?**
Um único código-fonte funciona em Android, tablet e PC — sem precisar manter três projetos separados.

**Por que o bloqueio de anúncios não está no código?**
Os Termos de Serviço do YouTube proíbem bloqueio de anúncios por código. O Brave Shields faz isso no nível do navegador, fora do escopo do app.

**Por que IndexedDB e não backend próprio?**
Elimina custo de servidor, complexidade de manutenção e dependência de infraestrutura externa para as funcionalidades principais. O Firebase cobre apenas a sincronização de progresso entre dispositivos.

**Download offline não é possível**
Os Termos de Serviço do YouTube só permitem download pelo app oficial com YouTube Premium. Além disso, o navegador não tem permissão de CORS para baixar streams brutos do YouTube.
