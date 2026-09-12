// Conexão com a conta Google — fluxo "servidor guarda tudo". O navegador
// nunca vê access_token nem refresh_token: eles ficam só no cookie
// HttpOnly que as functions de api/auth/*.ts controlam. Isso é o que faz a
// conexão sobreviver a atualização de página, atualização do PWA, etc. —
// diferente do fluxo antigo (Google Identity Services / initTokenClient),
// que guardava o token só em memória e perdia tudo a cada reload.

export class GoogleAuthError extends Error {}

export interface GoogleProfile {
  name: string
  email: string
  picture: string
}

export interface GoogleSession {
  connected: boolean
  profile: GoogleProfile | null
}

/**
 * Inicia a conexão — precisa ser chamada a partir de um clique direto do
 * usuário. Navega a página inteira (não abre popup nem iframe): o cookie
 * de estado (anti-CSRF) e o de sessão só funcionam com navegação de topo.
 */
export function startGoogleConnect(): void {
  window.location.href = '/api/auth/google-login'
}

/** Pergunta ao servidor se a conta Google continua conectada. */
export async function fetchGoogleSession(): Promise<GoogleSession> {
  try {
    const res = await fetch('/api/auth/google-session')
    if (!res.ok) return { connected: false, profile: null }
    const data = (await res.json()) as { connected?: boolean; profile?: GoogleProfile | null }
    return { connected: !!data.connected, profile: data.profile ?? null }
  } catch {
    return { connected: false, profile: null }
  }
}

/** Revoga o acesso no Google e limpa o cookie do servidor. */
export async function disconnectGoogle(): Promise<void> {
  try {
    await fetch('/api/auth/google-logout', { method: 'POST' })
  } catch {
    // Best-effort — mesmo se falhar, a UI trata como desconectado.
  }
}
