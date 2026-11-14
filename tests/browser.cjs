/* npm install; npx playwright install chromium webkit; npm run test:browser */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const results=path.join(root,'test-results');fs.mkdirSync(results,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'audio/index.json'),'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/habla-a1/')){res.writeHead(404).end();return;}
 const relative=decodeURIComponent(url.pathname.slice('/habla-a1/'.length))||'index.html';
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404).end();return;}
 const body=fs.readFileSync(file),headers={'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):body.length-1,body.length-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1}).end(body.subarray(start,end+1));}
 else res.writeHead(200,{...headers,'Content-Length':body.length}).end(body);
});
const seed=()=>{
 if(localStorage.getItem('habla_espanol_2026_v1'))return;
 const pages=Object.fromEntries(['home','lab','diagnostic','dialogues','library','practice','reviews','board','doubts','scenarios','verbs','workbook','progress','workbook:unit','workbook:exercise','study','verbs:quiz'].map(x=>[x,true]));
 localStorage.setItem('habla_ui_guides_v4',JSON.stringify({welcome:true,pages}));
 localStorage.setItem('habla_espanol_2026_v1',JSON.stringify({progress:{legacy:{seen:2,reps:1,due:'2026-11-14'}},custom:[{id:'personal',es:'Estudio con mis amigos.',pt:'Estudo com meus amigos.'}],doubts:[{id:'old-doubt',question:'Dúvida anterior',unit:7,status:'pending',teacherAnswer:'',createdAt:'2026-11-01T12:00:00Z'}],voiceSpeed:.88}));
 localStorage.setItem('frecuencias.a1.caderno.v2',JSON.stringify({answers:{'u1-1':['respuesta anterior']},results:{'u1-1':{score:1,total:1}},notes:{'u1-1':'Anotação anterior'},review:{'u1-1':true},last:'u1-1'}));
};
async function nav(page,name){
 const direct=page.locator(`[data-act="nav"][data-page="${name}"]:visible`).first();
 if(await direct.count())await direct.click();
 else{await page.locator('[data-act="more-open"]').click();await page.locator(`[data-act="more-nav"][data-page="${name}"]`).click();}
 await page.locator('#app h1').waitFor();
}
async function waitForAudio(page,unsupported){
 if(unsupported)await page.waitForFunction(()=>document.getElementById('audioStatus').hidden&&/Não foi possível ouvir esta frase neste aparelho/.test(document.getElementById('toast').textContent));
 else await page.waitForFunction(()=>document.getElementById('audioStatus').textContent==='Reproduzindo espanhol…');
}
async function testCase(base,config){
 const browser=await pw[config.engine].launch(config.channel?{channel:config.channel}:{});
 const context=await browser.newContext({...config.device,viewport:config.viewport,locale:'pt-BR',timezoneId:'America/Sao_Paulo',acceptDownloads:true});
 const page=await context.newPage(),errors=[],checks=[],overflows=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 page.setDefaultTimeout(12000);
 await context.addInitScript(seed);
 try{
  await page.goto(base);await page.waitForFunction(()=>window.HablaAudio?.stats().ready&&window.HablaCoach&&window.HablaLab);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  // Blob direto testa a capacidade nativa sem depender do player ou de Range.
  const mediaCapability=await page.evaluate(async path=>{
   const response=await fetch('./audio/'+path),url=URL.createObjectURL(await response.blob()),a=document.createElement('audio');
   try{a.src=url;await a.play();a.pause();return {supported:true};}
   catch(e){return {supported:e.name!=='NotSupportedError',error:e.name,message:e.message};}
   finally{URL.revokeObjectURL(url);}
  },Object.values(catalog.clips)[0]);
  const unsupported=!mediaCapability.supported;
  if(config.engine!=='webkit')assert.equal(unsupported,false,'Este navegador precisa reproduzir MP3 nativamente para validar o áudio');
  await page.evaluate(()=>{const NativeAudio=window.Audio;window.__mediaErrors=[];window.Audio=function(...args){const audio=new NativeAudio(...args);audio.addEventListener('error',()=>__mediaErrors.push({code:audio.error?.code,message:audio.error?.message}));window.__lastAudio=audio;return audio;};});
  const inventory=await page.evaluate(clips=>({structures:STRUCTURES.length,examples:allCards().length,verbs:VERB_BANK.verbs.length,combinations:CONJ_COUNTS.sentences,exercises:BOOK_EX.length,units:BOOK_UNITS.length,scenes:SCENARIO_SETS.length,turns:SCENARIO_SETS.reduce((n,s)=>n+s.turns.length,0),workbookAudio:BOOK_EX.flatMap(e=>e.items).filter(i=>i.audio).length,workbookRecorded:BOOK_EX.flatMap(e=>e.items).filter(i=>i.audio&&clips[i.audio]).length,sceneRecorded:SCENARIO_SETS.flatMap(s=>s.turns).filter(t=>clips[t.q]).length}),catalog.clips);
  for(const name of ['home','lab','diagnostic','dialogues','library','practice','reviews','board','doubts','scenarios','verbs','workbook','progress']){
   await nav(page,name);
   assert.ok((await page.locator('#app h1').innerText()).trim());
   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   if(dimensions.scroll>dimensions.width+1){
    const elements=await page.locator('#app *').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().right>innerWidth+1).slice(-8).map(n=>({tag:n.tagName,className:n.className,right:n.getBoundingClientRect().right,text:n.textContent.slice(0,60)})));
    overflows.push({page:name,...dimensions,elements});
   }
  }
  checks.push('13 telas navegadas pela interface');
  await page.locator('#voiceSpeed').selectOption('0.7');
  await page.locator('[data-act="speak"]').click();
  await waitForAudio(page,unsupported);
  await page.waitForFunction(()=>document.getElementById('audioStatus').hidden);
  checks.push(unsupported?'MP3 nativo indisponível neste WebKit; player mostra falha sem bloquear estudo':'MP3 real começou e terminou pelo botão; velocidade 0,7 salva');
  // Conjugação mantém campos e preferências; o caderno mantém respostas e notas antigas.
  await nav(page,'workbook');await page.evaluate(()=>wbOpenExercise('u1-1'));
  assert.equal(await page.locator('#wbNotes').inputValue(),'Anotação anterior');
  assert.equal(await page.evaluate(()=>wb.answers['u1-1'][0]),'respuesta anterior');
  checks.push('caderno preserva respostas, notas, resultados e marcação antigos');
  await nav(page,'lab');await page.locator('[data-act="lab-none"]').click();
  for(const unit of [2,5,7])await page.locator(`[data-lab-unit="${unit}"]`).check();
  await page.locator('#labMode').selectOption('dialogue');await page.locator('[data-act="lab-start"]').click();
  await page.locator('#labAnswer').fill('Resposta provisória que deve permanecer.');
  await page.locator('#doubtFab').click();await page.locator('#dq-question').fill('Como usar esta expressão?');
  await page.locator('#dq-form button[type="submit"]').click();
  assert.equal(await page.locator('#labAnswer').inputValue(),'Resposta provisória que deve permanecer.');
  await page.locator('[data-act="lab-check"]').click();await page.locator('[data-act="lab-rate"][data-value="good"]').click();
  assert.deepEqual(await page.evaluate(()=>HablaLab.settings.units),[2,5,7]);
  checks.push('revisão com unidades 2, 5 e 7; dúvida rápida preserva exercício; autoavaliação salva');
  await nav(page,'dialogues');await page.locator('[data-act="coach-convo-start"]').click();
  await page.locator('[data-act="coach-convo-hear"]').click();
  await waitForAudio(page,unsupported);
  await page.locator('[data-act="coach-convo-spoke"]').click();await page.locator('[data-act="coach-convo-compare"]').click();
  await page.locator('[data-act="coach-convo-grade"][data-grade="good"]').click();
  assert.equal(await page.locator('#audioStatus').isHidden(),true);
  checks.push(unsupported?'conversa progressiva continua após falha de áudio':'conversa progressiva ouve MP3, revela modelo e avança sem áudio anterior');
  await nav(page,'diagnostic');await page.locator('[data-act="coach-start"]').click();
  for(let i=0;i<2;i++){await page.locator('[data-act="coach-reveal"]').click();await page.locator('[data-act="coach-grade"][data-grade="hard"]').click();}
  await page.locator('[data-act="coach-audio"]').click();
  await waitForAudio(page,unsupported);
  checks.push(unsupported?'diagnóstico mantém navegação após falha de áudio':'diagnóstico avança entre habilidades e reproduz compreensão oral');
  await nav(page,'progress');
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-act="export"]').click();const download=await downloadPromise;
  const backupPath=path.join(results,config.name+'-backup.json');await download.saveAs(backupPath);
  const backup=JSON.parse(fs.readFileSync(backupPath));assert.equal(backup.version,2);assert.equal(backup.data.doubts.length,2);assert.equal(backup.data.progress.legacy.seen,2);assert.equal(backup.workbookState.notes['u1-1'],'Anotação anterior');assert.ok(Object.keys(backup.labState.results).length);
  await page.locator('#importFile').setInputFiles(backupPath);await page.waitForFunction(()=>document.getElementById('toast').textContent==='Backup importado com sucesso.');
  assert.equal(await page.evaluate(()=>data.doubts.length),2);assert.equal(await page.evaluate(()=>wb.notes['u1-1']),'Anotação anterior');
  checks.push('exportação e importação JSON v2 completas com dados anteriores e novos');
  let decoding;
  if(config.decodeAll){
   decoding=await page.evaluate(async paths=>{
    const ac=new (window.AudioContext||window.webkitAudioContext)(),durations=[];let silent=0;
    for(const path of paths){const response=await fetch('./audio/'+path);if(!response.ok)throw Error('MP3 HTTP '+response.status);const decoded=await ac.decodeAudioData(await response.arrayBuffer());const samples=decoded.getChannelData(0);if(!samples.some(v=>Math.abs(v)>.001))silent++;durations.push(decoded.duration);}
    await ac.close();return {decoded:durations.length,silent,minSeconds:Math.min(...durations),maxSeconds:Math.max(...durations)};
   },Object.values(catalog.clips));assert.equal(decoding.silent,0);checks.push('todos os MP3 decodificados, com amostras audíveis');
  }
  const onlineRange=await page.evaluate(async path=>{const r=await fetch('./audio/'+path,{headers:{Range:'bytes=0-1'}});return {status:r.status,length:(await r.arrayBuffer()).byteLength};},Object.values(catalog.clips)[0]);
  assert.equal(onlineRange.status,206);assert.equal(onlineRange.length,2);
  let offlineReload={passed:true},offlineRange;
  await context.setOffline(true);
  try{await page.reload();}catch(error){
   if(config.engine!=='webkit'||!error.message.includes('WebKit encountered an internal error'))throw error;
   offlineReload={passed:false,limitation:error.message};
  }
  await page.waitForFunction(()=>HablaAudio.stats().ready);
  await nav(page,'progress');await page.locator('[data-act="speak"]').click();
  await waitForAudio(page,unsupported);
  try{
   offlineRange=await page.evaluate(async path=>{const r=await fetch('./audio/'+path,{headers:{Range:'bytes=0-1'}});return {status:r.status,length:(await r.arrayBuffer()).byteLength,range:r.headers.get('Content-Range')};},Object.values(catalog.clips)[0]);
   assert.equal(offlineRange.status,206);assert.equal(offlineRange.length,2);
  }catch(error){
   if(config.engine!=='webkit'||offlineReload.passed)throw error;
   offlineRange={passed:false,limitation:error.message};
  }
  assert.equal(await page.evaluate(()=>data.doubts.length),2);
  checks.push(unsupported?'Range 206 online correto; limitações de recarga e mídia offline registradas':'PWA recarrega offline; MP3 toca offline; Range 206 de dois bytes; dados preservados');
  await page.evaluate(()=>HablaAudio.stop());await page.screenshot({path:path.join(results,config.name+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  assert.deepEqual(overflows,[],'As telas não devem ultrapassar a largura do aparelho');
  const report={name:config.name,version:browser.version(),viewport:config.viewport,mediaCapability,onlineRange,offlineReload,offlineRange,checks,inventory,decoding,overflows,errors};console.log(JSON.stringify(report));return report;
 }catch(error){
  const failure=await page.evaluate(()=>({url:location.href,status:document.getElementById('audioStatus')?.textContent,toast:document.getElementById('toast')?.textContent,mediaErrors:window.__mediaErrors,audio:window.__lastAudio?{src:__lastAudio.src,paused:__lastAudio.paused,readyState:__lastAudio.readyState,error:__lastAudio.error?{code:__lastAudio.error.code,message:__lastAudio.error.message}:null,support:__lastAudio.canPlayType('audio/mpeg')}:null}));
  await page.screenshot({path:path.join(results,config.name+'-failure.png'),fullPage:true});
  const nativeProbe=await page.evaluate(async path=>{const a=document.createElement('audio'),steps=[];try{a.src='./audio/'+path;steps.push('src');a.playbackRate=.7;steps.push('rate');a.preservesPitch=true;steps.push('pitch');await a.play();a.pause();return {steps,played:true};}catch(e){return {steps,error:e.name,message:e.message};}},Object.values(catalog.clips)[0]);
  console.error(JSON.stringify({name:config.name,failure,nativeProbe,checks,errors}));throw error;
 }finally{await context.close();await browser.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/habla-a1/`;
 const configs=[
  {name:'chromium-desktop',engine:'chromium',viewport:{width:1365,height:900},decodeAll:true},
  {name:'chromium-mobile',engine:'chromium',device:pw.devices['Pixel 7'],viewport:{width:393,height:851}},
  {name:'webkit-mobile',engine:'webkit',device:pw.devices['iPhone 13'],viewport:{width:390,height:844}},
  {name:'edge-desktop',engine:'chromium',channel:'msedge',viewport:{width:1365,height:900}}
 ];
 const reports=[];try{for(const config of configs.filter(c=>!process.env.BROWSERS||process.env.BROWSERS.split(',').includes(c.name))){try{reports.push(await testCase(base,config));}catch(error){reports.push({name:config.name,error:error.message});process.exitCode=1;}}}
 finally{fs.writeFileSync(path.join(results,'browser.json'),JSON.stringify(reports,null,2));server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
