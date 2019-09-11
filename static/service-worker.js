const cacheName = 'cache-v1';
const precacheResources = [
  '/',
  '/posts/',
  'index.html',
  '/bundle.min.js',
  '/main.min.css',
  '/fonts/Inter-UI-Regular.woff2',
  '/fonts/Inter-UI-Bold.woff2',
  '/fonts/Inter-UI-Regular.woff',
  '/fonts/Inter-UI-Bold.woff',
];

self.addEventListener('install', event => {
  console.log('Service worker install event!');
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => {
        return cache.addAll(precacheResources);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service worker activate event!');
});

self.addEventListener('fetch', event => {
  console.log('Fetch intercepted for:', event.request.url);
  event.respondWith(caches.match(event.request)
    .then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
