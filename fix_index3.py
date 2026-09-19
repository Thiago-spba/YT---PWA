emoji = '\U0001F947'
title = 'TF Edu ' + emoji
desc = 'Sua plataforma pessoal de aprendizado: cursos, vestibular, concursos e tecnologia.'

html = f'''<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icons/icon-192.png" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#4c1d95" />
    <meta name="description" content="{desc}" />
    <title>{title}</title>
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:image" content="/icons/og-image.png" />
    <meta property="og:url" content="https://tfedu.vercel.app" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{desc}" />
    <meta name="twitter:image" content="/icons/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>'''

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Titulo salvo:', title)
