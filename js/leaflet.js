// ==================== Leaflet 按需加载 ====================

let _leafletReady = null;

export function ensureLeaflet() {
  if (window.L && window.L.MarkerClusterGroup) return Promise.resolve();
  if (_leafletReady) return _leafletReady;

  _leafletReady = new Promise((resolve) => {
    const base = 'https://unpkg.com';
    // CSS
    const cssUrls = [
      `${base}/leaflet@1.9.4/dist/leaflet.css`,
      `${base}/leaflet.markercluster@1.5.3/dist/MarkerCluster.css`,
      `${base}/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css`
    ];
    cssUrls.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });
    // JS: Leaflet → MarkerCluster
    const s1 = document.createElement('script');
    s1.src = `${base}/leaflet@1.9.4/dist/leaflet.js`;
    s1.async = true;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = `${base}/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js`;
      s2.async = true;
      s2.onload = () => resolve();
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
  return _leafletReady;
}