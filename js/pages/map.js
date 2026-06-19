import { HashSearch, Config, State, Utils, UI, ensureLeaflet } from '../core.js';

let _map = null;
let _markerCluster = null;
let _mapMarkers = [];
let _activeEraFilter = 'all';
let _activeCategoryFilter = 'all';
const _el = {};

function _nearbyCallback(userLat, userLng) {
    if (!_mapMarkers.length) return [];
    const category = Config.buildingCategories;
    return _mapMarkers.reduce((acc, m) => {
      const ll = m.marker.getLatLng();
      if (!ll) return acc;
      const b = m.marker._building || {};
      const cat = category[m.categoryKey];
      if (!b.n) return acc;
      acc.push({ name: b.n, lat: ll.lat, lng: ll.lng, distance: Utils.haversineDistance(userLat, userLng, ll.lat, ll.lng), icon: cat?.icon || '🏛️', detailUrl: `?page=building&name=${encodeURIComponent((b.p||'')+(b.dn||'')+b.n)}&pid=${b.pid||''}` });
      return acc;
    }, []).sort((a, b) => a.distance - b.distance).slice(0, 5);
}

export async function render(container) {
  _destroyMap();
  _activeEraFilter = 'all';
  _activeCategoryFilter = 'all';

  // 确保省份元数据已加载，否则无缓存首次访问时 allProvinceIds 只有 ['cross']
  if (!State.getProvinceMeta()) {
    await State.initMeta();
  }

  let allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];

  // 按文件大小从小到大排序，让小文件先加载完成，更快显示进度和内容
  allProvinceIds = Config.getSortedProvinceIds(allProvinceIds);

  container.innerHTML = `
    <div class="map-page">
      <div class="map-timeline-bar" id="mapTimeline">
        <div class="era-timeline-all active" data-era="all">全部</div>
        <div class="era-timeline-track" id="eraTimelineTrack"></div>
      </div>
      <div class="map-legend" id="mapLegend">
        <div class="map-legend-item active" data-cat="all">
          <span class="map-legend-dot" style="background:#666;"></span>
          <span class="map-legend-label">全部分类</span>
        </div>
        ${Object.entries(Config.buildingCategories).map(([key, cat]) =>
          `<div class="map-legend-item" data-cat="${key}">
            <span class="map-legend-dot" style="background:${cat.markerColor};"></span>
            <span class="map-legend-label">${cat.icon} ${cat.label}</span>
          </div>`
        ).join('')}
      </div>
      <div class="map-stats-bar">
        <div class="map-stats-inner">
          <div class="map-stat-item">
            <span class="map-stat-label" id="mapStatLabel">全部年代 · 全部分类</span>
            <span class="map-stat-num" id="mapStatTotal">0</span>
          </div>
          <span class="map-stat-sep">·</span>
          <div class="map-stat-item">
            <span class="map-stat-label">覆盖</span>
            <span class="map-stat-num" id="mapStatProvinces">${State.getProvinceMeta()?.provinces?.length || 0}</span>
            <span class="map-stat-label">省</span>
          </div>
          <span class="map-stat-sep">·</span>
          <div class="map-stat-item map-stat-loading" id="mapStatLoading">
            <span class="map-stat-num map-stat-loading-num" id="mapStatLoaded">0</span>
            <span class="map-stat-sep" style="font-size:0.5rem;">/</span>
            <span class="map-stat-num map-stat-loading-num" id="mapTotalCount2">${allProvinceIds.length}</span>
            <span class="map-stat-loading-text" id="mapStatLoadingText">数据加载中</span>
          </div>
        </div>
        <span class="map-stats-tip">⚠️港澳台为近似坐标</span>
      </div>
      <div class="map-full-wrapper">
        <div id="mapFull" class="map-full"></div>
        <div class="map-progress-bar" id="mapProgressBar"><div class="map-progress-fill" id="mapProgressFill"></div></div>
      </div>
    </div>`;

  _cacheDOM();
  _el.timeline?.addEventListener('click', e => {
    const allBtn = e.target.closest('.era-timeline-all');
    const block = e.target.closest('.era-timeline-block');
    if (allBtn) { _setEraFilter('all'); return; }
    if (!block || block.classList.contains('empty')) return;
    const eraId = block.dataset.era;
    if (eraId) _setEraFilter(eraId);
  });

  _el.legend?.addEventListener('click', e => {
    const item = e.target.closest('.map-legend-item');
    if (!item) return;
    const cat = item.dataset.cat;
    _el.legend.querySelectorAll('.map-legend-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    _setCategoryFilter(cat);
  });

  if (_el.mapFull) { await ensureLeaflet(); _initMap(_el.mapFull); Utils.enableMapFullscreen(_el.mapFull, () => _map?.invalidateSize(), _nearbyCallback); }
  _loadMapDataAsync(allProvinceIds);
}

