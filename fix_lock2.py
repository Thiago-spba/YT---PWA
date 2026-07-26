content = open('src/components/PlayerHost.tsx', encoding='utf-8').read()
old = 'function PipIcon() {'
new = (
    'function LockIcon({ locked }: { locked: boolean }) {\n'
    '  return locked ? (\n'
    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">\n'
    '      <rect x="3" y="11" width="18" height="11" rx="2" />\n'
    '      <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />\n'
    '    </svg>\n'
    '  ) : (\n'
    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">\n'
    '      <rect x="3" y="11" width="18" height="11" rx="2" />\n'
    '      <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 9.9-1" />\n'
    '    </svg>\n'
    '  )\n'
    '}\n\n'
    'function PipIcon() {'
)
result = content.replace(old, new, 1)
open('src/components/PlayerHost.tsx', 'w', encoding='utf-8').write(result)
print('OK - substituicoes:', content.count(old))
