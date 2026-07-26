content = open('src/components/AccountPanel.tsx', encoding='utf-8').read()
old = '{needsPinToView ? ('
new = (
    '<div className="mb-3 flex items-center justify-between">\n'
    '              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Configuracoes</span>\n'
    '              <button type="button" onClick={closePanel} aria-label="Fechar painel" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">\n'
    '                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>\n'
    '              </button>\n'
    '            </div>\n'
    '            {needsPinToView ? ('
)
result = content.replace(old, new, 1)
open('src/components/AccountPanel.tsx', 'w', encoding='utf-8').write(result)
print('OK - substituicoes:', content.count(old))
