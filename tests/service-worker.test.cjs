const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base='https://example.test/habla-a1/';
function setup(){
 const handlers={},stores=new Map(),network=[];
 const key=r=>new URL(typeof r==='string'?r:r.url,base).href;
 const caches={
  async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {
   async match(req){return map.get(key(req))?.clone();},
   async put(req,res){if(res.status===206)throw Error('partial cannot be cached');map.set(key(req),res.clone());},
   async keys(){return [...map.keys()].map(url=>new Request(url));},async addAll(){}
  };},async match(req){for(const map of stores.values())if(map.has(key(req)))return map.get(key(req)).clone();},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
 };
 const context={URL,Request,Response,Headers,caches,console,
  fetch:async req=>{network.push(req);return new Response(Uint8Array.from([0,1,2,3,4,5,6,7,8,9]),{headers:{'Content-Type':'audio/mpeg'}});},
  self:{location:{origin:'https://example.test'},registration:{scope:base},clients:{claim:async()=>{}},addEventListener:(n,f)=>handlers[n]=f}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('sw.js','utf8'),context);
 return {context,handlers,caches,stores,network,
  async request(range){let promise;const headers=range?{Range:range}:{};handlers.fetch({request:new Request(base+'audio/clips/test.mp3',{headers}),respondWith:p=>promise=p});return promise;},
  async activate(){let promise;handlers.activate({waitUntil:p=>promise=p});await promise;}};
}
test('Range de dois bytes recebe 206 correto e armazena apenas resposta completa',async()=>{
 const h=setup(),r=await h.request('bytes=0-1');assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 0-1/10');assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[0,1]);
 assert.equal(h.network[0].headers.has('range'),false);
 const again=await h.request();assert.equal(again.status,200);assert.equal(h.network.length,1);
});
test('Range aberto, sufixo, limite e erro 416',async()=>{
 const h=setup();
 for(const [range,status,length,contentRange] of [['bytes=5-',206,5,'bytes 5-9/10'],['bytes=-3',206,3,'bytes 7-9/10'],['bytes=7-99',206,3,'bytes 7-9/10'],['bytes=10-',416,0,'bytes */10'],['bytes=6-2',416,0,'bytes */10']]){
  const r=await h.request(range);assert.equal(r.status,status);assert.equal((await r.arrayBuffer()).byteLength,length);assert.equal(r.headers.get('Content-Range'),contentRange);
 }
});
test('atualização migra MP3 antigos e preserva caches de outros aplicativos',async()=>{
 const h=setup();const old=await h.caches.open('habla-a1-app-v9-neural-audio');await old.put(base+'audio/clips/saved.mp3',new Response('saved'));
 const foreign=await h.caches.open('another-app');await foreign.put(base+'other',new Response('other'));
 await h.activate();assert.equal(h.stores.has('habla-a1-app-v9-neural-audio'),false);assert.equal(h.stores.has('another-app'),true);
 const audio=await h.caches.open('habla-a1-audio-v1');assert.equal(await (await audio.match(base+'audio/clips/saved.mp3')).text(),'saved');
});
test('falha de espaço não bloqueia reprodução',async()=>{
 const h=setup();const open=h.caches.open;h.caches.open=async name=>{const cache=await open(name);cache.put=async()=>{throw Error('quota');};return cache;};
 assert.equal((await h.request('bytes=0-1')).status,206);
});
test('Cache API indisponível ainda permite MP3 online',async()=>{
 const h=setup();h.caches.open=async()=>{throw Error('storage disabled');};
 assert.equal((await h.request()).status,200);assert.equal(h.network.length,1);
});
test('catálogo offline e HTTP 503 usam cópia instalada',async()=>{
 const h=setup();const cache=await h.caches.open(vm.runInContext('CACHE',h.context));await cache.put('./audio/index.json',new Response('{"clips":{}}'));
 for(const fetch of [async()=>{throw Error('offline');},async()=>new Response('unavailable',{status:503})]){
  h.context.fetch=fetch;let promise;h.handlers.fetch({request:new Request(base+'audio/index.json'),respondWith:p=>promise=p});
  assert.equal(await (await promise).text(),'{"clips":{}}');
 }
});
