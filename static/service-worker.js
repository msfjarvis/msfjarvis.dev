const oldCaches = ['cache-v1', 'cache-v2']
const cacheName = 'cache-v3';
const precacheResources = [
  '/',
  '/posts/',
  'index.html',
  '/bundle.min.js',
  '/main.min.css',
  '/fonts/Inter-UI-Bold.woff',
  '/fonts/Inter-UI-Medium.woff',
  '/fonts/Inter-UI-Medium.woff2',
  '/fonts/fa-brands-400.woff',
  '/css/fontawesome-5.9.0-all.min.css',
  '/fonts/fa-solid-900.woff2',
  '/fonts/Inter-UI-Italic.woff',
  '/fonts/Inter-UI-Regular.woff',
  '/fonts/Inter-UI-Italic.woff2',
  '/fonts/Inter-UI-MediumItalic.woff2',
  '/fonts/Inter-UI-MediumItalic.woff',
  '/fonts/Inter-UI-BoldItalic.woff',
  '/fonts/Inter-UI-Regular.woff2',
  '/fonts/Inter-UI-Bold.woff2',
  '/fonts/fa-solid-900.woff',
  '/fonts/Inter-UI-BoldItalic.woff2',
  '/fonts/fa-brands-400.woff2',
  '/posts/how-to-get-involved-in-open-source/index.html',
  '/posts/i-m-gonna-blog/index.html',
  '/posts/tools-for-effective-rust-development/index.html',
  '/posts/understanding-and-resolving-selinux-denials-on-android/index.html',
  '/posts/teaching-kotlin-kotlin-for-android-java-developers/index.html',
  '/posts/teaching-kotlin-classes-and-objects/index.html',
];

for (id in oldCaches) {
  caches.open(id).then(cache =>
    cache.keys().then(keys => {
      for (let key of keys) {
        cache.delete(key)
      }
    })
  )
}

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
