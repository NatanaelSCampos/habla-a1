/* Verifica os arquivos publicados pelo Pages, sem build ou acesso à rede. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const sw = read('sw.js');
const match = sw.match(/const ASSETS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(match, 'Lista do cache offline ausente');
const assets = vm.runInNewContext(match[1]);
const cached = new Set(assets);
function localFile(relative) {
  assert.ok(relative.startsWith('./'), `Caminho deve ser relativo: ${relative}`);
  const file = path.resolve(root, relative);
  assert.ok(file.startsWith(root + path.sep), `Caminho fora do projeto: ${relative}`);
  assert.ok(fs.statSync(file).isFile(), `Arquivo ausente: ${relative}`);
  return file;
}
for (const asset of assets) if (asset !== './') localFile(asset);
const references = [...html.matchAll(/\b(?:src|href)="([^"#]+)"/g)].map((m) => m[1]);
for (const relative of references) {
  localFile(relative);
  assert.ok(cached.has(relative), `Arquivo do HTML não está no cache offline: ${relative}`);
}
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length, 'Nenhum script no HTML');
for (const [, attributes, body] of scripts) {
  assert.ok(/\bsrc="/.test(attributes) && /\bdefer\b/.test(attributes), 'Scripts precisam de src relativo e defer');
  assert.equal(body.trim(), '', 'Lógica inline deve ficar nos arquivos JavaScript');
}
assert.ok(!/<style\b/.test(html), 'Estilos devem ficar nos arquivos CSS');
const order = scripts.map(([, attrs]) => attrs.match(/src="([^"]+)"/)[1]);
for (const dependency of ['./assets/js/content.js', './assets/js/verbs.js', './assets/js/workbook.js', './audio-player.js']) {
  assert.ok(order.includes(dependency) && order.indexOf(dependency) < order.indexOf('./assets/js/app.js'), `Ordem de carregamento inválida: ${dependency}`);
}
for (const module of ['./study-lab.js', './doubts.js', './coach.js', './quick-doubt.js']) {
  assert.ok(order.indexOf(module) > order.indexOf('./assets/js/app.js'), `Módulo carregado antes da aplicação: ${module}`);
}
assert.ok(order.indexOf('./quick-doubt.js') > order.indexOf('./doubts.js'), 'Dúvida rápida depende do caderno de dúvidas');
for (const file of new Set([...fs.readdirSync(root).filter((name) => name.endsWith('.js')), ...order.map((src) => src.slice(2))])) {
  new vm.Script(read(file), { filename: file });
}
const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.scope, './');
localFile(manifest.start_url);
for (const icon of manifest.icons) {
  localFile(icon.src);
  assert.ok(cached.has(icon.src), `Ícone ausente no cache: ${icon.src}`);
}
const index = JSON.parse(read('audio/index.json'));
for (const [text, relative] of Object.entries(index.clips)) {
  assert.equal(text, text.normalize('NFC').replace(/\s+/g, ' ').trim());
  assert.match(relative, /^clips\/[a-z0-9_-]+\.mp3$/i);
  assert.ok(fs.statSync(localFile('./audio/' + relative)).size >= 500, `MP3 incompleto: ${relative}`);
}
console.log(`Site válido: ${references.length} referências locais, ${assets.length} arquivos no cache e ${Object.keys(index.clips).length} MP3. Sintaxe JavaScript e caminhos /habla-a1/ verificados.`);
