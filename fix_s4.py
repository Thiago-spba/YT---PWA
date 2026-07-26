with open("src/components/Shorts.tsx", encoding="utf-8") as f:
    c = f.read()
c = c.replace("  startId?: string\n  onBack?: () => void", "  startId?: string\n  startIndex?: number\n  onBack?: () => void")
c = c.replace("{ startId, onBack }: Props", "{ startId, startIndex = 0, onBack }: Props")
with open("src/components/Shorts.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("OK")
