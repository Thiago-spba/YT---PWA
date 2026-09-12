import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  parseCookies,
  refreshAccessToken,
} from '../_lib/googleOAuth.js'

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string | string[]): ApiResponse
  json(body: unknown): void
}

// Chamada pelo app ao abrir/atualizar a página pra saber se a conta Google
// continua conectada — sem precisar de nenhum token guardado no navegador.
// Se tiver refresh_token válido no cookie, renova o access_token na hora e
// devolve o perfil; senão devolve `connected: false`.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const cookies = parseCookies(
    Array.isArray(req.headers.cookie) ? req.headers.cookie[0] : req.headers.cookie,
  )
  const refreshToken = cookies[REFRESH_COOKIE]
  if (!refreshToken) {
    res.status(200).json({ connected: false, profile: null })
    return
  }

  try {
    const tokens = await refreshAccessToken(refreshToken)
    if (tokens.error || !tokens.access_token) {
      // Refresh token expirado/revogado (ex.: 7 dias em modo "Testando" no
      // Google Cloud, ou o usuário revogou o acesso pela própria conta
      // Google) — limpa o cookie pra não ficar tentando de novo à toa.
      res.setHeader('Set-Cookie', clearRefreshCookie())
      res.status(200).json({ connected: false, profile: null })
      return
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!profileRes.ok) {
      res.status(200).json({ connected: true, profile: null })
      return
    }
    const profile = (await profileRes.json()) as {
      name?: string
      email?: string
      picture?: string
    }
    res.status(200).json({
      connected: true,
      profile: { name: profile.name ?? '', email: profile.email ?? '', picture: profile.picture ?? '' },
    })
  } catch (err) {
    console.error('google-session falhou:', err)
    res.status(200).json({ connected: false, profile: null })
  }
}
