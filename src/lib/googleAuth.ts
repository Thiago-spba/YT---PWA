const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE =
  'https://www.googleapis.com/auth/youtube.readonly openid email profile'

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}

interface TokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
          revoke: (token: string, callback: () => void) => void
        }
      }
    }
  }
}

export class GoogleAuthError extends Error {}

export interface GoogleProfile {
  name: string
  email: string
  picture: string
}

let accessToken: string | null = null
let expiresAt = 0

function assertClientId(): string {
  if (!CLIENT_ID) {
    throw new GoogleAuthError(
      'VITE_GOOGLE_CLIENT_ID não configurado. Crie um ID de cliente OAuth no Google Cloud Console.',
    )
  }
  return CLIENT_ID
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (document.getElementById('gis-script')) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check)
          resolve()
        }
      }, 100)
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new GoogleAuthError('Falha ao carregar o script do Google.'))
    document.head.appendChild(script)
  })
}

export function isTokenValid(): boolean {
  return accessToken !== null && Date.now() < expiresAt
}

export function getAccessToken(): string | null {
  return isTokenValid() ? accessToken : null
}

/** Precisa ser chamada a partir de um clique do usuário (gesto direto). */
export async function connectGoogle(): Promise<string> {
  const clientId = assertClientId()
  await loadGisScript()

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new GoogleAuthError(response.error ?? 'Acesso negado.'))
          return
        }
        accessToken = response.access_token
        expiresAt = Date.now() + response.expires_in * 1000
        resolve(accessToken)
      },
    })
    client.requestAccessToken()
  })
}

export function disconnectGoogle(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {})
  }
  accessToken = null
  expiresAt = 0
}

export async function fetchGoogleProfile(): Promise<GoogleProfile> {
  const token = getAccessToken()
  if (!token) throw new GoogleAuthError('Não conectado ao Google.')
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new GoogleAuthError('Não foi possível obter o perfil do Google.')
  const data = await res.json()
  return { name: data.name, email: data.email, picture: data.picture }
}
