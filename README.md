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
- Progresso individual salvo no navegador de cada aparelho, sem conta ou sincronização
- Faça backup na seção **Meu progresso**; o backup também inclui o histórico do Laboratório
- Publicação via GitHub Pages: o site é acessível por qualquer pessoa que tenha ou descubra o endereço; não é uma área restrita a amigos
- O caderno existente tem **236 atividades adaptadas** e não representa a reprodução integral literal das atividades e dos áudios dos livros originais
- A referência pedagógica é o Frecuencias A1 (Libro del estudiante e Libro de ejercicios), sem afiliação com a editora

## Estrutura do projeto
- `index.html`: aplicativo integrado
- `study-lab.js` e `study-lab.css`: revisão crescente e seleção de unidades
- `doubts.js` e `doubts.css`: caderno pessoal de dúvidas, notas da aula e filtros
- `quick-doubt.js` e `quick-doubt.css`: popup de dúvida global, integrado ao caderno
- `coach.js` e `coach.css`: diagnóstico por habilidades e conversação progressiva
- `sw.js`: cache offline e abertura do aplicativo ao tocar em uma notificação
- `manifest.webmanifest` e ícones: instalação PWA

## Evolução futura
- Complementar e revisar exercício por exercício do livro impresso com base nas fontes
- Sincronização entre dispositivos e alunos (se houver necessidade)
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
2. Para frases ainda não gravadas, usa como alternativa a leitura de voz do aparelho. Algumas combinações dinâmicas dependem dessa alternativa até a biblioteca ser ampliada.

A geração é feita pelo workflow **Gerar áudio em espanhol**, usando Kokoro-82M com uma voz em espanhol. É um modelo aberto, sem cobrança por reprodução dos arquivos. O modelo não roda no celular e não é distribuído com o PWA.

Para ampliar a biblioteca, abra [GitHub Actions → Gerar áudio em espanhol](https://github.com/NatanaelSCampos/habla-a1/actions/workflows/generate-audio.yml), selecione **Run workflow**, escolha a quantidade de novos áudios e execute. Os arquivos são adicionados automaticamente a `audio/clips/` e ao catálogo quando a execução termina com sucesso. É importante conferir a qualidade de pronúncia, especialmente em frases curtas e nomes próprios.

`audio/sources.json` contém as frases previstas. `tools/generate_audio.py` permite gerar os mesmos arquivos localmente, caso se deseje usar uma máquina própria.

> Os MP3 disponíveis podem funcionar offline **depois de reproduzidos e armazenados no cache**. Não é garantido que toda a biblioteca esteja disponível sem internet.
