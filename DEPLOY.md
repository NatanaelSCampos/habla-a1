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
- `index.html` — plataforma integrada com treino, conjugação, simulações e exercícios do caderno adaptado.
- `manifest.webmanifest` — instalação do PWA.
- `sw.js` — cache offline.
- `icon-*.png` — ícones do aplicativo.

Material de estudo baseado no Frecuencias A1. O caderno interativo é adaptado; não reproduz integralmente os PDFs, imagens ou áudios da editora.
