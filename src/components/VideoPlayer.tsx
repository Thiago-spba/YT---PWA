import { useCallback, useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import type { VideoProgress } from '../lib/firestore'
import type { YTPlayer } from '../lib/youtubePlayer'
import { useAuth } from '../lib/useAuth'

interface VideoPlayerProps {
  video: Video
  /** ID do usuário autenticado (vem do contexto de auth) */
  userId?: string
  /** Callback quando vídeo termina */
  onEnded?: () => void
  /** Callback quando ocorre erro no player */
  onError?: (error: Error) => void
  /** Callback quando progresso é salvo/restaurado */
  onProgressRestored?: (progress: VideoProgress | null) => void
  /** Configuração opcional: desabilitar auto-sync (útil para testes) */
  disableAutoSync?: boolean
  /** Intervalo de sincronização em ms (padrão: 10000 = 10s) */
  syncIntervalMs?: number
  /** Threshold mínimo de mudança para sincronizar (ms) */
  syncThresholdMs?: number
  /** Classe CSS customizada para o container do vídeo */
  className?: string
  /** Se deve autoplay ao montar */
  autoPlay?: boolean
  /** Se deve mutear inicialmente */
  muted?: boolean
  /** ID do vídeo do YouTube (se usar YouTube Player) */
  youtubeVideoId?: string
  /** Modo do player: 'native' | 'youtube' */
  playerMode?: 'native' | 'youtube'
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  muted: boolean
  playbackRate: number
  isFullscreen: boolean
  error: Error | null
  isBuffering: boolean
  progressRestored: boolean
}



const YOUTUBE_PLAYER_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

export function VideoPlayer({
  video,
  userId,
  onEnded,
  onError,
  onProgressRestored,
  disableAutoSync = false,
  syncIntervalMs = 10_000,
  syncThresholdMs = 1_000,
  className = '',
  autoPlay = false,
  muted = false,
  youtubeVideoId,
  playerMode = 'native',
}: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: muted ? 0 : 1,
    muted,
    playbackRate: 1,
    isFullscreen: false,
    error: null,
    isBuffering: false,
    progressRestored: false,
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const youtubePlayerRef = useRef<YTPlayer | null>(null)
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null)
  const progressSyncRef = useRef<{
    interval: ReturnType<typeof setInterval> | null
    lastSyncedTime: number
    pendingProgress: VideoProgress | null
  }>({
    interval: null,
    lastSyncedTime: 0,
    pendingProgress: null,
  })
  const isMountedRef = useRef(true)
  const progressRestoredRef = useRef(false)
  const { user } = useAuth()

  // Usa userId do prop ou do contexto de auth
  const effectiveUserId = userId || user?.uid

  // ============= UTILS =============

  const updateState = useCallback((partial: Partial<PlayerState>) => {
    if (!isMountedRef.current) return
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  const getCurrentTime = useCallback((): number => {
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      return youtubePlayerRef.current.getCurrentTime()
    }
    return videoRef.current?.currentTime ?? 0
  }, [playerMode])

  const getDuration = useCallback((): number => {
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      return youtubePlayerRef.current.getDuration()
    }
    return videoRef.current?.duration ?? 0
  }, [playerMode])

  const getBuffered = useCallback((): number => {
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      return youtubePlayerRef.current.getVideoLoadedFraction() * getDuration()
    }
    const video = videoRef.current
    if (!video?.buffered.length) return 0
    return video.buffered.end(video.buffered.length - 1)
  }, [playerMode, getDuration])

  // ============= PROGRESS SYNC (RASCUNHO - sync a cada 10s) =============

  /**
   * RASCUNHO: Função para sincronizar tempo de progresso no Firestore a cada 10 segundos
   * Estrutura Firestore: users/{userId}/videoProgress/{videoId}
   * Campos: videoId, userId, currentTime, duration, updatedAt (serverTimestamp), completed
   */
  const syncProgressToFirestore = useCallback(async (progress: VideoProgress) => {
    if (!effectiveUserId || disableAutoSync) return

    try {
      // Dinamicamente importar firebase/firestore apenas quando necessário
      const { getFirestoreDb, isFirebaseConfigured } = await import('../config/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

      if (!isFirebaseConfigured()) {
        console.warn('[VideoPlayer] Firebase não configurado, pulando sync')
        return
      }

      const db = getFirestoreDb()
      const docRef = doc(db, 'users', effectiveUserId, 'videoProgress', video.id)

      await setDoc(docRef, {
        videoId: progress.videoId,
        userId: progress.userId,
        currentTime: progress.currentTime,
        duration: progress.duration,
        updatedAt: serverTimestamp(),
        completed: progress.completed,
      }, { merge: true })

      progressSyncRef.current.lastSyncedTime = progress.currentTime
      console.log('[VideoPlayer] Progresso sincronizado:', {
        videoId: progress.videoId,
        currentTime: progress.currentTime,
        completed: progress.completed,
      })
    } catch (error) {
      console.error('[VideoPlayer] Erro ao sincronizar progresso:', error)
      // Não propagar erro para não quebrar a reprodução
    }
  }, [effectiveUserId, video.id, disableAutoSync])

  /**
   * Inicia o intervalo de sincronização periódica (a cada 10s por padrão)
   */
  const startProgressSync = useCallback(() => {
    if (disableAutoSync || !effectiveUserId || progressSyncRef.current.interval) return

    progressSyncRef.current.interval = setInterval(() => {
      const currentTime = getCurrentTime()

      // Só sincroniza se mudou mais que o threshold ou se completou
      const progress = progressSyncRef.current.pendingProgress
      if (progress &&
          (Math.abs(currentTime - progressSyncRef.current.lastSyncedTime) >= syncThresholdMs ||
           progress.completed)) {
        syncProgressToFirestore(progress)
        progressSyncRef.current.pendingProgress = null
      }
    }, syncIntervalMs)

    console.log('[VideoPlayer] Sync de progresso iniciado (interval:', syncIntervalMs, 'ms)')
  }, [disableAutoSync, effectiveUserId, getCurrentTime, getDuration, syncIntervalMs, syncThresholdMs, syncProgressToFirestore])

  /**
   * Para o intervalo e faz flush final
   */
  const stopProgressSync = useCallback(async () => {
    if (progressSyncRef.current.interval) {
      clearInterval(progressSyncRef.current.interval)
      progressSyncRef.current.interval = null
    }

    // Flush final se houver progresso pendente
    const progress = progressSyncRef.current.pendingProgress
    if (progress) {
      await syncProgressToFirestore(progress)
      progressSyncRef.current.pendingProgress = null
    }

    console.log('[VideoPlayer] Sync de progresso parado')
  }, [syncProgressToFirestore])

  /**
   * Atualiza progresso local e agenda sync (throttled pelo intervalo)
   */
  const updateLocalProgress = useCallback((currentTime: number, duration: number, completed = false) => {
    updateState({ currentTime, duration, isBuffering: false })

    if (!effectiveUserId || disableAutoSync) return

    // Atualiza progresso pendente para sync
    progressSyncRef.current.pendingProgress = {
      videoId: video.id,
      userId: effectiveUserId,
      currentTime,
      duration,
      updatedAt: Date.now(),
      completed,
    }

    // Se completou, faz sync imediato
    if (completed) {
      syncProgressToFirestore(progressSyncRef.current.pendingProgress)
      progressSyncRef.current.pendingProgress = null
    }
  }, [effectiveUserId, video.id, disableAutoSync, updateState, syncProgressToFirestore])

  /**
   * Carrega progresso salvo do Firestore ao iniciar
   */
  const restoreProgress = useCallback(async () => {
    if (!effectiveUserId || disableAutoSync || progressRestoredRef.current) return

    try {
      const { getFirestoreDb, isFirebaseConfigured } = await import('../config/firebase')
      const { doc, getDoc } = await import('firebase/firestore')

      if (!isFirebaseConfigured()) return

      const db = getFirestoreDb()
      const docRef = doc(db, 'users', effectiveUserId, 'videoProgress', video.id)
      const snapshot = await getDoc(docRef)

      if (snapshot.exists()) {
        const data = snapshot.data()
        const savedTime = data.currentTime ?? 0
        const savedDuration = data.duration ?? 0

        // Só restaura se duração bate (mesmo vídeo) e progresso > 0
        if (savedTime > 0 && savedDuration > 0) {
          progressRestoredRef.current = true
          updateState({ currentTime: savedTime, progressRestored: true })
          onProgressRestored?.({ ...data, updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt } as VideoProgress)
          console.log('[VideoPlayer] Progresso restaurado:', savedTime, 'de', savedDuration)
        }
      }
    } catch (error) {
      console.error('[VideoPlayer] Erro ao restaurar progresso:', error)
    }
  }, [effectiveUserId, disableAutoSync, video.id, updateState, onProgressRestored])

  // ============= PLAYER CONTROLS =============

  const play = useCallback(() => {
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.playVideo()
      updateState({ isPlaying: true, isBuffering: false })
    } else if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error('[VideoPlayer] Erro ao dar play:', err)
        updateState({ error: err, isPlaying: false })
      })
    }
  }, [playerMode, updateState])

  const pause = useCallback(() => {
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.pauseVideo()
      updateState({ isPlaying: false })
    } else if (videoRef.current) {
      videoRef.current.pause()
      updateState({ isPlaying: false })
    }
  }, [playerMode, updateState])

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) pause()
    else play()
  }, [state.isPlaying, play, pause])

  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, getDuration()))
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(clampedTime, true)
    } else if (videoRef.current) {
      videoRef.current.currentTime = clampedTime
    }
    updateLocalProgress(clampedTime, getDuration())
  }, [playerMode, getDuration, updateLocalProgress])

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume))
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(clamped * 100)
    } else if (videoRef.current) {
      videoRef.current.volume = clamped
    }
    updateState({ volume: clamped, muted: clamped === 0 })
  }, [playerMode, updateState])

  const toggleMute = useCallback(() => {
    const newMuted = !state.muted
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      if (newMuted) youtubePlayerRef.current.mute()
      else youtubePlayerRef.current.unMute()
    } else if (videoRef.current) {
      videoRef.current.muted = newMuted
    }
    updateState({ muted: newMuted, volume: newMuted ? 0 : state.volume })
  }, [playerMode, state.muted, state.volume, updateState])

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.25, Math.min(2, rate))
    if (playerMode === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.setPlaybackRate(clamped)
    } else if (videoRef.current) {
      videoRef.current.playbackRate = clamped
    }
    updateState({ playbackRate: clamped })
  }, [playerMode, updateState])

  const toggleFullscreen = useCallback(async () => {
    const videoEl = videoRef.current
    if (!videoEl) return

    try {
      if (!state.isFullscreen) {
        if (videoEl.requestFullscreen) await videoEl.requestFullscreen()
        else await (videoEl as any).webkitRequestFullscreen?.()
      } else {
        if (document.exitFullscreen) await document.exitFullscreen()
        else await (document as any).webkitExitFullscreen?.()
      }
      updateState({ isFullscreen: !state.isFullscreen })
    } catch (err) {
      console.error('[VideoPlayer] Erro ao alternar fullscreen:', err)
    }
  }, [state.isFullscreen, updateState])

  // ============= EVENT HANDLERS =============

  const handleNativeTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    updateLocalProgress(video.currentTime, video.duration)
  }, [updateLocalProgress])

  const handleNativeProgress = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    updateState({ buffered: getBuffered() })
  }, [getBuffered, updateState])

  const handleNativeDurationChange = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    updateState({ duration: video.duration })
  }, [updateState])

  const handleNativePlay = useCallback(() => {
    updateState({ isPlaying: true, isBuffering: false })
    startProgressSync()
  }, [updateState, startProgressSync])

  const handleNativePause = useCallback(() => {
    updateState({ isPlaying: false })
  }, [updateState])

  const handleNativeEnded = useCallback(() => {
    updateState({ isPlaying: false, currentTime: getDuration() })
    updateLocalProgress(getDuration(), getDuration(), true)
    onEnded?.()
  }, [updateState, getDuration, updateLocalProgress, onEnded])

  const handleNativeError = useCallback((_e: ErrorEvent) => {
    const video = videoRef.current
    const error = video?.error ? new Error(`Video error: ${video.error.code}`) : new Error('Unknown video error')
    updateState({ error, isPlaying: false, isBuffering: false })
    onError?.(error)
  }, [updateState, onError])

  const handleNativeWaiting = useCallback(() => updateState({ isBuffering: true }), [updateState])
  const handleNativeCanPlay = useCallback(() => updateState({ isBuffering: false }), [updateState])

  const handleYouTubeReady = useCallback((event: { target: YTPlayer }) => {
    youtubePlayerRef.current = event.target
    console.log('[VideoPlayer] YouTube Player ready')

    if (autoPlay) {
      event.target.playVideo()
    }

    // Se houve progresso restaurado, busca para lá
    if (progressRestoredRef.current && state.currentTime > 0) {
      event.target.seekTo(state.currentTime, true)
      progressRestoredRef.current = false
    }

    startProgressSync()
  }, [autoPlay, startProgressSync, state.currentTime])

  const handleYouTubeStateChange = useCallback((event: { data: number; target: YTPlayer }) => {
    const state = event.data

    switch (state) {
      case YOUTUBE_PLAYER_STATES.PLAYING:
        updateState({ isPlaying: true, isBuffering: false })
        startProgressSync()
        break
      case YOUTUBE_PLAYER_STATES.PAUSED:
        updateState({ isPlaying: false })
        break
      case YOUTUBE_PLAYER_STATES.BUFFERING:
        updateState({ isBuffering: true })
        break
      case YOUTUBE_PLAYER_STATES.ENDED:
        updateState({ isPlaying: false, currentTime: getDuration() })
        updateLocalProgress(getDuration(), getDuration(), true)
        onEnded?.()
        break
    }
  }, [updateState, startProgressSync, getDuration, updateLocalProgress, onEnded])

  const handleYouTubeError = useCallback((event: { data: number }) => {
    const errorMessages: Record<number, string> = {
      2: 'Parâmetro inválido',
      5: 'Erro no player HTML5',
      100: 'Vídeo não encontrado',
      101: 'Vídeo não permite embed',
      150: 'Vídeo não permite embed (mesmo que 101)',
    }
    const error = new Error(`YouTube Error ${event.data}: ${errorMessages[event.data] || 'Desconhecido'}`)
    updateState({ error, isPlaying: false, isBuffering: false })
    onError?.(error)
  }, [updateState, onError])

  // ============= EFFECTS =============

  // Monta player nativo
  useEffect(() => {
    if (playerMode !== 'native') return

    const video = videoRef.current
    if (!video) return

    video.addEventListener('timeupdate', handleNativeTimeUpdate)
    video.addEventListener('progress', handleNativeProgress)
    video.addEventListener('durationchange', handleNativeDurationChange)
    video.addEventListener('play', handleNativePlay)
    video.addEventListener('pause', handleNativePause)
    video.addEventListener('ended', handleNativeEnded)
    video.addEventListener('error', handleNativeError)
    video.addEventListener('waiting', handleNativeWaiting)
    video.addEventListener('canplay', handleNativeCanPlay)

    video.muted = muted
    video.volume = muted ? 0 : 1
    if (autoPlay) video.play().catch(() => {})

    return () => {
      video.removeEventListener('timeupdate', handleNativeTimeUpdate)
      video.removeEventListener('progress', handleNativeProgress)
      video.removeEventListener('durationchange', handleNativeDurationChange)
      video.removeEventListener('play', handleNativePlay)
      video.removeEventListener('pause', handleNativePause)
      video.removeEventListener('ended', handleNativeEnded)
      video.removeEventListener('error', handleNativeError)
      video.removeEventListener('waiting', handleNativeWaiting)
      video.removeEventListener('canplay', handleNativeCanPlay)
    }
  }, [
    playerMode,
    muted,
    autoPlay,
    handleNativeTimeUpdate,
    handleNativeProgress,
    handleNativeDurationChange,
    handleNativePlay,
    handleNativePause,
    handleNativeEnded,
    handleNativeError,
    handleNativeWaiting,
    handleNativeCanPlay,
  ])

  // Carrega YouTube API
  useEffect(() => {
    if (playerMode !== 'youtube') return

    const loadYouTubeAPI = () => {
      if (window.YT?.Player) {
        initYouTubePlayer()
        return
      }

      window.onYouTubeIframeAPIReady = initYouTubePlayer

      if (!document.getElementById('youtube-api-script')) {
        const script = document.createElement('script')
        script.id = 'youtube-api-script'
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.head.appendChild(script)
      }
    }

    loadYouTubeAPI()
  }, [playerMode])

  const initYouTubePlayer = useCallback(() => {
    if (!youtubeContainerRef.current || youtubePlayerRef.current) return

    const videoId = youtubeVideoId || video.id
    youtubePlayerRef.current = new window.YT!.Player(youtubeContainerRef.current!, {
      videoId,
      playerVars: {
        autoplay: autoPlay ? 1 : 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: handleYouTubeReady,
        onStateChange: handleYouTubeStateChange,
        onError: handleYouTubeError,
      },
    })
  }, [youtubeVideoId, video.id, autoPlay, handleYouTubeReady, handleYouTubeStateChange, handleYouTubeError])

  // Restaura progresso ao montar/trocar vídeo
  useEffect(() => {
    progressRestoredRef.current = false
    updateState({ progressRestored: false, currentTime: 0, duration: 0, isPlaying: autoPlay })
    restoreProgress()
  }, [video.id, restoreProgress, autoPlay, updateState])

  // Cleanup no unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopProgressSync()
      youtubePlayerRef.current?.destroy()
      youtubePlayerRef.current = null
    }
  }, [stopProgressSync])

  // Sync progress quando currentTime muda (para native player)
  useEffect(() => {
    if (playerMode !== 'native' || !state.isPlaying) return
    // O timeupdate event já trata disso para native
  }, [state.currentTime, playerMode, state.isPlaying])

  // ============= RENDER =============

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0
  const bufferedPercent = state.duration > 0 ? (state.buffered / state.duration) * 100 : 0

  return (
    <div className={`relative w-full aspect-video bg-black ${className}`} role="region" aria-label="Video player">
      {/* Video Element */}
      {playerMode === 'native' ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={video.thumbnailUrl} // Placeholder thumbnail - video src should be set dynamically
          playsInline
          disablePictureInPicture={false}
          aria-label={video.title}
        />
      ) : (
        <div ref={youtubeContainerRef} className="w-full h-full" id={`youtube-player-${video.id}`} />
      )}

      {/* Loading/Buffering Overlay */}
      {state.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10" aria-live="polite">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent" aria-label="Carregando vídeo" />
        </div>
      )}

      {/* Error Overlay */}
      {state.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/80 text-white z-20" role="alert">
          <svg className="h-12 w-12 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-center max-w-md">{state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
          >
            Recarregar página
          </button>
        </div>
      )}

      {/* Progress Restored Indicator */}
      {state.progressRestored && !state.isPlaying && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-20 animate-fade-in">
          Retomando de {formatTime(state.currentTime)}
          <button
            onClick={() => seek(0)}
            className="ml-3 px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-xs"
          >
            Reiniciar
          </button>
        </div>
      )}

      {/* Controls Overlay - mostra ao hover ou touch */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity duration-200 z-10">
        {/* Progress Bar */}
        <div className="relative h-2 mb-3" role="slider" aria-label="Progresso do vídeo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)} tabIndex={0}>
          <div
            className="absolute inset-0 h-full bg-white/30 rounded-full pointer-events-none"
            style={{ width: `${bufferedPercent}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 h-full bg-red-500 rounded-full pointer-events-none transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
          <button
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ left: `${progressPercent}%` }}
            onMouseDown={(e) => {
              e.preventDefault()
              const handleMove = (moveEvent: MouseEvent) => {
                const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
                const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width))
                seek(percent * state.duration)
              }
              const handleUp = () => {
                window.removeEventListener('mousemove', handleMove)
                window.removeEventListener('mouseup', handleUp)
              }
              window.addEventListener('mousemove', handleMove)
              window.addEventListener('mouseup', handleUp)
            }}
            onKeyDown={(e) => {
              const step = state.duration / 100
              if (e.key === 'ArrowRight') seek(state.currentTime + step * 5)
              else if (e.key === 'ArrowLeft') seek(state.currentTime - step * 5)
              else if (e.key === 'Home') seek(0)
              else if (e.key === 'End') seek(state.duration)
            }}
            aria-label={`Tempo atual: ${formatTime(state.currentTime)}`}
          />
        </div>

        {/* Time Labels */}
        <div className="flex justify-between text-sm text-white/80 mb-2">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label={state.isPlaying ? 'Pausar' : 'Reproduzir'}
              aria-pressed={state.isPlaying}
            >
              {state.isPlaying ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => seek(Math.max(0, state.currentTime - 10))}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Voltar 10 segundos"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12l7-7 7 7" />
              </svg>
            </button>

            <button
              onClick={() => seek(Math.min(state.duration, state.currentTime + 10))}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Avançar 10 segundos"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                aria-label={state.muted ? 'Ativar som' : 'Mutar'}
                aria-pressed={state.muted}
              >
                {state.muted || state.volume === 0 ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : state.volume < 0.5 ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={state.muted ? 0 : state.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 h-1 appearance-none bg-white/30 rounded-full slider-thumb"
                aria-label="Volume"
              />
            </div>

            {/* Playback Rate */}
            <select
              value={state.playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Velocidade de reprodução"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>Normal</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={1.75}>1.75x</option>
              <option value={2}>2x</option>
            </select>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label={state.isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
              aria-pressed={state.isFullscreen}
            >
              {state.isFullscreen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4-4l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4-4l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Picture-in-Picture Button (se suportado) */}
      {playerMode === 'native' && 'pictureInPictureEnabled' in document && (
        <button
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
          onClick={async () => {
            const video = videoRef.current
            if (!video) return
            try {
              if (document.pictureInPictureElement === video) {
                await document.exitPictureInPicture()
              } else {
                await video.requestPictureInPicture()
              }
            } catch (err) {
              console.error('PiP error:', err)
            }
          }}
          aria-label="Picture in Picture"
          title="Picture in Picture"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
            <rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
          </svg>
        </button>
      )}

      {/* Video Title Overlay (top) */}
      <div className="absolute top-4 left-4 right-4 text-white text-sm font-medium truncate bg-black/50 px-3 py-2 rounded" aria-hidden="true">
        {video.title}
      </div>
    </div>
  )
}

export default VideoPlayer