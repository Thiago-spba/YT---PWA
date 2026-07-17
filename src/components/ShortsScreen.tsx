import { useState } from 'react'
import Shorts from './Shorts'
import ShortsGrid from './ShortsGrid'
import { useShortsFeed } from '../lib/useShortsFeed'

/**
 * Chama useShortsFeed UMA única vez e compartilha o feed entre
 * ShortsGrid (grade) e Shorts (imersivo) — assim o startId sempre
 * encontra o vídeo certo porque os dois usam exatamente a mesma lista.
 */
export default function ShortsScreen() {
  const [startId, setStartId] = useState<string | undefined>(undefined)
  const [mode, setMode] = useState<'grid' | 'immersive'>('grid')
  const feed = useShortsFeed()

  if (mode === 'immersive') {
    return (
      <Shorts
        startId={startId}
        sharedFeed={feed}
        onBack={() => setMode('grid')}
      />
    )
  }

  return (
    <ShortsGrid
      sharedFeed={feed}
      onOpen={(id) => {
        setStartId(id)
        setMode('immersive')
      }}
    />
  )
}
