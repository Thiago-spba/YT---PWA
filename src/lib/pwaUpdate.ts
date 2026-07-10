import { registerSW } from 'virtual:pwa-register'

let applyUpdate: (() => void) | null = null

/**
 * Registra o service worker e checa por versão nova a cada minuto
 * enquanto o app está aberto. Antes, ao encontrar uma versão nova, o
 * app recarregava a página sozinho e sem avisar (`updateSW(true)`
 * direto) — isso derrubava qualquer vídeo tocando no meio da
 * reprodução. Agora só avisa (evento `pwa-update-available`, ouvido em
 * App.tsx) e deixa a pessoa decidir a hora de atualizar.
 */
export function setupAutoUpdate(): void {
  const updateSW = registerSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Checa na hora também — antes só checava a partir de 60s depois
      // de abrir, então quem fechava o app antes disso nunca chegava a
      // ver o aviso de versão nova.
      registration.update()
      setInterval(() => {
        registration.update()
      }, 60_000)
    },
    onNeedRefresh() {
      applyUpdate = () => updateSW(true)
      window.dispatchEvent(new Event('pwa-update-available'))
    },
  })
}

export function applyPendingUpdate(): void {
  applyUpdate?.()
}
