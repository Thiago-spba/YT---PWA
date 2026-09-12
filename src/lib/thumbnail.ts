/**
 * Miniatura vinda da API do YouTube, com respaldo para a URL
 * previsível de miniatura (funciona pra qualquer vídeo, mesmo quando a
 * API não devolve o campo `thumbnails` preenchido — acontece em
 * alguns itens de playlist, principalmente de canais "Topic").
 *
 * Prioriza a maior resolução disponível (maxres > standard > high >
 * medium > default) — antes só olhava medium/default (320x180 ou
 * menor), que ficava borrado/pixelizado quando esticado nos cards
 * verticais dos Shorts (9:16). A API nem sempre devolve maxres/standard
 * (depende do vídeo), então a cadeia de respaldo continua importante.
 */
export function resolveThumbnail(
  videoId: string,
  thumbnails?: {
    maxres?: { url?: string }
    standard?: { url?: string }
    high?: { url?: string }
    medium?: { url?: string }
    default?: { url?: string }
  },
): string {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  )
}
