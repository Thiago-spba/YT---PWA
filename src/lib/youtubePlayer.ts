export interface YTPlayer {
  loadVideoById: (videoId: string) => void
  destroy: () => void
}

interface YTPlayerOptions {
  videoId: string
  host?: string
  playerVars?: Record<string, number | string>
  events?: {
    onReady?: () => void
    onError?: (event: { data: number }) => void
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
