// Network-first for the app, falls back to cache when offline. Bump C to force a refresh.
const C='voyage-v3',A=['./','index.html','manifest.json','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const p=r.clone();caches.open(C).then(c=>c.put(e.request,p))}return r})
  .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))))});
