import { HashSearch, Config, State, Utils, ensureLeaflet } from '../core.js';

export async function render(container) {
  const trailId = State.currentTrailId;
  const meta = State.getTrailRegistry()?.find(t => t.id === trailId);
  if (!meta) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">👣</div><div class="empty-state-title">足迹未找到</div></div></div>`;
    return;
  }

  const data = await HashSearch.fetchJSON(`/trail/${meta.fileName}`);
  if (!data) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">加载失败</div></div></div>`;
    return;
  }

  await renderRouteDetail(container, darkMeta(meta), data);
}

function darkMeta(meta) {
  if (State.theme !== 'dark') return meta;
  return { ...meta, bgColor: Utils.darkenHexBg(meta.bgColor) };
}

async function _loadProvinces(stops) {
  const ids = new Set();
  stops?.forEach(s => s.buildings?.forEach(b => { if (b?.p) ids.add(b.p); }));
  if (ids.size > 0) await HashSearch.loadProvinces([...ids]);
}

function _split(text) {
  // Split by double newline, preserving HTML blocks that shouldn't be wrapped in <p>
  return text.split('\n\n').map(p => {
    if (p.startsWith('<div') || p.startsWith('</div')) return p;
    return '<p>' + p + '</p>';
  }).join('');
}

async function renderRouteDetail(container, meta, data) {
  const route = data.route;
  if (!route) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-title">路线未找到</div></div></div>`;
    return;
  }

  await _loadProvinces(route.stops);

  const allBuildings = [];
  for (const stop of route.stops) {
    for (const bRef of (stop.buildings || [])) {
      const building = State.resolveBuildingRef(bRef);
      if (building && building.lat && building.lng) allBuildings.push(building);
    }
  }

  const tocItems = route.stops.map((s, i) => {
    const label = s.title.replace(/第[^站]+站[：··\s]*/, '');
    return `<a href="#" class="rtoc-item" data-toc="${i}">
      <span class="rtoc-num" style="background:${meta.color};">${i + 1}</span> ${label}</a>`;
  }).join('');

  container.innerHTML = `
    <div class="container">
      <div class="topic-detail-header" style="background: linear-gradient(135deg, ${meta.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${meta.color}25;">
        <div class="topic-detail-icon" style="background: ${meta.color};">${meta.icon}</div>
        <div class="topic-detail-info">
          <h1 class="topic-detail-title">${route.title}</h1>
          <p class="topic-detail-subtitle">${meta.subtitle}</p>
        </div>
      </div>
      <div class="topic-intro">${_split(route.intro)}</div>
      ${allBuildings.length > 0 ? '<div id="routeMap" class="route-map"></div>' : ''}

      <div class="rtoc">
        <div class="rtoc-bar">
          <span class="rtoc-head">📋 ${meta.title}目录</span>
          <a href="#" class="rtoc-item rtoc-item--all" data-toc="all">
            <span class="rtoc-num" style="background:${meta.color};">全</span>全文</a>
        </div>
        <div class="rtoc-list">
          ${tocItems}
        </div>
      </div>

      <div class="route-stops">
          ${route.stops.map((stop, index) => {
            const label = stop.title.replace(/第[^站]+站[：··\s]*/, '');
            return `
            <div class="rstop" id="stop-${index}">
              <div class="rstop-head" style="border-left:3px solid ${meta.color};">
                <span class="rstop-icon">${stop.icon}</span>
                <h3 class="rstop-title">${index + 1} ${label}</h3>
              </div>
              <div class="rstop-body">
                ${stop.poem ? `<div class="rstop-poem"><pre>${stop.poem}</pre></div>` : ''}
                <div class="rstop-content">${_split(stop.content)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  if (allBuildings.length > 0) { await ensureLeaflet(); _initBuildingMap(allBuildings, meta); }
  _initTOC();
  _addTooltips();
}

function _addTooltips() {
  // Use all loaded buildings (not just those with coordinates for the map)
  const all = State.getAllBuildings();
  const map = {};
  for (const b of all) {
    if (b.n && b.desc) map[b.n] = b.desc;
  }
  document.querySelectorAll('.rstop-content a[data-nav]').forEach(el => {
    const name = el.textContent.trim();
    const desc = map[name];
    if (desc) el.setAttribute('title', desc.substring(0, 120));
  });
}

