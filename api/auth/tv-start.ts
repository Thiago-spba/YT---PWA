interface ApiRequest {
  method?: string
  body?: unknown
}

interface ApiResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

interface DeviceAuthResponse {
  device_code?: string
  user_code?: string
  verification_url?: string
  expires_in?: number
  interval?: number
  error?: string
}

const DEVICE_AUTH_URL = 'https://oauth2.googleapis.com/device/code'
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly openid email profile'

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(500).json({ error: 'Client ID nao configurado' })
    return
  }

  const response = await fetch(DEVICE_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope: SCOPE }),
  })

  const data = await response.json() as DeviceAuthResponse

  if (!response.ok) {
    res.status(500).json({ error: 'Erro ao iniciar autenticacao TV', details: data })
    return
  }

  res.status(200).json({
    device_code: data.device_code,
    user_code: data.user_code,
    verification_url: data.verification_url,
    expires_in: data.expires_in,
    interval: data.interval,
  })
}
