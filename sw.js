'use strict';
// Cache only the app shell. User records remain solely in existing localStorage.
const CACHE_PREFIX='compass-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE_NAME=CACHE_PREFIX+'firebase-start-today-v1';
const ASSETS=['./','index.html','styles.css','responsive.css','app.js','firebaseConfig.js','syncCore.js','sync.js','firebaseAdapter.js','farData.js','farWorkload.js','programs.js','planner.js','planningTools.js','spacedReview.js','universities.js','universityData.js','universityLibrary.js','mobile.js','pwa.js','manifest.webmanifest','icons/character-icon.png'];
const assetURLs=ASSETS.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(assetURLs.map(url=>new Request(url,{cache:'reload'})))));
  // Updates wait until the user saves any form and chooses to reload.
});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const clean=url.origin+url.pathname,isNavigation=request.mode==='navigate';
  if(!isNavigation&&!assetURLs.includes(clean))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME),cached=await cache.match(isNavigation?new URL('index.html',scope).href:clean);
    if(cached)return cached;
    // Network fallback never writes application/user data into the cache.
    return fetch(request);
  })());
});
