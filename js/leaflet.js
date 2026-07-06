// ==================== Leaflet 按需加载（本地化，零外部依赖） ====================

let _leafletReady = null;

export function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletReady) return _leafletReady;

  _leafletReady = new Promise((resolve, reject) => {
    const base = '/js/vendor';
    // CSS
    const cssUrls = [
      `${base}/leaflet.css`,
      `${base}/MarkerCluster.css`,
      `${base}/MarkerCluster.Default.css`
    ];
    cssUrls.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });
    const timeout = setTimeout(() => reject(new Error('Leaflet load timeout')), 15000);
    const cleanup = () => clearTimeout(timeout);
    // JS: Leaflet → MarkerCluster
    const s1 = document.createElement('script');
    s1.src = `${base}/leaflet.js`;
    s1.async = true;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = `${base}/leaflet.markercluster.js`;
      s2.async = true;
      s2.onload = () => { cleanup(); resolve(); };
      s2.onerror = () => { cleanup(); reject(new Error('Failed to load MarkerCluster')); };
      document.head.appendChild(s2);
    };
    s1.onerror = () => { cleanup(); reject(new Error('Failed to load Leaflet')); };
    document.head.appendChild(s1);
  }).catch(err => {
    _leafletReady = null;
    console.warn('Leaflet load failed:', err);
    throw err;
  });
  return _leafletReady;
}