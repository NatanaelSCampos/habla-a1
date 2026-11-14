# Habla · Frecuencias A1

Aplicativo pessoal de apoio às aulas de espanhol A1, com foco em **conversação, recuperação ativa e revisão espaçada**.

## Acesse
https://natanaelscampos.github.io/habla-a1/

## Recursos
- Painel de estruturas e frases com tradução opcional
- 90 verbos com treino de conjugação
- Simulações de conversas e situações do cotidiano
- Caderno interativo organizado nas dez unidades do *Frecuencias A1*
- **Caderno de Dúvidas** integrado: registre perguntas por unidade, use uma lista de pendências na aula, anote o que o professor explicou, marque como respondida ou reabra; tudo incluído no backup local.
- **Anotar dúvida em qualquer tela**: botão flutuante abre um popup sem perder o exercício; cria uma pendência no Caderno e mantém rascunhos locais.
- **Diagnóstico por habilidades**: teste flexível entre quaisquer unidades 1–10, com conjugação, vocabulário, escuta, construção e conversação; resultados por unidade/habilidade, recuperação ativa e sugestões de reforço.
- **Conversação progressiva**: aproveita 20 cenários e 103 interações originais do Habla, com níveis guiado/intermediário/desafio, resposta oral, comparação com modelos, histórico e prática das falas difíceis.
- **Revisão Inteligente**: escolha qualquer combinação das unidades 1 a 10, em qualquer dia
- Modos: diagnóstico, conjugação, transformar frases, ditado, conversação, questões do caderno, revisão de dificuldades e misto
- Autoavaliação da recuperação de memória, repetição espaçada e calendário de frequência
- Interface responsiva e instalável como PWA com cache offline

## Instalar no celular
No Chrome/Edge ou Safari, abra o site HTTPS e escolha *Instalar aplicativo* ou *Adicionar à Tela de Início*.

## Lembretes (05h, 13h, 20h)
A seção **Revisão Inteligente** permite ativar notificações locais e escolher os horários (por padrão, 05:00, 13:00 e 20:00). Elas exigem permissão e só podem ser verificadas quando o PWA está ativo, ou quando você volta a usá-lo próximo do horário. **Não há push automático em segundo plano quando o PWA está fechado**. Para entrega recorrente com o aplicativo fechado, é necessário um serviço de Web Push com infraestrutura externa, assinaturas individuais e agendamento do lado do servidor.

## Progresso e privacidade
- No primeiro acesso após a atualização, a apresentação explica como continuar entre celular e computador e exige entrar com Google ou e-mail. A sessão fica salva para os próximos acessos, inclusive offline. O histórico anterior é preservado.
- Faça backup na seção **Meu progresso**; o backup também inclui o histórico do Laboratório
- Publicação via GitHub Pages: o site é acessível por qualquer pessoa que tenha ou descubra o endereço; não é uma área restrita a amigos
- O caderno existente tem **236 atividades adaptadas** e não representa a reprodução integral literal das atividades e dos áudios dos livros originais
- A referência pedagógica é o Frecuencias A1 (Libro del estudiante e Libro de ejercicios), sem afiliação com a editora

## Estrutura do projeto
- `index.html`: estrutura da página e carregamento dos arquivos
- `assets/css/app.css`: estilos principais, responsividade e acessibilidade
- `assets/js/content.js`: estruturas, exemplos e cenários existentes
- `assets/js/verbs.js`: banco de verbos e contextos
- `assets/js/workbook.js`: banco das atividades do caderno
- `assets/js/app.js`: navegação, telas, progresso e backup
- `study-lab.js` e `study-lab.css`: revisão crescente e seleção de unidades
- `doubts.js` e `doubts.css`: caderno pessoal de dúvidas, notas da aula e filtros
- `quick-doubt.js` e `quick-doubt.css`: popup de dúvida global, integrado ao caderno
- `coach.js` e `coach.css`: diagnóstico por habilidades e conversação progressiva
- `sw.js`: cache offline e abertura do aplicativo ao tocar em uma notificação
- `manifest.webmanifest` e ícones: instalação PWA

## Evolução futura
- Complementar e revisar exercício por exercício do livro impresso com base nas fontes
- Homologar e ativar as contas e a sincronização implementadas localmente
- Backend de Web Push para avisos confiáveis com o app fechado

As atualizações do GitHub Pages podem demorar um pouco para chegar a todos os dispositivos devido à publicação e ao cache do PWA.

## Como funciona o diagnóstico
O diagnóstico alterna questões objetivas (correção baseada em respostas esperadas) com produção livre e fala (autoavaliação). Você pode selecionar qualquer combinação de unidades, repetir avaliações e acompanhar as áreas de atenção. As pontuações são **indicadores de estudo**, não certificação nem avaliação formal de pronúncia.

## Conversação progressiva
As situações são roteirizadas; não há IA em tempo real analisando o que você disse. Compare sua resposta com modelos, indique se precisou de ajuda e pratique novamente os turnos difíceis. A fala pelo microfone depende de recursos e permissões do navegador.

## Captura rápida de dúvidas
O botão **Anotar dúvida** permanece disponível em todas as páginas e abre um formulário por cima da tela atual. Ao salvar, a pergunta fica **Pendente** no Caderno de Dúvidas, onde você pode registrar a explicação do professor, marcá-la como respondida e reabri-la. O formulário guarda rascunhos locais.


## Áudio de espanhol com voz sintetizada por IA

O áudio do Habla funciona em dois níveis:

1. Se a frase tiver MP3 neural no catálogo `audio/index.json`, o aplicativo reproduz esse arquivo. Isso não depende de voz instalada no dispositivo.
2. Para frases pessoais e conteúdos novos ainda não gravados, usa como alternativa a leitura de voz do aparelho.

