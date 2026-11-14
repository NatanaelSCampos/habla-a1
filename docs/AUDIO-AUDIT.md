# Auditoria do áudio e estado técnico do Habla A1

Auditoria de 14 de novembro de 2026, inicialmente sobre o commit `7133d25`, atualizada após a publicação. O aplicativo existente foi mantido. As correções de concorrência, recuperação e cache foram publicadas no commit `e06930a`. O workflow gerou as 248 gravações restantes sem falhas e publicou o catálogo completo de 448 frases no commit `846b25d`. A confirmação em Android e iPhone reais e a aprovação pedagógica da pronúncia continuam pendentes.

## Arquitetura e dados existentes

O Habla é uma aplicação estática de HTML, CSS e JavaScript, sem framework, backend ou compilação. O `index.html` contém o layout, a navegação por substituição do conteúdo de `#app`, os bancos pedagógicos e as funções compartilhadas. Os módulos carregados com `defer` usam esses dados e funções globais.

| Componente | Funcionamento observado |
| --- | --- |
| `index.html` | 160 estruturas e 481 exemplos, 90 verbos e 4.320 combinações contextuais, 236 exercícios nas dez unidades, 20 cenários e 103 turnos. Inclui biblioteca, conjugação, prática, simulações, calendário, preferências e backup. |
| `study-lab.js` e CSS | Revisão com seleção combinável de unidades. Usa `VERB_BANK` e `verbalSentence()`, parte de `BOOK_EX` e perguntas próprias em `dialogueData`. Não compartilha exatamente o mesmo esquema de dados do diagnóstico. |
| `coach.js` e CSS | Diagnóstico das cinco habilidades e conversação progressiva. Reaproveita verbos, exercícios e cenários, com associação de cenários a unidades. Respostas abertas e fala dependem de modelos e autoavaliação. |
| `doubts.js` e CSS | Dúvidas, filtros, explicação do professor e estados pendente/respondida. Guarda os registros no objeto principal `data`. |
| `quick-doubt.js` e CSS | Janela sobre a atividade atual, com rascunho, contexto, controle de foco e retorno à atividade. Salvar uma dúvida não substitui o formulário do exercício. |
| `audio-player.js` | Reprodução centralizada de MP3 e alternativa com `speechSynthesis`. Não analisa pronúncia nem reconhece respostas. |
| `sw.js` e manifesto | Instalação PWA, arquivos offline, cache de gravações e abertura de notificações. Os lembretes do laboratório dependem do aplicativo ativo; não há push com o app fechado. |
| Gerador e workflow | Kokoro 0.9.4 em CPU, voz `ef_dora`, áudio mono de 24 kHz convertido para MP3 de 48 kbps. Modelo executado fora do celular. |

As chaves existentes foram preservadas:

| Chave de armazenamento | Conteúdo |
| --- | --- |
| `habla_espanol_2026_v1` | Progresso, favoritos, atividades, frases pessoais, dúvidas e rascunhos, preferências e histórico de conjugação. |
| `frecuencias.a1.caderno.v2` | Respostas, resultados, marcações de revisão, notas e último exercício. |
| `habla.lab.v1` | Unidades, resultados, sessões e lembretes da revisão. |
| `habla.coach.v1` | Preferências, diagnósticos e histórico de conversas. |
| `habla_ui_guides_v4` | Tutorial e ajuda por tela. |

O backup JSON atual tem versão 2 e inclui os estados principal, caderno, guias, revisão e diagnóstico/conversação. Nenhuma migração de armazenamento foi introduzida. Os bancos pedagógicos, identificadores de exercícios e mecanismos de importação/exportação permanecem iguais.

## Estado inicial do áudio

No início da auditoria, o catálogo tinha **200 entradas**, todas com arquivo físico correspondente, totalizando **2.379.624 bytes**, e **248 frases pendentes** na seleção de 448. Os 200 MP3 iniciais foram decodificados em Chromium: nenhum arquivo silencioso, durações entre 1 e 2,95 segundos. Isso verifica integridade e presença de sinal; não equivale a aprovação da pronúncia.

O catálogo inicial atendia 98 dos 103 turnos de pergunta dos cenários, contando os turnos que repetem perguntas. **Nenhum dos 20 textos de escuta do caderno estava gravado**, embora todos estivessem em `audio/sources.json`. A publicação posterior completou a seleção, incluindo os 20 textos do caderno. As combinações dinâmicas de conjugação e as frases pessoais ainda podem depender da síntese do aparelho. A seleção de 448 frases não cobre todo o conteúdo possível do aplicativo.

O caminho das chamadas foi conferido: botões gerais e do caderno chamam `speak()`; o laboratório chama essa mesma função em `lab-listen`; o diagnóstico e a conversação passam por `listen()` em `coach.js`, que chama `speak()`. A segunda implementação de síntese presente em `speak()` foi removida. A reprodução agora pertence exclusivamente a `HablaAudio`. O reconhecimento pelo microfone é outro recurso, feito por `SpeechRecognition` quando disponível.

