# Desenvolvimento do Habla no GitHub Pages

O Habla continua sendo uma aplicação estática de HTML, CSS e JavaScript. O Pages publica esses arquivos diretamente, sem servidor de aplicação ou etapa de compilação. Esse formato atende o uso pela turma e mantém a instalação PWA e os dados locais. A [documentação do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) descreve esse modelo de hospedagem.

## Análise e reorganização do HTML

O `index.html` anterior tinha 353.910 bytes, incluindo três blocos de CSS e um script de 307.315 bytes. Bancos de exercícios e verbos ocupavam linhas muito extensas junto das funções de navegação, progresso e backup. Isso tornava a revisão de mudanças difícil e fazia qualquer alteração exigir a atualização do documento que reunia tudo.

O HTML passou a ter 4.193 bytes. Os estilos e scripts agora são arquivos externos, formatados e armazenados separadamente pelo navegador e pelo cache do PWA. A redução do HTML representa separação de responsabilidades; os dados continuam sendo carregados. O tamanho total inicial não diminuiu na mesma proporção: a formatação acrescenta espaços para facilitar manutenção.

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura da página, metadados PWA, navegação acessível e referências aos arquivos. |
| `assets/css/app.css` | Os três blocos anteriores de estilos, mantendo sua ordem de aplicação. |
| `assets/js/content.js` | Estruturas e exemplos, expressões de apoio e cenários. |
| `assets/js/verbs.js` | `VERB_BANK`, incluindo os contextos e as pessoas gramaticais existentes. |
| `assets/js/workbook.js` | `BOOK_DATA`, com as unidades, exercícios, respostas e modelos existentes. |
| `assets/js/app.js` | Funções principais de telas, estudo, armazenamento, áudio e backup. |
| Módulos na raiz | Revisão, diagnóstico, conversação, dúvidas e reprodução de áudio. Continuam usando os mesmos dados compartilhados. |

A ordem de carregamento é explícita: conteúdo, verbos, caderno, player, aplicação e módulos complementares. Os scripts usam `defer`, permitindo que o navegador leia o HTML enquanto baixa os arquivos. Permanecem scripts clássicos para preservar o acesso aos dados e funções compartilhados pelos módulos atuais. Uma mudança futura para módulos ES deve tratar essas dependências explicitamente.

A comparação automática dos bancos antes e depois da extração confirmou textos, respostas e identificadores idênticos. As chaves de `localStorage`, o formato do backup e os MP3 existentes foram preservados. O HTML também inclui um atalho de teclado para o conteúdo principal e uma orientação quando o JavaScript está desativado.

Também foi corrigido o seletor de quantidade da revisão que ultrapassava a tela no WebKit de 390 px: os controles agora respeitam a largura das colunas. A rodada final de testes navegou pelas 13 telas iniciais sem excesso horizontal no Chromium desktop/móvel, no Edge e no WebKit móvel. Foram aprovados 20 testes Node e 7 testes Python; os bancos permaneceram idênticos e os 448 MP3 foram decodificados. Áudio e recarga offline passaram no Chromium e no Edge. O WebKit para Windows conserva as limitações nativas de mídia e simulação offline registradas na auditoria; testes em aparelhos reais continuam necessários.

## Rotina de desenvolvimento

Use `npm ci` para instalar somente as ferramentas de desenvolvimento. Para visualizar os arquivos, execute `python -m http.server 8000 --bind 127.0.0.1` na raiz e abra `http://127.0.0.1:8000/`. Os testes de navegador usam o caminho `/habla-a1/` para verificar o endereço real do Pages.

Antes de enviar mudanças:

```sh
npm run format
npm run check:site
npm run format:check
npm test
python tests/test_generate_audio.py -v
python tools/generate_audio.py --validate-only
npm run test:browser
```

O Prettier formata o HTML e os arquivos de `assets/`. O verificador do site analisa caminhos relativos, ordem dos scripts, sintaxe JavaScript, manifesto, arquivos do cache e existência dos MP3. O workflow **Verificar aplicativo** executa essas verificações e os testes do Chromium desktop/móvel em pushes de `main` e pull requests. Resultados e capturas ficam em um artefato por sete dias. A publicação atual por branch continua independente desse workflow; impedir merges com verificações pendentes exige configuração de proteção da branch.

