import { useEffect, useState } from 'react'
import type { Collection, Video } from '../types'
import { addToCollection, createCollection, isInCollection, listCollections, removeFromCollection } from '../lib/db'

interface Props {
  video: Video
  onClose: () => void
}

export default function SaveToCollectionModal({ video, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const cols = await listCollections()
      setCollections(cols)
      const states: Record<string, boolean> = {}
      await Promise.all(cols.map(async (c) => {
        states[c.id] = await isInCollection(c.id, video.id)
      }))
      setChecked(states)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [video.id])

  async function handleToggle(col: Collection) {
    const current = checked[col.id]
    setChecked((prev) => ({ ...prev, [col.id]: !current }))
    if (current) {
      await removeFromCollection(col.id, video.id)
    } else {
      await addToCollection(col.id, video)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const col = await createCollection(newName)
    await addToCollection(col.id, video)
    setCollections((prev) => [...prev, col])
    setChecked((prev) => ({ ...prev, [col.id]: true }))
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-semibold text-neutral-900 dark:text-white">Salvar em coleção</p>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Título do vídeo */}
        <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{video.title}</p>

        {/* Lista de coleções */}
        {loading ? (
          <p className="py-4 text-center text-sm text-neutral-400">Carregando…</p>
        ) : collections.length === 0 && !creating ? (
          <p className="py-2 text-center text-sm text-neutral-400">Nenhuma coleção ainda.</p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {collections.map((col) => (
              <label
                key={col.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <input
                  type="checkbox"
                  checked={!!checked[col.id]}
                  onChange={() => handleToggle(col)}
                  className="h-5 w-5 rounded accent-violet-600"
                />
                <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">{col.name}</span>
                {checked[col.id] && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-violet-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            ))}
          </div>
        )}

        {/* Criar nova coleção */}
        {creating ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da coleção…"
              maxLength={50}
              className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
            />
            <button type="submit" disabled={!newName.trim()} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              Criar
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-xl px-2 py-2 text-sm text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-2.5 text-sm text-neutral-500 hover:border-violet-400 hover:text-violet-600 dark:border-neutral-600 dark:hover:border-violet-500 dark:hover:text-violet-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Nova coleção
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
        >
          Concluído
        </button>
      </div>
    </div>
  )
}