export function destroyMap() { _destroyMap(); }

function _initMap(container) {
  if (_map) { _map.invalidateSize(); return; }
  _map = UI.createMapWithLayers(container);
  _map.setView([35.5, 105.0], 5);
  _markerCluster = L.markerClusterGroup({
    maxClusterRadius: 50, spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count >= 100) size = 'large';
      else if (count >= 20) size = 'medium';
      return L.divIcon({
        html: `<div class="map-cluster map-cluster-${size}"><span>${count}</span></div>`,
        className: 'map-cluster-container', iconSize: L.point(40, 40)
      });
    }
  });
  _map.addLayer(_markerCluster);
}

function _destroyMap() {
  if (_map) { _map.remove(); _map = null; _markerCluster = null; _mapMarkers = []; }
}

function _passesFilters(categoryKey, eraId) {
  return (_activeCategoryFilter === 'all' || categoryKey === _activeCategoryFilter) &&
         (_activeEraFilter === 'all' || (eraId && eraId === _activeEraFilter));
}

function _cacheDOM() {
  _el.timeline = document.getElementById('mapTimeline');
  _el.legend = document.getElementById('mapLegend');
  _el.mapFull = document.getElementById('mapFull');
  _el.statTotal = document.getElementById('mapStatTotal');
  _el.statProvinces = document.getElementById('mapStatProvinces');
  _el.statLoaded = document.getElementById('mapStatLoaded');
  _el.statLoading = document.getElementById('mapStatLoading');
  _el.progressFill = document.getElementById('mapProgressFill');
  _el.statLabel = document.getElementById('mapStatLabel');
  _el.eraTrack = document.getElementById('eraTimelineTrack');
}

function _refreshMarkers() {
  if (!_markerCluster || !_mapMarkers) return;
  _markerCluster.clearLayers();
  let visible = 0;
  const provSet = new Set();
  for (let i = 0, len = _mapMarkers.length; i < len; i++) {
    const { marker, categoryKey, eraId } = _mapMarkers[i];
    if (_passesFilters(categoryKey, eraId)) {
      _markerCluster.addLayer(marker);
      visible++;
      if (marker._provinceId) provSet.add(marker._provinceId);
    }
  }
  if (_el.statTotal) _el.statTotal.textContent = visible;
  if (_el.statProvinces) _el.statProvinces.textContent = provSet.size || State.getProvinceMeta()?.provinces?.length || 0;
}

function _setCategoryFilter(categoryKey) {
  _activeCategoryFilter = categoryKey;
  _refreshMarkers();
  _updateMapLabel();
}

function _setEraFilter(eraId) {
  _activeEraFilter = eraId;
  _refreshMarkers();
  if (_el.timeline) {
    _el.timeline.querySelectorAll('.era-timeline-block, .era-timeline-all').forEach(el => el.classList.remove('active'));
    const target = _el.timeline.querySelector(eraId === 'all' ? '.era-timeline-all' : `[data-era="${eraId}"]`);
    if (target) target.classList.add('active');
  }
  _updateMapLabel();
}

function _updateMapLabel() {
  if (!_el.statLabel) return;
  const ae = _activeEraFilter;
  const ac = _activeCategoryFilter;
  const eraName = ae && ae !== 'all' ? (Config.eras.find(e => e.id === ae)?.name || ae) : '全部年代';
  const catName = ac && ac !== 'all' ? (Config.buildingCategories[ac]?.label || ac) : '全部分类';
  _el.statLabel.textContent = eraName + ' · ' + catName;
}

