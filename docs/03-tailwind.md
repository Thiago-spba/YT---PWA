# Fase 3 — Tailwind CSS

**Status:** concluída

## O que foi feito

- Tailwind CSS v4 instalado via plugin oficial do Vite (`@tailwindcss/vite`),
  sem necessidade de `tailwind.config.js` — a v4 configura por convenção e
  via `@import "tailwindcss";` no CSS.
- `src/index.css` reescrito: importa Tailwind, mantém `color-scheme: light
  dark` (permite estilos `dark:` automáticos conforme o tema do sistema) e
  um reset mínimo de `body`.
- CSS antigo do template inicial (`App.css`, estilos de `#root` fixos em
  1126px) removido — não fazia sentido para um app responsivo mobile-first.

## Decisões

- Sem CSS customizado além do Tailwind: todas as telas usam classes
  utilitárias diretamente, o que reduz arquivos e mantém o app leve.
