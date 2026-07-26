content = open('src/components/PlayerHost.tsx', encoding='utf-8').read()
old = '  const [pipActive, setPipActive] = useState(false)'
new = (
    '  const [locked, setLocked] = useState(false)\n'
    '  const [pipActive, setPipActive] = useState(false)'
)
result = content.replace(old, new, 1)
open('src/components/PlayerHost.tsx', 'w', encoding='utf-8').write(result)
print('OK - substituicoes:', content.count(old))
