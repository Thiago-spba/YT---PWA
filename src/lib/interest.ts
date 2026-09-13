import type { Video } from '../types'
import { categorize, categorizeByYouTubeId } from './categories'
import { recordInterest } from './db'
import { getVideoCategoryId } from './youtube'

/**
 * Registra interesse a partir de um vídeo assistido, combinando duas fontes
 * (um vídeo pode contar para as duas ao mesmo tempo):
 *
 * 1. Categoria OFICIAL do YouTube (video.categoryId, ou buscada agora se
 *    ainda não veio junto) — a mais confiável, cobre a maioria do conteúdo
 *    real mesmo quando o título não usa nenhuma palavra "óbvia".
 * 2. Palavras-chave no título/canal — cobre nichos que o YouTube não
 *    categoriza como assunto próprio (ex.: conteúdo religioso, mistérios/
 *    OVNIs), que antes eram a ÚNICA fonte e cobriam pouca coisa.
 *
 * Antes desta função, a recomendação da Home dependia só da fonte 2, que
 * exige bater uma de ~60 palavras fixas no título — a maioria dos vídeos
 * assistidos não batia com nenhuma, então "aprender com o que você assiste"
 * raramente tinha efeito. Nunca lança erro (best-effort).
 */
export async function recordVideoInterest(video: Video, weight = 2): Promise<void> {
  const keywordCategories = categorize(`${video.title} ${video.channelTitle}`)
  const categoryId = video.categoryId ?? (await getVideoCategoryId(video.id))
  const ytCategories = categorizeByYouTubeId(categoryId)
  const all = Array.from(new Set([...keywordCategories, ...ytCategories]))
  if (all.length === 0) return
  await recordInterest(all, weight).catch(() => {})
}
