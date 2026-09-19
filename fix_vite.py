emoji = '\U0001F947'
content = open('vite.config.ts', encoding='utf-8').read()
content = content.replace("name: 'YT'", "name: 'TF Edu " + emoji + "'")
content = content.replace("short_name: 'YT'", "short_name: 'TF Edu'")
content = content.replace(
    "description: 'CatÃ¡logo de vÃ­deos do YouTube para assistir sem propaganda, com o Brave.'",
    "description: 'Sua plataforma pessoal de aprendizado: cursos, vestibular, concursos e tecnologia.'"
)
open('vite.config.ts', 'w', encoding='utf-8').write(content)
print('vite.config.ts atualizado!')
