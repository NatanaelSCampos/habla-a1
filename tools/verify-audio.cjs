/* Decodifica cada MP3 real no navegador; nenhuma chamada ao Azure. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const {collectSources} = require('./collect-audio-sources.cjs');
const root = path.resolve(__dirname, '..');
async function verify({pending = false} = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, pending ? 'audio/azure-index.pending.json' : 'audio/index.json'), 'utf8'));
  const texts = collectSources().phrases;
  const missing = texts.filter(t => !catalog.clips[t]);
  if (missing.length) throw Error(`${missing.length} falas ainda não têm MP3.`);
  const files = Object.values(catalog.clips);
  if (files.some(file => !/^clips\/[a-z0-9_-]+\.mp3$/i.test(file))) throw Error('Caminhos de áudio inválidos.');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url,'http://localhost');
    const relative = url.pathname.slice(1);
    if (relative === '') {res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Verificar áudio</title>'); return;}
    if (!/^clips\/[a-z0-9_-]+\.mp3$/i.test(relative)) {res.writeHead(404).end(); return;}
    const file = path.join(root, 'audio', relative);
    if (!fs.existsSync(file)) {res.writeHead(404).end(); return;}
    res.writeHead(200,{'Content-Type':'audio/mpeg'});fs.createReadStream(file).pipe(res);
  });
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const report = await page.evaluate(async files => {
      const audio = new AudioContext(), queue = files.slice();
      let decoded = 0, silent = 0, samples = 0, minSeconds = Infinity, maxSeconds = 0, wrongRate = 0;
      const failures = [];
      await Promise.all(Array.from({length:4}, async () => {
        while (queue.length) {
          const file = queue.shift();
          try {
            const response = await fetch('/' + file);
            if (!response.ok) throw Error('HTTP ' + response.status);
            const decodedAudio = await audio.decodeAudioData(await response.arrayBuffer());
            const channel = decodedAudio.getChannelData(0);
            if (!channel.some(value=>Math.abs(value)>.001)) silent++;
            if (decodedAudio.numberOfChannels !== 1) wrongRate++;
            decoded++; samples += channel.length;
            minSeconds = Math.min(minSeconds,decodedAudio.duration);maxSeconds = Math.max(maxSeconds,decodedAudio.duration);
          } catch {failures.push(file);}
        }
      }));
      const seconds = samples / audio.sampleRate; await audio.close();
      return {decoded,silent,wrongChannels:wrongRate,minSeconds,maxSeconds,totalSeconds:seconds,failures};
    },files);
    const result = {...report,provider:catalog.provider,voice:catalog.voice,expected:texts.length,bytes:files.reduce((n,f)=>n+fs.statSync(path.join(root,'audio',f)).size,0)};
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    fs.writeFileSync(path.join(root,'test-results/audio-verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
    if (result.decoded !== texts.length || result.silent || result.wrongChannels || result.failures.length || result.minSeconds < .15) throw Error('A verificação de decodificação, duração ou sinal falhou.');
    return result;
  } finally {await browser?.close();server.close();}
}
if (require.main === module) verify({pending:process.argv.includes('--pending')}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports = {verify};
