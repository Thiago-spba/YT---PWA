// Funções compartilhadas pelas functions de autenticação com o Google
// (api/auth/*.ts) e pelo proxy autenticado (api/youtube-authed.ts). Fica
// tudo num só lugar para não duplicar a lógica sensível (cookie do
// refresh_token, troca/renovação de tokens) em vários arquivos.
//
// Como funciona, em resumo: em vez do navegador guardar o access_token
// (que expira em ~1h e se perde a cada atualização da página, como era
// antes com o Google Identity Services), quem guarda a credencial de longo
// prazo (o refresh_token) é o servidor, num cookie HttpOnly que o
// JavaScript do navegador nunca consegue ler. A cada chamada autenticada,
// a function troca esse refresh_token por um access_token novo (válido por
// ~1h) direto com o Google, na hora — por isso a conexão sobrevive a
// reload, atualização do PWA, etc.

export const APP_ORIGIN = 'https://yt-pwa-nine.vercel.app'

export const OAUTH_SCOPE =
  'https://www.googleapis.com/auth/youtube.readonly openid email profile'

export const REFRESH_COOKIE = 'g_rt'
export const STATE_COOKIE = 'g_oauth_state'

// 180 dias — teto de segurança do próprio cookie. Isso NÃO é a validade do
// refresh_token em si (essa quem decide é o Google: ~6 meses de conta
// parada, ou só 7 dias enquanto a tela de consentimento do projeto
// estiver em modo "Testando" no Google Cloud Console).
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 180
const STATE_COOKIE_MAX_AGE = 60 * 5 // 5 minutos — só o tempo do login

function cookieAttributes(maxAgeSeconds: number): string {
  return `Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

export function serializeRefreshCookie(value: string): string {
  return `${REFRESH_COOKIE}=${encodeURIComponent(value)}; ${cookieAttributes(REFRESH_COOKIE_MAX_AGE)}`
}

export function clearRefreshCookie(): string {
  return `${REFRESH_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function serializeStateCookie(value: string): string {
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; ${cookieAttributes(STATE_COOKIE_MAX_AGE)}`
}

export function clearStateCookie(): string {
  return `${STATE_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) {
      try {
        out[key] = decodeURIComponent(value)
      } catch {
        out[key] = value
      }
    }
  }
  return out
}

interface TokenExchangeResult {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

export function callbackRedirectUri(): string {
  return `${APP_ORIGIN}/api/auth/google-callback`
}

export function assertServerCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_SECRET ou VITE_GOOGLE_CLIENT_ID não configurados no servidor.',
    )
  }
  return { clientId, clientSecret }
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenExchangeResult> {
  const { clientId, clientSecret } = assertServerCredentials()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  return (await res.json()) as TokenExchangeResult
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
  const { clientId, clientSecret } = assertServerCredentials()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  return (await res.json()) as TokenExchangeResult
}
