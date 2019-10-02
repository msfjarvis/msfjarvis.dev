const oldCaches = ['cache-v1', 'cache-v2', 'cache-v3']
const cacheName = 'cache-v4'
const precacheResources = [
  '/',
  '/posts/',
  'index.html',
  '/bundle.min.js',
  '/main.min.css',
  '/fonts/Inter-UI-Bold.woff',
  '/fonts/Inter-UI-Medium.woff',
  '/fonts/Inter-UI-Medium.woff2',
  '/fonts/Inter-UI-Italic.woff',
  '/fonts/Inter-UI-Regular.woff',
  '/fonts/Inter-UI-Italic.woff2',
  '/fonts/Inter-UI-MediumItalic.woff2',
  '/fonts/Inter-UI-MediumItalic.woff',
  '/fonts/Inter-UI-BoldItalic.woff',
  '/fonts/Inter-UI-Regular.woff2',
  '/fonts/Inter-UI-Bold.woff2',
  '/fonts/Inter-UI-BoldItalic.woff2',
  '/static/fonts/icomoon.eot',
  '/static/fonts/icomoon.svg',
  '/static/fonts/icomoon.ttf',
  '/static/fonts/icomoon.woff',
  '/posts/how-to-get-involved-in-open-source/index.html',
  '/posts/i-m-gonna-blog/index.html',
  '/posts/tools-for-effective-rust-development/index.html',
  '/posts/understanding-and-resolving-selinux-denials-on-android/index.html',
  '/posts/teaching-kotlin-kotlin-for-android-java-developers/index.html',
  '/posts/teaching-kotlin-classes-and-objects/index.html',
  '/posts/teaching-kotlin-variables/index.html'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(precacheResources)
    })
  )
})

self.addEventListener('activate', event => {
  for (id in oldCaches) {
    self.caches.delete(id)
  }
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(event.request)
    })
  )
})
