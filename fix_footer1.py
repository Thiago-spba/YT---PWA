content = open('src/components/Footer.tsx', encoding='utf-8').read()

# Corrige o nome YT no rodape
content = content.replace(
    '<strong className="text-neutral-700 dark:text-neutral-200">YT</strong>',
    '<strong className="text-neutral-700 dark:text-neutral-200">\U0001F947 TF Edu</strong>'
)

# Corrige o traco quebrado apos YT
content = content.replace(
    '\u00e2\u20ac\u201c {year}',
    '\u2013 {year}'
)
content = content.replace(
    'â\x80\x93 {year}',
    '\u2013 {year}'
)

open('src/components/Footer.tsx', 'w', encoding='utf-8').write(content)
print('Footer nome atualizado!')
