/* Service Worker של Alexiane Nails:
   1. שומר עותק של כל קבצי האפליקציה, כך שהיא נפתחת באייפון גם בלי אינטרנט.
   2. מקבל Web Push מ-Supabase ומציג תזכורת גם כשהאפליקציה סגורה (אייפון עם iOS 16.4 ומעלה, מותקנת במסך הבית). */
const CACHE = 'alexiane-nails-v1';
const SCOPE = self.registration.scope; // הכתובת שבה האפליקציה מותקנת

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png', 'logo-mark.png'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase וכו': תמיד מהרשת

  if (req.mode === 'navigate') {
    // הדף עצמו: קודם מהרשת (כדי שעדכון יגיע מיד), ובלי רשת מהעותק השמור
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(SCOPE, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(SCOPE))
    );
    return;
  }

  // קבצים (JS, CSS, גופנים, תמונות): מהמטמון אם יש, ובמקביל מתעדכנים מהרשת
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Rappel de rendez-vous', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Rappel de rendez-vous', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'rdv',
    renotify: true,
    lang: 'fr',
    dir: 'ltr',
    data: { url: d.url || './', apptId: d.tag || '' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const url = new URL(data.url || './', SCOPE).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.startsWith(SCOPE) && 'focus' in c) {
        if (data.apptId && data.apptId !== 'test') c.postMessage({ type: 'open-appt', id: data.apptId });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
