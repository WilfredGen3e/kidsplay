// Sjabloon: vite.config.ts vult versie en bestandslijst in en schrijft dist/sw.js.
const CACHE = 'familiespellen-__VERSION__';
const FILES = __FILES__;

// Elk bestand rechtstreeks van de server (`cache: 'reload'`). `cache.addAll` leest uit de HTTP-cache: GitHub Pages
// geeft bestanden 10 minuten max-age, en dan belandde een oude index.html in de cache van de nieuwe versie, met
// verwijzingen naar bestanden die al van de server waren. Gevolg: een kaal scherm.
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    FILES.map(async (file) => {
      const response = await fetch(new Request(file, { cache: 'reload' }));
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      await cache.put(file, response);
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) => hit || fetch(event.request).catch(() => caches.match('./')),
    ),
  );
});
