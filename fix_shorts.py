# FIX 1: Shorts - sempre comecar pelo video clicado
with open('src/components/Shorts.tsx', encoding='utf-8') as f:
    content = f.read()

old = "  useEffect(() => {\n    if (didInitRef.current || !loaded || feedShorts.length === 0) return\n    didInitRef.current = true\n    const target = startId && feedShorts.some((v) => v.id === startId) ? startId : feedShorts[0].id\n    setActiveId(target)\n    requestAnimationFrame(() => {\n      itemRefs.current.get(target)?.scrollIntoView({ block: 'start' })\n    })\n  }, [loaded, feedShorts, startId])"

new = (
    "  useEffect(() => {\n"
    "    if (didInitRef.current || !loaded || feedShorts.length === 0) return\n"
    "    didInitRef.current = true\n"
    "    const target = startId && feedShorts.some((v) => v.id === startId) ? startId : feedShorts[0].id\n"
    "    setActiveId(target)\n"
    "    requestAnimationFrame(() => {\n"
    "      const el = itemRefs.current.get(target)\n"
    "      if (el) {\n"
    "        el.scrollIntoView({ block: 'start' })\n"
    "        setTimeout(() => el.scrollIntoView({ block: 'start' }), 100)\n"
    "        setTimeout(() => el.scrollIntoView({ block: 'start' }), 300)\n"
    "      }\n"
    "    })\n"
    "  }, [loaded, feedShorts, startId])"
)

count = content.count(old)
print('Shorts scroll fix - ocorrencias:', count)
if count:
    content = content.replace(old, new, 1)
    with open('src/components/Shorts.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Shorts: OK')

# FIX 2: Shorts - autoplay nao mutado (comecar com som ativavel)
with open('src/components/Shorts.tsx', encoding='utf-8') as f:
    content = f.read()

old = "  const [muted, setMuted] = useState(true)"
new = "  const [muted, setMuted] = useState(false)"
count = content.count(old)
print('Shorts muted fix - ocorrencias:', count)
if count:
    content = content.replace(old, new, 1)
    with open('src/components/Shorts.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Shorts muted: OK')
