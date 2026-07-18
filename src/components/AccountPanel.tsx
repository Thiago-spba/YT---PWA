import { useEffect, useState } from 'react'
import {
  connectGoogle,
  disconnectGoogle,
  fetchGoogleProfile,
  isTokenValid,
  GoogleAuthError,
  type GoogleProfile,
} from '../lib/googleAuth'
import {
  listMyPlaylists,
  listMySubscriptions,
  listPlaylistVideos,
  GoogleYoutubeError,
  type Subscription,
  type UserPlaylist,
} from '../lib/googleYoutube'
import { addToCatalog } from '../lib/db'
import { getVideoFlags, hasApiKey } from '../lib/youtube'
import type { Video } from '../types'
import {
  getDailyLimitMinutes,
  hasPin,
  isKeepScreenOnEnabled,
  isParentalControlEnabled,
  setDailyLimitMinutes,
  setKeepScreenOnEnabled,
  setParentalControlEnabled,
  setPin,
  verifyPin,
} from '../lib/storage'
import { isWakeLockSupported } from '../lib/useWakeLock'

interface Props {
  onCatalogChanged: () => void
}

type Tab = 'conta' | 'importar' | 'config'

function skippedSuffix(n: number) {
  return n > 0 ? ` (${n} já existiam no catálogo)` : ''
}

async function filterAndEnrich(videos: Video[]): Promise<{ videos: Video[]; skipped: number }> {
  if (!hasApiKey()) return { videos, skipped: 0 }
  try {
    const flags = await getVideoFlags(videos.map((v) => v.id))
    const enriched = videos.map((v) => ({
      ...v,
      isShort: flags[v.id]?.isShort ?? v.isShort,
      durationSeconds: flags[v.id]?.durationSeconds ?? v.durationSeconds,
    }))
    return { videos: enriched, skipped: 0 }
  } catch {
    return { videos, skipped: 0 }
  }
}

