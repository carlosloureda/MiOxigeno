// Service worker: caché de la app para uso offline.
// La versión viene de version.js (no hay que tocar nada aquí al publicar).
importScripts('version.js');

var CACHE = 'oxi-cache-' + APP_VERSION;
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './version.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Sin skipWaiting automático: la versión nueva espera a que la usuaria pulse "Actualizar",
// para no recargar la app mientras está rellenando una medición.
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      // Migración desde la 1.0.0 (cachés "oxi-cache-v1/v2/v3", sin aviso de actualización):
      // se activa sin esperar. No recarga la pantalla; la siguiente apertura ya trae lo nuevo.
      if (keys.some(function (k) { return /^oxi-cache-v\d+$/.test(k); })) self.skipWaiting();
      return caches.open(CACHE);
    }).then(function (c) {
      // cache:'reload' salta la caché HTTP del navegador (GitHub Pages añade max-age=600),
      // para no guardar en la caché nueva archivos viejos.
      return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Network-first: con internet siempre se coge lo último; sin internet, caché.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache = revalidar siempre con el servidor (usa 304 si no cambió): lo último, sin descargar de más.
    fetch(e.request, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok && new URL(e.request.url).origin === location.origin) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
