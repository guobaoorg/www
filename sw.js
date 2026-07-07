// ==================== 国保地图 Service Worker ====================
// 渐进增强层：不兼容环境不影响网站核心功能
// 仅缓存静态资源（CSS/JS），HTML 使用网络优先（语言相关），业务数据由双层业务缓存管理

const SW_VERSION = 'v2';
const STATIC_CACHE = `guobao-static-${SW_VERSION}`;
const RUNTIME_CACHE = `guobao-pages-${SW_VERSION}`;

// 需要预缓存的静态资源（不含 HTML，因为 HTML 内容随语言变化）
const STATIC_ASSETS = [
  '/',
  '/404.html',
  '/manifest.json',
  '/style.min.css',
  '/js/vendor/leaflet.js',
  '/js/vendor/leaflet.css',
  '/js/vendor/leaflet.markercluster.js',
  '/js/vendor/msgpack.js',
  '/js/vendor/MarkerCluster.css',
  '/js/vendor/MarkerCluster.Default.css',
  '/js/cache.js',
  '/js/config.js',
  '/js/state.js',
  '/js/router.js',
  '/js/hash-search.js',
  '/js/utils.js',
  '/js/ui.js',
  '/js/leaflet.js',
  '/js/main.js',
  '/js/i18n.js',
  '/js/map.js',
  '/js/search.js',
  '/js/building.js',
  '/js/province.js',
  '/js/provinces.js',
  '/js/tag.js',
  '/js/tags.js',
  '/js/city.js',
  '/js/trail.js',
  '/js/trail-detail.js',
  '/js/quiz.js',
  '/js/quiz-core.js'
];

// ==================== Install ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // 静默失败：某个资源加载失败不影响其他资源缓存
          })
        )
      );
    }).then(() => {
      // 立即激活新 SW，不等待旧 SW 释放
      return self.skipWaiting();
    })
  );
});

// ==================== Activate ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => (name.startsWith('guobao-static-') && name !== STATIC_CACHE) ||
                             (name.startsWith('guobao-pages-') && name !== RUNTIME_CACHE))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // 立即接管所有页面
      return self.clients.claim();
    })
  );
});

// ==================== Fetch ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源 GET 请求
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 跳过业务数据请求（由业务缓存层管理，不由 SW 缓存）
  if (url.pathname.startsWith('/zh/china/') || url.pathname.startsWith('/zh/trail/') ||
      url.pathname.startsWith('/en/china/') || url.pathname.startsWith('/en/trail/') ||
      url.pathname.startsWith('/dist/')) return;

  // 静态资源（仅 CSS/JS）：缓存优先策略
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // 网络优先更新缓存（后台刷新），但立即返回缓存内容
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 导航请求：网络优先，成功后缓存，离线时多级回退
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;
          return caches.match('/').then(homeCached => {
            if (homeCached) return homeCached;
            return caches.match('/404.html').then(cached404 => cached404 || new Response('Offline', { status: 503 }));
          });
        });
      })
    );
  }
});
