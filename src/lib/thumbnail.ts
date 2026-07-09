/**
 * Miniatura vinda da API do YouTube, com respaldo para a URL
 * previsível de miniatura (funciona pra qualquer vídeo, mesmo quando a
 * API não devolve o campo `thumbnails` preenchido — acontece em
 * alguns itens de playlist, principalmente de canais "Topic").
 */
export function resolveThumbnail(
  videoId: string,
  thumbnails?: { medium?: { url?: string }; default?: { url?: string } },
): string {
  return (
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  )
}
