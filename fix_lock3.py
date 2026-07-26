content = open('src/components/PlayerHost.tsx', encoding='utf-8').read()
old = '          {visual !== \'mini\' && (\n            <button\n              type="button"\n              onClick={handleTogglePip}'
new = (
    '          {visual !== \'mini\' && (\n'
    '            <button\n'
    '              type="button"\n'
    '              onClick={() => setLocked((v) => !v)}\n'
    '              title={locked ? \'Desbloquear player\' : \'Bloquear player\'}\n'
    '              aria-label={locked ? \'Desbloquear player\' : \'Bloquear player\'}\n'
    '              className={\n'
    '                locked\n'
    '                  ? \'flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white\'\n'
    '                  : visual === \'fullscreen\' ? iconButtonClassDark : iconButtonClass\n'
    '              }\n'
    '            >\n'
    '              <LockIcon locked={locked} />\n'
    '            </button>\n'
    '          )}\n'
    '          {visual !== \'mini\' && (\n'
    '            <button\n'
    '              type="button"\n'
    '              onClick={handleTogglePip}'
)
result = content.replace(old, new, 1)
open('src/components/PlayerHost.tsx', 'w', encoding='utf-8').write(result)
print('OK - substituicoes:', content.count(old))
