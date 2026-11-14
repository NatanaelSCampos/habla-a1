# Validação de contas, sincronização e interface

14/11/2026. Os testes abaixo utilizam configuração fictícia nos emuladores e configuração `null` nos testes sem conta, sem gravar dados de teste no Firebase real. A configuração pública de `habla-9b4c7` está aplicada; o responsável confirmou banco, publicação das regras e login Google real, e autorizou a publicação da interface revisada. A homologação em aparelhos físicos e do provedor E-mail/senha permanece pendente.

## Verificações aprovadas

- `npm test`: **43 testes Node**, incluindo dez de codec/perfis e um de geração segura de configuração pública. Exercitam isolamento, alterações concorrentes, contadores por aparelho, exclusões, confirmação de revisões, quota e rejeição de dados inválidos.
- `python tests/test_generate_audio.py -v`: **7 testes Python** aprovados.
- `npm run check:site`: sintaxe, ordem de carregamento, caminhos relativos para `/habla-a1/`, 25 referências locais, 33 arquivos do cache e existência dos **5.141 MP3**.
- `npm run format:check`, `npm run check:firebase`, coleta de fontes com `--check`, validação do catálogo com `--validate-only` e `git diff --check`: aprovados.
- `npm audit --omit=dev`: nenhuma vulnerabilidade encontrada. Ferramentas de desenvolvimento têm os avisos transitivos moderados descritos em [DEVELOPMENT.md](DEVELOPMENT.md); não entram no site.

## Segurança e sincronização reais em emuladores

`npm run test:sync`, projeto fictício `demo-habla`, SDK Firebase **13.3.0**, Java portátil **21.0.13**, Authentication e Firestore locais. Rodada concluída em **Chromium** e **WebKit 26.5**, cada um com dois contextos isolados, largura móvel de 393 px e desktop de 1365 px.

Os cenários de sincronização abaixo foram ampliados com a apresentação no primeiro acesso:

1. Regras Firestore permitem o dono e bloqueiam outro UID, visitante, caminhos desconhecidos, campos extras, tipo desconhecido, tamanho excessivo, exclusão física e metadados inválidos.
2. Cadastro por e-mail e importação inicial preservam as chaves originais do aparelho.
3. Outro dispositivo recebe progresso, dúvida e caderno da mesma conta.
4. Uma atualização remota preserva a resposta em digitação e o popup de dúvida.
5. Reconexão combina exercícios diferentes e incrementos diários de dois aparelhos: histórico inicial de três tentativas, mais duas e quatro, resulta em nove.
6. Exclusões chegam ao outro aparelho; edições sucessivas do mesmo registro convergem para a última escrita.
7. Uma revisão aberta no computador pode ser retomada no celular com o texto digitado.
8. Backup JSON v2 inclui dados da conta; sair recupera o histórico sem conta.
9. Outra conta inicia vazia e isolada; quatro links de consulta são formados com codificação de caracteres, e os diálogos cabem na tela móvel.
10. Sair offline mantém as alterações pendentes daquele UID; entrar novamente as envia sem misturar o histórico de outro aluno.
11. O botão Google abre o popup do emulador em resposta ao toque; cancelar mostra orientação e mantém a apresentação obrigatória, sem marcar a entrada como concluída.
12. No primeiro acesso, a tela explica celular/computador, não oferece fechar ou pular e bloqueia Escape e a interação com o aplicativo ao fundo. A importação do histórico permanece disponível depois da entrada.
13. Uma sessão já existente confirma a novidade sem novo login. O marcador é persistido e a tela não reaparece nas próximas aberturas. Sem conexão na primeira entrada, o botão de login aguarda internet; ao reconectar, volta a funcionar. Uma conta já usada continua acessível offline.
14. A conta sincronizada oferece **Começar a estudar** como ação principal. O botão fecha o popup sem reiniciar a atividade nem apagar a resposta em andamento. O diálogo continua rolando sem barra visível.

A apresentação também foi verificada em 320 × 568 px, com tema escuro, e em desktop de 1365 × 900 px: sem excesso de largura, diálogo dentro da tela e rolagem até o backup. Capturas em `test-results/account-welcome-*.png`. O aplicativo usa `habla-a1-app-v16-red-navigation`, preservando o cache de MP3. A rodada final concluiu os 14 grupos de cenários funcionais em cada motor; o relatório WebKit registrou quatro avisos de transporte do emulador, mantendo a confirmação da sincronização.

Nenhum erro JavaScript foi capturado. Os `PERMISSION_DENIED` impressos pelo emulador são os bloqueios esperados dos testes negativos. Os testes não realizaram autenticação Google real nem enviaram e-mail real.

No Chromium, a recarga offline manteve a conta e as alterações até a reconexão. No WebKit para Windows, o Playwright retornou **erro interno na recarga offline**; a página existente e as alterações pendentes permaneceram, e a reconexão foi validada. Isso limita a confirmação de abertura offline nesse ambiente: ainda é preciso testar no Safari/iPhone real.

