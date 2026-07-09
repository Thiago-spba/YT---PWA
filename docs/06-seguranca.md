# Fase 6 — Endurecimento de segurança

**Status:** concluída

## O que foi feito

### Chave da YouTube Data API restrita
- Restrição por **Site (HTTP referrer)**: só funciona a partir de
  `https://yt-pwa-nine.vercel.app/*`.
- Restrição por **API**: só pode chamar a YouTube Data API v3.
- Testado com requisições reais simulando o cabeçalho `Referer`:
  - Referer de domínio não autorizado → `403` (bloqueado).
  - Referer do domínio de produção → `200` (funciona).
- Isso limita o dano se a chave vazar (ela aparece no bundle JS do
  client, isso é inerente a apps sem backend) — outro site não
  consegue usá-la, e ela só acessa uma API de leitura pública.

### Cabeçalhos de segurança HTTP (`vercel.json`)
Aplicados a todas as respostas do domínio de produção:
- `Content-Security-Policy` — restringe de onde o app pode carregar
  script, imagem, iframe e chamadas de rede. Só permite:
  script/estilo/fonte do próprio domínio, imagens do próprio domínio e
  de `i.ytimg.com` (thumbnails), chamadas de rede para
  `googleapis.com` (API do YouTube), iframe apenas de
  `youtube-nocookie.com` (player), e `frame-ancestors 'none'`
  (impede que outro site coloque o app dentro de um `<iframe>`).
- `X-Frame-Options: DENY` — reforça a mesma proteção contra clickjacking
  em navegadores mais antigos que não leem `frame-ancestors`.
- `X-Content-Type-Options: nosniff` — evita que o navegador tente
  reinterpretar arquivos com um tipo diferente do declarado.
- `Referrer-Policy: strict-origin-when-cross-origin` — evita vazar a URL
  completa (que poderia incluir dados) para terceiros em requisições
  cross-origin.
- `Permissions-Policy` — desativa explicitamente geolocalização,
  microfone, câmera, pagamento e USB, que o app não usa.

### Dependências
- `npm audit` → **0 vulnerabilidades** conhecidas nas dependências atuais.

## Limitações conhecidas (aceitas para uso pessoal)

- **PIN é só client-side.** Ele fica em `localStorage` (hash SHA-256, sem
  senha em texto puro), mas nada impede que alguém com acesso ao
  dispositivo limpe os dados do site no navegador — isso apaga o PIN e a
  tela de configurações volta a pedir "criar PIN" do zero, sem exigir o
  PIN antigo. Para uma criança pequena isso não é um risco realista (não
  tem motivo nem conhecimento técnico para fazer isso), mas não é uma
  proteção de nível "conta protegida por senha real". Resolver isso de
  verdade exigiria um backend com autenticação — fora do escopo atual
  (ver [docs/00-intencao-e-escopo.md](00-intencao-e-escopo.md)).
- **A chave da API sempre será visível** no código-fonte carregado pelo
  navegador — isso é inerente a qualquer app 100% client-side. A
  restrição por domínio é a mitigação correta nesse cenário (não existe
  como "esconder" segredo em código que roda no navegador do usuário).
