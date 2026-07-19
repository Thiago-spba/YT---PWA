import { useEffect, useRef, useState } from 'react'
import type { Collection, CollectionEntry, Video } from '../types'
import {
  createCollection,
  deleteCollection,
  listCollectionVideos,
  listCollections,
  removeFromCollection,
  updateCollectionName,
} from '../lib/db'

interface Props {
  onSelect: (video: Video, queue?: Video[]) => void
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-7-1 7-7a2 2 0 0 1 3 3l-7 7H9v-3z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export default function Collections({ onSelect }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeCol, setActiveCol] = useState<Collection | null>(null)
  const [videos, setVideos] = useState<CollectionEntry[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listCollections().then(setCollections).catch(() => [])
  }, [])

  useEffect(() => {
    if (creating) setTimeout(() => newInputRef.current?.focus(), 50)
  }, [creating])

  useEffect(() => {
    if (editingId) setTimeout(() => editInputRef.current?.focus(), 50)
  }, [editingId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const col = await createCollection(newName)
    setCollections((prev) => [...prev, col])
    setNewName('')
    setCreating(false)
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    await updateCollectionName(editingId, editName)
    setCollections((prev) => prev.map((c) => c.id === editingId ? { ...c, name: editName.trim() } : c))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
    setConfirmDelete(null)
    if (activeCol?.id === id) setActiveCol(null)
  }

  async function handleOpenCollection(col: Collection) {
    setActiveCol(col)
    const vids = await listCollectionVideos(col.id)
    setVideos(vids.sort((a, b) => b.addedAt - a.addedAt))
  }

  async function handleRemoveVideo(video: CollectionEntry) {
    if (!activeCol) return
    await removeFromCollection(activeCol.id, video.id.split(':')[1] ?? video.id)
    setVideos((prev) => prev.filter((v) => v.id !== video.id))
  }

  // ── Vista de vídeos da coleção ────────────────────────────────────────
  if (activeCol) {
    const queue = videos.map((v) => ({ ...v, id: v.id.split(':')[1] ?? v.id }))
    return (
      <div className="mx-auto max-w-[1800px] p-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveCol(null)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <BackIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-lg font-bold text-neutral-900 dark:text-white">{activeCol.name}</h2>
            <p className="text-xs text-neutral-500">{videos.length} vídeo(s)</p>
          </div>
          {videos.length > 0 && (
            <button
              type="button"
              onClick={() => onSelect({ ...queue[0] }, queue.slice(1))}
              className="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <PlayIcon />
              Reproduzir tudo
            </button>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-neutral-400">
            <FolderIcon />
            <p className="text-sm">Nenhum vídeo nesta coleção ainda.</p>
            <p className="text-xs">Use o ícone 🔖 nos cards para adicionar vídeos aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {videos.map((v) => {
              const realId = v.id.split(':')[1] ?? v.id
              const realVideo = { ...v, id: realId }
              return (
                <div key={v.id} className="group relative overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <button
                    type="button"
                    onClick={() => onSelect(realVideo, queue.filter((q) => q.id !== realId))}
                    className="w-full text-left"
                  >
                    <div className="relative aspect-video overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                          <PlayIcon />
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-white">{v.title}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">{v.channelTitle}</p>
                    </div>
                  </button>
                  {/* Botão remover */}
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(v)}
                    title="Remover da coleção"
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 sm:opacity-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                  {/* Mobile: sempre visível */}
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(v)}
                    title="Remover da coleção"
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white sm:hidden"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Vista de lista de coleções ────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Coleções</h2>
        <button
          type="button"
          onClick={() => { setCreating(true); setNewName('') }}
          className="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 active:scale-95 transition-transform"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Nova coleção
        </button>
      </div>

      {/* Formulário de criação */}
      {creating && (
        <form onSubmit={handleCreate} className="mb-4 flex gap-2 rounded-xl border border-violet-300 bg-violet-50 p-3 dark:border-violet-700 dark:bg-violet-950">
          <input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da coleção…"
            maxLength={50}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
          <button type="submit" disabled={!newName.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
            Criar
          </button>
          <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Cancelar
          </button>
        </form>
      )}

      {collections.length === 0 && !creating ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-neutral-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <FolderIcon />
          </div>
          <div>
            <p className="font-medium text-neutral-600 dark:text-neutral-300">Nenhuma coleção ainda</p>
            <p className="mt-1 text-sm">Crie uma coleção para guardar vídeos para ver depois.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {collections.map((col) => (
            <div key={col.id} className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-violet-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-violet-700">
              {editingId === col.id ? (
                <form onSubmit={handleRename} className="flex flex-1 gap-2">
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={50}
                    className="flex-1 rounded-lg border border-violet-400 bg-white px-3 py-1.5 text-sm focus:outline-none dark:bg-neutral-700 dark:text-white"
                  />
                  <button type="submit" className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700">Salvar</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">✕</button>
                </form>
              ) : (
                <>
                  <button type="button" onClick={() => handleOpenCollection(col)} className="flex flex-1 items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300">
                      <FolderIcon />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate font-medium text-neutral-900 dark:text-white">{col.name}</p>
                      <p className="text-xs text-neutral-400">{new Date(col.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </button>
                  {/* Ações — sempre visíveis no mobile */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingId(col.id); setEditName(col.name) }}
                      title="Renomear"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-white"
                    >
                      <EditIcon />
                    </button>
                    {confirmDelete === col.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(col.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Confirmar</button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">Não</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(col.id)}
                        title="Excluir coleção"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
