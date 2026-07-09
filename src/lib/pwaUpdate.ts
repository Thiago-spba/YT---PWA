import { registerSW } from 'virtual:pwa-register'

/**
 * Registra o service worker e checa por versão nova a cada minuto
 * enquanto o app está aberto. Ao encontrar uma versão nova, recarrega
 * sozinho (sem perguntar) — evita o usuário ficar preso numa versão
 * antiga em cache.
 */
export function setupAutoUpdate(): void {
  const updateSW = registerSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update()
      }, 60_000)
    },
    onNeedRefresh() {
      updateSW(true)
    },
  })
}
