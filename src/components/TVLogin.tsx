import { useEffect, useState } from 'react'

interface DeviceAuthState {
  status: 'idle' | 'loading' | 'waiting' | 'success' | 'expired' | 'error'
  userCode?: string
  verificationUrl?: string
  deviceCode?: string
  expiresIn?: number
  interval?: number
}

interface Props {
  onSuccess: () => void
}

export default function TVLogin({ onSuccess }: Props) {
  const [state, setState] = useState<DeviceAuthState>({ status: 'idle' })
  const [secondsLeft, setSecondsLeft] = useState(0)

  async function startAuth() {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/auth/tv-start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState({
        status: 'waiting',
        userCode: data.user_code,
        verificationUrl: data.verification_url,
        deviceCode: data.device_code,
        expiresIn: data.expires_in,
        interval: data.interval,
      })
      setSecondsLeft(data.expires_in)
    } catch {
      setState({ status: 'error' })
    }
  }

  // Countdown do tempo restante
  useEffect(() => {
    if (state.status !== 'waiting') return
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [state.status])

  // Polling a cada N segundos
  useEffect(() => {
    if (state.status !== 'waiting' || !state.deviceCode) return
    const interval = (state.interval ?? 5) * 1000
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/tv-poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: state.deviceCode }),
        })
        const data = await res.json()
        if (data.status === 'success') {
          setState({ status: 'success' })
          onSuccess()
        } else if (data.status === 'expired') {
          setState({ status: 'expired' })
        }
      } catch {
        // Ignora erros de polling
      }
    }, interval)
    return () => clearInterval(t)
  }, [state.status, state.deviceCode, state.interval, onSuccess])

  if (state.status === 'idle' || state.status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <span className="text-5xl">📺</span>
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          Conectar TV com Google
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Faça login para importar suas playlists e inscrições do YouTube
        </p>
        {state.status === 'error' && (
          <p className="text-sm text-red-500">Erro ao iniciar. Tente novamente.</p>
        )}
        <button
          type="button"
          onClick={startAuth}
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
        >
          Conectar agora
        </button>
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-neutral-500 dark:text-neutral-400">Gerando código...</p>
      </div>
    )
  }

  if (state.status === 'expired') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <span className="text-4xl">⏰</span>
        <p className="text-neutral-600 dark:text-neutral-300">Código expirado.</p>
        <button
          type="button"
          onClick={startAuth}
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
        >
          Gerar novo código
        </button>
      </div>
    )
  }

  if (state.status === 'waiting') {
    const mins = Math.floor(secondsLeft / 60)
    const secs = secondsLeft % 60
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-violet-200 bg-white p-8 text-center shadow-sm dark:border-violet-800 dark:bg-neutral-900">
        <span className="text-5xl">📺</span>
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          Autorize no seu celular
        </h2>
        <div className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            1. Abra no celular ou PC:
          </p>
          <p className="font-mono text-lg font-bold text-violet-600 dark:text-violet-400">
            {state.verificationUrl}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            2. Digite o código:
          </p>
          <div className="rounded-2xl bg-violet-50 px-8 py-4 dark:bg-violet-950/40">
            <span className="font-mono text-4xl font-black tracking-[0.3em] text-violet-700 dark:text-violet-300">
              {state.userCode}
            </span>
          </div>
        </div>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Expira em {mins}:{secs.toString().padStart(2, '0')}
        </p>
        <div className="flex items-center gap-2 text-sm text-neutral-400 dark:text-neutral-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
          </svg>
          Aguardando autorização...
        </div>
      </div>
    )
  }

  return null
}
