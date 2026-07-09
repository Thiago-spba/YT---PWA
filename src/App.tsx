import { useState } from 'react'
import { getDailyLimitMinutes, getUsageMinutesToday, isOnboardingDone } from './lib/storage'
import type { Video } from './types'
import Onboarding from './components/Onboarding'
import TopBar from './components/TopBar'
import Catalog from './components/Catalog'
import Favorites from './components/Favorites'
import Settings from './components/Settings'
import Player from './components/Player'
import Footer from './components/Footer'

type View = 'catalog' | 'favorites' | 'settings'

function limitReachedNow(): boolean {
  const limit = getDailyLimitMinutes()
  return limit !== null && getUsageMinutesToday() >= limit
}

function App() {
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingDone())
  const [view, setView] = useState<View>('catalog')
  const [playing, setPlaying] = useState<Video | null>(null)
  const [timeUp, setTimeUp] = useState(limitReachedNow())

  if (!onboardingDone) {
    return <Onboarding onDone={() => setOnboardingDone(true)} />
  }

  function handleSelect(video: Video) {
    if (limitReachedNow()) {
      setTimeUp(true)
      return
    }
    setPlaying(video)
  }

  function handleTimeUp() {
    setPlaying(null)
    setTimeUp(true)
  }

  return (
    <div className="min-h-svh bg-neutral-50 dark:bg-neutral-950">
      <TopBar view={view} onChange={setView} />
      {timeUp && (
        <div className="mx-4 mt-4 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
          Tempo de uso de hoje esgotado. Volte amanhã ou peça para o
          responsável ajustar o limite em Configurações.
        </div>
      )}
      {view === 'catalog' && <Catalog onSelect={handleSelect} />}
      {view === 'favorites' && <Favorites onSelect={handleSelect} />}
      {view === 'settings' && <Settings />}
      {playing && (
        <Player video={playing} onClose={() => setPlaying(null)} onTimeUp={handleTimeUp} />
      )}
      <Footer />
    </div>
  )
}

export default App
