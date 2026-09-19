content = open('index.html', encoding='utf-8').read()
content = content.replace('<title>YT</title>', '<title>TF Edu 🥇</title>')
content = content.replace('content="YT"', 'content="TF Edu 🥇"')
content = content.replace(
    'CatÃ¡logo de vÃ­deos do YouTube para assistir sem propaganda, com o Brave.',
    'Sua plataforma pessoal de aprendizado: cursos, vestibular, concursos e tecnologia.'
)
content = content.replace(
    'https://yt-pwa-nine.vercel.app/icons/og-image.png',
    '/icons/og-image.png'
)
open('index.html', 'w', encoding='utf-8').write(content)
print('index.html atualizado!')
