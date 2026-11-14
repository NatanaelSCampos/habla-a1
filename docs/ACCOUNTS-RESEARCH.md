# Contas, sincronização e consultas educacionais

Avaliação de 14/11/2026. Implementação apenas local, aguardando configuração do provedor. Não publicar antes de completar e validar o [guia de ativação](FIREBASE-SETUP.md).

## Recomendação

Usar **Firebase Authentication + Firestore Standard**, em um projeto exclusivo do Habla, começando no plano Spark. O site continua estático no GitHub Pages. A apresentação no primeiro acesso exige entrada na conta, com sessão persistente para os próximos acessos. O Firebase resolve identidade, isolamento por usuário e persistência da fila offline sem administrar um servidor. Não é necessário contratar Firebase Hosting, Functions, Storage, Clerk ou outro serviço de sincronização.

A vantagem decisiva neste aplicativo é a persistência offline do Firestore. Não é uma garantia de mesclagem semântica: edições concorrentes do mesmo documento seguem a última escrita aceita. O Habla divide os dados em registros por exercício, dúvida, resultado e preferência; atividades diárias são contribuições por aparelho. Isso permite reunir exercícios diferentes sem substituir todo o histórico de um dispositivo. [Documentação de persistência offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

## Comparação

| Opção | Gratuidade e limites consultados | GitHub Pages, Google e manutenção | Offline e adequação ao Habla |
| --- | --- | --- | --- |
| **Firebase Auth + Firestore** | Spark permite iniciar sem faturamento. Firestore: 1 GiB, 50 mil leituras/dia, 20 mil escritas/dia, 20 mil exclusões/dia, 10 GiB de saída/mês, uma base gratuita por projeto. | SDK no navegador e Google/e-mail; regras por UID no banco. Sem servidor próprio. | Cache e fila de escritas persistentes no SDK. Melhor relação entre simplicidade e requisito offline. |
| **Supabase Auth + PostgreSQL** | Free: 50 mil usuários ativos/mês, banco de 500 MB, 5 GB de saída e 1 GB de arquivos; dois projetos ativos gratuitos. Pode pausar após uma semana de inatividade. Pro a partir de US$ 25/mês. | Cliente estático e Google funcionam; RLS precisa proteger cada operação. SQL é uma vantagem para relatórios complexos futuros. | Realtime não oferece sozinho a fila durável offline. Exigiria implementação própria ou uma camada adicional. Boa segunda opção se SQL se tornar prioritário. |
| **Clerk** | Free anuncia 50 mil usuários mensais recorrentes (MRU, métrica diferente de MAU). Hobby tem duração de sessão fixa de sete dias. | Login bem acabado, Google e e-mail. Ainda precisa de outro banco e integração de autorização. | Não resolve armazenamento acadêmico nem sincronização offline. Adiciona um provedor sem resolver o principal requisito. |
| **Better Auth** | Biblioteca gratuita e aberta; infraestrutura, banco e e-mail podem ter custos próprios. | Exige um handler de autenticação em um ambiente de servidor, normalmente `/api/auth/*`, e banco. Pode ser serverless, mas Pages sozinho não executa esse handler. | Offline e banco acadêmico continuam por nossa conta. Mais manutenção do que a turma precisa. |

Fontes dos limites: [Firestore](https://firebase.google.com/docs/firestore/quotas), [planos Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Supabase](https://supabase.com/pricing), [pausa de projetos](https://supabase.com/docs/guides/platform/free-project-pausing), [Clerk](https://clerk.com/pricing) e [instalação do Better Auth](https://better-auth.com/docs/installation).

Firebase Authentication básico e Firebase Authentication com Identity Platform têm tabelas diferentes. Não se deve prometer “50 mil MAU gratuitos no Spark” indiscriminadamente: o limite de 3 mil usuários ativos/dia no Spark aparece para Authentication com Identity Platform. Esta proposta usa os provedores básicos Google e e-mail, sem telefone/SMS, MFA ou atualização para Identity Platform. Consulte [Authentication](https://firebase.google.com/docs/auth), [limites](https://firebase.google.com/docs/auth/limits) e [preços](https://firebase.google.com/pricing) antes de habilitar recursos adicionais.

No Supabase, o SMTP padrão restringe destinatários à equipe do projeto e tem limite de dois e-mails/hora. Para cadastro, confirmação e recuperação de senha da turma seria necessário configurar SMTP próprio. O login Google contorna a necessidade de enviar esses e-mails, mas não resolve a persistência offline. [Restrições oficiais de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Como estimativa, 20 alunos com 50 interações diárias e 2–3 escritas por interação representariam 2–3 mil escritas/dia, abaixo das 20 mil gratuitas. Isso não é uma medição: checkpoints, importações, listeners, número de registros existentes e frequência de estudo afetam o consumo. Não armazenar bancos públicos de frases ou MP3 no Firestore; eles continuam no Pages. Acompanhar o painel de uso antes de considerar mudar de plano.

## Estado real do armazenamento

O projeto tem formatos diferentes, que foram examinados separadamente:

| Chave original | Conteúdo |
| --- | --- |
| `habla_espanol_2026_v1` | Frases, favoritos, atividades por dia, verbos, dúvidas, rascunhos e preferências. |
| `frecuencias.a1.caderno.v2` | Respostas e resultados por exercício, notas, marcações e último exercício. |
| `habla.lab.v1` | Resultados de revisão, sessões, unidades, modalidades e avisos locais. |
| `habla.coach.v1` | Diagnósticos, conversas, unidades e preferências de assistência. |
| `habla_ui_guides_v4` | Tutorial do aparelho; continua local e não entra na sincronização. |

As sessões abertas ficavam apenas na memória. Foi acrescentado `habla.resume.v1` para guardar uma posição retomável, a sessão e seus campos de texto. Microfone e reprodução de áudio não são retomados automaticamente.

## Fluxo implementado

1. No primeiro acesso de cada navegador após a atualização, a apresentação explica a continuidade entre celular e computador. Não há botão de pular ou fechar antes de entrar e escolher o histórico. Quem já tem uma sessão salva apenas confirma a apresentação. A conclusão usa a chave local `habla.account.welcome.v1`, sem alterar dados de estudo; a tela não se repete nas próximas aberturas. A primeira entrada precisa de internet. Perfis já salvos continuam disponíveis offline. Após concluir essa apresentação, a opção explícita de sair da conta continua preservada e devolve o histórico sem conta, nas chaves originais.
2. Na primeira entrada em uma conta nova, o aluno escolhe levar o histórico local ou iniciar vazio. As chaves originais ficam intactas.
3. Se a conta já tem dados na nuvem, o aluno abre esse histórico. Não se mistura automaticamente outro histórico sem conta; ele permanece disponível ao sair e pode ser exportado.
4. Cada UID tem um perfil local separado (`habla.profile.<uid>.v1`), com dados, registros alterados e revisões pendentes em uma gravação local atômica. Trocar de conta recarrega os quatro módulos e encerra formulários da conta anterior.
5. O SDK mantém a fila persistente do Firestore. A lista local de alterações só é confirmada depois da resposta do servidor. Uma confirmação antiga não apaga uma edição feita enquanto o envio estava em andamento.
6. Atualizações recebidas mudam os dados em memória sem recriar a tela e sem perder uma resposta digitada ou o popup de dúvida. Retomar a atividade de outro aparelho exige um toque no aviso.
7. O PWA continua guardando o aplicativo e os MP3. O cache de áudio permanece `habla-a1-audio-v1`. O novo cache do aplicativo é `habla-a1-app-v15-account-welcome`, ainda não publicado.

Arquivos: `sync-data.js` transforma os formatos existentes em registros; `profile-store.js` isola perfis e preserva as chaves antigas; `app-sync.js` liga os módulos e a retomada; `accounts.js` cuida da conta e do transporte; `firestore.rules` impede acesso entre alunos. O SDK modular está empacotado em `assets/vendor/firebase-sdk.js`, sem depender de CDN durante o estudo offline.

## Conflitos e limites deliberados

- Exercícios e dúvidas diferentes são documentos diferentes; ambos permanecem quando dois aparelhos editam offline.
- Respostas do mesmo exercício, a mesma anotação ou a mesma dúvida usam a última escrita aceita pelo servidor. Não há mesclagem de caracteres nem tentativa de interpretar duas respostas conflitantes.
- Contadores diários guardam contribuições por aparelho e somam apenas os incrementos novos. Não se somam snapshots inteiros do calendário.
- Exclusões usam registros marcados, para que um aparelho que estava offline receba a exclusão. Essas marcas ocupam espaço; a escala atual dispensa um serviço de limpeza.
- O checkpoint de posição é único e também segue a última escrita; não altera a atividade aberta de outro aparelho sem confirmação por toque.
- Importação e limpeza substituem o histórico do perfil atual, inclusive na nuvem quando há conta. A confirmação informa isso. Antes dessas operações há uma cópia local de recuperação; são retidas as três últimas. JSON v2 continua aceito e exportável, agora com um campo opcional de retomada.
- São mantidos os limites existentes de histórico de sessões: até 120 na revisão, 50 diagnósticos e 80 conversas. Esta evolução não muda a política de retenção do produto.
- A primeira entrada e a recuperação em um aparelho novo exigem conexão. Um aparelho já utilizado mantém seu perfil offline. A sincronização ocorre com o aplicativo aberto; não se promete envio com o PWA fechado.

Isso evita construir uma migração histórica complexa para um aplicativo entregue há poucas horas. Se alguém já tiver dois históricos independentes, há backup e escolha explícita; não há fusão automática desses legados.

## Segurança e navegadores

O banco só aceita leituras e escritas no caminho do UID autenticado; o restante é negado. Campos, tamanho e carimbo de atualização são limitados pelas regras. Não há dados acadêmicos em coleções públicas. A configuração Web do Firebase é pública por projeto; regras e autenticação protegem os registros. Chaves Admin, credenciais de serviço, segredo OAuth e a chave Azure jamais entram no JavaScript. [Configuração e API keys Firebase](https://firebase.google.com/docs/projects/api-keys), [regras por usuário](https://firebase.google.com/docs/firestore/security/rules-conditions).

Google usa popup iniciado pelo toque do aluno. Redirecionamento móvel envolve restrições de armazenamento entre domínios; não se deve adotar redirect sem tratar essas restrições no domínio do Pages. Há alternativa por e-mail. A primeira autorização Google pode exigir escolher a conta e conceder consentimento; “um clique” não é garantido em todos os aparelhos. [Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin), [restrições de redirect](https://firebase.google.com/docs/auth/web/redirect-best-practices).

A documentação do Firestore lista Chrome, Safari e Firefox para persistência Web; Edge foi testado para os fluxos existentes e compartilha o motor Chromium. Autenticação real, popup e comportamento de armazenamento no Safari/iOS e no PWA instalado ainda dependem de testes em aparelhos reais. O cache do Firestore não é limpo automaticamente ao sair, assim como o perfil local desta implementação. O aluno é orientado a usar aparelhos de confiança; os dados não são criptografados contra quem tem acesso ao armazenamento do aparelho. [Comportamento oficial do cache](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

O WebKit inicialmente deixou uma escrita aguardando confirmação. Foram adotados `experimentalForceLongPolling` e `useFetchStreams: false` nesses navegadores, mantendo a configuração padrão no Chromium. O segundo ajuste evita o transporte Fetch cuja retenção de frames foi reproduzida pelos mantenedores no Safari 26.4+. Ele é reconhecido pelo SDK fixado no projeto e deve ser revisto ao atualizar essa dependência. As respostas curtas podem ter custo de desempenho. Isso não substitui a homologação no iPhone real. [Configuração do SDK](https://firebase.google.com/docs/reference/js/firestore.firestoresettings), [investigação oficial do problema](https://github.com/firebase/firebase-js-sdk/issues/9789).

## Integrações educacionais

O botão **Consultar palavra ou expressão** aparece nas atividades. Ao selecionar uma palavra ou preencher o campo, o aluno recebe quatro links externos. Não há chamada automática, envio de respostas/histórico, scraping, iframe ou cópia do acervo. A atividade permanece aberta. As consultas exigem conexão e estão sujeitas aos termos de cada site.

### YouGlish

Vídeos com falas reais ajudam a perceber ritmo, contexto e diferentes falantes. Há [widget oficial](https://youglish.com/api/doc/widget) e [API JavaScript](https://youglish.com/api/doc/js-api); o filtro espanhol `la` indica América Latina (`es` indica Espanha). Isso não garante apenas México nem exclui voseo em todos os exemplos.

A política de desenvolvedores exige permissão explícita para integração em aplicativos móveis. A aplicação dessa regra a PWA precisa ser confirmada com o YouGlish antes de incorporar o player. Integração comercial também exige autorização. O widget exige atribuição visível, player do YouTube integral e regras de privacidade/uso; não permite extrair nem guardar vídeos offline. [Portal e política da API](https://youglish.com/api), [termos](https://youglish.com/terms).

O plano gratuito do site anuncia 20 pesquisas/dia; isso não constitui uma licença nem uma cota garantida para API/widget. Não foi confirmado um contrato público gratuito para o REST. [Planos do site](https://subscribe.youglish.com/subscribe). Por isso, implementamos o link com filtro latino-americano; o player embutido fica para depois da autorização e da confirmação de custo/limites.

### WordReference

Consulta espanhol–português para significados e usos a partir da atividade, com acesso ao dicionário e às ferramentas do próprio site. Os [atalhos e ferramentas oficiais](https://www.wordreference.com/tools/Tools.aspx) apoiam esse tipo de consulta. Não foi confirmada uma API pública atualmente oferecida e suportada; exemplos antigos de API não são base suficiente para implementar uma integração.

O acesso normal ao site é gratuito com publicidade. A assinatura opcional para remover anúncios não equivale a uma licença de API: [WordReference Supporter](https://www.wordreference.com/docs/supporter.aspx). Não copiamos definições; os [termos](https://www.wordreference.com/english/TermsOfService.aspx) restringem coleta automatizada sem consentimento. A proteção contra bots impediu verificar entradas pelo coletor de pesquisa; testar a consulta manual em navegador real continua na lista de ativação.

### Tatoeba — integração adicional

Banco real e gratuito de frases com traduções e parte dos exemplos com voz humana. O link pesquisa espanhol com português, oferecendo exemplos para discutir com o professor. As frases não vêm classificadas automaticamente como A1, nem toda gravação informa uma variedade latino-americana.

Há [API pública v1](https://api.tatoeba.org/) e [especificação OpenAPI](https://api.tatoeba.org/openapi), úteis para uma seleção futura de exemplos. Uma futura incorporação deve preservar autor, licença e link de origem. Os textos são em geral CC BY 2.0 FR, com parte CC0; áudios têm licenças próprias e a ausência de licença não autoriza reutilização. [Downloads e licenças](https://tatoeba.org/en/downloads), [orientações de uso do corpus](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus). O link implementado não duplica o banco pedagógico nem exige manter cópias locais.

### Forvo — integração adicional

Pronúncias de palavras por pessoas reais, com identificação regional para comparar México, Colômbia e outros países. Complementa os vídeos do YouGlish com exemplos curtos. O link do site dispensa chave e assinatura de API para consulta pessoal; conferir o país do falante antes de tomar uma gravação como modelo.

A API oficial oferece filtro de país e idioma, mas é paga: Non Profit anuncia US$ 2/mês e 500 requisições/dia; Small comercial, US$ 28,95/mês e 10 mil/dia. Não há motivo para acrescentar assinatura e proteção de chave nesta turma. [API de pronúncias](https://api.forvo.com/documentation/word-pronunciations/), [preços](https://api.forvo.com/plans-and-pricing/), [termos do site](https://forvo.com/terminos-y-condiciones/). Não baixamos áudios do Forvo para o cache do PWA.

### LanguageTool — avaliado para depois

É uma ferramenta existente para revisão de escrita em espanhol. A [API HTTP pública](https://dev.languagetool.org/public-http-api.html) limita a 20 requisições/IP/minuto, 75 KB/minuto e 20 KB/requisição, proíbe requisições automatizadas e não oferece garantia de serviço. Não recomendamos acoplá-la como correção automática gratuita: exigir acordo, solução paga ou hospedagem própria acrescenta manutenção e exige avaliar privacidade dos textos. Não foi implementada nesta etapa.

## Etapas de entrega

1. **Local, implementada:** camada de perfis, apresentação com entrada obrigatória no primeiro acesso, importação inicial simples, sincronização por registros, checkpoint, regras e testes com emuladores. Consultas externas adicionadas.
2. **Configuração pelo responsável:** criar projeto Firebase, registrar app Web, habilitar provedores, configurar domínio, criar Firestore e publicar regras; fornecer somente configuração pública do app.
3. **Homologação:** testar dois usuários reais em dois aparelhos, Google, e-mail, PWA instalado, offline/reconexão e backup. Confirmar os links externos e revisar os termos aplicáveis.
4. **Publicação:** somente depois da configuração e validação, respeitando a instrução expressa de não subir agora. Não há push nem deploy incluído nesta etapa local.
5. **Acompanhamento:** observar cotas e erros da primeira turma. Avaliar incorporação autorizada do YouGlish e exemplos licenciados do Tatoeba apenas se agregarem mais valor do que as consultas externas.
