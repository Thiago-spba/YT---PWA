import {
  APP_ORIGIN,
  STATE_COOKIE,
  callbackRedirectUri,
  clearStateCookie,
  exchangeCodeForTokens,
  parseCookies,
  serializeRefreshCookie,
} from '../_lib/googleOAuth.js'

interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string | string[]): ApiResponse
  end(): void
}

function paramString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function redirectToApp(res: ApiResponse, query: string): void {
  res.setHeader('Location', `${APP_ORIGIN}/${query}`)
  res.status(302).end()
}

// O Google volta pra cá depois do usuário aprovar (ou negar) o
// consentimento. Troca o "code" pelo access_token + refresh_token, guarda
// só o refresh_token (o de longa duração) num cookie HttpOnly, e manda o
// navegador de volta pro app.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const cookies = parseCookies(
    Array.isArray(req.headers.cookie) ? req.headers.cookie[0] : req.headers.cookie,
  )
  const expectedState = cookies[STATE_COOKIE]

  const deniedError = paramString(req.query.error)
  if (deniedError) {
    res.setHeader('Set-Cookie', clearStateCookie())
    redirectToApp(res, '?google_error=denied')
    return
  }

  const code = paramString(req.query.code)
  const returnedState = paramString(req.query.state)

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    res.setHeader('Set-Cookie', clearStateCookie())
    redirectToApp(res, '?google_error=state')
    return
  }

  try {
    const tokens = await exchangeCodeForTokens(code, callbackRedirectUri())
    if (tokens.error || !tokens.refresh_token) {
      console.error('google-callback sem refresh_token:', tokens.error ?? tokens)
      res.setHeader('Set-Cookie', clearStateCookie())
      redirectToApp(res, '?google_error=token')
      return
    }
    res.setHeader('Set-Cookie', [clearStateCookie(), serializeRefreshCookie(tokens.refresh_token)])
    redirectToApp(res, '?google=connected')
  } catch (err) {
    console.error('google-callback falhou:', err)
    res.setHeader('Set-Cookie', clearStateCookie())
    redirectToApp(res, '?google_error=server')
  }
}
