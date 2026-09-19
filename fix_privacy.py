html = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pol\u00edtica de Privacidade \u2013 TF Edu</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 2rem 1.25rem 4rem; line-height: 1.6; color: #1a1a1a; background: #fff; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; }
    p, li { font-size: 0.95rem; }
    .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
    a { color: #4c1d95; }
  </style>
</head>
<body>
  <h1>\U0001F947 TF Edu \u2013 Pol\u00edtica de Privacidade</h1>
  <p class="meta">\u00daltima atualiza\u00e7\u00e3o: 19 de setembro de 2026</p>

  <p>
    O TF Edu (dispon\u00edvel em <a href="https://tfedu.vercel.app">tfedu.vercel.app</a>)
    \u00e9 uma plataforma pessoal de aprendizado que utiliza a YouTube Data API v3
    para exibir conte\u00fado educacional como cursos, vestibular, concursos e tecnologia.
    Este aplicativo utiliza os YouTube API Services do Google.
  </p>

  <h2>Uso da YouTube API Services</h2>
  <p>
    Este app utiliza os YouTube API Services para buscar e reproduzir v\u00eddeos.
    Ao usar o TF Edu, voc\u00ea tamb\u00e9m est\u00e1 sujeito \u00e0
    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
      Pol\u00edtica de Privacidade do Google</a>.
    Voc\u00ea pode revogar o acesso do app \u00e0 sua conta Google a qualquer momento em
    <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">
      myaccount.google.com/permissions</a>.
  </p>

  <h2>Quais dados o app acessa</h2>
  <p>Quando voc\u00ea conecta sua conta do Google, o app acessa:</p>
  <ul>
    <li>Dados p\u00fablicos de v\u00eddeos do YouTube (t\u00edtulo, miniatura, canal, dura\u00e7\u00e3o)</li>
    <li>Lista de inscri\u00e7\u00f5es e playlists (somente leitura)</li>
    <li>Nome, e-mail e foto de perfil p\u00fablicos da conta Google</li>
  </ul>
  <p>
    O app n\u00e3o publica, exclui, modifica nem envia nada em nome da sua conta Google.
    O acesso \u00e9 usado apenas para exibir conte\u00fado educacional personalizado.
  </p>

  <h2>Como os dados s\u00e3o armazenados</h2>
  <p>
    Favoritos, hist\u00f3rico de v\u00eddeos assistidos, playlists e prefer\u00eancias ficam
    salvos <strong>apenas localmente</strong> no seu navegador (localStorage/IndexedDB).
    Nenhum dado pessoal \u00e9 enviado a servidores externos ou compartilhado com terceiros.
  </p>

  <h2>Cookies e tecnologias similares</h2>
  <p>
    O app usa <strong>localStorage</strong> e <strong>IndexedDB</strong> para armazenar
    prefer\u00eancias e hist\u00f3rico localmente no seu dispositivo. A reprodu\u00e7\u00e3o de v\u00eddeos
    usa o modo de privacidade avan\u00e7ada do YouTube (<code>youtube-nocookie.com</code>),
    que reduz cookies de rastreamento at\u00e9 que o v\u00eddeo seja iniciado.
  </p>

  <h2>Compartilhamento de dados</h2>
  <p>
    Nenhum dado pessoal \u00e9 vendido, alugado ou compartilhado com terceiros.
    Os dados de v\u00eddeo exibidos s\u00e3o obtidos diretamente da YouTube Data API v3
    e pertencem ao YouTube/Google.
  </p>

  <h2>Como revogar o acesso</h2>
  <p>
    Voc\u00ea pode desconectar a qualquer momento pelo pr\u00f3prio app ou diretamente
    pela sua conta Google em
    <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">
      myaccount.google.com/permissions</a>.
  </p>

  <h2>Contato</h2>
  <p>
    D\u00favidas sobre privacidade podem ser enviadas para
    <a href="mailto:thiagorpba@gmail.com">thiagorpba@gmail.com</a>.
  </p>
</body>
</html>"""

with open("public/privacidade.html", "w", encoding="utf-8") as f:
    f.write(html)
print("privacidade.html reescrito com sucesso!")