Nesta rodada, o WebKit Windows emitiu eventos de rede do transporte do emulador ao recarregar e interromper conexões, também apresentados pelo driver como `pageerror`. O teste registra separadamente somente a mensagem específica de acesso ao transporte `Write/Listen` em `127.0.0.1:8080`, preservando o texto integral em `transportWarnings`. Qualquer outro erro continua reprovando a rodada. Não se ignora uma falha de sincronização: a leitura, a confirmação das escritas e a convergência dos dois aparelhos continuam obrigatórias. Isso não confirma ausência desses problemas em aparelhos físicos, que seguem na homologação pendente.

Relatórios locais em `test-results/sync-browser-chromium.json` e `test-results/sync-browser-webkit.json`. Capturas e backups de teste ficam nessa pasta ignorada pelo Git.

## Regressão dos recursos existentes

Chrome/Chromium desktop e móvel e Edge desktop: 13 telas, caderno anterior, revisão com unidades 2/5/7, dúvida rápida sem perder resposta, conversação, diagnóstico, exportação/importação JSON, áudio e PWA offline passaram. Nenhum erro de JavaScript nem excesso de largura horizontal.

Os **5.141 MP3 foram decodificados no Chromium**, sem arquivos silenciosos. O player, os bancos de frases, os arquivos MP3 e o catálogo não foram alterados nesta evolução. O cache de áudio continua separado e preservado.

WebKit móvel simulado: navegação nas 13 telas, reprodução de MP3 por URL, revisão, dúvidas, conversação, diagnóstico e backup passaram. A sondagem anterior com Blob podia rejeitar mídia que funcionava por URL; o teste agora utiliza a mesma URL do player. A recarga offline e a requisição Range offline mantêm limitações do driver Windows, registradas nos resultados. Não há confirmação de PWA offline real em iPhone nesta rodada.

Com `firebase-config.js` vazio, o estudo local funciona e o SDK de autenticação não é executado. O botão de conta informa que as contas estarão disponíveis depois da ativação. O service worker guarda o bundle local para uso offline depois de configurado.

## O que falta validar com a configuração real

Atualização em 14/11/2026: a consulta `GET /v1/projects` confirmou `natanaelscampos.github.io` nos domínios autorizados de `habla-9b4c7`. A chamada `accounts:createAuthUri` com `providerId: google.com` e retorno para o endereço do Habla respondeu HTTP 200 e forneceu autorização em `accounts.google.com`, com cliente OAuth configurado. Nenhum usuário foi autenticado ou criado; não houve mudança nas configurações remotas. O domínio e a preparação do provedor Google estão confirmados; consentimento e entrada completos continuam pendentes.

Depois da criação do banco, o responsável confirmou que publicou as regras do arquivo local. A consulta anônima a um caminho reservado de teste (`users/habla-config-probe/meta/profile`) respondeu 403 `PERMISSION_DENIED`; nenhum dado de aluno foi consultado ou gravado. A consulta administrativa aos metadados respondeu 401 `CREDENTIALS_MISSING`, exigindo OAuth; não foi possível inspecionar região, edição ou conteúdo integral das regras por essa via. Um navegador Chromium isolado abriu a aplicação local com a configuração real, chegou ao estado `signedout`, mostrou o botão Google habilitado e o formulário de e-mail, sem erros JavaScript. A presença do formulário não confirma que E-mail/senha esteja habilitado no provedor. Captura: `test-results/firebase-real-config-login.png`. Nenhuma conta foi autenticada ou criada nessa verificação.

Em seguida, o responsável confirmou o login real e forneceu a captura da conta com o estado “Estudos sincronizados”. Isso confirma a entrada realizada por ele; a homologação entre dois aparelhos físicos e o domínio publicado continua pendente. A apresentação de primeiro acesso foi acrescentada após essa confirmação, sem novos cadastros no projeto real.

- Projeto Firebase, configuração pública Web, provedores Google/e-mail, domínio autorizado e regras publicadas.
- Consentimento e popup Google no domínio do Pages, em Android/Chrome, iPhone/Safari e PWA instalado.
- Entrega real de confirmação e recuperação de senha.
- Persistência após fechar/reabrir offline em aparelhos físicos e restrições de armazenamento do sistema.
- Abertura manual das quatro consultas externas; os testes locais verificam os links e não burlam proteções dos sites.
- Cotas e segurança no painel do projeto real, com dois usuários de homologação.

O [guia de ativação](FIREBASE-SETUP.md) reúne os passos e as pendências de homologação real. A autorização de incorporar o widget YouGlish não foi solicitada ao provedor; o recurso entregue usa apenas um link externo.

## Menu e identidade visual

Os testes de navegador verificam os três grupos do menu, a entrada de **Consultar espanhol**, a preservação da resposta ao abrir e fechar a consulta, a fonte Inter carregada localmente e as cores dos dois temas. Foram capturadas telas claras e escuras em larguras de 320, 850 e 1440 px, sem excesso horizontal. No desktop de 620 px de altura, a consulta manteve rolagem pela roda do mouse mesmo com a barra oculta. Os novos ícones do manifesto seguem a paleta vermelha. A fonte e os ícones entram no cache offline; os antigos ícones e MP3 permanecem disponíveis.
