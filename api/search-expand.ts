import Anthropic from '@anthropic-ai/sdk'

// Tipos mínimos do que realmente usamos do request/response da Vercel —
// evita depender do pacote @vercel/node só por causa de tipos (suas
// dependências de build trazem avisos de segurança irrelevantes aqui,
// já que rodam só em tempo de deploy da Vercel, não no runtime da function).
interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  socket?: { remoteAddress?: string }
}

interface ApiResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

// Limite básico de requisições por IP — sem banco/Redis nesta arquitetura
// (site estático + functions), um mapa em memória já reduz abuso o
// suficiente para o volume de uso familiar deste app. Reseta a cada cold
// start da function, o que é uma limitação aceitável aqui.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20
const requestLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  requestLog.set(ip, recent)
  return recent.length > RATE_LIMIT_MAX_REQUESTS
}

const MAX_QUERY_LENGTH = 100

const SYSTEM_PROMPT =
  'Você expande termos de busca de vídeos do YouTube em português brasileiro. ' +
  'Dado um termo, devolva até 5 variações relacionadas em português, curtas (1 a 3 palavras), ' +
  'sem repetir o termo original. Foco em: tecnologia, ciência, educação, história, cultura brasileira. ' +
  'Responda SOMENTE com JSON válido no formato: {"terms": ["termo1", "termo2"]}'

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const forwardedFor = req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Muitas buscas em pouco tempo. Aguarde um instante.' })
    return
  }

  const body = (req.body ?? {}) as { query?: unknown }
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query || query.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ error: 'Termo de busca inválido.' })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' })
    return
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Busca: "${query}"\nResponda APENAS com JSON: {"terms": ["termo1", "termo2"]}` }],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    let terms: string[] = []
    if (textBlock) {
      try {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as { terms?: unknown }) : { terms: [] }
        terms = Array.isArray(parsed.terms)
          ? parsed.terms.filter((t): t is string => typeof t === 'string').slice(0, 5)
          : []
      } catch {
        terms = []
      }
    }

    res.status(200).json({ terms })
  } catch (err) {
    console.error('search-expand falhou:', err)
    res.status(502).json({ error: 'Não foi possível expandir a busca agora. Tente novamente mais tarde.' })
  }
}
