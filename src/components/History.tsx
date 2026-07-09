import { useEffect, useState } from 'react'
import type { HistoryEntry, Video } from '../types'
import VideoCard from './VideoCard'
import { clearHistory, listHistory, removeHistoryEntry } from '../lib/db'

interface Props {
  onSelect: (video: Video) => void
}

export default function History({ onSelect }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    listHistory().then(setHistory)
  }, [])

  async function handleRemove(id: string) {
    await removeHistoryEntry(id)
    setHistory(await listHistory())
  }

  async function handleClear() {
    await clearHistory()
    setHistory([])
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Histórico</h1>
        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Limpar histórico
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhum vídeo assistido ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {history.map((v) => (
            <div key={v.id} className="relative">
              <VideoCard video={v} onSelect={onSelect} />
              <button
                type="button"
                onClick={() => handleRemove(v.id)}
                className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
