import { useEffect, useRef, useState } from 'react'
import { markOnboardingDone } from '../lib/storage'

interface Props {
  onDone: () => void
}

interface Confetti {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  shape: 'rect' | 'circle'
}

const COLORS = ['#7c3aed', '#a78bfa', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#f97316']

export default function Onboarding({ onDone }: Props) {
  const [phase, setPhase] = useState<'intro' | 'collide' | 'done'>('intro')
  const [confetti, setConfetti] = useState<Confetti[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const confettiRef = useRef<Confetti[]>([])

  // Fase 1: letras se movem → colisão → confete
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('collide'), 1200)
    const t2 = setTimeout(() => {
      // Gera confete
      const pieces: Confetti[] = Array.from({ length: 120 }, (_, i) => ({
        id: i,
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.28,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 1.5) * 14,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      }))
      confettiRef.current = pieces
      setConfetti(pieces)
      setPhase('done')
    }, 1600)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Animar confete no canvas
  useEffect(() => {
    if (confetti.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      confettiRef.current = confettiRef.current
        .map((c) => ({
          ...c,
          x: c.x + c.vx,
          y: c.y + c.vy,
          vy: c.vy + 0.4, // gravidade
          vx: c.vx * 0.99, // atrito
          rotation: c.rotation + c.rotationSpeed,
        }))
        .filter((c) => c.y < canvas.height + 50)

      for (const c of confettiRef.current) {
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate((c.rotation * Math.PI) / 180)
        ctx.fillStyle = c.color
        ctx.globalAlpha = Math.max(0, 1 - c.y / canvas.height)
        if (c.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2)
        }
        ctx.restore()
      }

      if (confettiRef.current.length > 0) {
        animRef.current = requestAnimationFrame(draw)
      }
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [confetti])

  return (
    <div className="relative mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 overflow-hidden p-6 text-center">
      {/* Canvas de confete */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ opacity: phase === 'done' ? 1 : 0 }}
      />

      {/* Animação YT */}
      <div className="relative flex h-28 items-center justify-center select-none" aria-hidden>
        {/* Y vem da esquerda */}
        <span
          className="absolute text-7xl font-black text-violet-600 dark:text-violet-400 transition-all"
          style={{
            transform: phase === 'intro'
              ? 'translateX(-140px) scale(0.8)'
              : phase === 'collide'
              ? 'translateX(-2px) scale(1.15) rotate(-3deg)'
              : 'translateX(-22px) scale(1)',
            transitionDuration: phase === 'intro' ? '0ms' : phase === 'collide' ? '380ms' : '250ms',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: phase === 'collide' ? 'drop-shadow(0 0 20px #7c3aed)' : 'none',
          }}
        >
          Y
        </span>

        {/* T vem da direita */}
        <span
          className="absolute text-7xl font-black text-violet-800 dark:text-violet-300 transition-all"
          style={{
            transform: phase === 'intro'
              ? 'translateX(140px) scale(0.8)'
              : phase === 'collide'
              ? 'translateX(2px) scale(1.15) rotate(3deg)'
              : 'translateX(22px) scale(1)',
            transitionDuration: phase === 'intro' ? '0ms' : phase === 'collide' ? '380ms' : '250ms',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: phase === 'collide' ? 'drop-shadow(0 0 20px #5b21b6)' : 'none',
          }}
        >
          T
        </span>

        {/* Flash de colisão */}
        <div
          className="absolute inset-0 rounded-full bg-white transition-opacity duration-150"
          style={{ opacity: phase === 'collide' ? 0.9 : 0 }}
        />

        {/* Anel de onda */}
        {phase !== 'intro' && (
          <div
            className="absolute rounded-full border-4 border-violet-400"
            style={{
              width: phase === 'collide' ? '180px' : '0px',
              height: phase === 'collide' ? '180px' : '0px',
              opacity: phase === 'collide' ? 0 : 0,
              transition: 'width 600ms ease-out, height 600ms ease-out, opacity 600ms ease-out',
            }}
          />
        )}
      </div>

      {/* Conteúdo — aparece após animação */}
      <div
        className="flex flex-col gap-5 transition-all duration-500"
        style={{ opacity: phase === 'done' ? 1 : 0, transform: phase === 'done' ? 'translateY(0)' : 'translateY(16px)' }}
      >
        <h1 className="text-3xl font-black text-violet-700 dark:text-violet-300">
          Bem-vindo ao YT
        </h1>

        <p className="text-neutral-600 dark:text-neutral-300">
          Seu player de vídeos do YouTube, simples e sem distração.
          Para instalar, toque no menu do navegador e escolha{' '}
          <strong>"Instalar aplicativo"</strong> ou{' '}
          <strong>"Adicionar à tela inicial"</strong>.
        </p>

        <div className="flex flex-col gap-3 rounded-2xl bg-neutral-100 p-4 text-left text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">📶</span>
            <p><strong>Requer internet.</strong> Os vídeos são transmitidos ao vivo — não é possível baixá-los para ver offline.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">⚖️</span>
            <p><strong>Diretrizes do YouTube.</strong> O download de vídeos não é permitido pelos Termos de Uso do YouTube, exceto pelo app oficial com YouTube Premium.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">📋</span>
            <p><strong>Responsabilidade do conteúdo.</strong> Os vídeos são de responsabilidade de quem os publica na plataforma do YouTube. Este app apenas exibe o conteúdo disponível publicamente.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            markOnboardingDone()
            onDone()
          }}
          className="mt-2 rounded-2xl bg-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-violet-200 transition-transform hover:bg-violet-700 hover:scale-[1.02] active:scale-95 dark:shadow-violet-900"
        >
          Começar →
        </button>
      </div>
    </div>
  )
}
