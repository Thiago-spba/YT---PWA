with open('src/components/Shorts.tsx', encoding='utf-8') as f:
    content = f.read()

old = (
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
new = (
    "  const startIdRef = useRef(startId)\n"
    "\n"
    "  useEffect(() => {\n"
    "    if (didInitRef.current || !loaded || feedShorts.length === 0) return\n"
    "    didInitRef.current = true\n"
    "    const sid = startIdRef.current\n"
    "    const target = sid && feedShorts.some((v) => v.id === sid) ? sid : feedShorts[0].id\n"
    "    setActiveId(target)\n"
    "    function tryScroll(attempts: number) {\n"
    "      const el = itemRefs.current.get(target)\n"
    "      if (el) {\n"
    "        el.scrollIntoView({ block: 'start' })\n"
    "      } else if (attempts > 0) {\n"
    "        setTimeout(() => tryScroll(attempts - 1), 150)\n"
    "      }\n"
    "    }\n"
    "    requestAnimationFrame(() => tryScroll(10))\n"
    "  }, [loaded, feedShorts])"
)

count = content.count(old)
print('scroll fix - ocorrencias:', count)
if count:
    content = content.replace(old, new, 1)
    with open('src/components/Shorts.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK')
else:
    print('NAO ENCONTRADO')
