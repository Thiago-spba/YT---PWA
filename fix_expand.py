with open('api/search-expand.ts', encoding='utf-8') as f:
    content = f.read()

old = (
    "    const response = await client.messages.create({\n"
    "      model: 'claude-haiku-4-5',\n"
    "      max_tokens: 200,\n"
    "      system: SYSTEM_PROMPT,\n"
    "      messages: [{ role: 'user', content: query }],\n"
    "      output_config: {\n"
    "        format: {\n"
    "          type: 'json_schema',\n"
    "          schema: {\n"
    "            type: 'object',\n"
    "            properties: {\n"
    "              terms: { type: 'array', items: { type: 'string' } },\n"
    "            },\n"
    "            required: ['terms'],\n"
    "            additionalProperties: false,\n"
    "          },\n"
    "        },\n"
    "      },\n"
    "    })"
)
new = (
    "    const response = await client.messages.create({\n"
    "      model: 'claude-haiku-4-5-20251001',\n"
    "      max_tokens: 200,\n"
    "      system: SYSTEM_PROMPT + ' Responda APENAS com JSON no formato {\"terms\": [\"termo1\", \"termo2\"]}.',\n"
    "      messages: [{ role: 'user', content: query }],\n"
    "    })"
)
count = content.count(old)
print('search-expand fix - ocorrencias:', count)
if count:
    content = content.replace(old, new, 1)
    with open('api/search-expand.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK')
else:
    print('NAO ENCONTRADO - verificar manualmente')
