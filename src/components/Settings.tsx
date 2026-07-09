import { useEffect, useState } from 'react'
import {
  getDailyLimitMinutes,
  hasPin,
  setDailyLimitMinutes,
  setPin,
  verifyPin,
} from '../lib/storage'

export default function Settings() {
  const [unlocked, setUnlocked] = useState(false)
  const [pinExists, setPinExists] = useState(true)
  const [pinInput, setPinInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [limit, setLimit] = useState<string>('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    hasPin().then(setPinExists)
    const current = getDailyLimitMinutes()
    setLimit(current ? String(current) : '')
  }, [])

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (await verifyPin(pinInput)) {
      setUnlocked(true)
      setMessage(null)
    } else {
      setMessage('PIN incorreto.')
    }
  }

  async function handleCreatePin(e: React.FormEvent) {
    e.preventDefault()
    if (newPin.length < 4) {
      setMessage('Use um PIN com pelo menos 4 dígitos.')
      return
    }
    await setPin(newPin)
    setPinExists(true)
    setUnlocked(true)
    setMessage(null)
  }

  function handleSaveLimit() {
    const minutes = limit.trim() === '' ? null : Number(limit)
    setDailyLimitMinutes(minutes && minutes > 0 ? minutes : null)
    setMessage('Configuração salva.')
  }

  if (!pinExists) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h1 className="mb-4 text-xl font-semibold">Criar PIN de responsável</h1>
        <form onSubmit={handleCreatePin} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="Novo PIN"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <button type="submit" className="rounded bg-violet-600 px-4 py-2 text-white">
            Criar PIN
          </button>
        </form>
        {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h1 className="mb-4 text-xl font-semibold">Configurações (protegido)</h1>
        <form onSubmit={handleUnlock} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Digite o PIN"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <button type="submit" className="rounded bg-violet-600 px-4 py-2 text-white">
            Entrar
          </button>
        </form>
        {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Configurações</h1>
      <label className="mb-1 block text-sm font-medium">
        Limite diário de uso (minutos)
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="Sem limite"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
        />
        <button
          type="button"
          onClick={handleSaveLimit}
          className="rounded bg-violet-600 px-4 py-2 text-white"
        >
          Salvar
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
    </div>
  )
}
