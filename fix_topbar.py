content = open('src/components/TopBar.tsx', encoding='utf-8').read()

content = content.replace(
    'YT\n      </span>',
    '\U0001F947 TF Edu\n      </span>'
)
content = content.replace("label: 'In\u00c3\u00ad cio'", "label: 'In\u00edcio'")
content = content.replace("'InÃ­cio'", "'In\u00edcio'")
content = content.replace("'HistÃ³rico'", "'Hist\u00f3rico'")

open('src/components/TopBar.tsx', 'w', encoding='utf-8').write(content)
print('TopBar.tsx atualizado!')
