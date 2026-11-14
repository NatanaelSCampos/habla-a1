const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const azure = require('../tools/generate-azure-audio.cjs');
const {collectSources} = require('../tools/collect-audio-sources.cjs');
const mp3 = () => {const bytes = Buffer.alloc(600); bytes.set([255,243,100,192]); return bytes;};
const voices = () => Response.json([{ShortName:'es-MX-DaliaNeural', Locale:'es-MX', Status:'GA'}]);
const config = {key:'private-test-key', endpoint:'https://eastus.tts.speech.microsoft.com/cognitiveservices/'};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'habla-azure-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.mkdirSync(path.join(root,'audio/clips'), {recursive:true});
  fs.writeFileSync(path.join(root,'audio/sources.json'), JSON.stringify({phrases:['Hola', 'Adiós']}));
  const active = path.join(root,'audio/index.json');
  fs.writeFileSync(active, JSON.stringify({voice:'ef_dora', clips:{Hola:'clips/old.mp3'}}));
  return {root, active, read:()=>JSON.parse(fs.readFileSync(active))};
}
test('a extração reaproveita todos os bancos e conserva a seleção anterior', () => {
  const sources = collectSources();
  const current = JSON.parse(fs.readFileSync('audio/sources.json'));
  assert.ok(sources.phrases.length > 5000);
  assert.equal(sources.coverage.verbs, 4320);
  assert.equal(sources.coverage.workbook, 20);
  assert.equal(sources.coverage.lab, 54);
  assert.equal(new Set(sources.phrases).size, sources.phrases.length);
  assert.ok(current.phrases.every(t=>sources.phrases.includes(t)));
});
test('aceita endpoints do Azure e rejeita redirecionamento da chave para outros domínios', () => {
  const env = {AZURE_SPEECH_KEY:'test', AZURE_SPEECH_ENDPOINT:'https://eastus.api.cognitive.microsoft.com/'};
  assert.equal(azure.configuration(env,'missing.env').endpoint, config.endpoint);
  assert.equal(azure.configuration({...env,AZURE_SPEECH_ENDPOINT:'https://speech-resource.cognitiveservices.azure.com/'},'missing.env').endpoint,'https://speech-resource.cognitiveservices.azure.com/tts/cognitiveservices/');
  for (const endpoint of ['https://example.com/', 'http://eastus.tts.speech.microsoft.com/', 'https://eastus.tts.speech.microsoft.com/?key=private', 'https://eastus.tts.speech.microsoft.com.evil.example/']) {
    assert.throws(()=>azure.configuration({...env,AZURE_SPEECH_ENDPOINT:endpoint},'missing.env'));
  }
});
test('o nome do MP3 muda com a voz ou o perfil, mantendo a normalização', () => {
  const p = azure.profile();
  assert.equal(azure.clipPath(' Hola\n',p),azure.clipPath('Hola',p));
  assert.notEqual(azure.clipPath('Hola',p),azure.clipPath('Hola',azure.profile('es-MX-JorgeNeural')));
  assert.notEqual(azure.clipPath('Hola',p),azure.clipPath('Hola',{...p,version:2}));
  assert.match(azure.clipPath('Hola',p),/^clips\/azure-[a-z0-9-]+\.mp3$/);
});
test('SSML preserva espanhol mexicano e escapa marcação do texto', () => {
  const text = azure.ssml('A & B < C "hola"',azure.profile());
  assert.match(text,/xml:lang="es-MX"/);
  assert.match(text,/A &amp; B &lt; C &quot;hola&quot;/);
  assert.match(text,/rate="0%"/);
});
test('não aceita HTML, arquivos vazios ou falsos MP3', () => {
  assert.equal(azure.validMp3(Buffer.from('<html>Error</html>')),false);
  assert.equal(azure.validMp3(Buffer.alloc(1000)),false);
  assert.equal(azure.validMp3(mp3()),true);
});
test('lotes são separados por marcadores reais e não exigem bookmark após a última frase', () => {
  assert.deepEqual(azure.rangesFor(['Hola','Adiós'],new Map([['s0',.0125],['e0',1.565],['s1',1.565]]),86820),[{start:300,end:37560},{start:37560,end:86820}]);
  assert.throws(()=>azure.rangesFor(['Hola','Adiós'],new Map([['s0',0]]),86820),/Marcadores/);
  assert.throws(()=>azure.rangesFor(['Hola','Adiós'],new Map([['s0',2],['s1',1]]),86820),/Marcadores/);
});
test('grava cada frase do lote separadamente e mantém o catálogo ativo até a ativação',async t => {
  const f=fixture(t);let batches=0;
  const batcher=async (_,texts)=>{batches++;assert.deepEqual(texts,['Hola','Adiós']);return texts.map(mp3);};
  const result=await azure.generate({...f,config,batchSize:48,batcher,fetcher:async()=>voices(),intervalMs:0,log:()=>{}});
  assert.equal(batches,1);assert.equal(result.complete,true);assert.equal(f.read().voice,'ef_dora');
  azure.activate(f.root);assert.equal(Object.keys(f.read().clips).length,2);
});
test('geração interrompida retoma sem cobrar frases concluídas e só ativa catálogo completo',async t => {
  const f=fixture(t), settings=azure.profile(); let calls=0;
  const fetcher=async (url,init)=>{
    assert.equal(init.redirect,'error');
    assert.equal(init.headers['Ocp-Apim-Subscription-Key'],config.key);
    if(url.endsWith('voices/list'))return voices();
    calls++;return new Response(mp3());
  };
  const options={...f,config,settings,fetcher,intervalMs:0,concurrency:1,log:()=>{},wait:async()=>{}};
  const first=await azure.generate({...options,maxNew:1});
  assert.equal(first.complete,false);assert.equal(calls,1);assert.equal(f.read().voice,'ef_dora');
  assert.throws(()=>azure.activate(f.root,settings),/incompleto/);
  const second=await azure.generate(options);
  assert.equal(second.complete,true);assert.equal(calls,2);assert.equal(f.read().voice,'ef_dora');
  azure.activate(f.root,settings);
  assert.equal(f.read().voice,settings.voice);assert.equal(Object.keys(f.read().clips).length,2);
  await azure.generate(options);assert.equal(calls,2);
});
test('falha de autenticação preserva o catálogo ativo e não imprime resposta nem chave',async t => {
  const f=fixture(t), logs=[];
  const fetcher=async url=>url.endsWith('voices/list')?voices():new Response('secret-from-server',{status:401});
  await assert.rejects(azure.generate({...f,config,fetcher,intervalMs:0,concurrency:1,log:m=>logs.push(m),wait:async()=>{}}),/HTTP 401/);
  assert.equal(f.read().voice,'ef_dora');assert.doesNotMatch(logs.join('\n'),/private-test-key|secret-from-server/);
});
test('429 usa espera, repete a frase e preserva resultado recuperável',async t => {
  const f=fixture(t);let requests=0;const waits=[];
  const fetcher=async url=>{
    if(url.endsWith('voices/list'))return voices();
    if(++requests===1)return new Response('',{status:429,headers:{'Retry-After':'61'}});
    return new Response(mp3());
  };
  const result=await azure.generate({...f,config,fetcher,intervalMs:0,concurrency:1,log:()=>{},wait:async ms=>waits.push(ms)});
  assert.equal(result.complete,true);assert.equal(requests,3);assert.ok(waits.some(ms=>ms>=60000));
});
test('resposta inválida e falha parcial não substituem o catálogo publicado',async t => {
  const f=fixture(t);let calls=0;
  const fetcher=async url=>url.endsWith('voices/list')?voices():new Response(++calls===1?mp3():Buffer.alloc(600));
  await assert.rejects(azure.generate({...f,config,fetcher,intervalMs:0,concurrency:1,log:()=>{},wait:async()=>{}}),/1 frases falharam/);
  assert.equal(f.read().voice,'ef_dora');
  const saved=JSON.parse(fs.readFileSync(path.join(f.root,'audio/azure-index.pending.json')));
  assert.deepEqual(Object.keys(saved.clips),['Hola']);
});
