/**
 * IDs de vídeos recomendados para a primeira página do feed da Home.
 *
 * Por que isso existe: o endpoint `videos` da YouTube Data API custa 1
 * ponto de cota por chamada (até 50 IDs de uma vez), contra 100 pontos do
 * endpoint `search`. Preenchendo esta lista com IDs curados, a primeira
 * página da Home (a que todo usuário vê, sempre) passa a custar 1 em vez
 * de 100 pontos de cota.
 *
 * Como preencher: cole aqui os 11 caracteres do ID do vídeo (o trecho
 * depois de `v=` na URL do YouTube, ex.: `https://youtube.com/watch?v=SEU_ID`
 * → `'SEU_ID'`). Curadoria é uma decisão de conteúdo do app, por isso a
 * lista começa vazia — sem IDs aqui, a Home cai automaticamente no
 * fallback por busca (endpoint `search`, mesmo comportamento de antes).
 */
export const RECOMMENDED_VIDEO_IDS: string[] = []
