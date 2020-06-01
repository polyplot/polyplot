self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('sw-cache').then(function(cache) {
      return cache.addAll( [
          'index.html',
          'book.txt',
          'book.css',
          'book.js',
          'icons/128x128.png',
          'basement/jquery.min.js',
          'basement/polyplot.js',
          'basement/polyplot.css',
          'basement/sw.js'
        ]
      );
    })
  );
});
 
self.addEventListener('fetch', event => {
  console.log('Fetch event for ', event.request.url);
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      if (response) {
        console.log('Found ', event.request.url, ' in cache');
        return response;
      }
      console.log('Network request for ', event.request.url);
      return fetch(event.request)

      // TODO 4 - Add fetched files to the cache

    }).catch(error => {

      // TODO 6 - Respond with custom offline page

    })
  );
});