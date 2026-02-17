const CACHE_NAME = 'meter-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json',
  '/icon.png',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
  'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js'
];

// App ကို Install လုပ်စဉ်မှာ လိုအပ်တဲ့ဖိုင်တွေကို ဖုန်းထဲသိမ်းမယ်
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// အင်တာနက်မရှိရင် သိမ်းထားတဲ့ဖိုင်တွေကို ပြန်ထုတ်ပေးမယ်
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
