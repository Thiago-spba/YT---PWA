import { useState } from 'react'
import Shorts from './Shorts'
import ShortsGrid from './ShortsGrid'

/**
 * Alterna entre a grade de descoberta (miniaturas) e o modo imersivo
 * (1 vídeo por tela, rolagem vertical) — os dois usam o mesmo hook de
 * dados (`useShortsFeed`), então trocar de um para o outro não refaz
 * nenhuma busca já feita.
 */
export default function ShortsScreen() {
  const [startId, setStartId] = useState<string | undefined>(undefined)
  const [mode, setMode] = useState<'grid' | 'immersive'>('grid')

  if (mode === 'immersive') {
    return <Shorts startId={startId} onBack={() => setMode('grid')} />
  }

  return (
    <ShortsGrid
      onOpen={(id) => {
        setStartId(id)
        setMode('immersive')
      }}
    />
  )
}
