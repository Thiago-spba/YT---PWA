content = open('src/components/Home.tsx', encoding='utf-8').read()

# Adiciona o import
content = content.replace(
    "import { RECOMMENDED_VIDEO_IDS } from '../config/recommendedVideos'",
    "import { RECOMMENDED_VIDEO_IDS } from '../config/recommendedVideos'\nimport CategoryBar from './CategoryBar'"
)

# Adiciona o CategoryBar antes do input de busca
content = content.replace(
    '    <div className="mx-auto max-w-[1800px] p-4">\n      <div ref={boxRef}',
    '    <div className="mx-auto max-w-[1800px] p-4">\n      <CategoryBar onSelect={(query) => { setInput(query); runSearch(query) }} />\n      <div ref={boxRef}'
)

with open('src/components/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Home.tsx atualizado com CategoryBar!')