export default function AccountPanel({ onCatalogChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('conta')
  const [pinExists, setPinExists] = useState(false)
  const [parentalEnabled, setParentalEnabled] = useState(isParentalControlEnabled())
  const [keepScreenOn, setKeepScreenOn] = useState(isKeepScreenOnEnabled())
  const [unlocked, setUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [newPinInput, setNewPinInput] = useState('')
  const [limit, setLimit] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const [profile, setProfile] = useState<GoogleProfile | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([])
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null)
  const [playlistVideos, setPlaylistVideos] = useState<Video[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importStatus, setImportStatus] = useState<string | null>(null)

  useEffect(() => {
    hasPin().then(setPinExists)
    const current = getDailyLimitMinutes()
    setLimit(current ? String(current) : '')
  }, [])

  const needsPinToView = parentalEnabled && !unlocked

  function closePanel() {
    setOpen(false)
    setUnlocked(false)
    setPinInput('')
    setMessage(null)
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (await verifyPin(pinInput)) {
      setUnlocked(true)
      setMessage(null)
      setPinInput('')
    } else {
      setMessage('PIN incorreto.')
    }
  }

  async function handleEnableParentalControl() {
    if (pinExists) {
      setParentalControlEnabled(true)
      setParentalEnabled(true)
      setUnlocked(true)
      return
    }
    if (newPinInput.length < 4) {
      setMessage('Use um PIN com pelo menos 4 dígitos.')
      return
    }
    await setPin(newPinInput)
    setParentalControlEnabled(true)
    setParentalEnabled(true)
    setPinExists(true)
    setUnlocked(true)
    setNewPinInput('')
    setMessage(null)
  }

  function handleDisableParentalControl() {
    setParentalControlEnabled(false)
    setParentalEnabled(false)
    setMessage('Controle parental desativado.')
  }

  function handleSaveLimit() {
    const minutes = limit.trim() === '' ? null : Number(limit)
    setDailyLimitMinutes(minutes && minutes > 0 ? minutes : null)
    setMessage('Limite salvo.')
  }

  function handleToggleKeepScreenOn() {
    const next = !keepScreenOn
    setKeepScreenOn(next)
    setKeepScreenOnEnabled(next)
  }

  async function handleConnectGoogle() {
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      await connectGoogle()
      setGoogleConnected(true)
      const [userProfile, subs, pls] = await Promise.all([
        fetchGoogleProfile(),
        listMySubscriptions(),
        listMyPlaylists(),
      ])
      setProfile(userProfile)
      setSubscriptions(subs)
      setPlaylists(pls)
    } catch (err) {
      setGoogleError(err instanceof GoogleAuthError ? err.message : 'Erro ao conectar.')
      setGoogleConnected(false)
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleDisconnectGoogle() {
    disconnectGoogle()
    setGoogleConnected(false)
    setProfile(null)
    setSubscriptions([])
    setPlaylists([])
    setPlaylistVideos([])
    setSelected(new Set())
    setImportStatus(null)
    setActivePlaylist(null)
  }

  async function handleOpenPlaylist(playlistId: string) {
    if (!isTokenValid()) {
      setGoogleError('Conexão com o Google expirou — toque em "Conectar com Google" para continuar.')
      setGoogleConnected(false)
      return
    }
    setActivePlaylist(playlistId)
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      const { videos } = await filterAndEnrich(await listPlaylistVideos(playlistId))
      setPlaylistVideos(videos)
      setSelected(new Set(videos.map((v) => v.id)))
    } catch (err) {
      setGoogleError(err instanceof GoogleYoutubeError ? err.message : 'Erro ao carregar playlist.')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleImport() {
    if (!isTokenValid()) {
      setGoogleError('Conexão com o Google expirou.')
      setGoogleConnected(false)
      return
    }
    setGoogleLoading(true)
    setGoogleError(null)
    let count = 0
    try {
      for (const v of playlistVideos.filter((v) => selected.has(v.id))) {
        await addToCatalog(v)
        count++
      }
      setImportStatus(`${count} vídeo(s) importados.`)
      if (count > 0) onCatalogChanged()
    } catch (err) {
      setGoogleError(err instanceof GoogleYoutubeError ? err.message : 'Erro ao importar.')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleImportEntirePlaylist(playlistId: string) {
    if (!isTokenValid()) {
      setGoogleError('Conexão com o Google expirou.')
      setGoogleConnected(false)
      return
    }
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      const { videos, skipped } = await filterAndEnrich(await listPlaylistVideos(playlistId))
      for (const video of videos) await addToCatalog(video)
      setImportStatus(`${videos.length} vídeo(s) importados.${skippedSuffix(skipped)}`)
      if (videos.length > 0) onCatalogChanged()
    } catch (err) {
      setGoogleError(err instanceof GoogleYoutubeError ? err.message : 'Erro ao importar playlist.')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleImportAll() {
    if (!isTokenValid()) {
      setGoogleError('Conexão com o Google expirou — toque em "Conectar com Google" para continuar.')
      setGoogleConnected(false)
      return
    }
    setGoogleLoading(true)
    setGoogleError(null)
    let total = 0
    let totalSkipped = 0
    try {
      for (const p of playlists) {
        const { videos, skipped } = await filterAndEnrich(await listPlaylistVideos(p.id))
        for (const video of videos) await addToCatalog(video)
        total += videos.length
        totalSkipped += skipped
      }
      setImportStatus(`${total} vídeo(s) importados de todas as playlists.${skippedSuffix(totalSkipped)}`)
      if (total > 0) onCatalogChanged()
    } catch (err) {
      setGoogleError(err instanceof GoogleYoutubeError ? err.message : 'Erro ao importar tudo.')
    } finally {
      setGoogleLoading(false)
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Botão flutuante — canto superior direito, não atrapalha vídeos */}
      <button
        type="button"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label="Configurações"
        title="Configurações"
        className={`fixed right-3 top-3 z-[55] flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
          open ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-black' : ''
        } ${profile ? 'bg-transparent' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
      >
        {profile ? (
          <img src={profile.picture} alt={profile.name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
          </svg>
        )}
        {profile && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[54] bg-black/60 backdrop-blur-sm" onClick={closePanel}>
          {/* Painel — slide de baixo para cima no mobile, lateral no desktop */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[85vh] flex-col rounded-t-2xl animate-slide-up bg-white shadow-2xl dark:bg-neutral-900 sm:inset-x-auto sm:right-4 sm:top-14 sm:bottom-auto sm:w-96 sm:rounded-2xl"
          >
            {/* Header com perfil */}
            <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-700">
              {profile ? (
                <>
                  <img src={profile.picture} alt={profile.name} className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900 dark:text-white">{profile.name}</p>
                    <p className="truncate text-xs text-neutral-500">{profile.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="shrink-0 rounded-full px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 dark:text-white">Configurações</p>
                </div>
              )}
              <button type="button" onClick={closePanel} className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {needsPinToView ? (
              /* Modal de PIN centralizado na tela */
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={closePanel}>
                <form
                  onSubmit={handleUnlock}
                  className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-violet-600 dark:text-violet-300">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Controle Parental</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Digite o PIN para acessar as configurações.</p>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    className="rounded-xl border border-neutral-300 px-4 py-3 text-center text-lg tracking-widest focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  />
                  {message && <p className="text-center text-sm text-red-500">{message}</p>}
                  <button type="submit" className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-transform hover:bg-violet-700 active:scale-95">
                    Entrar
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Abas */}
                <div className="flex shrink-0 border-b border-neutral-200 dark:border-neutral-700">
                  {(['conta', 'importar', 'config'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                        tab === t
                          ? 'border-b-2 border-violet-600 text-violet-600'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                      }`}
                    >
                      {t === 'conta' ? '👤 Conta' : t === 'importar' ? '⬇ Importar' : '⚙ Config'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4">

                  {/* ── ABA CONTA ── */}
                  {tab === 'conta' && (
                    <div className="flex flex-col gap-4">
                      {!googleConnected ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Conecte sua conta Google para importar vídeos das suas inscrições e playlists.
                          </p>
                          <button
                            type="button"
                            onClick={handleConnectGoogle}
                            disabled={googleLoading}
                            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                          >
                            {googleLoading ? 'Conectando…' : '🔗 Conectar com Google'}
                          </button>
                        </div>
                      ) : (
                        <>
                          {googleConnected && !isTokenValid() && (
                            <button
                              type="button"
                              onClick={handleConnectGoogle}
                              className="w-full rounded-xl bg-amber-100 px-3 py-2.5 text-sm text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200"
                            >
                              ⚠ Conexão expirou — toque para reconectar
                            </button>
                          )}
                          {googleError && (
                            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{googleError}</p>
                          )}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                              Inscrições ({subscriptions.length})
                            </p>
                            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                              {subscriptions.length > 0
                                ? subscriptions.map((s) => (
                                    <span key={s.channelId} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                      {s.title}
                                    </span>
                                  ))
                                : <p className="text-sm text-neutral-400">Nenhuma encontrada.</p>
                              }
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── ABA IMPORTAR ── */}
                  {tab === 'importar' && (
                    <div className="flex flex-col gap-3">
                      {!googleConnected ? (
                        <p className="text-sm text-neutral-500">Conecte sua conta Google na aba Conta primeiro.</p>
                      ) : (
                        <>
                          {googleError && (
                            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{googleError}</p>
                          )}
                          {importStatus && (
                            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">{importStatus}</p>
                          )}
                          <button
                            type="button"
                            onClick={async () => { setGoogleError(null); setImportStatus(null); await handleImportAll() }}
                            disabled={googleLoading || playlists.length === 0}
                            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                          >
                            {googleLoading ? 'Importando…' : `⬇ Importar todas as playlists (${playlists.length})`}
                          </button>

                          <p className="text-xs font-semibold uppercase text-neutral-500">Playlists</p>
                          <div className="flex flex-col gap-2">
                            {playlists.map((p) => (
                              <div
                                key={p.id}
                                className={`rounded-xl border p-3 transition-colors ${
                                  activePlaylist === p.id
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                                    : 'border-neutral-200 dark:border-neutral-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPlaylist(p.id)}
                                    disabled={googleLoading}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{p.title}</p>
                                    <p className="text-xs text-neutral-400">{p.itemCount} vídeo(s)</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleImportEntirePlaylist(p.id)}
                                    disabled={googleLoading}
                                    className="shrink-0 rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200 disabled:opacity-50 dark:bg-violet-900 dark:text-violet-300"
                                  >
                                    Importar
                                  </button>
                                </div>

                                {activePlaylist === p.id && playlistVideos.length > 0 && (
                                  <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                                    <div className="mb-2 flex items-center justify-between">
                                      <p className="text-xs text-neutral-500">{playlistVideos.length} vídeos</p>
                                      <button
                                        type="button"
                                        onClick={() => setSelected(selected.size === playlistVideos.length ? new Set() : new Set(playlistVideos.map(v => v.id)))}
                                        className="text-xs text-violet-600 underline"
                                      >
                                        {selected.size === playlistVideos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                                      </button>
                                    </div>
                                    <div className="max-h-36 space-y-1 overflow-y-auto">
                                      {playlistVideos.map((v) => (
                                        <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                          <input
                                            type="checkbox"
                                            checked={selected.has(v.id)}
                                            onChange={() => toggleSelected(v.id)}
                                            className="accent-violet-600"
                                          />
                                          <span className="line-clamp-1 text-xs text-neutral-700 dark:text-neutral-300">{v.title}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleImport}
                                      disabled={selected.size === 0 || googleLoading}
                                      className="mt-2 w-full rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                                    >
                                      Importar selecionados ({selected.size})
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── ABA CONFIG ── */}
                  {tab === 'config' && (
                    <div className="flex flex-col gap-5">
                      {/* Manter tela acesa */}
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Manter tela acesa</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Evita que a tela apague durante a reprodução.</p>
                          {keepScreenOn && !isWakeLockSupported() && (
                            <p className="mt-1 text-xs text-amber-600">Este navegador não suporta este recurso.</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleKeepScreenOn}
                          aria-label="Manter tela acesa"
                          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                            keepScreenOn ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-600'
                          }`}
                        >
                          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${keepScreenOn ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>

                      {/* Controle parental */}
                      <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Controle parental</p>
                            <p className="text-xs text-neutral-500">{parentalEnabled ? 'Ativo' : 'Desligado'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (parentalEnabled) {
                                handleDisableParentalControl()
                              } else if (pinExists) {
                                // PIN já existe, só ativa
                                setParentalControlEnabled(true)
                                setParentalEnabled(true)
                              }
                              // Sem PIN: o campo abaixo aparece para criar
                            }}
                            aria-label="Controle parental"
                            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                              parentalEnabled ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          >
                            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${parentalEnabled ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>

                        {!parentalEnabled && !pinExists && (
                          <div className="mt-3 flex flex-col gap-2">
                            <input
                              type="password"
                              inputMode="numeric"
                              value={newPinInput}
                              onChange={(e) => setNewPinInput(e.target.value)}
                              placeholder="Criar PIN (mínimo 4 dígitos)"
                              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={handleEnableParentalControl}
                              className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                            >
                              Criar PIN e ativar
                            </button>
                          </div>
                        )}

                        {parentalEnabled && (
                          <div className="mt-3">
                            <p className="mb-1 text-xs text-neutral-500">Limite diário de uso (minutos)</p>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min={0}
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                placeholder="Sem limite"
                                className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={handleSaveLimit}
                                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}

                        {message && <p className="mt-2 text-xs text-neutral-500">{message}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
