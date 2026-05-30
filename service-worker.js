// 오프라인 캐싱용 서비스 워커
// 코드를 수정하면 CACHE 버전을 올려야 사용자에게 새 버전이 반영됩니다.
const CACHE = 'saju-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './saju_engine.mjs',
  './saju_text.mjs',
  './saju_descriptions.mjs',
  './manseryeok.mjs',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        // 동일 출처 응답만 캐시에 갱신 저장
        if (res && res.status === 200 && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
