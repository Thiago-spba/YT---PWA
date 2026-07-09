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
import Catalog from './components/Catalog'
import Favorites from './components/Favorites'
import Watch from './components/Watch'
import Footer from './components/Footer'
import AccountPanel from './components/AccountPanel'
import ThemeToggle from './components/ThemeToggle'

type View = 'catalog' | 'favorites'

function limitReachedNow(): boolean {
  if (!isParentalControlEnabled()) return false
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

  function handleChangeView(next: View) {
    setPlaying(null)
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
      {playing ? (
        <Watch
          video={playing}
          onClose={() => setPlaying(null)}
          onSelect={handleSelect}
          onTimeUp={handleTimeUp}
        />
      ) : (
        <>
          {view === 'catalog' && <Catalog onSelect={handleSelect} />}
          {view === 'favorites' && <Favorites onSelect={handleSelect} />}
        </>
      )}
      <Footer />
      <AccountPanel />
      <ThemeToggle />
    </div>
  )
}

export default App
