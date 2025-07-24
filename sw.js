const CACHE_NAME = 'appreceta-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://i.ibb.co/ns9sT96c/Logo-julio-20250712-140428-0000.png',
  'https://i.ibb.co/ksDjwNyb/20250711-225539-0000.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Evento de instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Evento de fetch (interceptar peticiones)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, lo retorna. Si no, lo busca en la red.
        return response || fetch(event.request);
      })
  );
});