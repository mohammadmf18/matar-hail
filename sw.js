const CACHE='matar-hail-v2';
const ASSETS=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('matar-hail-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==self.location.origin||e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(e.request))))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(self.registration.scope))});
