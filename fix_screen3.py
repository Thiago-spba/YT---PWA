content = """import { useState } from 'react'
import { useShortsFeed } from '../lib/useShortsFeed'
import Shorts from './Shorts'
import ShortsGrid from './ShortsGrid'

export default function ShortsScreen() {
  const feed = useShortsFeed()
  const [initialFeed, setInitialFeed] = useState(feed.shorts)
  const [mode, setMode] = useState<'grid' | 'immersive'>('grid')

  if (mode === 'immersive') {
    return (
      <Shorts
        initialFeed={initialFeed}
        onBack={() => setMode('grid')}
        feedHook={feed}
      />
    )
  }

  return (
    <ShortsGrid
      feed={feed}
      onOpen={(id) => {
        const idx = feed.shorts.findIndex((v) => v.id === id)
        const reordered = idx > 0
          ? [...feed.shorts.slice(idx), ...feed.shorts.slice(0, idx)]
          : feed.shorts
        setInitialFeed(reordered)
        setMode('immersive')
      }}
    />
  )
}
"""
open("src/components/ShortsScreen.tsx", "w", encoding="utf-8").write(content)
print("OK")
