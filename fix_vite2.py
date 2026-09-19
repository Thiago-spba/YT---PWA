content = open('vite.config.ts', encoding='utf-8').read()
content = content.replace("short_name: 'TF Edu \U0001F947'", "short_name: 'TF Edu'")
content = content.replace(
    "description: 'Cat\u00e1logo de v\u00eddeos do YouTube para assistir sem propaganda, com o Brave.'",
    "description: 'Sua plataforma pessoal de aprendizado: cursos, vestibular, concursos e tecnologia.'"
)
open('vite.config.ts', 'w', encoding='utf-8').write(content)
print('Corrigido!')
