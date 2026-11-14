# Azure Speech no Habla

## Migração autorizada

O responsável autorizou gerar o banco completo com Azure Speech usando as credenciais locais. A voz escolhida é **es-MX-DaliaNeural**, mantendo a preferência pedagógica por espanhol latino-americano. O gerador fixa essa variante sem alterar a configuração `es-ES` do `.env` usado pelo responsável.

A seleção completa reúne **5.141 frases únicas e 132.868 caracteres de texto**. Ela inclui biblioteca, as 4.320 combinações contextuais dos verbos, conversação, revisão, frases de apoio, exemplos gramaticais e os 20 textos de escuta do caderno. Quatro frases da seleção anterior são preservadas como `extraPhrases`. `tools/collect-audio-sources.cjs` extrai o conteúdo dos bancos reais e usa a função original `verbalSentence`, sem modificar respostas ou IDs.

`tools/generate-azure-audio.cjs` usa o SDK oficial para gerar até 48 frases por pedido. Os marcadores de tempo separam o PCM em gravações individuais, codificadas com FFmpeg a 24 kHz, mono e 48 kbit/s. Isso reduz as requisições e evita depender da API assíncrona Batch synthesis. A [documentação de eventos e bookmarks](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis) descreve os offsets usados para os cortes.

O serviço pode omitir o marcador após a última fala. Os cortes usam os inícios confirmados de cada frase e da seguinte; a última termina no fim do áudio completo. Marcadores ausentes ou fora de ordem impedem a ativação. O catálogo intermediário é recuperável e o ativo só muda por `--activate` com todas as frases presentes. `tools/verify-audio.cjs --pending` decodifica os MP3 reais em Chromium para conferir cobertura, sinal, canais e duração antes dessa ativação.

Os nomes dos MP3 incluem provedor, voz e hash do perfil. A atualização mantém o cache de áudio e os arquivos anteriores do Kokoro, sem reutilizar suas URLs. As gravações continuam sendo baixadas conforme o uso, mantendo a instalação inicial pequena. Frases pessoais e conteúdo novo ainda sem gravação usam a alternativa do aparelho.

O `.env` é ignorado pelo Git e não é carregado pelo app. Nenhum segredo foi enviado ao GitHub nesta geração local. Futuras gerações no Actions exigem os secrets indicados no README; o workflow é manual para evitar cobranças a cada push. Ouvir um arquivo no Pages não chama o Azure.

A escolha regional não substitui a conferência pedagógica da pronúncia pelo professor nem testes em aparelhos reais. A avaliação abaixo registra a situação anterior à migração.

## Avaliação anterior à migração

O Azure Speech é tecnicamente compatível com o Habla e vale uma comparação de voz, especialmente porque já é utilizado no outro projeto do responsável. Para esta turma, a recomendação é manter o aplicativo no GitHub Pages e avaliar o Azure como gerador prévio de MP3. A adoção depende de uma melhora perceptível de pronúncia e entonação em relação à voz atual.

## Diferenças entre Kokoro e Azure Speech

Ambas as opções geram voz com redes neurais. O Habla usa Kokoro-82M, um modelo de pesos abertos com 82 milhões de parâmetros, executado em CPU pelo GitHub Actions. A documentação informa uma arquitetura baseada em StyleTTS 2 e ISTFTNet. O eSpeak presente no ambiente ajuda a converter texto em fonemas; a voz final vem do modelo neural, não da voz sintética tradicional do eSpeak. [Modelo oficial](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/README.md), [pipeline de texto e fonemas](https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py).

O Azure Speech é um serviço gerenciado da Microsoft com várias famílias de vozes. Suas vozes neurais prontas fazem previsão de prosódia e síntese de voz. Uma comparação útil deve fixar a voz e a variante, como `es-MX-DaliaNeural`; comparar apenas os nomes das plataformas não mede a pronúncia das frases do Habla. [Descrição técnica da Microsoft](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/text-to-speech/transparency-note).

| Critério | Kokoro usado no Habla | Azure Speech indicado para comparação |
| --- | --- | --- |
| Execução da geração | Modelo instalado no runner; pode gerar sem um serviço externo após obter as dependências e os pesos. | Solicitações autenticadas ao serviço da Microsoft. |
| Voz e variante | `ef_dora`, com espanhol `e` e fonemizador `es`; o catálogo não declara uma voz mexicana específica. | Vozes identificadas como espanhol do México, como Dalia e Jorge. |
| Ajuste didático | A implementação atual controla texto, voz e velocidade. | SSML permite controlar pausas, velocidade e pronúncias, conforme os recursos da voz escolhida. |
| Custo de geração | Sem tarifa por caractere do modelo; utiliza processamento e armazenamento do Actions. | Cobrança por caracteres conforme plano ou franquia F0 disponível. |
| Reprodução pelos alunos | MP3 pelo Pages, com cache offline. | O mesmo comportamento se os resultados forem salvos como MP3 no Pages. |
| Manutenção | Instalação e compatibilidade das dependências, modelo e fonemizador. | Credencial, região, cotas e disponibilidade do serviço. |

O [catálogo do Kokoro](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) confirma a configuração espanhola e as três vozes existentes. Os [controles SSML do Azure](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup) ampliam as opções de ajuste. Esses recursos não demonstram, por si só, que uma voz terá resultado melhor em todas as frases: a decisão final deve usar uma comparação auditiva das mesmas amostras.

