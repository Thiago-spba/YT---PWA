import { serializeRefreshCookie } from '../_lib/googleOAuth.js'

interface ApiRequest {
  method?: string
  body?: { device_code?: string }
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string | string[]): ApiResponse
  json(body: unknown): void
}

interface TokenResponse {
  error?: string
  refresh_token?: string
  access_token?: string
  expires_in?: number
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const device_code = (req.body as { device_code?: string })?.device_code
  if (!device_code) {
    res.status(400).json({ error: 'device_code obrigatorio' })
    return
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Credenciais nao configuradas' })
    return
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })

  const data = await response.json() as TokenResponse

  if (data.error === 'authorization_pending') {
    res.status(202).json({ status: 'pending' })
    return
  }
  if (data.error === 'access_denied') {
    res.status(403).json({ status: 'denied' })
    return
  }
  if (data.error === 'expired_token') {
    res.status(410).json({ status: 'expired' })
    return
  }
  if (data.error) {
    res.status(500).json({ status: 'error', error: data.error })
    return
  }

  if (data.refresh_token) {
    res.setHeader('Set-Cookie', serializeRefreshCookie(data.refresh_token))
  }

  res.status(200).json({
    status: 'success',
    access_token: data.access_token,
    expires_in: data.expires_in,
  })
}
