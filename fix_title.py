content = open('src/components/PlayerHost.tsx', encoding='utf-8').read()
old = '            title={locked ? \'Desbloqueie para fechar\' : \'Fechar\'}\n            title="Fechar"'
new = '            title={locked ? \'Desbloqueie para fechar\' : \'Fechar\'}'
result = content.replace(old, new, 1)
open('src/components/PlayerHost.tsx', 'w', encoding='utf-8').write(result)
print('OK - substituicoes:', content.count(old))
