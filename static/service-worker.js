self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keyList => {
        return Promise.all(
          keyList.map(key => {
            return caches.delete(key)
          })
        )
      })
      .then(self.clients.claim())
  )
})

navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.unregister()
  })
})