function _initTOC() {
  const stops = document.querySelectorAll('.rstop');
  document.querySelectorAll('.rtoc-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const idx = el.dataset.toc;
      stops.forEach(s => s.style.display = (idx === 'all' || s.id === 'stop-' + idx) ? '' : 'none');
    });
  });
}

function _addArrow(map, fromLatLng, toLatLng, color) {
  const mid = L.latLng((fromLatLng.lat + toLatLng.lat) / 2, (fromLatLng.lng + toLatLng.lng) / 2);
  const angle = Math.atan2(toLatLng.lng - fromLatLng.lng, toLatLng.lat - fromLatLng.lat) * 180 / Math.PI;
  const arrowIcon = L.divIcon({
    html: `<div style="transform:rotate(${angle}deg);font-size:18px;color:${color};text-shadow:0 1px 3px rgba(0,0,0,.5);line-height:1;">▶</div>`,
    className: '', iconSize: [18, 18], iconAnchor: [9, 9]
  });
  L.marker(mid, { icon: arrowIcon, interactive: false }).addTo(map);
}

function _initBuildingMap(buildings, meta) {
  const mapEl = document.getElementById('routeMap');
  if (!mapEl) return;

  const map = L.map(mapEl, { zoomControl: true, attributionControl: false });
  const sat = L.tileLayer(Config.TILE_URLS.SAT, { maxZoom: 19, minZoom: 3 });
  const road = L.tileLayer(Config.TILE_URLS.ROAD, { maxZoom: 18, minZoom: 3, opacity: 0.5 });
  const labels = L.tileLayer(Config.TILE_URLS.LABELS, { maxZoom: 18, minZoom: 3, opacity: 0.4 });
  L.layerGroup([sat, road, labels]).addTo(map);

  const latlngs = [];
  const markers = [];

  buildings.forEach((b, i) => {
    const ll = L.latLng(b.lat, b.lng);
    latlngs.push(ll);

    const category = Config.getBuildingCategory(b);
    const size = category.size || 20;
    const color = category.markerColor || meta.color;
    const buildingPath = (b.p || '') + (b.dn || '') + b.n;
    const buildingPid = b.pid || '';
    const detailUrl = `?page=building&name=${encodeURIComponent(buildingPath)}&pid=${buildingPid}`;

    const icon = L.divIcon({
      html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.8);color:#fff;font-weight:700;font-size:${size > 22 ? 12 : 10}px;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;">${i + 1}</div>`,
      className: 'route-map-icon', iconSize: [size + 4, size + 4], iconAnchor: [(size + 4) / 2, (size + 4) / 2]
    });

    const popupHtml = `
      <div class="rm-card">
        <div class="rm-card-head" style="border-left:3px solid ${color};">
          <span class="rm-card-num" style="background:${color};">${i + 1}</span>
          <strong class="rm-card-name">${b.n}</strong>
        </div>
        <div class="rm-card-meta">
          <span>📅 ${b.e || '年代未知'}</span>
          <span>📍 ${b.p || ''} · ${b.dn || ''}</span>
        </div>
        <p class="rm-card-desc">${Utils.truncateText(b.desc, 100)}</p>
        <div class="rm-card-actions">
          <a href="${detailUrl}" target="_blank" class="rm-card-btn">了解更多 ↗</a>
        </div>
      </div>`;

    const m = L.marker(ll, { icon })
      .bindTooltip(`${i + 1}. ${b.n}`, { direction: 'top', offset: L.point(0, -12), className: 'rm-tooltip' })
      .bindPopup(popupHtml, { maxWidth: 300, className: 'rm-popup' });

    markers.push(m);
    map.addLayer(m);
  });

  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: meta.color, weight: 3, opacity: 0.6, dashArray: '8 6' }).addTo(map);
    for (let i = 0; i < latlngs.length - 1; i++) _addArrow(map, latlngs[i], latlngs[i + 1], meta.color);
  }

  if (latlngs.length > 0) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.12));
  setTimeout(() => map.invalidateSize(), 200);
}