Os [logs da geração bem-sucedida](https://github.com/NatanaelSCampos/habla-a1/actions/runs/43594252453) registram 200 arquivos gerados e zero falhas. O [Pages publicou o commit correspondente](https://github.com/NatanaelSCampos/habla-a1/actions/runs/43594961066). Duas execuções anteriores falharam ao enviar commits, com rejeição `fetch first`: [primeira execução examinada](https://github.com/NatanaelSCampos/habla-a1/actions/runs/43593778405) e [execução seguinte](https://github.com/NatanaelSCampos/habla-a1/actions/runs/43594176494). Nessas duas, a síntese havia terminado com sucesso. A publicação foi confirmada pelos registros do Actions; o acesso HTTP direto ao domínio do Pages falhou neste ambiente, impedindo uma conferência adicional do arquivo servido em produção.

## Problemas por prioridade e correções

| Prioridade | Problema inicial | Correção ou pendência |
| --- | --- | --- |
| Alta | Cache genérico tentava guardar respostas parciais 206; não montava intervalos solicitados pelo navegador. | MP3 são obtidos completos, guardados como 200 e servidos como 206 para intervalos válidos, incluindo sufixos e intervalos abertos. Intervalos impossíveis recebem 416. O [Chrome documenta a necessidade desse tratamento para mídia em cache](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video). |
| Alta | Atualizar a versão do cache apagava as gravações já baixadas. | Cache persistente de áudio separado do cache do aplicativo. A ativação migra MP3 completos do cache antigo antes de removê-lo. Falta de espaço conserva o cache antigo e não impede reprodução online. Não altera `localStorage`. |
| Alta | Evento de erro e rejeição de `play()` podiam iniciar a alternativa duas vezes; uma mídia com falha não era completamente liberada. | Controle por requisição, proteção contra callbacks antigos, liberação de mídia e apenas uma alternativa por falha. Novos toques cancelam a frase anterior, inclusive durante carregamento do catálogo. |
| Alta | Falta de cobertura neural deixa aparelhos sem voz espanhola sem áudio para parte do conteúdo. | O workflow gera até 450 pendências por padrão e concluiu a seleção atual: **448 gravações publicadas**, incluindo os 20 textos do caderno. Frases pessoais e outras combinações continuam sujeitas à disponibilidade de voz no aparelho. |
| Média | Toque durante carregamento do catálogo desviava diretamente para a voz do aparelho; falha inicial do catálogo não era retomada. | Primeiro pedido aguarda a carga, com prazo limitado. Falhas permitem nova tentativa no próximo toque ou ao voltar à rede. |
| Média | Bloqueios de permissão eram tratados como qualquer erro de arquivo. | Bloqueio de `play()` pede um novo toque, preservando a preferência pelo MP3. [A permissão depende do navegador e da interação do usuário](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play); depois de uma espera assíncrona, um novo toque pode ser necessário. |
| Média | Síntese podia usar idioma inadequado ou ficar silenciosa sem feedback. | Consulta as vozes no momento de cada reprodução, prioriza espanhol latino-americano e evita selecionar voz portuguesa. Lista ainda vazia permite tentativa com `es-MX`; ausência de início recebe aviso após dez segundos. Vozes carregadas mais tarde são usadas no próximo toque, conforme o comportamento descrito para [`voiceschanged`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event). |
| Média | Troca de atividade podia deixar a fala anterior tocando; microfone podia captar a pergunta sintetizada. | Renderização de uma nova tela/estado encerra a reprodução. Iniciar o microfone também interrompe o áudio. A janela de dúvida rápida preserva a atividade atual. |
| Média | Gerador considerava a existência do arquivo suficiente, não recuperava entradas perdidas e aceitava falhas parciais como sucesso. | Validação de tamanho e caminhos, reconciliação de arquivos completos, escrita atômica de MP3 e catálogo, salvamento após cada sucesso, código de erro para qualquer falha e comando `--validate-only` sem modelo. |
| Média | Checkout raso e publicação frágil; falha de solicitação ao Pages era escondida. | Checkout completo de `main`, restrição à branch principal, tentativas sem force push, aborto explícito em conflito, artefato recuperável por sete dias e erro visível se o Pages rejeitar a atualização. Instala PyTorch para CPU. |
| Baixa | WebKit em 390 px apresentou excesso horizontal de 4 px na revisão. | Registrado para ajuste posterior de responsividade; os estilos existentes não foram alterados nesta correção. |

O player mostra carregamento e reprodução em uma região acessível, aplica a velocidade escolhida e mantém o exercício utilizável após falhas. O cache do HTML usa a mesma versão instalada dos scripts, reduzindo mistura de versões. As URLs permanecem relativas e foram testadas sob `/habla-a1/`.

## Pronúncia e escolha do modelo

Kokoro continua sendo uma opção aberta, sem contratação de serviço de voz ou inclusão de chave de API no site. Entretanto, o [catálogo oficial de vozes](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) identifica espanhol genericamente. O [pipeline do projeto](https://raw.githubusercontent.com/hexgrad/kokoro/main/kokoro/pipeline.py) associa `lang_code='e'` ao fonemizador `es`; não declara uma variante latino-americana para `ef_dora`. **Não há base para considerar essa configuração já homologada para seseo e yeísmo do objetivo pedagógico.**

Antes de aprovar a voz como padrão didático, o professor deve ouvir amostras com `cena`, `cinco`, `zapato`, `calle`, `llave`, `yo`, `tú`, `ustedes`, nomes próprios e perguntas, nas velocidades 0,7, 0,88 e 1. A análise deve considerar sons, acentuação e entonação. Uma troca de voz/fonemizador exige regeneração coerente das gravações; não foi feita substituição de sotaque sem validação auditiva. As vozes do aparelho são alternativas e sua qualidade e disponibilidade variam.

## Validação executada

Foram aprovados **20 testes Node** do player/cache e **7 testes Python** de catálogo e recuperação. Os testes Python simulam a síntese para verificar falhas e arquivos atômicos; não geram novas vozes. O catálogo real passou em `--validate-only`, o JavaScript externo e inline passou na análise sintática e o YAML do workflow foi analisado com sucesso.

| Ambiente Playwright | Resultado |
| --- | --- |
| Chromium 151 desktop, 1365 × 900 | Áudio real online/offline; 200 MP3 decodificados; recarga PWA offline; Range; navegação; revisão; dúvida rápida; conversação; diagnóstico e backup aprovados. |
| Chromium 151 com emulação móvel, 393 × 851 | Mesmos fluxos, incluindo reprodução e recarga offline, aprovados. Sem excesso horizontal nas 13 telas iniciais examinadas. |
| Edge 157 desktop, 1365 × 900 | Fluxos de estudo, reprodução online/offline, recarga PWA e backup aprovados. |
| WebKit 26.5 para Windows, emulação de iPhone, 390 × 844 | Navegação nas 13 telas, campos, dúvida rápida, revisão, diagnóstico/conversa após falha de áudio, backup e resposta Range online aprovados. MP3 nativo por Blob retornou `NotSupportedError`, independentemente do player. Recarga offline apresentou erro interno do WebKit e a consulta offline falhou. **Reprodução e PWA no Safari/iOS real continuam sem confirmação.** |

Os testes usam perfis isolados e dados fictícios anteriores, verificam notas/respostas e progresso após exportação/importação, e combinam unidades 2, 5 e 7. Não acessam os dados dos estudantes. A versão móvel emulada não confirma hardware Android, políticas do Safari/iPhone ou vozes instaladas. Os resultados detalhados e capturas ficam em `test-results/`, ignorado pelo Git. Os cenários reproduzíveis estão em `tests/` e os comandos estão no README.

## Verificação do site publicado

Após o deploy, o site respondeu com HTTP 200 e serviu o cache `habla-a1-app-v10-audio` e o catálogo com 448 gravações. Em um perfil isolado do Chromium com emulação móvel, o botão de teste e um áudio recém-gerado do caderno reproduziram até o fim. Os 448 MP3 publicados foram baixados e decodificados com sinal de áudio, sem arquivos silenciosos. O PWA recarregou offline, reproduziu uma gravação em cache e respondeu ao intervalo de dois bytes com HTTP 206. Nenhum erro de JavaScript foi registrado. Essa verificação de produção não substitui os testes pendentes em aparelhos reais.

## Arquivos e publicação

Alterados: `audio-player.js`, `sw.js`, `index.html`, `tools/generate_audio.py`, `.github/workflows/generate-audio.yml` e `README.md`. Adicionados: este relatório, `tests/`, `package.json`, `package-lock.json` e `.gitignore`. Playwright é dependência de desenvolvimento; a aplicação publicada continua estática, sem instalação de pacotes para funcionar.

Não foram alterados `audio/sources.json`, os MP3 anteriores, os bancos pedagógicos ou as chaves dos dados. O workflow acrescentou 248 MP3 e atualizou `audio/index.json`. O catálogo atual contém 448 arquivos, totalizando 5.548.368 bytes, e passou em `--validate-only` com zero falhas.

As alterações foram enviadas a `main` e a [geração das 248 gravações](https://github.com/NatanaelSCampos/habla-a1/actions/runs/43598022643) terminou com zero falhas. O [deploy do catálogo completo](https://github.com/NatanaelSCampos/habla-a1/actions/runs/43598378735) também terminou com sucesso. Não foi necessária nova chave de TTS ou contratação de serviço. A configuração de Pages continua usando `main` e a raiz do repositório, com as permissões `contents: write` e `pages: write` já declaradas.

Em Android e iPhone reais, ainda é necessário testar primeiro toque, vários toques rápidos, troca de frase, mudança de velocidade, microfone, fechamento/reabertura do PWA e modo avião após ouvir uma gravação. A geração de todas as 448 frases melhora a cobertura selecionada, mas frases pessoais e combinações dinâmicas ainda podem exigir voz espanhola no aparelho.
