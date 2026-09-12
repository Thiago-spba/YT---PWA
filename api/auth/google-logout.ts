import { REFRESH_COOKIE, clearRefreshCookie, parseCookies } from '../_lib/googleOAuth.js'

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string | string[]): ApiResponse
  json(body: unknown): void
}

// "Desconectar": revoga o refresh_token direto no Google (assim some da
// lista de acessos de terceiros da conta do usuário, não só localmente) e
// limpa o cookie. Best-effort — mesmo se a chamada ao Google falhar, o
// cookie é limpo do mesmo jeito.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const cookies = parseCookies(
    Array.isArray(req.headers.cookie) ? req.headers.cookie[0] : req.headers.cookie,
  )
  const refreshToken = cookies[REFRESH_COOKIE]

  if (refreshToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('revogar token do Google falhou:', err)
    }
  }

  res.setHeader('Set-Cookie', clearRefreshCookie())
  res.status(200).json({ connected: false })
}
