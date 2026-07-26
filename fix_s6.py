with open("src/components/Shorts.tsx", encoding="utf-8") as f:
    c = f.read()
old = "    const sid = startIdRef.current\n    const target = sid && feedShorts.some((v) => v.id === sid) ? sid : feedShorts[0].id"
new = "    const sid = startIdRef.current\n    const idx = startIndexRef.current\n    const target = sid && feedShorts.some((v) => v.id === sid) ? sid : feedShorts[idx] ? feedShorts[idx].id : feedShorts[0].id"
print("encontrado:", old in c)
c = c.replace(old, new)
with open("src/components/Shorts.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("OK - startIndexRef count:", c.count("startIndexRef"))
