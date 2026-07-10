import { lazy, Suspense, useEffect, useState } from 'react'
import {
  getDailyLimitMinutes,
  getUsageMinutesToday,
  isOnboardingDone,
  isParentalControlEnabled,
} from './lib/storage'
import { applyPendingUpdate } from './lib/pwaUpdate'
import type { Video } from './types'
import TopBar from './components/TopBar'
import Home from './components/Home'
import Footer from './components/Footer'
import ThemeToggle from './components/ThemeToggle'
import type { PlayerMode } from './components/PlayerHost'

// Code splitting (item 7): só a tela inicial (Home) e o que aparece em
// todas as telas (TopBar, Footer, ThemeToggle) entram no bundle inicial.
// As demais telas, o player e o painel de conta viram chunks separados,
// carregados sob demanda — reduz o JS baixado na primeira abertura. O tipo
// PlayerMode é importado como `import type` acima, então não puxa o módulo
// do PlayerHost para o bundle inicial.
const Onboarding = lazy(() => import('./components/Onboarding'))
const Catalog = lazy(() => import('./components/Catalog'))
const Favorites = lazy(() => import('./components/Favorites'))
const Playlist = lazy(() => import('./components/Playlist'))
const History = lazy(() => import('./components/History'))
const ShortsScreen = lazy(() => import('./components/ShortsScreen'))
const PlayerHost = lazy(() => import('./components/PlayerHost'))
const AccountPanel = lazy(() => import('./components/AccountPanel'))

function ScreenFallback() {
  return (
    <p className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">Carregando…</p>
  )
}

type View = 'home' | 'catalog' | 'favorites' | 'playlist' | 'history' | 'shorts'

function limitReachedNow(): boolean {
  if (!isParentalControlEnabled()) return false
  const limit = getDailyLimitMinutes()
  return limit !== null && getUsageMinutesToday() >= limit
}

function App() {
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingDone())
  const [view, setView] = useState<View>('home')
  const [playing, setPlaying] = useState<Video | null>(null)
  const [playerMode, setPlayerMode] = useState<PlayerMode>('expanded')
  const [queue, setQueue] = useState<Video[]>([])
  const [timeUp, setTimeUp] = useState(limitReachedNow())
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    function handleUpdateAvailable() {
      setUpdateAvailable(true)
    }
    window.addEventListener('pwa-update-available', handleUpdateAvailable)
    return () => window.removeEventListener('pwa-update-available', handleUpdateAvailable)
  }, [])

  if (!onboardingDone) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Onboarding onDone={() => setOnboardingDone(true)} />
      </Suspense>
    )
  }

  function handleSelect(video: Video, newQueue?: Video[]) {
    if (limitReachedNow()) {
      setTimeUp(true)
      return
    }
    setPlaying(video)
    setPlayerMode('expanded')
    setQueue(newQueue ?? [])
  }

  function handleQueueAdvance() {
    setQueue((q) => q.slice(1))
  }

  function handleClosePlayer() {
    setPlaying(null)
    setQueue([])
  }

  function handleTimeUp() {
    handleClosePlayer()
    setTimeUp(true)
  }

  function handleChangeView(next: View) {
    if (playing) setPlayerMode('mini')
    setView(next)
  }

  return (
    <div className="min-h-svh bg-neutral-50 dark:bg-neutral-950">
      <TopBar view={view} onChange={handleChangeView} />
      {updateAvailable && (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded border border-violet-400 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-600 dark:bg-violet-950 dark:text-violet-200">
          <span>Nova versão do app disponível.</span>
          <button
            type="button"
            onClick={applyPendingUpdate}
            className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Atualizar agora
          </button>
        </div>
      )}
      {timeUp && (
        <div className="mx-4 mt-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
          Tempo de uso de hoje esgotado. Volte amanhã ou peça para o
          responsável ajustar o limite nas configurações.
        </div>
      )}
      {/* Home é eager; as demais telas são chunks lazy — a fallback só
          aparece no primeiro acesso a cada aba, enquanto o chunk baixa. */}
      {view === 'home' && <Home onSelect={handleSelect} />}
      <Suspense fallback={<ScreenFallback />}>
        {view === 'catalog' && <Catalog key={catalogVersion} onSelect={handleSelect} />}
        {view === 'shorts' && <ShortsScreen key={catalogVersion} />}
        {view === 'favorites' && <Favorites onSelect={handleSelect} />}
        {view === 'playlist' && <Playlist onSelect={handleSelect} />}
        {view === 'history' && <History onSelect={handleSelect} />}
      </Suspense>
      <Footer />
      {/* Overlays: fallback nulo — não devem piscar um "Carregando…" sobre a tela. */}
      <Suspense fallback={null}>
        <AccountPanel onCatalogChanged={() => setCatalogVersion((v) => v + 1)} />
      </Suspense>
      <ThemeToggle />
      {playing && (
        <Suspense fallback={null}>
          <PlayerHost
            video={playing}
            mode={playerMode}
            onModeChange={setPlayerMode}
            onClose={handleClosePlayer}
            onSelect={handleSelect}
            onTimeUp={handleTimeUp}
            queue={queue}
            onQueueAdvance={handleQueueAdvance}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
