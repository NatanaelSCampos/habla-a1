/* Habla A1 · Cache do aplicativo separado dos MP3 já ouvidos. */
const CACHE='habla-a1-app-v11-structure';
const AUDIO_CACHE='habla-a1-audio-v1';
const ASSETS=['./','./index.html','./assets/css/app.css','./assets/js/content.js','./assets/js/verbs.js','./assets/js/workbook.js','./assets/js/app.js','./manifest.webmanifest','./study-lab.css','./study-lab.js','./doubts.css','./doubts.js','./coach.css','./coach.js','./quick-doubt.css','./quick-doubt.js','./audio-player.js','./audio/index.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const clipPath=new URL('./audio/clips/',self.registration.scope).pathname;
const isClip=url=>url.origin===self.location.origin&&url.pathname.startsWith(clipPath)&&url.pathname.endsWith('.mp3');
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const audio=await caches.open(AUDIO_CACHE);
  for(const key of await caches.keys()){
   if(!key.startsWith('habla-a1-app-')||key===CACHE)continue;
   const old=await caches.open(key);
   let migrated=true;
   for(const req of await old.keys())if(isClip(new URL(req.url))){
    try{const res=await old.match(req);if(res?.status===200)await audio.put(req,res);}catch(_){migrated=false;}
   }
   // Conserva o cache antigo se faltar espaço para migrar um MP3.
   if(migrated)await caches.delete(key);
  }
  await self.clients.claim();
 })());
});
async function partial(response,range){
 if(!range)return response;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 if(!match||(!match[1]&&!match[2]))return response;
 const body=await response.arrayBuffer(),size=body.byteLength;
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 const headers=new Headers(response.headers);
 headers.delete('content-encoding');headers.set('Accept-Ranges','bytes');
 if(start>=size||end<start||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){
  headers.set('Content-Range','bytes */'+size);headers.set('Content-Length','0');
  return new Response(null,{status:416,headers});
 }
 headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);
 headers.set('Content-Length',String(end-start+1));
 return new Response(body.slice(start,end+1),{status:206,headers});
}
async function audioResponse(req){
 const full=new Request(req.url,{credentials:'same-origin'});
 let cache,response;
 try{cache=await caches.open(AUDIO_CACHE);response=await cache.match(full)||await caches.match(full);}catch(_){}
 if(!response){
  // GET completo: o Cache API não aceita guardar respostas parciais 206.
  response=await fetch(full);
  if(response.status===200&&cache){try{await cache.put(full,response.clone());}catch(_){}}
 }
 return response.status===200?partial(response,req.headers.get('range')):response;
}
async function networkFirst(req,key){
 const cache=await caches.open(CACHE);
 try{
  const res=await fetch(req);
  if(res.ok){try{await cache.put(key,res.clone());}catch(_){}return res;}
  return await cache.match(key)||res;
 }catch(_){return await cache.match(key)||Response.error();}
}
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(isClip(url)){event.respondWith(audioResponse(req).catch(()=>Response.error()));return;}
 if(url.pathname===new URL('./audio/index.json',self.registration.scope).pathname){event.respondWith(networkFirst(req,'./audio/index.json'));return;}
 // HTML e scripts usam a mesma versão instalada do aplicativo.
 if(req.mode==='navigate'){event.respondWith(caches.open(CACHE).then(async cache=>await cache.match('./index.html')||fetch(req)));return;}
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const cached=await cache.match(req);if(cached)return cached;
  const res=await fetch(req);
  if(res.status===200){try{await cache.put(req,res.clone());}catch(_){}}
  return res;
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const dest=new URL('./',self.registration.scope).href;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
  for(const win of windows)if(win.url.startsWith(self.registration.scope))return win.focus();
  return clients.openWindow(dest);
 }));
});
