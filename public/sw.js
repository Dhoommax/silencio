const CACHE = 'silencio-shell-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/','/manifest.json']))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => caches.match('/')))));