// Proxy server-side para a YouTube Data API v3 — mesma motivação do
// api/search-expand.ts: a chave nunca deve chegar ao bundle do navegador
// (qualquer variável VITE_ é embutida em texto claro no cliente). Aqui ela
// fica só em process.env.YOUTUBE_API_KEY, lida em tempo de execução da
// function.
interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
}

interface ApiResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

// Mesmo padrão de rate-limit em memória do api/search-expand.ts — sem
// banco/Redis nesta arquitetura, um mapa por IP já reduz abuso o
// suficiente para o volume de uso familiar deste app.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const requestLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  requestLog.set(ip, recent)
  return recent.length > RATE_LIMIT_MAX_REQUESTS
}

const BASE_URL = 'https://www.googleapis.com/youtube/v3'
const MAX_QUERY_LENGTH = 200

// Só os dois endpoints que o app usa, e só os parâmetros que cada um aceita
// — evita que o proxy vire uma porta aberta para qualquer parâmetro da API
// do Google.
const ALLOWED_PARAMS: Record<string, string[]> = {
  search: ['q', 'part', 'type', 'maxResults', 'safeSearch', 'pageToken', 'order', 'videoDuration'],
  videos: ['id', 'part'],
}

function paramString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const forwardedFor = req.headers['x-forwarded-for']
  const ip =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Muitas buscas em pouco tempo. Aguarde um instante.' })
    return
  }

  if (!process.env.YOUTUBE_API_KEY) {
    res.status(500).json({ error: 'YOUTUBE_API_KEY não configurada no servidor.' })
    return
  }

  const endpoint = paramString(req.query.endpoint)
  if (endpoint !== 'search' && endpoint !== 'videos') {
    res.status(400).json({ error: 'Endpoint inválido.' })
    return
  }

  const q = paramString(req.query.q)
  if (q !== undefined && q.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ error: 'Termo de busca muito longo.' })
    return
  }

  const params = new URLSearchParams({ key: process.env.YOUTUBE_API_KEY })
  for (const name of ALLOWED_PARAMS[endpoint]) {
    const value = paramString(req.query[name])
    if (value !== undefined) params.set(name, value)
  }
  // Evita que uma única chamada já esgote boa parte da cota diária.
  const maxResults = params.get('maxResults')
  if (maxResults && Number(maxResults) > 50) params.set('maxResults', '50')

  try {
    const upstream = await fetch(`${BASE_URL}/${endpoint}?${params}`)
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    console.error('youtube proxy falhou:', err)
    res.status(502).json({ error: 'Não foi possível consultar o YouTube agora. Tente novamente mais tarde.' })
  }
}
