const CACHE_NAME = 'constructa-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Instalação: Cacheia os arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar requisições externas (Supabase, CDNs, etc) exceto nossas imagens
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // 2. Estratégia App Shell para Navegação (HTML)
  // Se for uma navegação (abrir app, recarregar, digitar URL), SEMPRE retorna o index.html do cache.
  // Isso corrige o erro 404 ao abrir o app em rotas como /transactions.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cachedResponse) => {
        // Retorna o HTML do cache se existir, senão tenta a rede
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // 3. Estratégia Stale-While-Revalidate para Assets (CSS, JS, Imagens Locais)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Atualiza o cache com a versão mais nova da rede
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Se falhar a rede e não tiver cache, falha silenciosamente ou retorna nada
        });
        
        // Retorna o cache se tiver, senão espera a rede
        return cachedResponse || fetchPromise;
      });
    })
  );
});