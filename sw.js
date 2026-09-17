const CACHE = 'po-prep-v15';
const ASSETS = ['./', './index.html', './styles.css', './src/app.js', './src/analytics.js', './src/questions.js', './src/storage.js', './src/markdown.js', './src/review.js', './src/review-ai.js', './src/mock-builder.js', './src/progress.js', './src/ai.js', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];
const STATIC_URLS = new Set(ASSETS.map((asset) => new URL(asset, self.location.href).href));

self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !STATIC_URLS.has(url.href) || event.request.headers.has('authorization')) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && response.type === 'basic') caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
