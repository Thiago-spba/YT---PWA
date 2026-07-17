import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { blockVideoId } from '../lib/storage'
import { isFavorite, listCatalog, recordHistory, recordInterest, toggleFavorite } from '../lib/db'
import { categorize } from '../lib/categories'
import {
  addUsageMinutes,
  getDailyLimitMinutes,
  isAutoplayEnabled,
  isKeepScreenOnEnabled,
  isParentalControlEnabled,
  setAutoplayEnabled,
} from '../lib/storage'
import { hasApiKey, searchVideosPage } from '../lib/youtube'
import {
  enablePictureInPicture,
  isDocumentPipSupported,
  loadYouTubeApi,
  openDocumentPip,
  YT_PLAYER_STATE_ENDED,
  type DocumentPipHandle,
  type YTPlayer,
} from '../lib/youtubePlayer'
import { useWakeLock } from '../lib/useWakeLock'
import VideoCard from './VideoCard'

function findNaturalNext(all: Video[], currentId: string, fallback: Video[]): Video | undefined {
  const idx = all.findIndex((v) => v.id === currentId)
  if (idx !== -1 && idx + 1 < all.length) return all[idx + 1]
  return fallback[0]
}

export type PlayerMode = 'mini' | 'expanded'

interface Props {
  video: Video
  mode: PlayerMode
  onModeChange: (mode: PlayerMode) => void
  onClose: () => void
  onSelect: (video: Video, queue?: Video[]) => void
  onTimeUp: () => void
  queue: Video[]
  onQueueAdvance: () => void
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinejoin="round" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
    </svg>
  )
}

function CompressIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h4V4M20 8h-4V4M4 16h4v4M20 16h-4v4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13H5" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

function PipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

const iconButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
const iconButtonClassDark =
  'flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-white hover:bg-neutral-600'
const miniButtonClass =
  'flex h-6 w-6 items-center justify-center rounded text-white hover:bg-white/20'

