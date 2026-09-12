import { randomBytes } from 'node:crypto'
import {
  OAUTH_SCOPE,
  callbackRedirectUri,
  serializeStateCookie,
} from '../_lib/googleOAuth.js'

interface ApiRequest {
  method?: string
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string | string[]): ApiResponse
  end(): void
}

// Ponto de entrada do "Conectar com Google": redireciona a página inteira
// para a tela de consentimento do Google (não é popup nem iframe — o
// cookie do fluxo só funciona com navegação de topo). `access_type=offline`
// + `prompt=consent` garantem que o Google sempre devolva um refresh_token
// novo, mesmo que o usuário já tenha autorizado o app antes.
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(500).end()
    return
  }

  const state = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackRedirectUri(),
    response_type: 'code',
    scope: OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })

  res.setHeader('Set-Cookie', serializeStateCookie(state))
  res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  res.status(302).end()
}
