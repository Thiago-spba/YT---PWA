<div align="center">

# 🥇 TF Edu
### Aprenda sem limites — Tecnologia a serviço da educação

<br/>

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://tfedu.vercel.app)
[![YouTube API](https://img.shields.io/badge/YouTube-Data_API_v3-red?style=for-the-badge&logo=youtube)](https://developers.google.com/youtube/v3)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Instalável-5A0FC8?style=for-the-badge&logo=pwa)](https://tfedu.vercel.app)

<br/>

> **Plataforma pessoal de aprendizado com vídeos educacionais — vestibular, concursos, tecnologia, mistérios e muito mais.**

🌐 **[tfedu.vercel.app](https://tfedu.vercel.app)**

</div>

---

## 🎯 O que é o TF Edu?

O **TF Edu** é uma PWA educacional que usa a YouTube Data API v3 para organizar e exibir conteúdo de aprendizado de forma personalizada. Desenvolvido por **Thiago Fernando**, engenheiro de computação e educador, para uso familiar com foco em estudo e descoberta.

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---|---|
| 🥇 **Categorias educacionais** | 40+ categorias organizadas: Vestibular, ENEM, Concursos, Tecnologia, Mistérios e mais |
| 🔍 **Busca inteligente** | Busca com expansão semântica via IA (Claude) para resultados mais precisos |
| 📚 **Meus Cursos** | Catálogo pessoal curado por link ou ID do vídeo |
| ⭐ **Favoritos** | Salve os vídeos preferidos localmente |
| 📋 **Playlist** | Monte filas de reprodução com ordenação manual |
| 🕐 **Assistidos** | Histórico completo de vídeos assistidos |
| ⚡ **Dicas Rápidas** | Grid de vídeos curtos para aprendizado rápido |
| 🌙 **Dark / Light Mode** | Tema escuro e claro com detecção automática |
| 📱 **PWA Instalável** | Funciona como app em Android, tablet e PC |
| 🔒 **Login Google** | Importe suas inscrições e playlists do YouTube |
| 🎬 **Mini-player** | Continue navegando enquanto assiste |
| 🔐 **Segurança** | CORS, rate limit, proxy server-side — chave de API nunca exposta |

---

## 📚 Categorias disponíveis

<details>
<summary><b>Ver todas as categorias (clique para expandir)</b></summary>

### 🎓 Vestibular & Concursos
`Vestibular` `ENEM` `Concursos Públicos`

### 📖 Disciplinas Escolares
`Matemática` `História` `Português` `Física` `Química` `Biologia` `Geografia` `Filosofia` `Artes`

### 🏫 Pedagogia & Educação
`Pedagogia` `Didática` `Psicopedagogia` `Gestão Escolar` `Educação Inclusiva` `Metodologias Ativas` `BNCC` `Educação Digital`

### 💻 Tecnologia & Engenharia
`Programação` `Eng. Computação` `Hardware` `Redes` `Inteligência Artificial` `Cibersegurança` `Dev Mobile` `Cloud Computing`

### 🔮 Mistérios & Curiosidades
`Mistérios` `Ovnis & ET` `Curiosidades` `Civilizações Antigas` `Mente Humana` `Natureza Incrível` `Casos Reais` `Ciência Curiosa`

### 🌎 Idiomas
`Inglês para Brasileiros` `Espanhol para Brasileiros`

### ⚖️ Humanas & Sociais
`Direito` `Finanças` `Empreendedorismo` `Psicologia`

### 🏥 Saúde & Bem-estar
`Saúde` `Educação Física`

### 🔭 Ciência & Universo
`Astronomia` `Ciências` `Documentários` `Planeta Terra` `Genética`

</details>

---

## 🛡️ Segurança

```
✅ Chave de API nunca exposta no navegador (proxy server-side)
✅ Rate limit: máx 30 requisições/minuto por IP
✅ CORS: API restrita ao domínio tfedu.vercel.app
✅ Whitelist de parâmetros — impede injeção de parâmetros
✅ Content Security Policy (CSP) configurada
✅ X-Frame-Options: DENY (anti-clickjacking)
✅ Permissions-Policy: câmera, microfone e GPS bloqueados
```

---

## 🚀 Stack tecnológica

| Camada | Tecnologia |
|---|---|
| **Build** | Vite |
| **UI** | React 18 + TypeScript |
| **Estilo** | Tailwind CSS v4 |
| **PWA** | vite-plugin-pwa (Workbox) |
| **Banco local** | IndexedDB (idb) + localStorage |
| **Auth** | Google OAuth 2.0 |
| **Busca de vídeos** | YouTube Data API v3 |
| **Busca por IA** | Anthropic Claude (expansão semântica) |
| **Deploy** | Vercel |

---

## 🗄️ Arquitetura de dados

```
📦 IndexedDB (local — no navegador)
├── catalog        → vídeos do catálogo curado
├── favorites      → vídeos favoritos
├── history        → histórico de reprodução
├── playlist       → fila com ordem manual
└── interests      → categorias com pontuação e decaimento temporal

🔒 localStorage
├── youtube-cache  → cache de buscas (24h)
├── quota-exceeded → circuit breaker de cota (reset automático 24h)
└── onboarding     → controle de tela inicial
```

---

## ⚙️ Rodando localmente

```bash
# Clone o repositório
git clone https://github.com/Thiago-spba/tf.edu.git
cd tf.edu

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha as variáveis no .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de ambiente

```env
YOUTUBE_API_KEY=        # YouTube Data API v3 (server-side)
VITE_GOOGLE_CLIENT_ID=  # Google OAuth 2.0
GOOGLE_CLIENT_SECRET=   # Chave secreta OAuth
ANTHROPIC_API_KEY=      # Claude API (busca semântica)
```

---

## 📁 Estrutura do projeto

```
src/
├── components/         # TopBar, CategoryBar, VideoCard, VideoPlayer...
├── config/             # recommendedVideos.ts
├── lib/                # db.ts, youtube.ts, youtubeCache.ts, aiSearch.ts
├── types.ts            # Tipos globais
└── App.tsx             # Roteamento principal

api/
├── youtube.ts          # Proxy seguro para YouTube Data API
├── search-expand.ts    # Expansão semântica via Claude
└── auth/               # Login Google (OAuth 2.0)
```

---

## 📜 Conformidade com YouTube API

Este app utiliza a **YouTube Data API v3** e está em conformidade com as [Políticas para Desenvolvedores do YouTube API Services](https://developers.google.com/youtube/terms/developer-policies):

- ✅ Reprodução via player oficial do YouTube
- ✅ Política de privacidade completa disponível em [tfedu.vercel.app/privacidade.html](https://tfedu.vercel.app/privacidade.html)
- ✅ Não baixa, hospeda ou redistribui vídeos
- ✅ Conteúdo educacional com valor agregado independente
- ✅ Informações de contato: thiagorpba@gmail.com

---

## 👨‍💻 Autor

<div align="center">

**Thiago Fernando**
Engenheiro da Computação | Educador | Desenvolvedor

[![GitHub](https://img.shields.io/badge/GitHub-Thiago--spba-181717?style=for-the-badge&logo=github)](https://github.com/Thiago-spba)
[![Email](https://img.shields.io/badge/Email-thiagorpba@gmail.com-D14836?style=for-the-badge&logo=gmail)](mailto:thiagorpba@gmail.com)

</div>

---

<div align="center">

**🥇 TF Edu** — Feito com 💜 para aprender sempre

</div>
