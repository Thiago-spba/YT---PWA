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
const ALLOWED_ORIGINS = [
  'https://tfedu.vercel.app',
  'https://tfedu.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

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
  'Você expande termos de busca de vídeos do YouTube para um app familiar ' +
  '(música religiosa, curiosidades, entretenimento leve, uso pessoal). Dado ' +
  'um termo de busca, devolva até 5 sinônimos ou termos relacionados em ' +
  'português, curtos (1 a 3 palavras cada), sem repetir o termo original e ' +
  'sem inventar conteúdo — apenas reformule/expanda o termo em variações ' +
  'plausíveis que alguém buscaria pelo mesmo assunto.'

/**
 * O modelo às vezes devolve o JSON embrulhado em um bloco de código
 * markdown (```json ... ``` ou ``` ... ```), mesmo quando instruído a
 * responder "apenas" com JSON — isso é comportamento comum de LLMs e
 * estava causando falha 100% das vezes em JSON.parse (SyntaxError:
 * Unexpected token '`'), derrubando a busca inteligente inteira com 502.
 * Remove esse invólucro antes de tentar o parse.
 */
function extractJson(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) return fenced[1].trim()
  // Sem crases, mas pode ter texto antes/depois do objeto — pega só o
  // primeiro '{' até o último '}' como salvaguarda extra.
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const rawOrigin = req.headers['origin']
  const rawReferer = req.headers['referer']
  const origin = (Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin) ?? ''
  const referer = (Array.isArray(rawReferer) ? rawReferer[0] : rawReferer) ?? ''
  const isAllowed =
    ALLOWED_ORIGINS.some((o) => origin === o || referer.startsWith(o)) ||
    origin === ''

  if (!isAllowed) {
    res.status(403).json({ error: 'Acesso não autorizado.' })
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
      system: SYSTEM_PROMPT + ' Responda APENAS com JSON no formato {"terms": ["termo1", "termo2"]}.',
      messages: [{ role: 'user', content: query }],
    })

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const parsed = textBlock ? (JSON.parse(extractJson(textBlock.text)) as { terms?: unknown }) : { terms: [] }
    const terms = Array.isArray(parsed.terms)
      ? parsed.terms.filter((t): t is string => typeof t === 'string').slice(0, 5)
      : []

    res.status(200).json({ terms })
  } catch (err) {
    console.error('search-expand falhou:', err)
    res.status(502).json({ error: 'Não foi possível expandir a busca agora. Tente novamente mais tarde.' })
  }
}
