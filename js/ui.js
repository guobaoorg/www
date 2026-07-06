import { ensureLeaflet } from './leaflet.js';
import { Config } from './config.js';
import { State } from './state.js';
import { HashSearch } from './hash-search.js';
import { Utils } from './utils.js';
import { t as i18nT } from './i18n.js';

const _ATTR_TEXT = {
  standard: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  satellite: '© <a href="https://www.esri.com">Esri</a>'
};

const UI = {
  setupTheme() {
    document.documentElement.setAttribute('data-theme', State.theme);
  },

  toggleTheme() {
    State.theme = State.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', State.theme);
    localStorage.setItem('theme', State.theme);
  },

  setupEventListeners(onNavigate) {
    document.querySelector('.theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      const card = target.closest('.building-card');
      if (card) { e.preventDefault(); onNavigate(card.getAttribute('data-href')); return; }
      const link = target.closest('[data-nav]');
      if (link) {
        if (link.getAttribute('target') === '_blank') return;
        e.preventDefault(); onNavigate(link.getAttribute('href') || link.getAttribute('data-nav'));
      }
    });
    window.addEventListener('popstate', () => { window.dispatchEvent(new CustomEvent('route-change')); });
  },

  setBreadcrumb(items) {
    const breadcrumbList = document.getElementById('breadcrumbList');
    if (!breadcrumbList) return;
    const all = [{ name: i18nT('breadcrumb.home'), href: '?page=map' }, ...items];
    breadcrumbList.innerHTML = all.map((item, index) => {
      if (index === all.length - 1 || !item.href) return `<li class="active">${item.name}</li>`;
      return `<li><a href="${item.href}" data-nav>${item.name}</a></li>`;
    }).join('');
  },

  initRouteTOC(container) {
    const stops = container.querySelectorAll('.route-stop');
    container.querySelectorAll('.route-toc__item').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const idx = el.dataset.toc;
        stops.forEach(s => s.style.display = (idx === 'all' || s.id === 'stop-' + idx) ? '' : 'none');
        if (idx !== 'all') {
          const target = container.querySelector(`#stop-${idx}`);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } else {
          container.querySelector('.topic-detail-header')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  },

  updateActiveNav() {
    const v = State.currentView;
    const setActive = (selector) => {
      document.querySelectorAll(selector).forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if ((v === 'trail' || v === 'trail-detail') && href === '?page=trail') link.classList.add('active');
        else if (href === `?page=${v}`) link.classList.add('active');
      });
    };
    setActive('.nav-menu__link');
    setActive('.mobile-tab-bar__item');
  },

  // 创建带街道/卫星图层切换的地图
  createMapWithLayers(mapEl, opts = {}) {
    const L = window.L;
    const map = L.map(mapEl, { zoomControl: true, attributionControl: false });
    const { maxZoom = 18, minZoom = 3, satMaxZoom = maxZoom } = opts;
    const street = L.tileLayer(Config.TILE_URLS.OSM_DE, { maxZoom, minZoom });
    const sat = L.tileLayer(Config.TILE_URLS.SAT, { maxZoom: satMaxZoom, minZoom });
    const labels = L.tileLayer(Config.TILE_URLS.LABELS, { maxZoom: 14, minZoom, opacity: 0.5 });
    const satGroup = L.layerGroup([sat, labels]);
    satGroup.addTo(map);

    const attrDiv = L.DomUtil.create('div', 'leaflet-control-attribution');
    const attrCtrl = L.control({ position: 'bottomright' });
    attrCtrl.onAdd = () => attrDiv;
    attrCtrl.addTo(map);
    const _updateAttr = (name) => { attrDiv.innerHTML = _ATTR_TEXT[name] || ''; };
    _updateAttr('satellite');

    mapEl._fsTileLayers = { standard: street, satellite: satGroup };
    mapEl._fsMap = map;
    mapEl._updateAttr = _updateAttr;
    return map;
  },

  async createSatelliteMap(mapDiv, lat, lng, buildingName) {
    if (!mapDiv || lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
    await ensureLeaflet();
    const L = window.L;
    if (!L) return null;
    const map = this.createMapWithLayers(mapDiv);
    map.setView([lat, lng], 15);
    const markerIcon = L.divIcon({
      className: 'quiz__satellite-marker',
      html: '<div class="quiz__satellite-pin"></div><div class="quiz__satellite-pulse"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10]
    });
    L.marker([lat, lng], { icon: markerIcon }).addTo(map);
    this.enableMapFullscreen(mapDiv, () => map.invalidateSize(), buildingName ? (userLat, userLng) => {
      const dist = this.haversineDistance(userLat, userLng, lat, lng);
      return [{ name: buildingName, lat, lng, distance: dist, icon: '🏛️' }];
    } : null);
    let invalidated = false;
    setTimeout(() => { if (!invalidated) { invalidated = true; map.invalidateSize(); } }, 100);
    map.on('unload', () => { invalidated = true; });
    return map;
  },

  injectStructuredData() {
    let script = document.getElementById('ld-json');
    if (!script) {
      script = document.createElement('script');
      script.id = 'ld-json';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    const breadcrumbs = [];
    const items = document.querySelectorAll('#breadcrumbList li');
    items.forEach((li, i) => {
      const a = li.querySelector('a');
      const name = li.textContent.trim();
      if (a) breadcrumbs.push({ '@type': 'ListItem', position: i + 1, name, item: new URL(a.href, location.origin).href });
      else breadcrumbs.push({ '@type': 'ListItem', position: i + 1, name });
    });
    const ld = { '@context': 'https://schema.org', '@graph': [] };
    if (breadcrumbs.length > 1) ld['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: breadcrumbs });
    script.textContent = JSON.stringify(ld);
  },

  // ========== 从 Utils 移入的方法（避免 ui.js ↔ utils.js 循环依赖） ==========

  _fmtDist(d) { return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`; },

  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  // 全屏地图功能：注入展开/关闭/定位按钮，返回 invalidate 回调
  enableMapFullscreen(containerEl, onResize, getNearby) {
    if (!containerEl) return;
    containerEl.style.position = 'relative';

    // 避免重复注入
    if (containerEl.querySelector('.map__fs-controls')) return;

    const controls = document.createElement('div');
    controls.className = 'map__fs-controls';
    controls.innerHTML = `
      <button class="map__fs-btn map__fs-btn--layer" title="切换图层" aria-label="切换图层">🗺️</button>
      <button class="map__fs-btn map__fs-btn--geo" title="定位到我" aria-label="定位到我">📍</button>
      <button class="map__fs-btn map__fs-btn--close" title="退出全屏" aria-label="退出全屏">✕</button>
      <button class="map__fs-btn map__fs-btn--open" title="全屏地图" aria-label="全屏地图">⛶</button>
    `;
    containerEl.appendChild(controls);

    // 距离面板（使用事件代理监听折叠）
    const distPanel = document.createElement('div');
    distPanel.className = 'map__dist-panel';
    distPanel.style.display = 'none';
    containerEl.appendChild(distPanel);
    distPanel.addEventListener('click', (e) => {
      if (e.target.closest('.map__dist-header')) distPanel.classList.toggle('collapsed');
    });

    let _userMarker = null;
    let _geoWatchId = null;
    let _nearbyMarkers = [];
    let _destroyed = false;
    const _pendingTimeouts = new Set();

    const _safeSetTimeout = (fn, ms) => {
      const id = setTimeout(() => {
        _pendingTimeouts.delete(id);
        if (!_destroyed) fn();
      }, ms);
      _pendingTimeouts.add(id);
      return id;
    };

    const _cleanup = () => {
      _destroyed = true;
      for (const id of _pendingTimeouts) clearTimeout(id);
      _pendingTimeouts.clear();
    };

    const _self = this;

    const enterFS = () => {
      if (_destroyed) return;
      containerEl.classList.add('map--fullscreen');
      document.body.style.overflow = 'hidden';
      _safeSetTimeout(() => onResize?.(), 300);
    };

    const exitFS = () => {
      if (_destroyed) return;
      containerEl.classList.remove('map--fullscreen');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', escHandler);
      _stopGeolocation();
      _safeSetTimeout(() => onResize?.(), 300);
    };

    controls.querySelector('.map__fs-btn--open').addEventListener('click', enterFS);
    controls.querySelector('.map__fs-btn--close').addEventListener('click', exitFS);

    // ESC 退出全屏
    const escHandler = (e) => {
      if (e.key === 'Escape' && containerEl.classList.contains('map--fullscreen')) exitFS();
    };
    document.addEventListener('keydown', escHandler);

    const geoBtn = controls.querySelector('.map__fs-btn--geo');
    const layerBtn = controls.querySelector('.map__fs-btn--layer');
    const LAYER_NAMES = ['standard', 'satellite'];
    const LAYER_ICONS = ['🗺️', '🛰️'];
    let _layerIndex = 1;

    // 自动检测初始图层状态
    if (containerEl._fsTileLayers) {
      const tl = containerEl._fsTileLayers;
      if (tl.satellite?._map) _layerIndex = 1;
      else if (tl.standard?._map) _layerIndex = 0;
      layerBtn.textContent = LAYER_ICONS[_layerIndex];
    }

    // 图层切换（循环切换：街道 → 卫星 → 街道）
    layerBtn.addEventListener('click', () => {
      const tileLayers = containerEl._fsTileLayers;
      if (!tileLayers) return;
      const mapInstance = _findLeafletMap(containerEl);
      if (!mapInstance) return;

      const prev = LAYER_NAMES[_layerIndex];
      _layerIndex = (_layerIndex + 1) % LAYER_NAMES.length;
      const next = LAYER_NAMES[_layerIndex];
      if (prev !== next) {
        if (tileLayers[prev]) mapInstance.removeLayer(tileLayers[prev]);
        if (tileLayers[next]) mapInstance.addLayer(tileLayers[next]);
      }
      layerBtn.textContent = LAYER_ICONS[_layerIndex];
      if (containerEl._updateAttr) containerEl._updateAttr(next);
    });

    const _stopGeolocation = () => {
      if (_geoWatchId) { navigator.geolocation.clearWatch(_geoWatchId); _geoWatchId = null; }
      if (_userMarker && _userMarker._map) _userMarker.remove();
      _userMarker = null;
      _clearNearbyMarkers();
      geoBtn.classList.remove('active');
      geoBtn.textContent = '📍';
      distPanel.style.display = 'none';
    };

    const _clearNearbyMarkers = () => {
      for (let i = 0; i < _nearbyMarkers.length; i++) {
        const m = _nearbyMarkers[i];
        if (m._map) m.remove();
      }
      _nearbyMarkers = [];
    };

    const _updateDistPanel = (userLat, userLng, mapInstance) => {
      if (!getNearby) { distPanel.style.display = 'none'; return; }
      const buildings = getNearby(userLat, userLng);
      if (!buildings || buildings.length === 0) {
        distPanel.innerHTML = `<div class="map__dist-empty">${i18nT('building.nearby')}</div>`;
        distPanel.style.display = 'block';
        return;
      }

      _clearNearbyMarkers();
      const L = window.L;
      const top5 = buildings.slice(0, 5);

      for (let i = 0; i < top5.length; i++) {
        const b = top5[i];
        if (b.lat == null || b.lng == null || !isFinite(b.lat) || !isFinite(b.lng)) continue;
        const icon = L.divIcon({
          html: `<div class="map__dist-marker">${_self._fmtDist(b.distance)}</div>`,
          className: 'map__dist-marker-container',
          iconSize: [60, 22], iconAnchor: [30, 28]
        });
        _nearbyMarkers.push(L.marker([b.lat, b.lng], { icon, interactive: false, zIndexOffset: 5000 + i }).addTo(mapInstance));
      }

      distPanel.innerHTML = `<div class="map__dist-header"><div class="map__dist-title">${i18nT('map.nearbyGeolocated')}</div><button class="map__dist-toggle" aria-label="${i18nT('map.distToggle')}">▼</button></div>${top5.map(b => `<a class="map__dist-item"${b.detailUrl ? ` href="${b.detailUrl}" target="_blank"` : ''}><span class="map__dist-icon">${b.icon || '🏛️'}</span><span class="map__dist-name">${b.name}</span><span class="map__dist-val">${_self._fmtDist(b.distance)}</span></a>`).join('')}`;
      distPanel.style.display = 'block';

    };

    const _findLeafletMap = (el) => el._fsMap || null;

    const _geoBtnMsg = (msg, ms) => {
      geoBtn.textContent = msg;
      if (ms) _safeSetTimeout(() => { if (!_destroyed) geoBtn.textContent = '📍'; }, ms);
    };

    geoBtn.addEventListener('click', () => {
      if (_geoWatchId) { _stopGeolocation(); return; }
      if (!window.isSecureContext) { _geoBtnMsg(i18nT('map.geoNeedHttps'), 2500); return; }
      if (!navigator.geolocation) { _geoBtnMsg(i18nT('map.geoNotSupported'), 2000); return; }
      if (_destroyed) return;

      geoBtn.classList.add('map__fs-btn--geo-pulse');
      geoBtn.textContent = i18nT('map.geoLocating');
      const L = window.L;
      const mapInstance = containerEl._fsMap || null;
      if (!L || !mapInstance) { _geoBtnMsg('📍', 0); geoBtn.classList.remove('map__fs-btn--geo-pulse'); return; }

      const _onPosition = (pos) => {
        geoBtn.classList.remove('map__fs-btn--geo-pulse');
        geoBtn.classList.add('active');
        geoBtn.textContent = '📍';
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        if (_userMarker) _userMarker.setLatLng(latlng);
        else _userMarker = L.marker(latlng, { icon: L.divIcon({ className: 'map__user-dot', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 10000 }).addTo(mapInstance);

        if (getNearby) {
          const buildings = getNearby(pos.coords.latitude, pos.coords.longitude);
          if (buildings && buildings.length > 0) {
            const bounds = L.latLngBounds([latlng]);
            for (let i = 0; i < buildings.length && i < 5; i++) {
              const b = buildings[i];
              if (b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng)) bounds.extend(L.latLng(b.lat, b.lng));
            }
            mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          } else mapInstance.setView(latlng, Math.max(mapInstance.getZoom(), 14));
        } else mapInstance.setView(latlng, Math.max(mapInstance.getZoom(), 14));
        _updateDistPanel(pos.coords.latitude, pos.coords.longitude, mapInstance);
      };

      const _onError = (err) => {
        geoBtn.classList.remove('map__fs-btn--geo-pulse');
        if (_geoWatchId) { navigator.geolocation.clearWatch(_geoWatchId); _geoWatchId = null; }
        const msgs = { 1: i18nT('map.geoDenied'), 2: i18nT('map.geoNoSignal'), 3: i18nT('map.geoTimeout') };
        _geoBtnMsg(msgs[err.code] || i18nT('map.geoFailed'), 2500);
      };

      navigator.geolocation.getCurrentPosition(
        pos => { _onPosition(pos); _geoWatchId = navigator.geolocation.watchPosition(_onPosition, _onError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }); },
        _onError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });

    const mapInstance = _findLeafletMap(containerEl);
    if (mapInstance) {
      mapInstance.on('unload', () => {
        _cleanup();
        document.removeEventListener('keydown', escHandler);
        _stopGeolocation();
      });
    }
  },

  _addArrow(map, fromLatLng, toLatLng, color) {
    const L = window.L;
    if (!L) return;
    const mid = L.latLng((fromLatLng.lat + toLatLng.lat) / 2, (fromLatLng.lng + toLatLng.lng) / 2);
    const angle = Math.atan2(toLatLng.lng - fromLatLng.lng, toLatLng.lat - fromLatLng.lat) * 180 / Math.PI;
    const arrowIcon = L.divIcon({
      html: `<div style="transform:rotate(${angle}deg);font-size:18px;color:${color};text-shadow:0 1px 3px rgba(0,0,0,.5);line-height:1;">▶</div>`,
      className: '', iconSize: [18, 18], iconAnchor: [9, 9]
    });
    L.marker(mid, { icon: arrowIcon, interactive: false }).addTo(map);
  },

  // ========== 从 Utils 移入的地图函数 ==========

  createSimpleMarker(building, opts = {}) {
    const L = window.L;
    if (!L) return null;
    const { popupHTML, className = 'marker-dot', containerClass = 'marker-container', iconSize = 10, maxWidth = 240 } = opts;
    const ll = L.latLng(building.lat, building.lng);
    const divIcon = L.divIcon({ html: `<div class="${className}"></div>`, className: containerClass, iconSize: [iconSize, iconSize], iconAnchor: [iconSize / 2, iconSize / 2] });
    const marker = L.marker(ll, { icon: divIcon });
    marker.bindTooltip(building.n, { direction: 'top', offset: L.point(0, -iconSize / 2 - 4), className: 'route-map__tooltip' });
    if (popupHTML) marker.bindPopup(popupHTML, { maxWidth, className: 'map__popup-container' });
    return marker;
  },

  async setupBuildingMap(mapEl, buildings, opts = {}) {
    if (!mapEl || !buildings?.length) return null;
    await ensureLeaflet();
    const L = window.L;
    if (!L) return null;
    const map = this.createMapWithLayers(mapEl);
    const bounds = L.latLngBounds([]);
    const _hash = b => Utils.generateBuildingUrl(b);
    const defaultPopup = b => `<div class="map__popup"><div class="map__popup-header"><strong>🏛️ ${b.n}</strong></div><div class="map__popup-body"><a href="${_hash(b)}" class="map__popup-link">${i18nT('common.viewDetail')}</a></div></div>`;
    const popupBuilder = opts.popupBuilder ? b => opts.popupBuilder(b, _hash) : defaultPopup;
    let hasValid = false;
    buildings.forEach(b => {
      if (b.lat == null || b.lng == null || !isFinite(b.lat) || !isFinite(b.lng)) return;
      hasValid = true;
      bounds.extend(L.latLng(b.lat, b.lng));
      const marker = this.createSimpleMarker(b, { popupHTML: popupBuilder(b) });
      if (marker) marker.addTo(map);
    });
    if (hasValid) map.fitBounds(bounds, { padding: [30, 30], maxZoom: opts.maxZoom || 14 });
    this.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => buildings
      .filter(b => b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng))
      .map(b => ({
        name: b.n, lat: b.lat, lng: b.lng, distance: this.haversineDistance(userLat, userLng, b.lat, b.lng), icon: '🏛️', detailUrl: _hash(b)
      })).sort((a, b) => a.distance - b.distance).slice(0, 5));
    return map;
  },

  async createRouteMap(mapEl, buildings, meta, opts = {}) {
    if (!mapEl || !buildings?.length) return null;
    await ensureLeaflet();
    const L = window.L;
    if (!L) return null;

    const map = this.createMapWithLayers(mapEl, { satMaxZoom: 19 });
    this.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => {
      return buildings
        .filter(b => b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng))
        .map(b => ({
          name: b.n, lat: b.lat, lng: b.lng,
          distance: this.haversineDistance(userLat, userLng, b.lat, b.lng),
          icon: Config.getBuildingCategory(b)?.icon || '🏛️',
          detailUrl: Utils.generateBuildingUrl(b)
        })).sort((a, b) => a.distance - b.distance).slice(0, 5);
    });

    const markers = [];
    const latlngs = [];

    buildings.forEach((b, i) => {
      if (b.lat == null || b.lng == null || !isFinite(b.lat) || !isFinite(b.lng)) return;
      const ll = L.latLng(b.lat, b.lng);
      latlngs.push(ll);
      const category = Config.getBuildingCategory(b);
      const size = category.size || 20;
      const color = category.markerColor || meta.color;
      const detailUrl = Utils.generateBuildingUrl(b);

      const icon = L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.8);color:#fff;font-weight:700;font-size:${size > 22 ? 12 : 10}px;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;">${i + 1}</div>`,
        className: 'route-map__icon', iconSize: [size + 4, size + 4], iconAnchor: [(size + 4) / 2, (size + 4) / 2]
      });

      const popupHtml = `
        <div class="route-map__card">
          <div class="route-map__card-head" style="border-left:3px solid ${color};">
            <span class="route-map__card-num" style="background:${color};">${i + 1}</span>
            <strong class="route-map__card-name">${b.n}</strong>
          </div>
          <div class="route-map__card-meta">
            <span>📅 ${b.e || i18nT('map.unknownEra')}</span>
            <span>📍 ${b.p || ''} · ${b.dn || ''}</span>
          </div>
          <p class="route-map__card-desc">${Utils.truncateText(b.desc, 100)}</p>
          <div class="route-map__card-actions">
            <a href="${detailUrl}" target="_blank" class="route-map__card-btn">${i18nT('common.learnMore')}</a>
          </div>
        </div>`;

      const m = L.marker(ll, { icon })
        .bindTooltip(`${i + 1}. ${b.n}`, { direction: 'top', offset: L.point(0, -12), className: 'route-map__tooltip' })
        .bindPopup(popupHtml, { maxWidth: 300, className: 'route-map__popup' });
      markers.push(m);
      map.addLayer(m);
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: meta.color, weight: 3, opacity: 0.6, dashArray: '8 6' }).addTo(map);
      for (let i = 0; i < latlngs.length - 1; i++) this._addArrow(map, latlngs[i], latlngs[i + 1], meta.color);
    }

    if (markers.length > 0) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.12));
    let invalidated = false;
    setTimeout(() => { if (!invalidated) { invalidated = true; map.invalidateSize(); } }, 200);
    map.on('unload', () => { invalidated = true; });
    return map;
  }
};

export { UI };