A biblioteca usa **Azure Speech**, com a voz mexicana **es-MX-DaliaNeural**. São 5.141 frases únicas: biblioteca, 4.320 combinações contextuais dos verbos, diálogos, revisão, frases de apoio, exemplos especiais e os 20 textos de escuta do caderno. A geração ocorre previamente; ouvir um MP3 no Pages não faz uma chamada ao Azure. Os arquivos do Kokoro anterior foram conservados para compatibilidade e recuperação.

Para ampliar a biblioteca, atualize a seleção com `npm run audio:sources`. O workflow [Gerar áudio em espanhol com Azure](https://github.com/NatanaelSCampos/habla-a1/actions/workflows/generate-audio.yml) é **manual** para evitar geração cobrável em cada push. Ele precisa dos secrets `AZURE_SPEECH_KEY` e `AZURE_SPEECH_ENDPOINT` (ou `AZURE_SPEECH_REGION`). Execute **Run workflow** com limite suficiente para concluir as pendências; a publicação só ativa um catálogo completo e validado. Confira com o professor a pronúncia, principalmente de nomes próprios e frases curtas.

Para geração local, copie `.env.example` para `.env`, configure a chave e o endpoint e execute:

```sh
npm ci
npx playwright install chromium
npm run audio:sources
npm run audio:generate
node tools/verify-audio.cjs --pending
node tools/generate-azure-audio.cjs --activate
```

O `.env` é ignorado pelo Git e nunca é carregado pelo aplicativo. `tools/generate_audio.py` permanece disponível para manutenção do gerador Kokoro anterior e validação compatível do catálogo.

`node tools/generate-azure-audio.cjs --check-access` verifica a autenticação e a disponibilidade da voz por uma consulta, sem sintetizar áudio. O Actions executa essa conferência antes de uma geração manual e quando o próprio arquivo do workflow é atualizado. Atualizar o workflow não inicia geração de MP3.

> Os MP3 disponíveis podem funcionar offline **depois de reproduzidos e armazenados no cache**. Não é garantido que toda a biblioteca esteja disponível sem internet.

O cache dos MP3 é separado dos arquivos do aplicativo. Atualizações preservam as gravações já baixadas; o navegador ainda pode remover dados por falta de espaço. Frases sem gravação dependem de uma voz em espanhol disponível no aparelho. Bloqueios de reprodução pedem um novo toque em **Ouvir**, sem impedir a continuação do estudo.

## Verificação técnica

O [relatório de auditoria do áudio](docs/AUDIO-AUDIT.md) registra a arquitetura, os problemas encontrados, a cobertura das gravações e os limites da validação.

O [guia de desenvolvimento](docs/DEVELOPMENT.md) explica a estrutura dos arquivos, os cuidados com o PWA e a validação para GitHub Pages. A [avaliação do Azure Speech](docs/AZURE-SPEECH.md) descreve quando vale a pena usá-lo para gerar gravações da turma.

Os testes não alteram o site publicado nem os dados dos estudantes:

```sh
npm ci
npm run check:site
npm run format:check
npm test
python tests/test_generate_audio.py -v
python tools/generate_audio.py --validate-only
npx playwright install chromium webkit
npm run test:browser
```

O Playwright serve o aplicativo em `/habla-a1/`, usa perfis isolados e grava os resultados em `test-results/`. A configuração inclui Edge (`msedge`), que precisa estar instalado; `BROWSERS` permite selecionar os casos `chromium-desktop`, `chromium-mobile`, `webkit-mobile` e `edge-desktop`. A emulação móvel não substitui testes em celulares reais. Limitações nativas do WebKit para Windows são identificadas separadamente nos resultados.

O gerador Azure aceita `--dry-run` para estimar a seleção sem chamar o serviço e `--max-new` para limitar uma execução. Ele reutiliza os arquivos concluídos e gera lotes de até 48 frases por pedido, separadas pelos marcadores reais do Speech SDK. MP3 e catálogo são escritos de forma atômica. O catálogo ativo só muda após a validação de todas as frases. Voz, formato e perfil participam dos nomes dos arquivos, evitando que um cache antigo sirva a voz anterior. O workflow guarda um artefato por sete dias para recuperação após interrupção ou conflito na publicação.

## Contas e sincronização

A aplicação usa Firebase Authentication + Firestore e separa o histórico de cada aluno. A primeira entrada após a atualização apresenta a sincronização e exige uma conta; depois a sessão permanece salva. Inclui importação inicial opcional, fila offline, retomada de atividade e backup JSON. O responsável confirmou o login Google no projeto configurado. A sincronização foi testada com emuladores; a homologação em dois aparelhos físicos e do provedor E-mail/senha permanece pendente.

O menu organiza os recursos em **Estudar**, **Conversar** e **Apoio à aula**, com grupos recolhíveis no computador. **Consultar espanhol**, em Apoio à aula, abre WordReference, YouGlish, Tatoeba e Forvo sem interromper a atividade. A conta também tem entrada no menu e o botão **Começar a estudar**. Os temas claro e escuro usam preto, branco e vermelho, com a fonte Inter incluída no cache offline.

- [Comparação dos provedores e integrações](docs/ACCOUNTS-RESEARCH.md)
- [Configurações que faltam e roteiro de ativação](docs/FIREBASE-SETUP.md)
- [Resultados e limites da validação local](docs/ACCOUNTS-VALIDATION.md)
- Testes locais de segurança e sincronização: `npm run test:sync` (Java 21+, sem conta Firebase real).
- Configuração pública: `npm run configure:firebase`, após preencher os campos `FIREBASE_*` do `.env.example`. Chaves Azure e credenciais Admin nunca entram no site.
