with open("src/components/Shorts.tsx", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    "const startIdRef = useRef(startId)",
    "const startIdRef = useRef(startId)\n  const startIndexRef = useRef(startIndex)"
)
with open("src/components/Shorts.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("OK - count:", c.count("startIndexRef"))
