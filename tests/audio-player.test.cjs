const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup({manifest={clips:{Hola:'clips/hola.mp3',Adiós:'clips/adios.mp3'}},defer=false,failFirst=false,available=[{lang:'es-MX'}],synthesis=true}={}){
 const audio=[],spoken=[],messages=[],timers=new Map(),events={};
 let timerId=0,resolveFetch,calls=0,voiceList=available;
 const node={hidden:true,textContent:''};
 class Audio{
  constructor(src){this.src=src;audio.push(this);}
  play(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
  pause(){this.paused=true;}
  removeAttribute(){this.src='';}
  load(){}
 }
 const context={Audio,AbortController,console,document:{getElementById:()=>node},toast:m=>messages.push(m),
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
  addEventListener:(name,fn)=>events[name]=fn,
  fetch:()=>{calls++;if(failFirst&&calls===1)return Promise.reject(Error('offline'));if(defer&&calls===1)return new Promise(resolve=>resolveFetch=resolve);return Promise.resolve({ok:true,json:async()=>manifest});},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  speechSynthesis:{getVoices:()=>voiceList,cancel(){},speak:u=>spoken.push(u),resume(){}}
 };
 context.window=context;
 if(!synthesis){delete context.speechSynthesis;delete context.SpeechSynthesisUtterance;}
 vm.runInNewContext(fs.readFileSync(process.env.HABLA_PLAYER_SOURCE||'audio-player.js','utf8'),context);
 return {api:context.HablaAudio,audio,spoken,messages,node,events,timers,
  setVoices:v=>voiceList=v,
  resolve:()=>resolveFetch({ok:true,json:async()=>manifest}),
  timeout(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(f=>f());}};
}
test('MP3 com normalização de texto e velocidade; nenhuma síntese paralela',async()=>{
 const h=setup();await flush();assert.equal(h.api.play('  Hola\n',.7),true);
 assert.equal(h.audio[0].src,'./audio/clips/hola.mp3');assert.equal(h.audio[0].playbackRate,.7);assert.equal(h.spoken.length,0);
 h.audio[0].onplaying();assert.equal(h.node.textContent,'Reproduzindo espanhol…');
 h.audio[0].onended();assert.equal(h.node.hidden,true);
});
test('error de mídia e rejeição de play acionam uma única alternativa',async()=>{
 const h=setup();await flush();h.api.play('Hola');const a=h.audio[0];a.onerror();a.reject(Error('decode'));await flush();
 assert.equal(h.spoken.length,1);assert.equal(a.paused,true);
});
test('rejeição atrasada da frase anterior não interrompe a nova',async()=>{
 const h=setup();await flush();h.api.play('Hola');const a=h.audio[0];h.api.play('Adiós');a.reject(Error('aborted'));await flush();
 assert.equal(h.spoken.length,0);assert.equal(h.audio[1].src,'./audio/clips/adios.mp3');
});
test('primeiro toque aguarda catálogo; stop cancela a continuação pendente',async()=>{
 const h=setup({defer:true});h.api.play('Hola');assert.equal(h.spoken.length,0);h.api.stop();h.resolve();await flush();
 assert.equal(h.audio.length,0);assert.equal(h.spoken.length,0);
 const j=setup({defer:true});j.api.play('Hola');j.resolve();await flush();assert.equal(j.audio.length,1);assert.equal(j.spoken.length,0);
});
test('toques durante o carregamento só reproduzem a última frase',async()=>{
 const h=setup({defer:true});h.api.play('Hola');h.api.play('Adiós');h.resolve();await flush();
 assert.equal(h.audio.length,1);assert.equal(h.audio[0].src,'./audio/clips/adios.mp3');
});
test('bloqueio de permissão pede novo toque sem trocar a voz gravada',async()=>{
 const h=setup();await flush();h.api.play('Hola');h.audio[0].reject({name:'NotAllowedError'});await flush();
 assert.equal(h.spoken.length,0);assert.equal(h.messages.length,1);assert.match(h.messages[0],/Toque/);assert.equal(h.node.hidden,true);
});
test('carregamento de MP3 travado usa alternativa uma vez e libera o player',async()=>{
 const h=setup();await flush();h.api.play('Hola');h.timeout();assert.equal(h.spoken.length,1);h.timeout();
 assert.equal(h.node.hidden,true);assert.match(h.messages[0],/voz do aparelho/);
});
test('lista de vozes tardia é consultada de novo; prioriza México',async()=>{
 const h=setup({available:[]});await flush();h.api.play('Sin grabación');assert.equal(h.spoken[0].lang,'es-MX');
 h.setVoices([{lang:'es-ES'},{lang:'es-AR'},{lang:'es-MX'}]);h.api.play('Otra frase',1);
 assert.equal(h.spoken[1].voice.lang,'es-MX');assert.equal(h.spoken[1].rate,1);
});
test('não escolhe voz portuguesa quando falta voz espanhola',async()=>{
 const h=setup({available:[{lang:'pt-BR'}]});await flush();assert.equal(h.api.play('Sin grabación'),false);
 assert.equal(h.spoken.length,0);assert.match(h.messages[0],/instale uma voz em espanhol/);
});
test('sem Web Speech continua reproduzindo MP3 e avisa sobre frases ausentes',async()=>{
 const h=setup({synthesis:false});await flush();assert.equal(h.api.play('Hola'),true);assert.equal(h.api.play('Sin grabación'),false);
 assert.equal(h.messages.length,1);
});
test('caminhos externos ou com travessia nunca viram requisições de mídia',async()=>{
 const h=setup({manifest:{clips:{Hola:'../private.mp3',Adiós:'https://external/x.mp3'}}});await flush();h.api.play('Hola');
 assert.equal(h.audio.length,0);assert.equal(h.spoken.length,1);assert.equal(h.api.stats().generated,0);
});
test('callbacks obsoletos de síntese não encerram a gravação seguinte',async()=>{
 const h=setup();await flush();h.api.play('Otra');const end=h.spoken[0].onend;h.api.play('Hola');end();
 assert.equal(h.audio[0].paused,undefined);assert.equal(h.node.hidden,false);
});
test('pagehide cancela áudio e feedback',async()=>{
 const h=setup();await flush();h.api.play('Hola');h.events.pagehide();assert.equal(h.audio[0].paused,true);assert.equal(h.node.hidden,true);
});
test('catálogo que falhou na abertura é tentado novamente no próximo toque',async()=>{
 const h=setup({failFirst:true});await flush();assert.equal(h.api.stats().ready,false);
 h.api.play('Hola');await flush();assert.equal(h.api.stats().ready,true);assert.equal(h.audio[0].src,'./audio/clips/hola.mp3');assert.equal(h.spoken.length,0);
});
