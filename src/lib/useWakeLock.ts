import { useEffect, useRef } from 'react'

/** true se o navegador suporta a Screen Wake Lock API. */
export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Mantém a tela acesa enquanto `enabled` for true — usado para não deixar
 * a tela apagar durante a reprodução de vídeo. Falha graciosamente sem
 * suporte do navegador (Firefox desktop, Safari antigo) ou se o pedido for
 * negado (ex.: `NotAllowedError` com a aba em segundo plano,
 * `InvalidStateError`) — nesses casos o app segue funcionando normalmente,
 * só sem a tela travada.
 */
export function useWakeLock(enabled: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !isWakeLockSupported()) return

    let cancelled = false

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        lockRef.current = lock
      } catch {
        // Best-effort: negado, sem suporte real por trás do feature-detect,
        // ou qualquer outro erro do navegador — segue sem o lock.
      }
    }

    acquire()

    // O navegador libera o lock sozinho quando a aba fica oculta — ao
    // voltar a ficar visível, tenta readquirir.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      try {
        lockRef.current?.release().catch(() => {})
      } catch {
        // ignore
      }
      lockRef.current = null
    }
  }, [enabled])
}
