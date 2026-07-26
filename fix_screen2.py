content = '''import { useState } from 'react'
import Shorts from './Shorts'
import ShortsGrid from './ShortsGrid'

export default function ShortsScreen() {
  const [startId, setStartId] = useState<string | undefined>(undefined)
  const [startIndex, setStartIndex] = useState<number>(0)
  const [mode, setMode] = useState<'grid' | 'immersive'>('grid')

  if (mode === 'immersive') {
    return <Shorts startId={startId} startIndex={startIndex} onBack={() => setMode('grid')} />
  }
  return (
    <ShortsGrid
      onOpen={(id, index) => {
        setStartId(id)
        setStartIndex(index)
        setMode('immersive')
      }}
    />
  )
}
'''
with open('src/components/ShortsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
