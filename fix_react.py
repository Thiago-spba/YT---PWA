content = open('src/components/CategoryBar.tsx', encoding='utf-8').read()
content = content.replace("import React from 'react'\n\n", "")
open('src/components/CategoryBar.tsx', 'w', encoding='utf-8').write(content)
print('Corrigido!')
