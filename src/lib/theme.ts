export type Theme = 'light' | 'dark' | 'system'

const KEY = 'yt-pwa:theme'

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme): void {
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

export function initTheme(): void {
  applyTheme(getStoredTheme())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}