function _createMapMarker(building) {
  const category = Config.getBuildingCategory(building);
  const size = category.size || 20;
  const wh = category.isWorldHeritage;
  const mc = category.markerColor;
  const icon = L.divIcon({
    html: `<div class="map-marker${wh ? ' map-marker-world' : ''}" style="background:${mc};width:${size}px;height:${size}px;" title="${building.n}"><span>${category.icon}</span></div>`,
    className: 'map-marker-container', iconSize: [size + 4, size + 4], iconAnchor: [(size + 4) / 2, (size + 4) / 2]
  });
  const marker = L.marker([building.lat, building.lng], { icon });
  marker.bindTooltip(building.n, { direction: 'top', offset: L.point(0, -size / 2 - 4), className: 'rm-tooltip' });
  const badge = Utils.generateProtectionBadge(building);
  marker.bindPopup(`<div class="map-popup"><div class="map-popup-header" style="border-left:3px solid ${mc};padding-left:8px;"><strong>${category.icon} ${building.n}</strong></div><div class="map-popup-body"><div class="map-popup-info"><span class="map-popup-era">📅 ${building.e}</span><span class="map-popup-district">📍 ${building.dn}</span></div>${badge ? `<div class="map-popup-badge">${badge}</div>` : ''}<p class="map-popup-desc">${Utils.truncateText(building.desc, 80)}</p><a href="?page=building&name=${encodeURIComponent((building.p||'')+(building.dn||'')+building.n)}&pid=${building.pid||''}" target="_blank" class="map-popup-link">查看详情 →</a></div></div>`, { maxWidth: 280, className: 'map-popup-container' });
  marker._categoryKey = category.key;
  marker._provinceId = building.pid;
  marker._building = { n: building.n, e: building.e, dn: building.dn, pid: building.pid, p: null };
  return marker;
}

const _visibleEras = Config.eras.filter(e => e.timeline !== false);
const _timelineFlexCache = _visibleEras.map(e => {
  if (!isFinite(e.yearMin)) return Math.max(3, Math.min(14, 100));
  const rawSpan = Math.max(1, e.yearMax - e.yearMin);
  const exponent = e.yearMax < -1000 ? 0.18 : 0.32;
  return Math.max(3, Math.min(14, Math.pow(rawSpan, exponent)));
});

async function _loadMapDataAsync(allIds) {
  _mapMarkers = [];
  const addedNames = new Set();
  let totalBuildings = 0;
  const dynastyCounts = {};
  const loadedProvinces = new Set();
  const maxConcurrency = 8;
  const _processProvince = (id, data) => {
    if (!data?.bs || !_markerCluster) return;
    loadedProvinces.add(id);
    const provinceName = State.getProvinceName(id);
    const batch = [];
    const bs = data.bs;
    for (let i = 0, len = bs.length; i < len; i++) {
      const b = bs[i];
      const key = `${id}_${b.d}_${b.n}`;
      if (addedNames.has(key) || b.lat === undefined || b.lng === undefined) continue;
      addedNames.add(key);
      b.p = provinceName;
      b.pid = id;
      const marker = _createMapMarker(b);
      const eraId = Config.getEarliestDynasty(b.e);
      _mapMarkers.push({ marker, categoryKey: marker._categoryKey, eraId });
      if (_passesFilters(marker._categoryKey, eraId)) batch.push(marker);
      totalBuildings++;
      if (eraId) dynastyCounts[eraId] = (dynastyCounts[eraId] || 0) + 1;
    }
    if (batch.length > 0) _markerCluster.addLayers(batch);
    const batchLoaded = loadedProvinces.size;
    const pct = Math.round(batchLoaded / allIds.length * 100);
    if (_el.statLoaded) _el.statLoaded.textContent = batchLoaded;
    if (_el.statTotal) _el.statTotal.textContent = totalBuildings;
    if (_el.progressFill) _el.progressFill.style.width = pct + '%';
    if (batchLoaded === 1) { _renderTimeline(dynastyCounts, _visibleEras); _updateMapLabel(); }
  };

  const queue = [...allIds];
  const workers = Array.from({ length: maxConcurrency }, () => (async () => {
    while (queue.length > 0 && _markerCluster) {
      const id = queue.shift();
      try { const data = await HashSearch.loadProvinceData(id); _processProvince(id, data); } catch (_) {}
    }
  })());
  await Promise.allSettled(workers);

  _updateMapLabel();
  if (_el.progressFill) { _el.progressFill.style.width = '100%'; _el.progressFill.style.opacity = '0'; }
  if (_el.statLoading) _el.statLoading.style.display = 'none';
  _renderTimeline(dynastyCounts, _visibleEras);
  if (_activeEraFilter !== 'all') {
    const activeBlock = _el.timeline?.querySelector(`.era-timeline-block[data-era="${_activeEraFilter}"]`);
    if (activeBlock) activeBlock.classList.add('active');
  }
}

function _renderTimeline(dynastyCounts, visibleEras) {
  if (!_el.eraTrack) return;
  _el.eraTrack.innerHTML = visibleEras.map((e, idx) => {
    const count = dynastyCounts[e.id] || 0;
    const color = Config.eraColors[e.id] || '#888';
    const flexVal = _timelineFlexCache[idx];
    return `<div class="era-timeline-block${count === 0 ? ' empty' : ''}" data-era="${e.id}" style="flex:${flexVal};background:${color};" title="${e.name}（${count}处）"><span class="era-timeline-label">${e.name}</span></div>`;
  }).join('');
}
