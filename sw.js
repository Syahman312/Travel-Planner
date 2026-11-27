// App files: network-first, but fall back to cache after 3s (slow roaming data) or when offline.
// Leaflet (versioned CDN files): cache-first, so maps work offline once opened. Bump C to force a refresh.
const C='voyage-v8',LIB='voyage-lib-1',A=['./','index.html','manifest.json','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==LIB).map(x=>caches.delete(x)))).then(()=>clients.claim())));
const cached=q=>caches.match(q,{ignoreSearch:true}).then(r=>r||(q.mode==='navigate'?caches.match('index.html'):undefined));
self.addEventListener('fetch',e=>{const q=e.request,u=new URL(q.url);if(q.method!=='GET')return;
 if(u.hostname==='cdnjs.cloudflare.com'&&u.pathname.includes('/leaflet/'))
  return e.respondWith(caches.open(LIB).then(c=>c.match(q).then(r=>r||fetch(q).then(n=>{if(n.ok||n.type==='opaque')c.put(q,n.clone());return n}))));
 if(u.origin!==location.origin)return;
 const net=fetch(q).then(r=>{if(r.ok){const p=r.clone();caches.open(C).then(c=>c.put(q,p))}return r});
 e.waitUntil(net.catch(()=>{}));
 e.respondWith(new Promise(ok=>{let done=0;const fb=()=>cached(q).then(r=>{if(r&&!done){done=1;ok(r)}return r});
  const t=setTimeout(fb,3000);
  net.then(r=>{clearTimeout(t);if(!done){done=1;ok(r)}}).catch(()=>{clearTimeout(t);fb().then(r=>{if(!done){done=1;ok(r||Response.error())}})})}))});
