# Incidente: descompasso de deploy expôs a chave da YouTube Data API

**Data:** 2026-07-10
**Severidade:** Alta (chave de API pública exposta em produção)
**Status:** Resolvido

## Resumo

A refatoração que eliminou `VITE_YOUTUBE_API_KEY` do front-end (migração para
um proxy server-side, `api/youtube.ts`) foi commitada e enviada ao GitHub
(`bb39fa2`), mas o ambiente de **Production** na Vercel não foi promovido
automaticamente para esse build. Usuários continuaram recebendo, por um
período, o bundle JS anterior — que ainda chamava
`https://www.googleapis.com/youtube/v3/search` diretamente do navegador com
a chave antiga embutida — resultando em erros `429` e na chave
permanecendo publicamente visível a qualquer pessoa que inspecionasse o
site.

## Linha do tempo

1. Implementada a migração da busca do YouTube para uma Vercel Function
   (`api/youtube.ts`), cache local (24h) e circuit breaker de cota
   (`src/lib/youtubeCache.ts`), e correção do parâmetro `origin` no player —
   commit `bb39fa2`, enviado para `origin/master`.
2. **Detecção:** relato de que a barra de busca continuava chamando
   `googleapis.com/youtube/v3/search` diretamente, com a chave antiga
   exposta, e erros `429` em produção.
3. **Investigação:** varredura completa do código-fonte (`grep` por
   `googleapis.com/youtube` e `VITE_YOUTUBE_API_KEY`) não encontrou nenhuma
   chamada direta remanescente relacionada à busca — o código em
   `origin/master` já estava correto.
4. **Causa raiz identificada** via `vercel ls` / `vercel inspect`: o deploy
   mais recente do commit `bb39fa2` havia sido criado como **Preview**, não
   como **Production**. O deployment de Production ativo no domínio
   principal era anterior à correção (criado ~14h antes da checagem, ou
   seja, antes do fix chegar ao ar).
5. **Confirmação da exposição:** o bundle JS servido pelo domínio de
   produção nesse período era o build antigo — contendo a chamada direta à
   API do Google e a chave `VITE_YOUTUBE_API_KEY` em texto claro (qualquer
   variável `VITE_*` é embutida no JavaScript entregue ao navegador).

## Causa raiz

O push para `master` gerou um novo build na Vercel, mas esse build não foi
automaticamente promovido ao alias de produção — ficando disponível apenas
como uma URL de Preview. O domínio de produção continuou servindo o
deployment anterior até uma promoção manual.

## Remediação

1. **Promoção manual do build correto:** `vercel promote` no deployment de
   Preview que já continha o commit `bb39fa2`, forçando um rebuild com as
   variáveis de ambiente de Production (`target: production`).
2. **Auditoria do bundle em produção:** download do JS servido por
   `https://yt-pwa-nine.vercel.app` e busca por `googleapis.com/youtube` e
   pelo padrão de chave `AIza...` — nenhuma ocorrência encontrada após a
   promoção, confirmando que o proxy (`/api/youtube`) está em uso e nenhuma
   chave está embutida no cliente.
3. **Teste funcional do proxy em produção:** `GET /api/youtube?endpoint=search&q=...`
   respondeu `200` com dados reais do YouTube, confirmando `YOUTUBE_API_KEY`
   configurada corretamente no servidor.
4. **Remoção da variável obsoleta:** `VITE_YOUTUBE_API_KEY` removida das
   Environment Variables de Production na Vercel (o código não lê mais essa
   variável desde `bb39fa2`; mantê-la apenas gerava confusão).
5. **Rotação preventiva da chave:** como a chave antiga esteve
   publicamente visível no bundle enquanto o deploy desatualizado estava no
   ar, ela foi considerada comprometida por precaução. Uma nova chave foi
   gerada no Google Cloud Console e configurada em `YOUTUBE_API_KEY` na
   Vercel; a chave antiga deve ser revogada/apagada no Google Cloud Console
   caso ainda não tenha sido.

## Impacto

- Exposição pública de uma chave de API restrita por HTTP referrer (não uma
  credencial de acesso a dados de usuário) por, no mínimo, o intervalo entre
  a criação do deployment de Production anterior e a promoção manual do fix
  (observado como ≥14h no momento da investigação).
- Erros `429` para usuários finais durante a janela em que o bundle antigo
  (sem cache/circuit breaker) esteve ativo.
- Nenhuma evidência de exfiltração de dados de usuário — a chave exposta é
  de uso restrito ao domínio do app e à YouTube Data API v3 (leitura
  pública de vídeos), não concede acesso a contas Google de terceiros.

## Ações de acompanhamento

- [ ] Verificar nas configurações do projeto na Vercel (Git Integration)
  qual branch está definida como "Production Branch" e se o deploy
  automático para Production a partir de `master` está habilitado —
  para que um `git push` normal não gere apenas um Preview no futuro.
- [ ] Confirmar no Google Cloud Console que a chave antiga foi
  revogada/apagada (não só substituída) e que a nova chave está restrita
  por referenciador HTTP ao domínio de produção, por `docs/seguranca-chaves-api.html`.
- [ ] Considerar um passo de verificação pós-deploy (smoke test) que
  confirme, após cada promoção a Production, que o bundle servido não
  contém `googleapis.com/youtube` nem padrões de chave (`AIza...`).
