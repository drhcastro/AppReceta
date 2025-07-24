// sw.js - Service Worker Básico

const CACHE_NAME = 'appreceta-cache-v1';
// Lista de archivos que se guardarán en caché para que la app funcione sin conexión
const urlsToCache = [
  '/',
  'index.html',
  'app.html',
  'urgencia.html',
  'pago.html',
  'style.css',
  'script.js',
  'manifest.json',
  'https://i.ibb.co/ns9sT96c/Logo-julio-20250712-140428-0000.png',
  'https://i.ibb.co/ksDjwNyb/20250711-225539-0000.png'
];

// Evento 'install': Se dispara cuando el Service Worker se instala
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la app pide un recurso (imagen, script, etc.)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en caché, lo devuelve. Si no, lo busca en la red.
        return response || fetch(event.request);
      }
    )
  );
});
