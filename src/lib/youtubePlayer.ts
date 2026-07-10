export interface YTPlayer {
  loadVideoById: (videoId: string) => void
  destroy: () => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  playVideo: () => void
  pauseVideo: () => void
  getIframe: () => HTMLIFrameElement
}

/**
 * Garante que o iframe permite Picture-in-Picture — o jeito real
 * (nativo do navegador) de manter o vídeo visível/tocando por cima de
 * outros apps, bem mais confiável do que qualquer truque de JS pra
 * "forçar" segundo plano (o player do YouTube, por ser de outra
 * origem, decide sozinho se pausa quando a página fica oculta).
 */
export function enablePictureInPicture(player: YTPlayer): void {
  const iframe = player.getIframe()
  if (!iframe) return
  const current = iframe.getAttribute('allow') ?? ''
  if (!current.includes('picture-in-picture')) {
    iframe.setAttribute('allow', `${current}${current ? '; ' : ''}picture-in-picture`.trim())
  }
}

export interface DocumentPipHandle {
  window: Window
  close: () => void
}

export function isDocumentPipSupported(): boolean {
  return typeof window !== 'undefined' && !!window.documentPictureInPicture
}

/**
 * Move o nó (iframe do player) para uma janela real de Picture-in-Picture,
 * sempre visível por cima de outros apps/abas — ao contrário de
 * window.open, a Document PiP API move o nó existente sem recarregar o
 * iframe, então a reprodução não é interrompida. `onClose` é chamado
 * tanto quando fechamos por código quanto quando o usuário fecha a
 * janela flutuante pelo próprio X do navegador.
 */
export async function openDocumentPip(
  node: HTMLElement,
  size: { width: number; height: number },
  onClose: () => void,
): Promise<DocumentPipHandle> {
  if (!window.documentPictureInPicture) {
    throw new Error('Picture-in-Picture não é suportado neste navegador.')
  }
  const pipWindow = await window.documentPictureInPicture.requestWindow(size)

  const parent = node.parentElement
  const nextSibling = node.nextSibling
  let restored = false

  pipWindow.document.body.style.margin = '0'
  pipWindow.document.body.style.background = '#000'
  pipWindow.document.body.style.overflow = 'hidden'
  pipWindow.document.body.append(node)

  function restore() {
    if (restored) return
    restored = true
    parent?.insertBefore(node, nextSibling)
  }

  pipWindow.addEventListener('pagehide', () => {
    restore()
    onClose()
  })

  return {
    window: pipWindow,
    close: () => {
      restore()
      pipWindow.close()
    },
  }
}

export const YT_PLAYER_STATE_ENDED = 0

interface YTPlayerOptions {
  videoId: string
  host?: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, number | string>
  events?: {
    onReady?: () => void
    onError?: (event: { data: number }) => void
    onStateChange?: (event: { data: number }) => void
  }
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: YTPlayerOptions) => YTPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<NonNullable<Window['YT']>> | null = null

export function loadYouTubeApi(): Promise<NonNullable<Window['YT']>> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}
