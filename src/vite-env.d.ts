/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Document Picture-in-Picture API — ainda não incluída no lib.dom.d.ts
// padrão do TypeScript. Suporte: Chrome/Edge (desktop e Android) recentes.
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}
