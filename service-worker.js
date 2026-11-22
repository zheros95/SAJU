// 오프라인 캐싱용 서비스 워커
// 코드를 수정하면 CACHE 버전을 올려야 사용자에게 새 버전이 반영됩니다.
const CACHE = 'saju-v24';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './saju_engine.mjs',
  './saju_text.mjs',
  './saju_descriptions.mjs',
  './manseryeok.mjs',
  './solar_terms.mjs',
  './physiognomy.mjs',
  './physiognomy_text.mjs',
  './face_measure.mjs',
  './palmistry.mjs',
  './palmistry_text.mjs',
  './vision.mjs',
  './camera.mjs',
  './judgments.mjs',
  './vsop87d_earth.mjs',
  './integration.mjs',
  './glossary.mjs',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
// 참고: 얼굴·손 인식 라이브러리와 모델(MediaPipe)은 외부 CDN이라 캐시 대상이 아닙니다.
//       사주는 완전 오프라인 동작, 관상·수상의 사진 인식은 인터넷이 필요합니다.

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
  // 동일 출처는 ?v= 캐시버스터를 무시하고 매칭/저장 — 프리캐시(쿼리 없음)와
  // 실제 요청(app.js?v=17 등)이 어긋나 최초 오프라인 실행이 깨지는 문제 방지
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === location.origin;
  const key = sameOrigin ? url.origin + url.pathname : e.request;
  e.respondWith(
    caches.match(key).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200 && sameOrigin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
