/* Emuladores locais reais. Não usa projeto Firebase, chaves ou dados de produção. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,setDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');
const makeServer=require('./site-server.cjs');
const config={apiKey:'demo-key',authDomain:'demo-habla.firebaseapp.com',projectId:'demo-habla',appId:'1:123:web:test',emulators:{auth:9099,firestore:8080}};
const server=makeServer(config),checks=[],errors=[],transportWarnings=[];
const main='habla_espanol_2026_v1',book='frecuencias.a1.caderno.v2';
function seed(legacy){
 if(localStorage.getItem('test-seeded'))return;localStorage.setItem('test-seeded','yes');
 localStorage.setItem('habla_ui_guides_v4',JSON.stringify({welcome:true,pages:Object.fromEntries(['home','lab','diagnostic','dialogues','library','practice','reviews','board','doubts','scenarios','verbs','workbook','progress','workbook:unit','workbook:exercise'].map(key=>[key,true]))}));
 if(legacy){localStorage.setItem('habla_espanol_2026_v1',JSON.stringify({progress:{legacy:{seen:2,reps:1}},doubts:[{id:'legacy-doubt',question:'Dúvida anterior',unit:7,status:'pending'}],activity:{'2026-11-14':{attempts:3,good:2}}}));localStorage.setItem('frecuencias.a1.caderno.v2',JSON.stringify({answers:{'u1-1':['uno']},notes:{'u1-1':'Minha nota antiga'}}));}
}
async function settled(page){await page.waitForFunction(()=>HablaAccounts.status().phase==='ready'&&HablaAccounts.status().pending===0,null,{timeout:20000});}
async function email(page,name,register=false){
 await page.waitForFunction(()=>window.HablaAccounts&&HablaAccounts.status().phase==='signedout');
 if(!await page.locator('#accountsRoot [role="dialog"]').count())await page.locator('#accountButton').click();
 const toggle=page.locator('[data-account="register"]');if((await toggle.innerText()).includes('Criar conta')===register)await toggle.click();
 await page.locator('#accountEmailForm [name="email"]').fill(name);await page.locator('#accountEmailForm [name="password"]').fill('test-password-123');
 await page.locator('#accountEmailForm button').click();
 await page.waitForFunction(()=>['migration','ready'].includes(HablaAccounts.status().phase),null,{timeout:20000});
}
async function offline(device,value){
 await device.context.setOffline(value);
}
async function rules(){
 const env=await initializeTestEnvironment({projectId:'demo-habla',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore();
  const record={kind:'book.notes',key:'u1-1',payload:'"nota"',deleted:false,updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(a,'users/alice/records/book.notes%3Au1-1'),record));
  await assertSucceeds(getDocs(collection(a,'users/alice/records')));
  await assertFails(getDoc(doc(b,'users/alice/records/book.notes%3Au1-1')));await assertFails(getDocs(collection(b,'users/alice/records')));
  await assertFails(setDoc(doc(b,'users/alice/records/x'),record));await assertFails(getDoc(doc(guest,'users/alice/records/book.notes%3Au1-1')));
  await assertFails(setDoc(doc(a,'users/alice/records/x'),{...record,secret:'no'}));
  await assertFails(setDoc(doc(a,'users/alice/records/x'),{...record,kind:'unknown'}));
  await assertFails(setDoc(doc(a,'users/alice/records/x'),{...record,payload:'x'.repeat(200001)}));
  await assertFails(deleteDoc(doc(a,'users/alice/records/book.notes%3Au1-1')));
  await assertFails(setDoc(doc(a,'public/x'),record));
  await assertFails(setDoc(doc(a,'users/alice/meta/profile'),{schema:1,status:'invalid',updatedAt:serverTimestamp()}));
  checks.push('Regras reais: leitura/escrita do dono; bloqueia outro aluno, visitante, formato inválido, excesso de tamanho e caminhos não autorizados');
 }finally{await env.cleanup();}
}
(async()=>{
 await rules();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/habla-a1/`;
 const engine=process.env.SYNC_ENGINE||'chromium',browser=await ({chromium,webkit}[engine]).launch();const contexts=[];
 async function device(legacy=false,viewport={width:393,height:851}){
  const context=await browser.newContext({viewport,locale:'pt-BR',acceptDownloads:true});contexts.push(context);await context.addInitScript(seed,legacy);const page=await context.newPage();page.on('pageerror',error=>{
   // Neste WebKit Windows, o transporte do emulador também emite pageerror
   // ao recarregar ou interromper a conexão. Não é uma exceção do código
   // do Habla. Registrar o evento integralmente; acesso e confirmação de
   // todas as escritas continuam sendo exigidos pelos testes funcionais.
   const emulatorTransport=engine==='webkit'&&/^\/(?:\/)?127\.0\.0\.1:8080\/google\.firestore\.v1\.Firestore\/(?:Write|Listen)\/channel\?.* due to access control checks\.$/.test(error.message);
   (emulatorTransport?transportWarnings:errors).push(error.message);
  });page.on('dialog',dialog=>dialog.accept());page.setDefaultTimeout(15000);await page.goto(base);await page.waitForFunction(()=>window.HablaAccounts&&window.HablaApp);return {context,page};
 }
 try{
  const phone=await device(true),pc=await device(false,{width:1365,height:900}),emailAddress='alice-'+Date.now()+'@example.test';
  await phone.page.waitForFunction(()=>HablaAccounts.status().phase==='signedout');
  assert.ok(await phone.page.locator('.account-welcome').isVisible());
  assert.equal(await phone.page.locator('[data-account="close"]').count(),0);
  assert.equal(await phone.page.locator('[data-account="logout"]').count(),0);
  assert.ok(await phone.page.locator('#accountWelcomeText').innerText().then(text=>text.includes('celular')&&text.includes('computador')));
  assert.equal(await phone.page.locator('.app-shell').evaluate(node=>node.inert),true);
  await phone.page.keyboard.press('Escape');assert.ok(await phone.page.locator('.account-welcome').isVisible());
  await phone.page.keyboard.press('Tab');assert.equal(await phone.page.evaluate(()=>document.getElementById('accountsRoot').contains(document.activeElement)),true);
  assert.ok(await phone.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await phone.page.screenshot({path:'test-results/account-welcome-'+engine+'.png',fullPage:false});
  checks.push('Primeiro acesso após atualização explica celular/computador, exige entrada e bloqueia fechar, Escape e interação ao fundo');
  const before=await phone.page.evaluate(()=>localStorage.getItem('habla_espanol_2026_v1'));
  await email(phone.page,emailAddress,true);await phone.page.locator('[data-account="use-local"]').click();await settled(phone.page);
  const uid=await phone.page.evaluate(()=>HablaStore.active());
  assert.equal(await phone.page.locator('#accountsRoot [role="dialog"]').count(),0);
  assert.equal(await phone.page.evaluate(()=>localStorage.getItem('habla.account.welcome.v1')),'done');
  assert.equal(await phone.page.locator('.app-shell').evaluate(node=>node.inert),false);
  assert.equal(await phone.page.evaluate(()=>data.progress.legacy.seen),2);assert.equal(await phone.page.evaluate(()=>localStorage.getItem('habla_espanol_2026_v1')),before);
  checks.push('Cadastro e importação inicial de progresso, dúvidas e caderno sem alterar as chaves antigas');
  await email(pc.page,emailAddress);await pc.page.locator('[data-account="use-cloud"]').click();await settled(pc.page);
  await pc.page.waitForFunction(()=>data.progress.legacy?.seen===2&&wb.notes['u1-1']==='Minha nota antiga');
  checks.push('Segundo dispositivo entra na mesma conta e recebe histórico completo');
  // Quem já tinha uma conta na versão anterior vê a novidade uma vez,
  // sem precisar sair e autorizar o Google novamente.
  await phone.page.evaluate(()=>localStorage.removeItem('habla.account.welcome.v1'));await phone.page.reload();
  await phone.page.waitForFunction(()=>HablaAccounts.status().phase==='ready');
  assert.ok(await phone.page.locator('.account-welcome').isVisible());
  await phone.page.locator('[data-account="welcome-continue"]').click();
  assert.equal(await phone.page.locator('.account-welcome').count(),0);
  await phone.page.reload();await settled(phone.page);
  assert.equal(await phone.page.locator('#accountsRoot [role="dialog"]').count(),0);
  checks.push('Sessão já salva confirma a novidade uma vez; próximas aberturas mantêm a conta sem repetir a tela');
  await phone.page.evaluate(()=>{wb.notes['u2-1']='Nota do celular';wbSave();});await pc.page.waitForFunction(()=>wb.notes['u2-1']==='Nota do celular');
  // Atualização remota não destrói um exercício ou uma dúvida aberta.
  await pc.page.evaluate(()=>{go('lab');});await pc.page.locator('[data-act="lab-start"]').click();await pc.page.locator('#labAnswer').fill('Resposta em andamento');
  await pc.page.locator('#doubtFab').click();await pc.page.locator('#dq-question').fill('Meu rascunho');
  await phone.page.evaluate(()=>{wb.notes['u3-1']='Atualização remota';wbSave();});await pc.page.waitForFunction(()=>wb.notes['u3-1']==='Atualização remota');
  assert.equal(await pc.page.locator('#labAnswer').inputValue(),'Resposta em andamento');assert.equal(await pc.page.locator('#dq-question').inputValue(),'Meu rascunho');
  await pc.page.locator('button[data-act="dq-close"]').first().click();
  await pc.page.locator('#accountButton').click();
  assert.equal(await pc.page.locator('.account-dialog').evaluate(node=>getComputedStyle(node).scrollbarWidth),'none');
  assert.ok(await pc.page.locator('[data-account="welcome-continue"]').isVisible());
  await pc.page.screenshot({path:'test-results/account-synced-'+engine+'.png',fullPage:false});
  await pc.page.locator('[data-account="welcome-continue"]').click();
  assert.equal(await pc.page.locator('#accountsRoot [role="dialog"]').count(),0);
  assert.equal(await pc.page.locator('#labAnswer').inputValue(),'Resposta em andamento');
  checks.push('Conta sincronizada tem ação principal Começar a estudar, fecha sem perder exercício e oculta barra de rolagem');
  checks.push('Atualização remota mantém resposta em andamento e popup de dúvida');
  await phone.page.evaluate(()=>navigator.serviceWorker.ready);await phone.page.waitForFunction(()=>navigator.serviceWorker.controller);
  await offline(phone,true);
  await phone.page.evaluate(()=>{wb.notes['u4-1']='Escrito sem internet';wbSave();data.activity['2026-11-14'].attempts+=2;save();});
  await pc.page.evaluate(()=>{wb.notes['u5-1']='Escrito no computador';wbSave();data.activity['2026-11-14'].attempts+=4;save();});await settled(pc.page);
  let offlineReload=true;
  try{await phone.page.reload();}catch(error){if(engine!=='webkit'||!error.message.includes('WebKit encountered an internal error'))throw error;offlineReload=false;}
  await phone.page.waitForFunction(()=>window.HablaAccounts&&HablaStore.active());
  assert.equal(await phone.page.locator('#accountsRoot [role="dialog"]').count(),0);
  assert.equal(await phone.page.evaluate(()=>wb.notes['u4-1']),'Escrito sem internet');assert.equal(await phone.page.evaluate(()=>data.activity['2026-11-14'].attempts),5);
  await offline(phone,false);await settled(phone.page);await pc.page.waitForFunction(()=>data.activity['2026-11-14'].attempts===9&&wb.notes['u4-1']==='Escrito sem internet');
  await phone.page.waitForFunction(()=>wb.notes['u5-1']==='Escrito no computador'&&data.activity['2026-11-14'].attempts===9);
  checks.push((offlineReload?'PWA recarrega offline com alterações pendentes':'WebKit Windows devolve erro interno ao recarregar offline; página mantém alterações pendentes')+'; reconexão reúne exercícios e soma 2+4 atividades sem duplicar as 3 anteriores');
  // Exclusão e última edição do mesmo registro seguem a confirmação do Firestore.
  await phone.page.evaluate(()=>{data.doubts=[];save();});await pc.page.waitForFunction(()=>data.doubts.length===0);
  await phone.page.evaluate(()=>{wb.notes['u2-1']='Primeira edição';wbSave();});await settled(phone.page);await pc.page.waitForFunction(()=>wb.notes['u2-1']==='Primeira edição');
  await pc.page.evaluate(()=>{wb.notes['u2-1']='Última edição';wbSave();});await settled(pc.page);await phone.page.waitForFunction(()=>wb.notes['u2-1']==='Última edição');
  checks.push('Exclusões sincronizadas e última edição confirmada do mesmo registro');
  // Retomada explícita evita interromper o que já está aberto no outro aparelho.
  await pc.page.evaluate(()=>HablaApp.checkpoint());await settled(pc.page);
  await phone.page.waitForFunction(()=>!document.getElementById('resumeNotice').hidden);await phone.page.locator('[data-sync-resume]').click();
  assert.equal(await phone.page.locator('#labAnswer').inputValue(),'Resposta em andamento');
  checks.push('Retoma uma sessão de revisão com o texto digitado no outro dispositivo');
  await phone.page.locator('#accountButton').click();const downloadPromise=phone.page.waitForEvent('download');await phone.page.locator('[data-account="backup"]').click();const download=await downloadPromise;const backupFile=path.resolve('test-results/sync-backup.json');await download.saveAs(backupFile);const backup=JSON.parse(fs.readFileSync(backupFile));assert.equal(backup.version,2);assert.equal(backup.workbookState.notes['u4-1'],'Escrito sem internet');
  await phone.page.locator('[data-account="logout"]').click();await phone.page.waitForFunction(()=>!HablaStore.active());assert.equal(await phone.page.evaluate(()=>data.doubts[0]?.id),'legacy-doubt');
  checks.push('Backup JSON v2 da conta e saída restauram o perfil local sem misturar históricos');
  const bobEmail='bob-'+Date.now()+'@example.test';
  await email(phone.page,bobEmail,true);await phone.page.locator('[data-account="use-empty"]').click();await settled(phone.page);assert.equal(await phone.page.evaluate(()=>Object.keys(wb.notes).length),0);assert.equal(await phone.page.evaluate(()=>Object.keys(data.progress).length),0);
  const bobUid=await phone.page.evaluate(()=>HablaStore.active());assert.notEqual(bobUid,uid);await phone.page.locator('[data-account="close"]').click();
  // Recursos geram apenas links; não fazem chamadas externas antes da escolha.
  await phone.page.locator('[data-resources-open]:visible').first().click();await phone.page.locator('#resourceTerm').fill('¿Qué tal?');
  assert.equal(await phone.page.locator('[data-resource="wordreference"]').getAttribute('href'),'https://www.wordreference.com/espt/%C2%BFQu%C3%A9%20tal%3F');
  assert.equal(await phone.page.locator('[data-resource="youglish"]').getAttribute('href'),'https://youglish.com/pronounce/%C2%BFQu%C3%A9%20tal%3F/spanish/la');assert.equal(await phone.page.locator('#resourceLinks a[href]').count(),4);
  assert.ok(await phone.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.page.locator('[data-resources-close]').click();
  await phone.page.locator('#accountButton').click();assert.ok(await phone.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.page.screenshot({path:'test-results/accounts-mobile.png',fullPage:true});
  checks.push('Outra conta começa isolada; quatro consultas externas codificadas; diálogos cabem na largura móvel');
  await offline(phone,true);await phone.page.evaluate(()=>{wb.notes['u1-1']='Pendente de Bob';wbSave();});await phone.page.locator('[data-account="logout"]').click();await phone.page.waitForFunction(()=>!HablaStore.active());
  await offline(phone,false);await email(phone.page,bobEmail);await settled(phone.page);
  assert.equal(await phone.page.evaluate(()=>wb.notes['u1-1']),'Pendente de Bob');assert.equal(await pc.page.evaluate(()=>wb.notes['u1-1']),'Minha nota antiga');
  checks.push('Saída offline guarda pendências da conta; nova entrada envia sem misturar o perfil de outro aluno');
  const google=await device();await google.page.waitForFunction(()=>HablaAccounts.status().phase==='signedout');
  const popupPromise=google.page.waitForEvent('popup');await google.page.locator('[data-account="google"]').click();const popup=await popupPromise;
  await popup.waitForLoadState();assert.ok(popup.url().startsWith('http://127.0.0.1:9099/'));await popup.close();
  await google.page.waitForFunction(()=>document.querySelector('.account-message')?.textContent.includes('janela'));assert.equal(await google.page.evaluate(()=>HablaStore.active()),null);
  assert.ok(await google.page.locator('.account-welcome').isVisible());
  assert.equal(await google.page.evaluate(()=>localStorage.getItem('habla.account.welcome.v1')),null);
  assert.equal(await google.page.locator('.app-shell').evaluate(node=>node.inert),true);
  await offline(google,true);assert.ok(await google.page.locator('.account-connection').isVisible());assert.equal(await google.page.locator('[data-account="google"]').isDisabled(),true);
  assert.equal(await google.page.locator('[data-account="close"]').count(),0);
  await offline(google,false);await google.page.waitForFunction(()=>!document.querySelector('[data-account="google"]').disabled);
  checks.push('Popup Google cancelado mantém a apresentação; primeira entrada offline pede conexão e volta a permitir login ao reconectar');
  assert.deepEqual(errors,[]);const report={engine,checks,errors,transportWarnings};console.log(JSON.stringify(report,null,2));fs.writeFileSync('test-results/sync-browser-'+engine+'.json',JSON.stringify(report,null,2));
 }catch(error){
  fs.writeFileSync('test-results/sync-browser-'+engine+'.json',JSON.stringify({engine,checks,errors,transportWarnings,failure:error.message},null,2));
  console.error(JSON.stringify({checks,errors}));
  for(let i=0;i<contexts.length;i++)for(const page of contexts[i].pages()){
   await page.screenshot({path:'test-results/sync-failure-'+i+'.png',fullPage:true}).catch(()=>{});
   console.error(await page.evaluate(()=>({status:window.HablaAccounts?.status(),main:window.HablaStore?.snapshot()['habla_espanol_2026_v1'],notes:window.HablaStore?.snapshot()['frecuencias.a1.caderno.v2']?.notes})).catch(()=>({})));
  }
  throw error;
 }finally{for(const context of contexts)await context.close();await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
