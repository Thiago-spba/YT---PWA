# Fase 8 — Rodapé, avisos de onboarding e README

**Status:** concluída

## O que foi feito

- `src/components/Footer.tsx` (novo): rodapé fixo no fim de cada tela com
  nome do app ("YT"), ano atual (calculado via `new Date().getFullYear()`,
  não hardcoded) e dois botões — **Privacidade** e **Termos de uso** — que
  expandem/colapsam um painel com o texto correspondente (um só painel
  aberto por vez). Adicionado em `App.tsx`, aparece em todas as views.
- Conteúdo de Privacidade e Termos escrito refletindo o que o app
  **realmente faz** (sem texto genérico de template):
  - Privacidade: nenhum backend próprio, dados só no dispositivo
    (localStorage/IndexedDB), uso da YouTube Data API sujeito à política
    do Google, player em modo `youtube-nocookie.com`, e a limitação
    conhecida de que o PIN não sobrevive à limpeza de dados do site.
  - Termos: uso pessoal/familiar sem fins comerciais, conteúdo de vídeo
    sujeito aos Termos de Serviço do YouTube, exige internet, uso por
    criança deve ser supervisionado.
- `src/components/Onboarding.tsx`: adicionado aviso de que os vídeos só
  podem ser assistidos com internet (sem suporte a download/offline
  ainda), com nota de que isso está planejado para o futuro.
- `README.md` reescrito: seção **Finalidade** explícita, e seção **Onde
  está** deixando claro que o código é local (`C:\Users\Home\Projects\yt-pwa`,
  abrível direto no VS Code) e versionado só em Git local — **ainda não
  publicado no GitHub** — com a URL de produção do Vercel.

## Por que existe a opção de "colar link" no catálogo

Foi uma decisão da fase de definição de escopo (ver
[docs/00-intencao-e-escopo.md](00-intencao-e-escopo.md)): a busca por
palavra-chave (via API) só existe com uma chave configurada, e mesmo
assim retorna resultados abertos da plataforma. "Colar link" é o
mecanismo de **curadoria manual** — permite montar o catálogo só com
vídeos que o responsável já escolheu e aprovou, sem depender da API nem
do algoritmo de busca/sugestão do YouTube. É o caminho que funciona
mesmo sem chave de API configurada.

## Verificação

Testado no preview (via inspeção de acessibilidade/DOM, não captura de
tela — ver limitação registrada na fase 7):
- Aviso de internet/offline aparece corretamente na tela de onboarding.
- Rodapé mostra "YT — 2026" e os dois botões.
- Clicar em "Privacidade" expande o texto correspondente; clicar em
  "Termos de uso" fecha o painel anterior e abre o novo (um por vez).
