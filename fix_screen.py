with open('src/components/ShortsScreen.tsx', encoding='utf-8') as f:
    content = f.read()

old = 'export default function ShortsScreen() {\n  const [startId, setStartId] = useState<string | undefined>(undefined)\n  const [mode, setMode] = useState<\'grid\' | \'immersive\'>(\'grid\')\n  if (mode === \'immersive\') {\n    return <Shorts startId={startId} onBack={() => setMode(\'grid\')} />\n  }\n  return (\n    <ShortsGrid\n      onOpen={(id) => {\n        setStartId(id)\n        setMode(\'immersive\')\n      }}\n    />\n  )\n}'

new = (
    'export default function ShortsScreen() {\n'
    '  const [startId, setStartId] = useState<string | undefined>(undefined)\n'
    '  const [startIndex, setStartIndex] = useState<number>(0)\n'
    '  const [mode, setMode] = useState<\'grid\' | \'immersive\'>(\'grid\')\n'
    '  if (mode === \'immersive\') {\n'
    '    return <Shorts startId={startId} startIndex={startIndex} onBack={() => setMode(\'grid\')} />\n'
    '  }\n'
    '  return (\n'
    '    <ShortsGrid\n'
    '      onOpen={(id, index) => {\n'
    '        setStartId(id)\n'
    '        setStartIndex(index)\n'
    '        setMode(\'immersive\')\n'
    '      }}\n'
    '    />\n'
    '  )\n'
    '}'
)

count = content.count(old)
print('ShortsScreen - ocorrencias:', count)
if count:
    content = content.replace(old, new, 1)
    with open('src/components/ShortsScreen.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK')
else:
    print('NAO ENCONTRADO')
