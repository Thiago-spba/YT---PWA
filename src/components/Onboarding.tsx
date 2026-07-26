import { useEffect, useState } from 'react'
import { markOnboardingDone } from '../lib/storage'

interface Props {
  onDone: () => void
}

export default function Onboarding({ onDone }: Props) {
  const [phase, setPhase] = useState<'y' | 't' | 'merge' | 'confetti' | 'done'>('y')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('t'), 600)
    const t2 = setTimeout(() => setPhase('merge'), 1200)
    const t3 = setTimeout(() => setPhase('confetti'), 1800)
    const t4 = setTimeout(() => setPhase('done'), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const confettiColors = ['#7c3aed','#a78bfa','#f59e0b','#10b981','#ef4444','#3b82f6']

  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 p-6 text-center">

      {/* Animação YT */}
      <div className="relative flex h-32 items-center justify-center select-none">
        {/* Confetes */}
        {phase === 'confetti' || phase === 'done' ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  backgroundColor: confettiColors[i % confettiColors.length],
                  animation: `fall ${0.8 + Math.random() * 1.2}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        ) : null}

        <style>{`
          @keyframes slideFromLeft { from { transform: translateX(-60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideFromRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes mergeY { from { transform: translateX(0); } to { transform: translateX(18px) scale(1.08); } }
          @keyframes mergeT { from { transform: translateX(0); } to { transform: translateX(-18px) scale(1.08); } }
          @keyframes explode { 0% { transform: scale(1.08); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
          @keyframes fall { 0% { transform: translateY(-20px) rotate(0deg); opacity:1; } 100% { transform: translateY(120px) rotate(360deg); opacity:0; } }
        `}</style>

        <span
          className="text-7xl font-black text-violet-700 dark:text-violet-300 transition-all duration-500"
          style={{
            display: 'inline-block',
            animation:
              phase === 'y' ? 'slideFromLeft 0.5s ease-out forwards' :
              phase === 't' ? 'none' :
              phase === 'merge' ? 'mergeY 0.5s ease-in-out forwards' :
              'explode 0.6s ease-in-out forwards',
          }}
        >
          Y
        </span>
        <span
          className="text-7xl font-black text-violet-500 dark:text-violet-400 transition-all duration-500"
          style={{
            display: 'inline-block',
            animation:
              phase === 'y' ? 'none' :
              phase === 't' ? 'slideFromRight 0.5s ease-out forwards' :
              phase === 'merge' ? 'mergeT 0.5s ease-in-out forwards' :
              'explode 0.6s ease-in-out forwards',
            opacity: phase === 'y' ? 0 : 1,
          }}
        >
          T
        </span>
      </div>

      <h1 className="text-3xl font-bold text-violet-700 dark:text-violet-300">
        Bem-vindo ao YT
      </h1>
      <p className="text-neutral-600 dark:text-neutral-300">
        Este app funciona melhor dentro do navegador Brave, que bloqueia
        anúncios automaticamente. Siga os passos abaixo uma única vez:
      </p>
      <ol className="list-decimal space-y-3 text-left text-neutral-700 dark:text-neutral-200">
        <li>Abra este endereço no <strong>navegador Brave</strong>.</li>
        <li>Toque no menu e escolha <strong>"Instalar aplicativo"</strong>.</li>
        <li>Confirme que o <strong>Brave Shields</strong> está ativo.</li>
        <li>Pronto! Nas próximas vezes o app abre direto.</li>
      </ol>
      <p className="rounded-lg bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        Os vídeos só podem ser assistidos com internet — não é possível
        baixá-los offline. Isso segue os Termos de Uso do YouTube.
      </p>
      <button
        type="button"
        onClick={() => { markOnboardingDone(); onDone() }}
        className="mt-4 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
      >
        Concluir e ir para o catálogo
      </button>
    </div>
  )
}