## Necessidade e benefício

Os erros anteriores no mobile envolviam disponibilidade de voz no aparelho, concorrência do player e cache offline. Essas correções já foram feitas, e existem 448 MP3 publicados. Trocar o sintetizador não substitui as correções do player ou do cache. O benefício potencial do Azure é a escolha explícita de uma voz regional adequada ao espanhol ensinado.

A Microsoft lista `es-MX-DaliaNeural` e `es-MX-JorgeNeural` como vozes do México. Elas são candidatas a uma avaliação com o professor, usando perguntas, nomes próprios, palavras com `c`, `z`, `ll` e `y`, e as velocidades de estudo do Habla. A escolha da variante não dispensa a avaliação auditiva. [Vozes oficiais por idioma](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts).

## Volume e custo

O arquivo `audio/sources.json` contém 448 frases, com **12.007 caracteres de texto**. Uma geração por voz representa aproximadamente 2,4% de 500 mil caracteres. Essa é uma medição do texto atual; revisões, novas frases e parâmetros faturáveis do serviço podem aumentar o uso.

Também foi calculada uma expansão com os dados existentes, sem duplicar bancos pedagógicos:

| Seleção para uma geração | Frases únicas | Caracteres de texto |
| --- | --- | --- |
| Seleção atual de `audio/sources.json` | 448 | 12.007 |
| Seleção atual mais as 4.320 combinações contextuais dos verbos | 4.558 | 117.616 |

A segunda linha elimina repetições por texto normalizado e corresponde a aproximadamente 23,5% de 500 mil caracteres. Essa expansão cobriria mais frases de conjugação que hoje dependem da voz do aparelho. Ela ainda não inclui todo conteúdo possível nem as frases pessoais dos alunos. Para esse volume, as gravações devem continuar sendo carregadas e guardadas em cache conforme o uso, mantendo a instalação inicial pequena.

O plano **F0** oferece 500 mil caracteres mensais para TTS neural. Isso é uma condição do plano gratuito, não uma franquia que se deve presumir no recurso S0 usado pelo SaaS. Para usar o mesmo recurso existente, é necessário verificar seu plano, região, consumo e preço efetivo. A página oficial apresenta valores conforme a configuração e o contrato; não foi fixado um preço em reais nem presumido acesso gratuito à conta. [Preços oficiais](https://azure.microsoft.com/en-us/pricing/details/speech/).

No F0, a síntese comum tem limite de 20 transações por minuto; 448 pedidos individuais exigiriam cerca de 23 minutos, sem contar repetição de pedidos e outros usos do recurso. A API assíncrona chamada **Batch synthesis** não está disponível no F0. Um script pode gerar frases uma a uma usando a síntese comum, com controle de ritmo e novas tentativas para respostas 429. [Cotas oficiais](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits).

Com MP3 pré-gerados, reproduzir a gravação pelo Pages não faz uma nova chamada ao Azure. O volume de geração depende das frases novas ou alteradas, e não de quantas vezes os alunos repetem cada atividade. Frases pessoais e milhares de combinações dinâmicas precisam de uma estratégia própria de cobertura; as 448 frases selecionadas não representam todo o conteúdo possível do aplicativo.

## Integração indicada

O fluxo proposto é:

1. Selecionar de 10 a 20 frases existentes e comparar Kokoro com uma ou duas vozes mexicanas do Azure.
2. Depois da escolha da voz e do plano, gerar somente as frases necessárias em uma execução controlada do GitHub Actions.
3. Guardar a chave de um recurso Azure em um secret do Actions. Manter a chave fora dos arquivos publicados e separar a medição do Habla do consumo do SaaS quando possível.
4. Gerar MP3 e atualizar o catálogo de forma coerente. A API admite o formato `audio-24khz-48kbitrate-mono-mp3`, equivalente ao formato atualmente utilizado no Habla. [Formatos e autenticação da API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech).
5. Testar as gravações, publicar e manter o mesmo player e o cache offline.

O Azure permite sintetizar voz e salvar o resultado em arquivo. Assim, a geração pode ocorrer fora do navegador do aluno. [Síntese e salvamento de áudio](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis).

Uma troca deve identificar provedor, voz e versão de geração no catálogo e nos arquivos. O gerador atual protege contra mistura de vozes e usa nomes derivados do texto. Substituir a voz mantendo exatamente a mesma URL de MP3 poderia deixar gravações antigas no cache; uma futura integração deve versionar os caminhos ou incluir o perfil de geração no nome do arquivo. Preserve os áudios anteriores até concluir a validação e a atualização do catálogo.

## Decisão para a turma

Manter o Kokoro atende a opção gratuita já publicada. Testar o Azure faz sentido para buscar uma voz mexicana com pronúncia didática mais adequada e aproveitar uma ferramenta já conhecida. A configuração indicada continua sendo geração prévia e distribuição dos MP3 pelo Pages. Uma dependência de síntese em tempo real acrescentaria custos por uso, conectividade e autenticação sem resolver uma necessidade atual da turma.

Na avaliação inicial, nenhum recurso Azure foi criado e nenhuma geração cobrável foi executada. Posteriormente, o responsável forneceu as credenciais locais e autorizou a geração completa descrita no início deste documento. Os 448 MP3 anteriores permanecem disponíveis para compatibilidade e recuperação.