export default function PlayerHost({
  video,
  mode,
  onModeChange,
  onClose,
  onSelect,
  onTimeUp,
  queue,
  onQueueAdvance,
}: Props) {
  const [subFullscreen, setSubFullscreen] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [catalogFeed, setCatalogFeed] = useState<Video[]>([])
  const [suggested, setSuggested] = useState<Video[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const [autoplay, setAutoplay] = useState(isAutoplayEnabled())
  const [keepScreenOn, setKeepScreenOn] = useState(isKeepScreenOnEnabled())
  const [pipActive, setPipActive] = useState(false)
  const [pipMessage, setPipMessage] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const pipHandleRef = useRef<DocumentPipHandle | null>(null)
  const readyRef = useRef(false)
  const feedRef = useRef<Video[]>([])
  const catalogAllRef = useRef<Video[]>([])
  const currentVideoIdRef = useRef(video.id)
  const queueRef = useRef<Video[]>(queue)
  const autoplayRef = useRef(autoplay)
  const onSelectRef = useRef(onSelect)
  const onQueueAdvanceRef = useRef(onQueueAdvance)
  const stackRef = useRef<Video[]>([video])
  const indexRef = useRef(0)
  const [, forceNavUpdate] = useState(0)

  useEffect(() => {
    autoplayRef.current = autoplay
  }, [autoplay])

  // Ativa/desativa em tempo real se a preferência mudar no painel de
  // configurações enquanto este player já está montado (mesmo padrão de
  // evento usado em pwaUpdate.ts para avisar sobre versão nova).
  useEffect(() => {
    function handleKeepScreenOnChange() {
      setKeepScreenOn(isKeepScreenOnEnabled())
    }
    window.addEventListener('keep-screen-on-changed', handleKeepScreenOnChange)
    return () => window.removeEventListener('keep-screen-on-changed', handleKeepScreenOnChange)
  }, [])

  // Só mantém a tela acesa enquanto este player existir (vídeo aberto,
  // mini ou expandido) — evita gastar bateria fora da reprodução.
  useWakeLock(keepScreenOn)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    onQueueAdvanceRef.current = onQueueAdvance
  }, [onQueueAdvance])

  // Cria o player uma única vez, para a sessão inteira de reprodução.
  // Trocar de vídeo (ou de modo mini/expandido) só reposiciona esse
  // mesmo nó via CSS ou chama loadVideoById — nunca desmonta o
  // container, porque a API do YouTube substitui esse <div> por um
  // <iframe> por fora do React. Se o container fosse desmontado
  // condicionalmente, o React tentaria remover um nó que não é mais
  // filho dele (erro "removeChild") — foi exatamente o bug encontrado
  // no Watch e no Shorts antes desta arquitetura.
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: video.id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, autoplay: 1, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true
            if (playerRef.current) enablePictureInPicture(playerRef.current)
          },
          onError: () => setVideoError(true),
          onStateChange: (e) => {
            if (e.data !== YT_PLAYER_STATE_ENDED || !autoplayRef.current) return
            const fromQueue = queueRef.current[0]
            if (fromQueue) {
              onQueueAdvanceRef.current()
              onSelectRef.current(fromQueue)
              return
            }
            const next = findNaturalNext(catalogAllRef.current, currentVideoIdRef.current, feedRef.current)
            if (next) onSelectRef.current(next)
          },
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup declarado depois do efeito de criação do player: no unmount,
  // o React roda limpezas na ordem inversa, então esta roda ANTES da de
  // cima — devolve o iframe pro documento principal antes de destruir o
  // player, evitando destruir um nó que está dentro da janela PiP.
  useEffect(() => {
    return () => {
      pipHandleRef.current?.close()
      pipHandleRef.current = null
    }
  }, [])

  // Auto-esconde o aviso de PiP depois de um tempo — mensagem não deve
  // bloquear a tela (ao contrário de um window.alert, que trava a aba
  // inteira até o usuário clicar OK).
  useEffect(() => {
    if (!pipMessage) return
    const timeout = setTimeout(() => setPipMessage(null), 5000)
    return () => clearTimeout(timeout)
  }, [pipMessage])

  async function handleTogglePip() {
    if (pipActive) {
      pipHandleRef.current?.close()
      pipHandleRef.current = null
      setPipActive(false)
      return
    }
    if (!isDocumentPipSupported()) {
      setPipMessage(
        'Picture-in-Picture não é suportado neste navegador. Funciona no Chrome ou Edge (computador ou Android) — em outros navegadores o vídeo pausa ao trocar de app, como esperado.',
      )
      return
    }
    const iframe = playerRef.current?.getIframe()
    if (!iframe) return
    try {
      const handle = await openDocumentPip(iframe, { width: 320, height: 180 }, () => {
        setPipActive(false)
        pipHandleRef.current = null
      })
      pipHandleRef.current = handle
      setPipActive(true)
    } catch {
      setPipMessage('Não foi possível abrir o Picture-in-Picture agora. Tente novamente.')
    }
  }

  // Pilha de navegação (estilo histórico do navegador).
  useEffect(() => {
    const stack = stackRef.current
    const idx = indexRef.current
    if (stack[idx]?.id !== video.id) {
      if (stack[idx + 1]?.id === video.id) {
        indexRef.current = idx + 1
      } else if (idx > 0 && stack[idx - 1]?.id === video.id) {
        indexRef.current = idx - 1
      } else {
        stackRef.current = [...stack.slice(0, idx + 1), video]
        indexRef.current = stackRef.current.length - 1
      }
    }
    forceNavUpdate((n) => n + 1)
  }, [video])

  function handlePrev() {
    if (indexRef.current > 0) onSelect(stackRef.current[indexRef.current - 1])
  }

  function handleNext() {
    const stack = stackRef.current
    const idx = indexRef.current
    if (idx < stack.length - 1) {
      onSelect(stack[idx + 1])
      return
    }
    const fromQueue = queueRef.current[0]
    if (fromQueue) {
      onQueueAdvance()
      onSelect(fromQueue)
      return
    }
    const next = findNaturalNext(catalogAllRef.current, currentVideoIdRef.current, feedRef.current)
    if (next) onSelect(next)
  }

  const feed = [...catalogFeed, ...suggested]

  const canGoPrev = indexRef.current > 0
  // Usa `feed` (derivado de state, sempre fresco neste render) em vez de
  // feedRef.current aqui: feedRef só é atualizado por um efeito que roda
  // depois do commit, então usá-lo direto no render deixava o botão
  // "Próximo" preso como desabilitado por um ciclo a mais sempre que o
  // catálogo/sugestões chegavam depois da troca de vídeo.
  const canGoNext = indexRef.current < stackRef.current.length - 1 || queue.length > 0 || feed.length > 0

  useEffect(() => {
    currentVideoIdRef.current = video.id
    recordHistory(video).catch(() => {})
    recordInterest(categorize(`${video.title} ${video.channelTitle}`), 2).catch(() => {})
    isFavorite(video.id)
      .then(setFavorite)
      .catch(() => {})
    setVideoError(false)

    listCatalog()
      .catch(() => [])
      .then((all) => {
        catalogAllRef.current = all
        setCatalogFeed(all.filter((v) => v.id !== video.id))
      })

    setSuggested([])
    setNextPageToken(undefined)
    if (hasApiKey()) {
      searchVideosPage(video.title)
        .then((page) => {
          setSuggested(page.videos.filter((v) => v.id !== video.id))
          setNextPageToken(page.nextPageToken)
        })
        .catch(() => {})
    }

    if (readyRef.current) {
      playerRef.current?.loadVideoById(video.id)
    } else {
      const wait = setInterval(() => {
        if (readyRef.current) {
          playerRef.current?.loadVideoById(video.id)
          clearInterval(wait)
        }
      }, 150)
      return () => clearInterval(wait)
    }
  }, [video])

  useEffect(() => {
    if (!isParentalControlEnabled()) return
    const limit = getDailyLimitMinutes()
    if (!limit) return
    const interval = setInterval(() => {
      const total = addUsageMinutes(1)
      if (total >= limit) onTimeUp()
    }, 60_000)
    return () => clearInterval(interval)
  }, [onTimeUp, video])

  useEffect(() => {
    if (!hasApiKey() || !nextPageToken) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true)
          searchVideosPage(video.title, nextPageToken)
            .then((page) => {
              setSuggested((current) => [
                ...current,
                ...page.videos.filter((v) => v.id !== video.id && !current.some((c) => c.id === v.id)),
              ])
              setNextPageToken(page.nextPageToken)
            })
            .finally(() => setLoadingMore(false))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nextPageToken, loadingMore, video])

  async function handleToggleFavorite() {
    setFavorite(await toggleFavorite(video))
  }

  // Media Session: mostra título/miniatura e controles de play/pausa/
  // anterior/próximo na notificação e na tela de bloqueio do celular.
  // Sinaliza pro navegador que isso é reprodução de mídia de verdade —
  // ajuda o áudio a continuar tocando ao trocar de app (o navegador não
  // suspende tão facilmente uma aba com sessão de mídia ativa).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: video.title,
      artist: video.channelTitle,
      artwork: video.thumbnailUrl ? [{ src: video.thumbnailUrl, sizes: '320x180', type: 'image/jpeg' }] : [],
    })
  }, [video])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => playerRef.current?.playVideo())
    navigator.mediaSession.setActionHandler('pause', () => playerRef.current?.pauseVideo())
    navigator.mediaSession.setActionHandler('previoustrack', canGoPrev ? handlePrev : null)
    navigator.mediaSession.setActionHandler('nexttrack', canGoNext ? handleNext : null)
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGoPrev, canGoNext])

  useEffect(() => {
    feedRef.current = feed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogFeed, suggested])

  function handleToggleAutoplay() {
    const next = !autoplay
    setAutoplay(next)
    setAutoplayEnabled(next)
  }

  const visual: 'mini' | 'fullscreen' | 'windowed' =
    mode === 'mini' ? 'mini' : subFullscreen ? 'fullscreen' : 'windowed'

  return (
    <div
      className={
        visual === 'mini'
          ? 'fixed bottom-20 right-4 z-40 flex w-56 flex-col overflow-hidden rounded-lg bg-black shadow-2xl sm:w-64'
          : visual === 'fullscreen'
            ? 'fixed inset-0 z-50 bg-black'
            : // top-[50px] deixa a barra de navegação (~49px de altura) de fora
              // da área coberta pelo player — sem isso, o modo janela cobria a
              // tela inteira por cima do TopBar, e tentar trocar de aba acabava
              // clicando em botões do próprio player por engano.
              'fixed inset-x-0 bottom-0 top-[50px] z-40 grid grid-cols-1 gap-x-6 gap-y-3 overflow-y-auto bg-white px-4 pb-10 pt-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10 dark:bg-neutral-950'
      }
    >
      <div
        className={
          visual === 'mini'
            ? 'flex items-center justify-between gap-1 bg-neutral-900 px-2 py-1'
            : visual === 'fullscreen'
              ? 'absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-3 text-white'
              : 'flex w-full flex-wrap items-center justify-between gap-2 [grid-area:2/1/3/2]'
        }
      >
        {visual === 'windowed' ? (
          <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{video.title}</h1>
        ) : (
          <p className={visual === 'mini' ? 'truncate text-xs text-white' : 'truncate text-sm text-white'}>
            {video.title}
          </p>
        )}
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {visual !== 'mini' && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              className={
                favorite
                  ? 'flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white'
                  : visual === 'fullscreen'
                    ? iconButtonClassDark
                    : iconButtonClass
              }
            >
              <StarIcon filled={favorite} />
            </button>
          )}
          {visual !== 'mini' && (
            <button
              type="button"
              onClick={handleTogglePip}
              title={pipActive ? 'Sair do Picture-in-Picture' : 'Ativar Picture-in-Picture'}
              aria-label={pipActive ? 'Sair do Picture-in-Picture' : 'Ativar Picture-in-Picture'}
              className={
                pipActive
                  ? 'flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white'
                  : visual === 'fullscreen'
                    ? iconButtonClassDark
                    : iconButtonClass
              }
            >
              <PipIcon />
            </button>
          )}
          {visual === 'mini' ? (
            <button
              type="button"
              onClick={() => onModeChange('expanded')}
              title="Expandir"
              aria-label="Expandir"
              className={miniButtonClass}
            >
              <ExpandIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSubFullscreen((v) => !v)}
              title={visual === 'fullscreen' ? 'Sair da tela cheia' : 'Tela cheia'}
              aria-label={visual === 'fullscreen' ? 'Sair da tela cheia' : 'Tela cheia'}
              className={visual === 'fullscreen' ? iconButtonClassDark : iconButtonClass}
            >
              {visual === 'fullscreen' ? <CompressIcon /> : <ExpandIcon />}
            </button>
          )}
          {visual === 'windowed' && (
            <button
              type="button"
              onClick={() => onModeChange('mini')}
              title="Minimizar"
              aria-label="Minimizar"
              className={iconButtonClass}
            >
              <MinimizeIcon />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className={visual === 'mini' ? miniButtonClass : visual === 'fullscreen' ? iconButtonClassDark : iconButtonClass}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div
        className={
          visual === 'mini'
            ? 'relative aspect-video w-full bg-black'
            : visual === 'fullscreen'
              ? 'absolute inset-0'
              : 'relative w-full [grid-area:1/1/2/2]'
        }
      >
        {/*
          Espaçador com padding-bottom percentual em vez de `aspect-video`:
          dentro deste grid (janela de assistir), o CSS Grid dimensiona a
          linha ANTES de considerar `aspect-ratio`, fazendo o player "vazar"
          por cima do título. Padding percentual é altura de verdade (soma
          na caixa), então o grid mede certo — técnica clássica, mais
          confiável que aspect-ratio dentro de grid.
        */}
        <div className={visual === 'windowed' ? 'pb-[56.25%]' : 'hidden'} />
        <div
          className={
            visual === 'windowed'
              ? 'absolute inset-0 overflow-hidden rounded-xl bg-black'
              : 'absolute inset-0'
          }
        >
          <div ref={containerRef} className="h-full w-full" />

          {pipActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black p-4 text-center text-sm text-white">
              <PipIcon />
              <p>Tocando em Picture-in-Picture (janela flutuante).</p>
            </div>
          )}

          {pipMessage && (
            <div className="absolute inset-x-2 bottom-2 z-20 flex items-start justify-between gap-2 rounded-lg bg-black/85 p-3 text-xs text-white sm:text-sm">
              <p>{pipMessage}</p>
              <button
                type="button"
                onClick={() => setPipMessage(null)}
                aria-label="Fechar aviso"
                className="shrink-0 text-white/70 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>
          )}

          {visual !== 'mini' && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                title="Vídeo anterior"
                aria-label="Vídeo anterior"
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                title="Próximo vídeo"
                aria-label="Próximo vídeo"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0"
              >
                <ChevronRightIcon />
              </button>
            </>
          )}

          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 p-6 text-center text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 text-neutral-500">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
              </svg>
              <div>
                <p className="font-medium">Vídeo indisponível</p>
                <p className="mt-1 text-sm text-neutral-400">
                  O dono desabilitou a reprodução fora do YouTube.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (video) blockVideoId(video.id)
                    onClose()
                  }}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium hover:bg-violet-700"
                >
                  Remover e voltar ao início
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-medium hover:bg-neutral-700"
                >
                  Voltar sem remover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {visual === 'windowed' && (
        <p className="text-xs text-neutral-500 [grid-area:3/1/4/2] dark:text-neutral-400">
          Toque em "Minimizar" para continuar assistindo numa janelinha enquanto navega por
          outras páginas do app.
        </p>
      )}

      {visual === 'windowed' && (
        // lg:max-h + overflow-y-auto: sem isso, com muitos vídeos em
        // "A seguir" essa coluna (que ocupa as 3 linhas do grid ao lado
        // do vídeo) ficava mais alta que o vídeo+título, e o CSS Grid
        // esticava a linha do vídeo pra acompanhar — resultado: área
        // preta desproporcional, vídeo pequeno lá embaixo, precisando
        // rolar pra ver direito. Limitando a altura dessa coluna e
        // deixando ela rolar sozinha, o grid não estica mais.
        <div className="flex flex-col gap-3 [grid-area:4/1/5/2] lg:max-h-[75vh] lg:overflow-y-auto lg:[grid-area:1/2/4/3]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">A seguir</h2>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              Automático
              <button
                type="button"
                onClick={handleToggleAutoplay}
                aria-label="Reprodução automática"
                className={`relative h-6 w-11 rounded-full transition ${
                  autoplay ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    autoplay ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            {feed.map((v) => (
              <VideoCard key={v.id} video={v} onSelect={onSelect} variant="list" />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">Carregando mais vídeos…</p>
          )}
        </div>
      )}
    </div>
  )
}
