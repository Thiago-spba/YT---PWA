with open("vite.config.ts", encoding="utf-8") as f:
    c = f.read()
c = c.replace(
    "registerType: 'autoUpdate',",
    "registerType: 'autoUpdate',\n      selfDestroying: true,"
)
with open("vite.config.ts", "w", encoding="utf-8") as f:
    f.write(c)
print("OK")
