import subprocess

vars = [
    ("VITE_FIREBASE_AUTH_DOMAIN", "tfedu-325a5.firebaseapp.com"),
    ("VITE_FIREBASE_PROJECT_ID", "tfedu-325a5"),
    ("VITE_FIREBASE_STORAGE_BUCKET", "tfedu-325a5.firebasestorage.app"),
    ("VITE_FIREBASE_MESSAGING_SENDER_ID", "720512626686"),
    ("VITE_FIREBASE_APP_ID", "1:720512626686:web:d5e8a6e8f4e33776011aaf"),
]

for name, value in vars:
    result = subprocess.run(
        ["npx", "vercel", "env", "add", name],
        input=f"Config\n{value}\nProduction, Preview, Development\n",
        capture_output=True, text=True
    )
    print(f"{name}: {'OK' if 'Added' in result.stdout else 'ERRO'}")
    print(result.stdout[-100:] if result.stdout else result.stderr[-100:])
