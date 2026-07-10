import { useState } from 'react'
import {
  getDailyLimitMinutes,
  getUsageMinutesToday,
  isOnboardingDone,
  isParentalControlEnabled,
} from './lib/storage'
import type { Video } from './types'
import Onboarding from './components/Onboarding'
import TopBar from './components/TopBar'
import Home from './components/Home'
import Catalog from './components/Catalog'
import Favorites from './components/Favorites'
import Playlist from './components/Playlist'
import History from './components/History'
import Shorts from './components/Shorts'
import PlayerHost, { type PlayerMode } from './components/PlayerHost'
import Footer from './components/Footer'
import AccountPanel from './components/AccountPanel'
import ThemeToggle from './components/ThemeToggle'

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

  if (!onboardingDone) {
    return <Onboarding onDone={() => setOnboardingDone(true)} />
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
      {timeUp && (
        <div className="mx-4 mt-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
          Tempo de uso de hoje esgotado. Volte amanhã ou peça para o
          responsável ajustar o limite nas configurações.
        </div>
      )}
      {view === 'home' && <Home onSelect={handleSelect} />}
      {view === 'catalog' && <Catalog key={catalogVersion} onSelect={handleSelect} />}
      {view === 'shorts' && <Shorts key={catalogVersion} />}
      {view === 'favorites' && <Favorites onSelect={handleSelect} />}
      {view === 'playlist' && <Playlist onSelect={handleSelect} />}
      {view === 'history' && <History onSelect={handleSelect} />}
      <Footer />
      <AccountPanel onCatalogChanged={() => setCatalogVersion((v) => v + 1)} />
      <ThemeToggle />
      {playing && (
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
      )}
    </div>
  )
}

export default App
