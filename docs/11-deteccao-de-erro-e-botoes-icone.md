# Fase 11 — Detecção de vídeo indisponível, botões só com ícone, modestbranding

**Status:** concluída

## Vídeo indisponível → "Voltar ao catálogo"

O player antes era um `<iframe src="...">` estático — a página de erro
("Vídeo indisponível") que aparecia era a própria tela de erro do
YouTube, dentro do iframe, sem nenhuma forma de detectar isso do lado
do app (iframe de outra origem, sem acesso via JS).

Trocado por integração com a **YouTube IFrame Player API**
(`src/lib/youtubePlayer.ts` carrega `https://www.youtube.com/iframe_api`
sob demanda) em vez do iframe estático. Isso dá acesso ao evento
`onError`, que dispara para vídeo removido/privado (código 100) ou com
incorporação desativada pelo dono (101/150). Quando isso acontece, o
app mostra sua própria tela de erro (não a do YouTube) com o botão
**"Voltar ao catálogo"**.

Detalhe técnico importante: o player é criado **uma única vez** por
sessão de uso (não a cada troca de vídeo) — trocar de vídeo chama
`player.loadVideoById()` na mesma instância, em vez de recriar o
iframe. Isso também é o que permite o player persistir sem reiniciar ao
alternar entre modo janela e tela cheia (só o CSS ao redor muda).

## Botões só com ícone

Os botões de Favoritar / Tela cheia / Fechar na tela de assistir
perderam o texto e viraram ícones SVG simples, com `title` e
`aria-label` (aparece dica ao passar o mouse, e leitores de tela
continuam anunciando a função corretamente).

## Redução da marca do YouTube

Adicionado `modestbranding: 1` nas opções do player. Importante:
**não é possível remover a marca do YouTube por completo** — isso é uma
exigência dos Termos de Serviço do YouTube para quem usa o player
incorporado gratuito. `modestbranding` reduz a proeminência do logo nos
controles, mas não elimina a marca d'água/link — removê-la
completamente quebraria os termos de uso da API do YouTube.

## CSP atualizada

`script-src` e `frame-src` do `vercel.json` passaram a incluir
`https://www.youtube.com` (necessário para carregar o script da IFrame
Player API).

## Testes realizados (preview)

- Vídeo válido: player carrega, título aparece, botões com tooltip
  confirmados via árvore de acessibilidade (`aria-label` correto).
- Vídeo inválido (ID inexistente inserido diretamente no catálogo para
  forçar o teste): `onError` disparado, tela de erro própria aparece
  com a mensagem e o botão "Voltar ao catálogo" funciona, retornando
  corretamente à lista.
