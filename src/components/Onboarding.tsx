import { useEffect, useRef, useState } from 'react'
import { markOnboardingDone } from '../lib/storage'

interface Props {
  onDone: () => void
}

interface Particle {
  id: number
  x: number; y: number
  vx: number; vy: number
  color: string
  size: number
  rotation: number
  rotSpeed: number
  shape: 'rect' | 'circle' | 'triangle'
  opacity: number
}

const COLORS = ['#7c3aed','#a78bfa','#c4b5fd','#f59e0b','#10b981','#3b82f6','#ec4899','#f97316','#06b6d4']

function makeParticles(cx: number, cy: number): Particle[] {
  return Array.from({ length: 90 }, (_, i) => {
    const angle = (Math.random() * Math.PI * 2)
    const speed = 3 + Math.random() * 10
    return {
      id: i,
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 9,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      shape: (['rect','circle','triangle'] as const)[Math.floor(Math.random() * 3)],
      opacity: 1,
    }
  })
}

export default function Onboarding({ onDone }: Props) {
  // phase: 'moving' → letras se aproximam (2s)
  //        'impact' → colisão + flash (0.3s)
  //        'settle' → letras se acomodam (0.5s)
  //        'done'   → conteúdo aparece
  const [phase, setPhase] = useState<'moving'|'impact'|'settle'|'done'>('moving')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('impact'), 2000)
    const t2 = setTimeout(() => {
      // Dispara confete a partir do centro da tela
      const cx = window.innerWidth / 2
      const cy = (containerRef.current?.getBoundingClientRect().top ?? 120) + 60
      particlesRef.current = makeParticles(cx, cy)
      setPhase('settle')
    }, 2300)
    const t3 = setTimeout(() => setPhase('done'), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Loop de animação do canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function drawTriangle(ctx: CanvasRenderingContext2D, size: number) {
      ctx.beginPath()
      ctx.moveTo(0, -size / 2)
      ctx.lineTo(size / 2, size / 2)
      ctx.lineTo(-size / 2, size / 2)
      ctx.closePath()
      ctx.fill()
    }

    function loop() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.35,
          vx: p.vx * 0.98,
          rotation: p.rotation + p.rotSpeed,
          opacity: Math.max(0, p.opacity - 0.012),
        }))
        .filter(p => p.opacity > 0 && p.y < canvas.height + 40)

      for (const p of particlesRef.current) {
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'triangle') {
          drawTriangle(ctx, p.size)
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const isImpact = phase === 'impact'
  const isMoving = phase === 'moving'
  const isDone = phase === 'done' || phase === 'settle'

  return (
    <div className="relative mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 overflow-hidden p-6 text-center">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />

      {/* Letras animadas */}
      <div ref={containerRef} className="relative flex h-32 items-center justify-center select-none" aria-hidden>
        {/* Brilho de fundo na colisão */}
        <div
          className="absolute h-32 w-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
            opacity: isImpact ? 0.9 : 0,
            transform: isImpact ? 'scale(2.5)' : 'scale(0)',
            transition: 'opacity 200ms ease-out, transform 250ms ease-out',
          }}
        />

        {/* Y — vem da esquerda devagar */}
        <span
          className="absolute font-black text-violet-600 dark:text-violet-400"
          style={{
            fontSize: '5rem',
            lineHeight: 1,
            transform: isMoving
              ? 'translateX(-120px) scale(0.85)'
              : isImpact
              ? 'translateX(-1px) scale(1.18) rotate(-4deg)'
              : 'translateX(-26px) scale(1) rotate(0deg)',
            transition: isMoving
              ? 'transform 2s cubic-bezier(0.25, 0.1, 0.25, 1)'
              : isImpact
              ? 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            textShadow: isImpact ? '0 0 30px #7c3aed, 0 0 60px #a78bfa' : 'none',
            filter: isImpact ? 'brightness(1.4)' : 'brightness(1)',
          }}
        >
          Y
        </span>

        {/* T — vem da direita devagar */}
        <span
          className="absolute font-black text-violet-800 dark:text-violet-300"
          style={{
            fontSize: '5rem',
            lineHeight: 1,
            transform: isMoving
              ? 'translateX(120px) scale(0.85)'
              : isImpact
              ? 'translateX(1px) scale(1.18) rotate(4deg)'
              : 'translateX(26px) scale(1) rotate(0deg)',
            transition: isMoving
              ? 'transform 2s cubic-bezier(0.25, 0.1, 0.25, 1)'
              : isImpact
              ? 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            textShadow: isImpact ? '0 0 30px #5b21b6, 0 0 60px #7c3aed' : 'none',
            filter: isImpact ? 'brightness(1.4)' : 'brightness(1)',
          }}
        >
          T
        </span>

        {/* Ondas de choque — anéis que se expandem */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-violet-400/60"
            style={{
              width: isImpact ? `${140 + i * 60}px` : '0px',
              height: isImpact ? `${140 + i * 60}px` : '0px',
              opacity: isImpact ? 0 : 0,
              transition: `width ${0.4 + i * 0.12}s ease-out ${i * 0.06}s,
                           height ${0.4 + i * 0.12}s ease-out ${i * 0.06}s,
                           opacity ${0.4 + i * 0.12}s ease-out ${i * 0.06}s`,
            }}
          />
        ))}
      </div>

      {/* Conteúdo — aparece suavemente após animação */}
      <div
        className="flex flex-col gap-5 transition-all duration-700"
        style={{
          opacity: isDone ? 1 : 0,
          transform: isDone ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: isDone ? 'auto' : 'none',
        }}
      >
        <h1 className="text-3xl font-black text-violet-700 dark:text-violet-300">
          Bem-vindo ao YT
        </h1>

        <p className="text-neutral-600 dark:text-neutral-300">
          Seu player de vídeos do YouTube — simples, direto e sem distração.
          Para instalar, abra o menu do navegador e escolha{' '}
          <strong>"Instalar aplicativo"</strong> ou{' '}
          <strong>"Adicionar à tela inicial"</strong>.
        </p>

        <div className="flex flex-col gap-3 rounded-2xl bg-neutral-100 p-4 text-left dark:bg-neutral-800">
          {[
            { icon: '📶', title: 'Requer internet', text: 'Os vídeos são transmitidos em tempo real — não é possível assisti-los sem conexão.' },
            { icon: '⚖️', title: 'Download não permitido', text: 'As diretrizes do YouTube proíbem o download de vídeos, exceto pelo app oficial com YouTube Premium.' },
            { icon: '📋', title: 'Responsabilidade do conteúdo', text: 'Os vídeos são de responsabilidade de quem os publica. Este app apenas exibe conteúdo público do YouTube.' },
          ].map(({ icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">{icon}</span>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                <strong className="text-neutral-800 dark:text-neutral-100">{title}.</strong>{' '}{text}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { markOnboardingDone(); onDone() }}
          className="mt-2 rounded-2xl bg-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-violet-700 hover:scale-[1.02] active:scale-95"
        >
          Começar →
        </button>
      </div>
    </div>
  )
}
