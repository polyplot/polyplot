const filesToCache = [
	'index.html',
	'book.txt',
	'book.css',
	'book.js',
	'sw.js',
	'icons/128x128.png',
	'basement/jquery.min.js',
	'basement/polyplot.js',
	'basement/polyplot.css'
]

const staticCacheName = 'pages-cache-v1';

self.addEventListener('install', event => {
  console.log('Attempting to install service worker and cache static assets');
  event.waitUntil(
    caches.open(staticCacheName)
    .then(cache => {
      return cache.addAll(filesToCache);
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
		.then(response => {
		  // TODO 5 - Respond with custom 404 page
		  return caches.open(staticCacheName).then(cache => {
			cache.put(event.request.url, response.clone());
			return response;
		  });
		});
    }).catch(error => {
      // TODO 6 - Respond with custom offline page
    })
  );
});