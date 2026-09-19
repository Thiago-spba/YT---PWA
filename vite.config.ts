import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' (e não 'autoUpdate') porque o registro real é manual, em
      // src/lib/pwaUpdate.ts: ele avisa a pessoa (faixa "Nova versão
      // disponível") e só aplica a atualização quando ela clica, em vez de
      // recarregar a página sozinho — o que derrubaria um vídeo tocando.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'TF Edu 🥇',
        short_name: 'TF Edu',
        description: 'Sua plataforma pessoal de aprendizado: cursos, vestibular, concursos e tecnologia.',
        theme_color: '#4c1d95',
        background_color: '#16171d',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
