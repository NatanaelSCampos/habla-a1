# Ativar contas e sincronização do Habla

O aplicativo continua hospedado no GitHub Pages; somente contas e histórico usam Firebase. Não é necessário configurar Firebase Hosting nem enviar MP3 ao Firebase. Os passos abaixo também servem para configurar outro projeto.

O primeiro acesso de cada navegador após a atualização apresenta a sincronização entre celular e computador e exige entrar na conta antes de estudar. A sessão fica salva e a apresentação não se repete depois de concluída. Quem já tinha entrado apenas confirma a novidade. O primeiro login exige conexão; contas já utilizadas continuam funcionando offline. A apresentação mantém o backup do histórico anterior acessível.

**Andamento em 14/11/2026:** a configuração Web de `habla-9b4c7` está aplicada em `firebase-config.js`. A consulta confirmou `natanaelscampos.github.io` nos domínios autorizados e a geração da autorização Google. O responsável confirmou a criação do banco, a publicação de `firestore.rules` e a entrada real com Google, mostrando a conta com “Estudos sincronizados”. A consulta sem login ao caminho de teste do Firestore foi bloqueada como esperado. O conteúdo integral das regras e a região não foram inspecionados administrativamente, pois isso exige OAuth. A apresentação de primeiro acesso e a sincronização foram testadas nos emuladores. O responsável autorizou a publicação com a nova interface. Ainda é preciso confirmar E-mail/senha e validar a sincronização entre aparelhos físicos. Não é necessário colar novamente o código do console nem adicionar Analytics.

## 1. Criar um projeto exclusivo

