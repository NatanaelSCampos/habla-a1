# Publicação do Habla A1 no GitHub Pages

Site esperado: https://natanaelscampos.github.io/habla-a1/

## Ativar o GitHub Pages
1. Abra **Settings → Pages** neste repositório.
2. Em **Build and deployment / Source**, selecione **Deploy from a branch**.
3. Selecione **main** e **/(root)**, depois clique **Save**.
4. Aguarde o GitHub informar o link publicado em Settings → Pages.

## Instalar no celular
- Android/Chrome: abra a URL HTTPS, use o menu ⋮ → **Instalar aplicativo** ou **Adicionar à tela inicial**.
- iPhone/Safari: abra a URL HTTPS, use **Compartilhar → Adicionar à Tela de Início**.
- O app guarda o progresso **no navegador/dispositivo**; não há sincronização entre dispositivos. Exporte o backup pelo app antes de trocar de aparelho ou endereço.
- O primeiro acesso com internet instala o cache offline. Recursos de fala podem depender das vozes/permissões/conexão do dispositivo.

## Estrutura
- `index.html` — estrutura da página e carregamento ordenado dos arquivos.
- `assets/` — estilos, bancos de conteúdo e lógica da aplicação, publicados junto do HTML.
- `manifest.webmanifest` — instalação do PWA.
- `sw.js` — cache offline.
- `icon-*.png` — ícones do aplicativo.

Não é necessário um build para o Pages. Os caminhos permanecem relativos a `/habla-a1/`. Publique `assets/` junto dos demais arquivos; `npm run check:site` verifica referências, scripts e cache offline. O workflow **Verificar aplicativo** executa as verificações em pushes e pull requests, mantendo o modo de publicação por branch. Ele informa falhas; esse modo do Pages não espera o workflow de verificação para publicar.

Material de estudo baseado no Frecuencias A1. O caderno interativo é adaptado; não reproduz integralmente os PDFs, imagens ou áudios da editora.

## Gerar áudio com Azure

A publicação atual já contém os MP3; o Pages não precisa de acesso ao Azure nem de chaves. A geração local usa o `.env`, ignorado pelo Git. A voz do Habla é `es-MX-DaliaNeural`; uma configuração `es-ES` usada em outro projeto não altera essa escolha.

Para novas gerações no Actions, configure **Settings → Secrets and variables → Actions** com `AZURE_SPEECH_KEY` e `AZURE_SPEECH_ENDPOINT`, ou com `AZURE_SPEECH_KEY` e `AZURE_SPEECH_REGION`. Nunca inclua essas chaves nos arquivos do site. O workflow de áudio é manual, gera somente pendências e ativa apenas catálogos completos após decodificar todos os MP3. Um limite insuficiente mantém o catálogo ativo e guarda os arquivos concluídos no artefato para recuperação.