## Atualizações e preservação dos dados

O cache da aplicação usa `habla-a1-app-v16-red-navigation` e inclui HTML, módulos, SDK, fonte e ícones. O cache de áudio continua `habla-a1-audio-v1`, preservando gravações baixadas. A instalação só ativa o novo service worker depois de baixar os arquivos necessários. Os MP3 do Azure têm URLs próprias, identificadas por provedor, voz e hash do perfil, sem sobrescrever os MP3 anteriores.

Quando criar um arquivo exigido pela aplicação, inclua-o em `ASSETS` no `sw.js` e nas referências do HTML quando necessário. Ao publicar uma nova versão do código, atualize a versão do cache da aplicação para instalar um conjunto coerente de HTML, estilos e scripts. Preserve o cache de áudio e as chaves dos dados dos alunos.

Ao editar conteúdo, mantenha os identificadores existentes. Os IDs das estruturas são derivados da posição dos grupos e exemplos; reordená-los pode alterar a associação do progresso. Prefira acrescentar novos itens com cuidado e verifique os vínculos antes de reorganizar os bancos. Exercícios do caderno mantêm seus IDs explícitos.

## Contas e interface

A arquitetura de contas está descrita em [ACCOUNTS-RESEARCH.md](ACCOUNTS-RESEARCH.md) e [FIREBASE-SETUP.md](FIREBASE-SETUP.md). Acrescenta perfis isolados e Firebase, preservando as chaves sem conta. A apresentação exige entrada no primeiro acesso e usa o marcador local `habla.account.welcome.v1`; não altere as chaves acadêmicas para reapresentá-la. A compilação do SDK de autenticação/banco ocorre com `npm run build:firebase`, e `npm run check:firebase` verifica o artefato incluído em `assets/vendor/`. O restante do site continua sendo publicado como arquivos estáticos.

Os grupos do menu são definidos em `NAV_GROUPS`, em `assets/js/app.js`. Os grupos do desktop usam `details`/`summary` com exclusividade nativa e abrem a seção da página atual. A consulta mantém o exercício e restaura o foco ao fechar. A barra de rolagem fica oculta no menu e nos diálogos, preservando rolagem por toque, roda do mouse e teclado. As cores ficam nas variáveis de `assets/css/app.css`, incluindo os aliases usados pelos módulos antigos.

A fonte [Inter](https://github.com/rsms/inter) vem do repositório oficial, com licença SIL OFL em `assets/fonts/OFL.txt`; o WOFF2 está incluído no PWA, sem requisição a serviços de fontes. O desenho vetorial dos novos ícones está em `assets/brand.svg`; suas versões PNG são usadas pelo manifesto e pelo HTML. Ícones antigos permanecem disponíveis por compatibilidade.

O bundle do fornecedor é excluído do Prettier para manter a compilação reproduzível e os avisos de licença. Os módulos novos da raiz entram em `format` e `format:check`. Testes de sincronização usam `npm run test:sync`, Java 21+ e apenas emuladores com projeto `demo-habla`; não requerem segredos do GitHub nem acesso ao Firebase real. O workflow de verificação inclui esse teste a cada publicação.

`npm audit --omit=dev` não encontrou vulnerabilidades na verificação local. Há 14 avisos moderados transitivos nas ferramentas de desenvolvimento do Firebase CLI; o `audit fix` compatível não os resolveu. Não foi aplicado o downgrade de versão principal sugerido por `--force`, nem substituição incompatível das bibliotecas internas. Essas dependências não entram no bundle do navegador. O override de `@grpc/grpc-js` mantém a versão corrigida nas ferramentas Node.

O próximo ponto de manutenção é decompor `assets/js/app.js` por funcionalidade quando houver mudanças concretas nessas telas. A separação de renderização, regras de estudo e persistência deve preservar os contratos usados pelos módulos atuais. Não é necessária uma migração de framework ou hospedagem para manter e ampliar as dez unidades.