No [Firebase Console](https://console.firebase.google.com/), crie um projeto para o Habla, separado do outro SaaS. Comece no plano Spark; não é necessário habilitar Analytics para esta implementação.

Em **Configurações do projeto → Geral → Seus apps → Web (`</>`)**, registre o Habla. Copie a configuração do app Web, que contém `apiKey`, `authDomain`, `projectId` e `appId` (e, opcionalmente, `messagingSenderId`). Não crie uma chave Admin ou baixe uma conta de serviço para colocar no site.

## 2. Habilitar login

Em **Authentication → Método de login**, habilite:

- **Google**: selecione nome público e e-mail de suporte. Complete eventual tela de consentimento solicitada pelo console. Sem restrição a uma organização Google Workspace.
- **E-mail/senha**: habilite para permitir alternativa ao popup Google. O código inclui cadastro, confirmação de e-mail e recuperação de senha. Configure a política de senha com mínimo de oito caracteres e confira os modelos de e-mail.

Em **Authentication → Configurações → Domínios autorizados**, adicione `natanaelscampos.github.io` (somente host, sem `https://` nem `/habla-a1/`). Adicione `localhost` e `127.0.0.1` apenas se for testar contra o projeto real nesses hosts; os emuladores locais dispensam isso.

Confira que a configuração `authDomain` continua sendo a fornecida pelo Firebase (`SEU-PROJETO.firebaseapp.com`). Este código usa `signInWithPopup`, iniciado pelo toque. Não alterar para redirect sem tratar o armazenamento entre domínios descrito nas [boas práticas oficiais](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## 3. Criar o Firestore e aplicar regras

Em **Firestore Database**, crie a base **Standard**, ID **`(default)`**, em modo de produção. Escolha uma região próxima dos alunos, considerando disponibilidade e preços antes de confirmar; a localização do banco não é uma preferência que se troca livremente depois.

Na aba **Regras**, copie o conteúdo integral de [`firestore.rules`](../firestore.rules), revise e clique em **Publicar**. Não use regras que liberam `read, write: if true`. Não é necessário criar índices compostos: o cliente consulta somente os registros do próprio UID, sem filtros compostos.

Alternativa para quem usa CLI, executada **somente na etapa de configuração autorizada**:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project SEU_PROJECT_ID
```

Esses comandos não foram executados contra um projeto real nesta entrega. O `firebase.json` versionado configura regras e emuladores, sem alterar a hospedagem Pages.

## 4. Fornecer a configuração pública

Você pode fornecer o objeto `firebaseConfig` do console ou preencher no `.env` ignorado pelo Git:

```dotenv
FIREBASE_API_KEY=valor_publico_do_app_web
FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_APP_ID=1:numero:web:identificador
FIREBASE_MESSAGING_SENDER_ID=numero_opcional
```

Então executar:

```sh
npm run configure:firebase
```

O gerador escreve **somente esses campos permitidos** em `firebase-config.js`. Ele não publica nem copia o `.env`, não inclui `AZURE_SPEECH_KEY` e não inclui credenciais privadas. A configuração Web é pública; os dados são protegidos por Authentication e pelas regras do banco. As chaves Azure continuam privadas e independentes.

Revise as restrições da API key no Google Cloud conforme as [orientações Firebase](https://firebase.google.com/docs/projects/api-keys). Não reutilize a mesma chave para APIs Google cobradas que não são usadas pelo Habla. A verificação opcional App Check pode ser avaliada depois; não está habilitada nem é requisito oculto desta implementação.

Para esta integração **não é preciso criar secrets Firebase no GitHub Actions**. Os testes usam um projeto fictício `demo-habla`, e o site recebe configuração pública. Os secrets Azure existentes continuam atendendo apenas à geração de áudio.

## 5. Testar antes de publicar

Validação local sem chaves, usando Node 24.12+ (npm 11+) e Java 21+:

```sh
npm ci
npx playwright install chromium
npm run check:site
npm run check:firebase
npm test
npm run test:sync
```

`test:sync` inicia Authentication e Firestore em `127.0.0.1:9099` e `127.0.0.1:8080`, testa as regras e abre dois dispositivos isolados no Playwright. Não usa seu projeto, a chave Azure nem dados de produção. O primeiro uso baixa o emulador oficial. `JAVA_HOME` precisa apontar para Java 21+; no PowerShell, use `npm.cmd` se a política de execução bloquear `npm.ps1`.

O SDK local já está incluído no projeto. Se atualizar a dependência Firebase, executar `npm run build:firebase` e conferir `npm run check:firebase`; essa compilação é de desenvolvimento, não um servidor obrigatório para o Pages.

Roteiro de homologação em aparelhos físicos, depois da configuração real:

1. Fazer backup JSON do histórico de um aparelho de teste.
2. Entrar com Google e importar esse histórico para uma conta nova. Conferir caderno, dúvidas, revisões, diagnósticos e calendário.
3. Entrar na mesma conta em outro aparelho e abrir o histórico da nuvem.
4. Estudar offline, fechar/reabrir o PWA, reconectar e confirmar o envio.
5. Editar exercícios diferentes nos dois aparelhos, inclusive offline. Editar o mesmo registro e conferir a regra de última escrita aceita.
6. Entrar em outra conta e confirmar o isolamento. Sair e conferir o retorno ao histórico sem conta.
7. Testar cadastro, confirmação e recuperação de senha com entrega real de e-mail.
8. Testar Google no Android/Chrome, iPhone/Safari e PWA instalado. O emulador não valida consentimento OAuth real, bloqueio de popup nem políticas de armazenamento desses aparelhos.
9. Abrir WordReference, YouGlish com filtro latino-americano, Tatoeba e Forvo em navegador real. Os testes locais verificam a formação dos links, sem automatizar consultas aos sites.
10. Conferir uso e eventuais erros no Firebase Console.

## Pendências e publicação

Projeto, configuração Web, domínio e Google já foram conferidos; banco e regras foram confirmados pelo responsável, que também validou o login Google e autorizou a publicação. Não é necessária nova configuração no GitHub para esta interface. Confirmar E-mail/senha e concluir o roteiro em aparelhos físicos; os testes locais não substituem essa homologação.

O YouGlish está implementado como link. Incorporar seu player no PWA depende de confirmar permissão e limites junto ao provedor; isso não impede usar a consulta externa atual.

Perfis locais e o cache offline permanecem no aparelho depois de sair. Não usar contas em computadores compartilhados sem gerenciar os dados do navegador. Backups também contêm informações pessoais e devem ser guardados com cuidado. A aplicação não apaga automaticamente uma conta no provedor nem faz uma mesclagem automática de dois históricos locais independentes.
