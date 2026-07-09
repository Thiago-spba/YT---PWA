# Fase 7 — Dark mode manual e revisão de responsividade

**Status:** concluída

## Dark mode

Antes desta fase, o `dark:` do Tailwind só seguia `prefers-color-scheme`
do sistema, sem opção de o usuário escolher manualmente. Agora:

- `src/index.css` — adicionado `@custom-variant dark (&:where(.dark, .dark
  *));`, mudando o `dark:` do Tailwind de "baseado em media query" para
  "baseado na classe `.dark` no `<html>`".
- `src/lib/theme.ts` — três modos: `light`, `dark`, `system`.
  - `system` (padrão): segue `prefers-color-scheme` do dispositivo e
    reage a mudanças em tempo real (listener de `change` no
    `matchMedia`).
  - `light` / `dark`: força o modo escolhido, ignorando o sistema.
  - Preferência salva em `localStorage` (`yt-pwa:theme`).
- `src/components/ThemeToggle.tsx` — botão na barra superior que alterna
  entre os três modos em sequência (🖥️ Sistema → ☀️ Claro → 🌙 Escuro).
- `main.tsx` chama `initTheme()` **antes** do `ReactDOM.render`, para a
  classe `dark` já estar aplicada no primeiro paint (evita "flash" de
  tema errado).

## Responsividade — revisão de todas as telas

- `TopBar`: agora usa `flex-wrap` — em telas estreitas, a navegação
  quebra para uma segunda linha em vez de cortar ou espremer os botões
  (confirmado via inspeção: 32px de altura em telas largas, quebra para
  ~68px em 375px de largura, acomodando duas linhas).
- `Catalog`: os formulários de "adicionar por link" e "buscar" agora
  empilham verticalmente abaixo do breakpoint `sm` (640px) e ficam lado a
  lado a partir daí (`flex-col sm:flex-row`), evitando campo de texto e
  botão espremidos em telas pequenas.
- Grades de vídeo (Catálogo/Busca/Favoritos): já usavam `grid-cols-2
  sm:grid-cols-3 md:grid-cols-4` — confirmado que respondem corretamente
  em mobile (375px, 2 colunas), tablet (768px, 4 colunas) e desktop
  (1280px, 4 colunas dentro do `max-w-5xl`).
- Onboarding, Player, Favoritos e Settings — revisados, já eram
  responsivos por usarem containers com `max-w-*` + `mx-auto` e não
  tinham larguras fixas.

## Como foi verificado

A ferramenta de screenshot do preview apresentou uma falha nesta sessão
(a janela capturada ficava menor que o viewport emulado, gerando imagens
não confiáveis). A verificação foi feita por **inspeção do DOM**
(`getBoundingClientRect`, `grid-template-columns`, `flex-direction`
computados) nos breakpoints mobile (375px), tablet (768px) e desktop
(1280px), o que é uma fonte de verdade equivalente — confirma o que o
CSS está realmente aplicando, independente de renderização visual.
