const KEYS = {
  onboardingDone: 'yt-pwa:onboarding-done',
  pinHash: 'yt-pwa:pin-hash',
  dailyLimitMinutes: 'yt-pwa:daily-limit-minutes',
  usageDate: 'yt-pwa:usage-date',
  usageMinutes: 'yt-pwa:usage-minutes',
  parentalControlEnabled: 'yt-pwa:parental-control-enabled',
  autoplayEnabled: 'yt-pwa:autoplay-enabled',
  keepScreenOnEnabled: 'yt-pwa:keep-screen-on-enabled',
} as const

/** Toca o próximo vídeo da lista automaticamente ao terminar. Ligado por padrão. */
export function isAutoplayEnabled(): boolean {
  return localStorage.getItem(KEYS.autoplayEnabled) !== '0'
}

export function setAutoplayEnabled(enabled: boolean): void {
  localStorage.setItem(KEYS.autoplayEnabled, enabled ? '1' : '0')
}

/** Controla se PIN + limite diário são exigidos. Desligado por padrão. */
export function isParentalControlEnabled(): boolean {
  return localStorage.getItem(KEYS.parentalControlEnabled) === '1'
}

export function setParentalControlEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(KEYS.parentalControlEnabled, '1')
  } else {
    localStorage.removeItem(KEYS.parentalControlEnabled)
  }
}

/**
 * Mantém a tela acesa durante a reprodução (Screen Wake Lock). Desligado
 * por padrão — gasta mais bateria, então é opt-in. Dispara um evento para
 * o player (montado em outro componente) atualizar em tempo real, mesmo
 * alternando pelo painel de configurações enquanto um vídeo já está
 * tocando — mesmo padrão usado em `pwaUpdate.ts` para avisar a App sobre
 * versão nova.
 */
export function isKeepScreenOnEnabled(): boolean {
  try {
    return localStorage.getItem(KEYS.keepScreenOnEnabled) === '1'
  } catch {
    return false
  }
}

export function setKeepScreenOnEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(KEYS.keepScreenOnEnabled, '1')
    } else {
      localStorage.removeItem(KEYS.keepScreenOnEnabled)
    }
  } catch {
    // localStorage indisponível (aba anônima/bloqueado) — segue sem persistir.
  }
  window.dispatchEvent(new Event('keep-screen-on-changed'))
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(KEYS.onboardingDone) === '1'
}

export function markOnboardingDone(): void {
  localStorage.setItem(KEYS.onboardingDone, '1')
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hasPin(): Promise<boolean> {
  return localStorage.getItem(KEYS.pinHash) !== null
}

export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(KEYS.pinHash, await sha256(pin))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(KEYS.pinHash)
  if (!stored) return false
  return (await sha256(pin)) === stored
}

export function getDailyLimitMinutes(): number | null {
  const raw = localStorage.getItem(KEYS.dailyLimitMinutes)
  return raw ? Number(raw) : null
}

export function setDailyLimitMinutes(minutes: number | null): void {
  if (minutes === null) {
    localStorage.removeItem(KEYS.dailyLimitMinutes)
  } else {
    localStorage.setItem(KEYS.dailyLimitMinutes, String(minutes))
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getUsageMinutesToday(): number {
  const storedDate = localStorage.getItem(KEYS.usageDate)
  if (storedDate !== today()) return 0
  return Number(localStorage.getItem(KEYS.usageMinutes) ?? '0')
}

export function addUsageMinutes(minutes: number): number {
  const current = getUsageMinutesToday()
  const updated = current + minutes
  localStorage.setItem(KEYS.usageDate, today())
  localStorage.setItem(KEYS.usageMinutes, String(updated))
  return updated
}

// ── IDs de vídeos bloqueados/removidos pelo usuário ──────────────────────
const BLOCKED_KEY = 'yt-pwa:blocked-video-ids'

export function getBlockedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function blockVideoId(id: string): void {
  try {
    const ids = getBlockedIds()
    ids.add(id)
    localStorage.setItem(BLOCKED_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

export function isVideoBlocked(id: string): boolean {
  return getBlockedIds().has(id)
}
