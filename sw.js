/* Habla A1 — cache offline. Dados de estudo ficam apenas no dispositivo. */
const CACHE='habla-a1-app-v5-review';
const ASSETS=['./','./index.html','./manifest.webmanifest','./study-lab.css','./study-lab.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('habla-a1-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
if(req.mode==='navigate'){event.respondWith(fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put('./index.html',clone));}return response;}).catch(()=>caches.match('./index.html')));return;}
event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone));}return response;})));
});

self.addEventListener('notificationclick',event=>{event.notification.close();const dest=new URL('./',self.registration.scope).href;event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{for(const win of windows){if(win.url.startsWith(self.registration.scope)){return win.focus();}}return clients.openWindow(dest);}));});
