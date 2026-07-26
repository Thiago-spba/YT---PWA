content = open('src/components/PlayerHost.tsx', encoding='utf-8').read()
old = '          <button\n            type="button"\n            onClick={onClose}'
new = (
    '          <button\n'
    '            type="button"\n'
    '            onClick={() => { if (!locked) onClose() }}\n'
    '            title={locked ? \'Desbloqueie para fechar\' : \'Fechar\'}'
)
result = content.replace(old, new, 1)
open('src/components/PlayerHost.tsx', 'w', encoding='utf-8').write(result)
print('OK - substituicoes:', content.count(old))
