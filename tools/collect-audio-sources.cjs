/* Extrai as falas dos bancos existentes, sem copiar respostas nem alterar o app. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const canonical = text => String(text).normalize('NFC').replace(/\s+/g, ' ').trim();

function collectSources() {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const context = vm.createContext({});
  for (const file of ['assets/js/content.js', 'assets/js/verbs.js', 'assets/js/workbook.js']) {
    vm.runInContext(read(file), context, {filename: file});
  }
  const app = read('assets/js/app.js');
  const end = app.indexOf('function verbDue()');
  if (end < 0) throw Error('Não foi possível localizar a montagem das frases de conjugação.');
  // Esta parte do app só declara os dados e a função real verbalSentence.
  vm.runInContext(app.slice(0, end), context);
  const dialogue = read('study-lab.js').match(/var dialogueData\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!dialogue) throw Error('Banco de conversação da revisão não encontrado.');
  vm.runInContext('const LAB_DIALOGUES = ' + dialogue[1] + ';', context);
  const groups = vm.runInContext(`({
    library: STRUCTURES.flatMap(s => s.examples.map(e => e.es)),
    verbs: VERB_BANK.verbs.flatMap(v => v.contexts.flatMap((_, ci) => VERB_PEOPLE.map((_, pi) => verbalSentence(v, pi, ci).es))),
    grammar: specialGrammar.flatMap(s => s.examples.map(e => e[0])),
    board: EMERGENCY.flatMap(s => s.phrases.map(p => p[0])),
    scenes: SCENARIO_SETS.flatMap(s => s.turns.flatMap(t => [t.q, ...t.examples])),
    workbook: BOOK_DATA.exercises.flatMap(e => e.items.map(i => i.audio).filter(Boolean)),
    lab: LAB_DIALOGUES.flatMap(rows => rows.map(row => row[0]))
  })`, context);
  // Falas literais de botões: teste de áudio e acordo com o professor.
  groups.buttons = [...app.matchAll(/data-text="([^"$<>]+)"/g)].map(m => m[1]);
  const extraPhrases = JSON.parse(read('audio/sources.json')).extraPhrases || [];
  groups.extra = extraPhrases;
  const phrases = [...new Set(Object.values(groups).flat().map(canonical).filter(Boolean))];
  return {
    version: 2, language: 'es-MX',
    source: 'Gerado dos bancos do Habla por tools/collect-audio-sources.cjs',
    extraPhrases,
    coverage: Object.fromEntries(Object.entries(groups).map(([name, texts]) => [name, texts.length])),
    phrases
  };
}
if (require.main === module) {
  const sources = collectSources();
  const file = path.join(root, 'audio/sources.json');
  const previous = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lost = previous.phrases.filter(p => !sources.phrases.includes(canonical(p)));
  if (lost.length) throw Error(`${lost.length} falas anteriores não foram encontradas nos bancos. Revise a extração antes de substituir a seleção.`);
  if (process.argv.includes('--check')) {
    if (JSON.stringify(previous) !== JSON.stringify(sources)) throw Error('audio/sources.json precisa ser atualizado.');
  } else fs.writeFileSync(file, JSON.stringify(sources, null, 2) + '\n');
  console.log(JSON.stringify({phrases: sources.phrases.length, characters: sources.phrases.reduce((n, p) => n + [...p].length, 0), coverage: sources.coverage}));
}
module.exports = {canonical, collectSources};
