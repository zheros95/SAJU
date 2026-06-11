// 오프라인 캐싱용 서비스 워커
// 코드를 수정하면 CACHE 버전을 올려야 사용자에게 새 버전이 반영됩니다.
const CACHE = 'saju-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './saju_engine.mjs',
  './saju_text.mjs',
  './saju_descriptions.mjs',
  './manseryeok.mjs',
  './physiognomy.mjs',
  './palmistry.mjs',
  './integration.mjs',
  './glossary.mjs',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
// 참고: 관상(face-api) 라이브러리·모델은 외부 CDN이라 캐시 대상이 아닙니다.
//       사주·수상은 완전 오프라인 동작, 관상 최초 1회만 인터넷이 필요합니다.

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
