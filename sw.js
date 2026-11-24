/* 오프라인에서도 앱이 열리도록 파일을 보관합니다.
   인터넷이 되면 항상 깃허브의 최신 파일을 먼저 받아오므로, 파일을 고쳐 올리면 다음 실행 때 바로 반영됩니다. */
const CACHE = "jasan-v1";
const FILES = ["./", "index.html", "app.js", "settings.js", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // 구글 로그인·드라이브는 건드리지 않음
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
