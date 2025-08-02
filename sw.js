// sw.js (Service Worker)

const CACHE_NAME = 'appreceta-cache-v3'; // Incrementamos la versión para forzar la actualización
// Lista de todos los archivos de nuestra app
const urlsToCache = [
  '/',
  'index.html',
  'app.html',
  'sintomas.html',
  'receta.html',
  'pago.html',
  'urgencia.html',
  'style.css',
  'script.js',
  'sintomas.js',
  'manifest.json',
  'https://i.ibb.co/ksDjwNyb/20250711-225539-0000.png',
  'https://i.ibb.co/ns9sT96c/Logo-julio-20250712-140428-0000.png'
];

// Evento 'install': Guarda los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Responde con los archivos en caché cuando no hay conexión
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Evento 'activate': Limpia cachés antiguos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
