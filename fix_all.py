import re

# ============ FIX 1: Shorts - postMessage origin ============
with open('src/components/Shorts.tsx', encoding='utf-8') as f:
    content = f.read()

old = "playerVars: { rel: 0, autoplay: 1, controls: 0, playsinline: 1, modestbranding: 1, origin: window.location.origin }"
new = "playerVars: { rel: 0, autoplay: 1, controls: 0, playsinline: 1, modestbranding: 1, origin: window.location.origin, enablejsapi: 1 }"

if old in content:
    content = content.replace(old, new, 1)
    print('Shorts: OK')
else:
    print('Shorts: NAO ENCONTRADO')

with open('src/components/Shorts.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ============ FIX 2: PlayerHost - verificar cadeado ============
with open('src/components/PlayerHost.tsx', encoding='utf-8') as f:
    ph = f.read()

if 'LockIcon' in ph and 'locked' in ph:
    print('PlayerHost cadeado: JA EXISTE')
else:
    print('PlayerHost cadeado: NAO ENCONTRADO - precisa recriar')

if 'Desbloqueie para fechar' in ph:
    print('PlayerHost bloqueio fechar: OK')
else:
    print('PlayerHost bloqueio fechar: NAO ENCONTRADO')

# ============ FIX 3: AccountPanel - verificar X ============
with open('src/components/AccountPanel.tsx', encoding='utf-8') as f:
    ap = f.read()

if 'Fechar painel' in ap:
    print('AccountPanel X: OK')
else:
    print('AccountPanel X: NAO ENCONTRADO')
