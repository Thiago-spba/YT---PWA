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
import type { Video } from '../types'
import {
  getDailyLimitMinutes,
  hasPin,
  isParentalControlEnabled,
  setDailyLimitMinutes,
  setParentalControlEnabled,
  setPin,
  verifyPin,
} from '../lib/storage'

export default function AccountPanel() {
  const [open, setOpen] = useState(false)
  const [pinExists, setPinExists] = useState(false)
  const [parentalEnabled, setParentalEnabled] = useState(isParentalControlEnabled())
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
      setGoogleError(
        err instanceof GoogleAuthError || err instanceof GoogleYoutubeError
          ? err.message
          : 'Não foi possível conectar com o Google.',
      )
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
    setActivePlaylist(null)
  }

  async function handleOpenPlaylist(playlistId: string) {
    if (!isTokenValid()) {
      setGoogleError('Conexão com o Google expirou — toque em "Conectar com Google" para continuar.')
      setGoogleConnected(false)
      return
    }
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      setPlaylistVideos(await listPlaylistVideos(playlistId))
      setActivePlaylist(playlistId)
      setSelected(new Set())
    } catch (err) {
      setGoogleError(err instanceof GoogleYoutubeError ? err.message : 'Erro ao abrir playlist.')
    } finally {
      setGoogleLoading(false)
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleImport() {
    const toImport = playlistVideos.filter((v) => selected.has(v.id))
    for (const video of toImport) {
      await addToCatalog(video)
    }
    setImportStatus(`${toImport.length} vídeo(s) adicionados ao catálogo.`)
    setSelected(new Set())
  }

  async function handleImportEntirePlaylist(playlistId: string) {
    if (!isTokenValid()) {
      setGoogleError('Conexão com o Google expirou — toque em "Conectar com Google" para continuar.')
      setGoogleConnected(false)
      return
    }
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      const videos = await listPlaylistVideos(playlistId)
      for (const video of videos) {
        await addToCatalog(video)
      }
      setImportStatus(`${videos.length} vídeo(s) importados dessa playlist.`)
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
    try {
      for (const p of playlists) {
        const videos = await listPlaylistVideos(p.id)
        for (const video of videos) {
          await addToCatalog(video)
        }
        total += videos.length
      }
      setImportStatus(`${total} vídeo(s) importados de todas as playlists.`)
    } catch (err) {
      setGoogleError(err instanceof GoogleYoutubeError ? err.message : 'Erro ao importar tudo.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label="Configurações"
        title="Configurações"
        className="fixed bottom-4 left-4 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700"
      >
        {profile ? (
          <img src={profile.picture} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={closePanel}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-20 left-4 z-40 max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-xl bg-white p-4 shadow-xl dark:bg-neutral-900"
          >
            {needsPinToView ? (
              <form onSubmit={handleUnlock} className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  Configurações protegidas
                </h2>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Digite o PIN"
                  className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                />
                <button type="submit" className="rounded bg-violet-600 px-4 py-2 text-white">
                  Entrar
                </button>
                {message && <p className="text-sm text-red-500">{message}</p>}
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Conta Google
                  </h2>
                  {!googleConnected ? (
                    <>
                      <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                        Conecte para importar vídeos das suas inscrições e playlists.
                        Acesso somente leitura.
                      </p>
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={googleLoading}
                        className="rounded bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {googleLoading ? 'Conectando…' : 'Conectar com Google'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {profile && (
                          <img
                            src={profile.picture}
                            alt={profile.name}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <div className="text-sm">
                          <p className="font-medium text-neutral-800 dark:text-neutral-100">
                            {profile?.name}
                          </p>
                          <p className="text-neutral-500 dark:text-neutral-400">
                            {profile?.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectGoogle}
                        className="text-xs text-neutral-500 underline"
                      >
                        Desconectar
                      </button>
                    </div>
                  )}

                  {googleError && (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{googleError}</p>
                  )}

                  {googleConnected && !isTokenValid() && (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="mt-2 w-full rounded bg-amber-100 px-3 py-2 text-sm text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200"
                    >
                      Conexão expirou — toque para reconectar
                    </button>
                  )}

                  {googleConnected && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                          Inscrições ({subscriptions.length})
                        </h3>
                        <p className="max-h-16 overflow-y-auto text-sm text-neutral-500 dark:text-neutral-400">
                          {subscriptions.map((s) => s.title).join(', ') || 'Nenhuma encontrada.'}
                        </p>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase text-neutral-500">
                            Playlists
                          </h3>
                          {playlists.length > 0 && (
                            <button
                              type="button"
                              onClick={handleImportAll}
                              disabled={googleLoading}
                              className="text-xs font-medium text-violet-600 underline hover:text-violet-700 disabled:opacity-50 dark:text-violet-400"
                            >
                              Importar tudo de uma vez
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {playlists.map((p) => (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs ${
                                activePlaylist === p.id
                                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                                  : 'border-neutral-300 dark:border-neutral-600'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenPlaylist(p.id)}
                                disabled={googleLoading}
                                className="flex-1 truncate text-left hover:underline"
                              >
                                {p.title} ({p.itemCount})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImportEntirePlaylist(p.id)}
                                disabled={googleLoading}
                                title="Importar a playlist inteira de uma vez"
                                className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                              >
                                importar tudo
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {playlistVideos.length > 0 && (
                        <div>
                          <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                            Vídeos
                          </h3>
                          <div className="mb-2 max-h-40 space-y-1 overflow-y-auto">
                            {playlistVideos.map((v) => (
                              <label key={v.id} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={selected.has(v.id)}
                                  onChange={() => toggleSelected(v.id)}
                                />
                                {v.title}
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={handleImport}
                            disabled={selected.size === 0}
                            className="w-full rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                          >
                            Importar selecionados ({selected.size})
                          </button>
                        </div>
                      )}
                      {importStatus && (
                        <p className="text-sm text-green-600">{importStatus}</p>
                      )}
                    </div>
                  )}
                </section>

                <section className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Controle parental
                    </h2>
                    <button
                      type="button"
                      onClick={parentalEnabled ? handleDisableParentalControl : handleEnableParentalControl}
                      className={`relative h-6 w-11 rounded-full transition ${
                        parentalEnabled ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                          parentalEnabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {!parentalEnabled && !pinExists && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Desligado — sem PIN e sem limite de tempo. Para ativar, defina um PIN:
                      </p>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="Novo PIN"
                        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                      />
                      <button
                        type="button"
                        onClick={handleEnableParentalControl}
                        className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                      >
                        Criar PIN e ativar
                      </button>
                    </div>
                  )}

                  {parentalEnabled && (
                    <div className="mt-2">
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        Limite diário de uso (minutos)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={limit}
                          onChange={(e) => setLimit(e.target.value)}
                          placeholder="Sem limite"
                          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
                        />
                        <button
                          type="button"
                          onClick={handleSaveLimit}
                          className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  {message && <p className="mt-2 text-sm text-neutral-500">{message}</p>}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
