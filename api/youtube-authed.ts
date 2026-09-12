import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  parseCookies,
  refreshAccessToken,
} from './_lib/googleOAuth.js'

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string | string[]): ApiResponse
  json(body: unknown): void
}

const BASE_URL = 'https://www.googleapis.com/youtube/v3'
// Mesmo limite de segurança que o antigo authedGetAllPages do navegador
// tinha — 20 páginas de 50 já cobre 1000 itens.
const MAX_PAGES = 20

// Só os três recursos que o app usa (inscrições, playlists, itens de
// playlist), e só os parâmetros que cada um aceita — evita que o proxy
// vire uma porta aberta pra qualquer parâmetro da API do Google.
const ALLOWED_PARAMS: Record<string, string[]> = {
  subscriptions: ['part', 'mine', 'maxResults', 'order'],
  playlists: ['part', 'mine', 'maxResults'],
  playlistItems: ['part', 'playlistId', 'maxResults'],
}

function paramString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// Proxy autenticado para a YouTube Data API v3 — substitui as chamadas que
// antes saíam direto do navegador com "Authorization: Bearer <token>".
// Agora o navegador nunca vê nenhum token: manda só o cookie (automático,
// HttpOnly) e essa function troca o refresh_token por um access_token na
// hora, faz a paginação inteira internamente e devolve só os itens já
// juntados.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const resource = paramString(req.query.resource)
  if (!resource || !ALLOWED_PARAMS[resource]) {
    res.status(400).json({ error: 'Recurso inválido.' })
    return
  }

  const cookies = parseCookies(
    Array.isArray(req.headers.cookie) ? req.headers.cookie[0] : req.headers.cookie,
  )
  const refreshToken = cookies[REFRESH_COOKIE]
  if (!refreshToken) {
    res.status(401).json({ error: 'Conta do Google não conectada.' })
    return
  }

  let accessToken: string
  try {
    const tokens = await refreshAccessToken(refreshToken)
    if (tokens.error || !tokens.access_token) {
      res.setHeader('Set-Cookie', clearRefreshCookie())
      res.status(401).json({ error: 'Conexão com o Google expirou. Conecte novamente.' })
      return
    }
    accessToken = tokens.access_token
  } catch (err) {
    console.error('youtube-authed: renovar token falhou:', err)
    res.status(502).json({ error: 'Não foi possível renovar o acesso ao Google agora.' })
    return
  }

  const baseParams: Record<string, string> = {}
  for (const name of ALLOWED_PARAMS[resource]) {
    const value = paramString(req.query[name])
    if (value !== undefined) baseParams[name] = value
  }

  try {
    const items: unknown[] = []
    let pageToken: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams(pageToken ? { ...baseParams, pageToken } : baseParams)
      const upstream = await fetch(`${BASE_URL}/${resource}?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!upstream.ok) {
        const errBody = await upstream.json().catch(() => ({}))
        res.status(upstream.status).json(errBody)
        return
      }
      const data = (await upstream.json()) as { items?: unknown[]; nextPageToken?: string }
      items.push(...(data.items ?? []))
      pageToken = data.nextPageToken
      if (!pageToken) break
    }
    res.status(200).json({ items })
  } catch (err) {
    console.error('youtube-authed falhou:', err)
    res.status(502).json({ error: 'Não foi possível consultar sua conta do Google agora.' })
  }
}
