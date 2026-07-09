const KEYS = {
  onboardingDone: 'yt-pwa:onboarding-done',
  pinHash: 'yt-pwa:pin-hash',
  dailyLimitMinutes: 'yt-pwa:daily-limit-minutes',
  usageDate: 'yt-pwa:usage-date',
  usageMinutes: 'yt-pwa:usage-minutes',
  parentalControlEnabled: 'yt-pwa:parental-control-enabled',
} as const

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
