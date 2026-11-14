const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('gerador publica somente configuração Web e preserva o arquivo quando faltar um campo',()=>{
 fs.mkdirSync('test-results',{recursive:true});const dir=fs.mkdtempSync(path.resolve('test-results/firebase-config-'));fs.mkdirSync(path.join(dir,'tools'));fs.copyFileSync('tools/configure-firebase.cjs',path.join(dir,'tools/configure-firebase.cjs'));
 const destination=path.join(dir,'firebase-config.js');fs.writeFileSync(destination,'placeholder');
 const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot};
 fs.writeFileSync(path.join(dir,'.env'),'AZURE_SPEECH_KEY=fake-private-value\nFIREBASE_API_KEY=public-key\n');
 let result=spawnSync(process.execPath,[path.join(dir,'tools/configure-firebase.cjs')],{env,encoding:'utf8'});assert.notEqual(result.status,0);assert.equal(fs.readFileSync(destination,'utf8'),'placeholder');assert.ok(!result.stderr.includes('fake-private-value'));
 fs.appendFileSync(path.join(dir,'.env'),'FIREBASE_PROJECT_ID=demo-habla\nFIREBASE_AUTH_DOMAIN=demo-habla.firebaseapp.com\nFIREBASE_APP_ID=1:123:web:test\nGOOGLE_PRIVATE_KEY=fake-other-secret\n');
 result=spawnSync(process.execPath,[path.join(dir,'tools/configure-firebase.cjs')],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const publicText=fs.readFileSync(destination,'utf8');assert.ok(publicText.includes('public-key'));assert.ok(!publicText.includes('fake-private-value'));assert.ok(!publicText.includes('fake-other-secret'));assert.ok(!publicText.includes('AZURE_SPEECH_KEY'));
});
