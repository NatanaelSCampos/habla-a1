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
- `sw.js`: cache offline e abertura do aplicativo ao tocar em uma notificação
- `manifest.webmanifest` e ícones: instalação PWA

## Evolução futura
- Complementar e revisar exercício por exercício do livro impresso com base nas fontes
- Sincronização entre dispositivos e alunos (se houver necessidade)
- Backend de Web Push para avisos confiáveis com o app fechado

As atualizações do GitHub Pages podem demorar um pouco para chegar a todos os dispositivos devido à publicação e ao cache do PWA.
