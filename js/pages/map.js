import { HashSearch, Config, State, Utils } from '../core.js';

let _map = null;
let _markerCluster = null;
let _mapMarkers = [];
let _activeEraFilter = 'all';
let _activeCategoryFilter = 'all';
let _filteredMarkerCount = 0;

export async function render(container) {
  _destroyMap();
  _activeEraFilter = 'all';
  _activeCategoryFilter = 'all';

  const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];

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

  const timeline = document.getElementById('mapTimeline');
  if (timeline) {
    timeline.addEventListener('click', e => {
      const allBtn = e.target.closest('.era-timeline-all');
      const block = e.target.closest('.era-timeline-block');
      if (allBtn) { _setEraFilter('all'); return; }
      if (!block || block.classList.contains('empty')) return;
      const eraId = block.dataset.era;
      if (eraId) _setEraFilter(eraId);
    });
  }

  const legendEl = document.getElementById('mapLegend');
  if (legendEl) {
    legendEl.addEventListener('click', e => {
      const item = e.target.closest('.map-legend-item');
      if (!item) return;
      const cat = item.dataset.cat;
      legendEl.querySelectorAll('.map-legend-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      _setCategoryFilter(cat);
    });
  }

  const mapEl = document.getElementById('mapFull');
  if (mapEl) _initMap(mapEl);
  _loadMapDataAsync(allProvinceIds);
}

export function destroyMap() { _destroyMap(); }

function _initMap(container) {
  if (_map) { _map.invalidateSize(); return; }
  _map = L.map(container, { center: [35.5, 105.0], zoom: 5, zoomControl: true, attributionControl: false });
  const osm = L.tileLayer(Config.TILE_URLS.OSM, { maxZoom: 18, minZoom: 3, attribution: '© OpenStreetMap' });
  const sat = L.tileLayer(Config.TILE_URLS.SAT, { maxZoom: 18, minZoom: 3 });
  const road = L.tileLayer(Config.TILE_URLS.ROAD, { maxZoom: 18, minZoom: 3, opacity: 0.7 });
  const labels = L.tileLayer(Config.TILE_URLS.LABELS, { maxZoom: 18, minZoom: 3, opacity: 0.6 });
  const satGroup = L.layerGroup([sat, road, labels]);
  L.control.layers({ '标准': osm, '卫星': satGroup }, null, { position: 'bottomleft', collapsed: true }).addTo(_map);
  satGroup.addTo(_map);
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

function _refreshMarkers() {
  if (!_markerCluster || !_mapMarkers) return;
  _markerCluster.clearLayers();
  let visible = 0;
  const provSet = new Set();
  for (const { marker, categoryKey, eraId } of _mapMarkers) {
    if (_passesFilters(categoryKey, eraId)) {
      _markerCluster.addLayer(marker);
      visible++;
      if (marker._provinceId) provSet.add(marker._provinceId);
    }
  }
  _filteredMarkerCount = visible;

  const statTotal = document.getElementById('mapStatTotal');
  const provEl = document.getElementById('mapStatProvinces');
  if (statTotal) statTotal.textContent = visible;
  if (provEl) provEl.textContent = provSet.size || State.getProvinceMeta()?.provinces?.length || 0;
}

function _setCategoryFilter(categoryKey) {
  _activeCategoryFilter = categoryKey;
  _refreshMarkers();
  _updateMapLabel();
}

function _setEraFilter(eraId) {
  _activeEraFilter = eraId;
  _refreshMarkers();
  const timelineEl = document.getElementById('mapTimeline');
  if (timelineEl) {
    timelineEl.querySelectorAll('.era-timeline-block, .era-timeline-all').forEach(el => el.classList.remove('active'));
    if (eraId === 'all') {
      const allBtn = timelineEl.querySelector('.era-timeline-all');
      if (allBtn) allBtn.classList.add('active');
    } else {
      const activeEl = timelineEl.querySelector(`[data-era="${eraId}"]`);
      if (activeEl) activeEl.classList.add('active');
    }
  }
  _updateMapLabel();
}

function _updateMapLabel() {
  const labelEl = document.getElementById('mapStatLabel');
  if (!labelEl) return;
  const activeEra = _activeEraFilter && _activeEraFilter !== 'all' ? Config.eras.find(e => e.id === _activeEraFilter) : null;
  const activeCat = _activeCategoryFilter && _activeCategoryFilter !== 'all' ? Config.buildingCategories[_activeCategoryFilter] : null;
  const parts = [activeEra ? activeEra.name : '全部年代', activeCat ? activeCat.label : '全部分类'];
  labelEl.textContent = parts.join(' · ');
}

function _createMapMarker(building) {
  const category = Config.getBuildingCategory(building);
  const size = category.size || 20;
  const worldClass = category.isWorldHeritage ? ' map-marker-world' : '';
  const icon = L.divIcon({
    html: `<div class="map-marker${worldClass}" style="background:${category.markerColor}; width:${size}px; height:${size}px;" title="${building.name}"><span>${category.icon}</span></div>`,
    className: 'map-marker-container',
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2]
  });
  const marker = L.marker([building.lat, building.lng], { icon });
  const protectionBadge = Utils.generateProtectionBadge(building);
  marker.bindPopup(
    `<div class="map-popup">
      <div class="map-popup-header" style="border-left:3px solid ${category.markerColor}; padding-left:8px;">
        <strong>${category.icon} ${building.name}</strong>
      </div>
      <div class="map-popup-body">
        <div class="map-popup-info">
          <span class="map-popup-era">📅 ${building.era}</span>
          <span class="map-popup-district">📍 ${building.districtName}</span>
        </div>
        ${protectionBadge ? `<div class="map-popup-badge">${protectionBadge}</div>` : ''}
        <p class="map-popup-desc">${Utils.truncateText(building.description, 80)}</p>
        <a href="${Utils.generateBuildingHash(building, State.getProvinceName.bind(State))}" target="_blank" class="map-popup-link">查看详情 →</a>
      </div>
    </div>`,
    { maxWidth: 280, className: 'map-popup-container' }
  );
  marker._categoryKey = category.key;
  marker._provinceId = building.provinceId;
  return marker;
}

// Precomputed timeline flex values
const _timelineFlexCache = Config.eras.filter(e => e.timeline !== false).map(e => {
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
  const batchSize = 6;
  const progressFill = document.getElementById('mapProgressFill');
  const statLoaded = document.getElementById('mapStatLoaded');
  const statTotal = document.getElementById('mapStatTotal');
  const visibleEras = Config.eras.filter(e => e.timeline !== false);

  for (let i = 0; i < allIds.length; i += batchSize) {
    if (!_markerCluster) return;
    const batch = allIds.slice(i, i + batchSize);
    try { await Promise.all(batch.map(id => HashSearch.loadProvinceData(id))); } catch (_) {}

    for (const id of batch) {
      const data = HashSearch.getProvinceData(id);
      if (!data?.buildings) continue;
      loadedProvinces.add(id);
      const provinceName = State.getProvinceName(id);
      for (const b of data.buildings) {
        const key = `${id}_${b.district}_${b.name}`;
        if (addedNames.has(key) || b.lat === undefined || b.lng === undefined) continue;
        addedNames.add(key);
        b.province = provinceName;
        b.provinceId = id;
        const marker = _createMapMarker(b);
        const eraId = Config.getEarliestDynasty(b.era);
        _mapMarkers.push({ marker, categoryKey: marker._categoryKey, eraId });
        if (_passesFilters(marker._categoryKey, eraId)) {
          _markerCluster.addLayer(marker);
        }
        totalBuildings++;
        if (eraId) dynastyCounts[eraId] = (dynastyCounts[eraId] || 0) + 1;
      }
    }

    const batchLoaded = loadedProvinces.size;
    const pct = Math.round(batchLoaded / allIds.length * 100);
    if (statLoaded) statLoaded.textContent = batchLoaded;
    if (statTotal) statTotal.textContent = totalBuildings;
    if (progressFill) progressFill.style.width = pct + '%';

    if (i === 0) {
      _renderTimeline(dynastyCounts, visibleEras);
      _updateMapLabel();
    }
  }

  _updateMapLabel();
  if (progressFill) { progressFill.style.width = '100%'; progressFill.style.opacity = '0'; }
  const doneLoadingEl = document.getElementById('mapStatLoading');
  if (doneLoadingEl) doneLoadingEl.style.display = 'none';

  _renderTimeline(dynastyCounts, visibleEras);
  if (_activeEraFilter !== 'all') {
    const activeBlock = document.querySelector(`.era-timeline-block[data-era="${_activeEraFilter}"]`);
    if (activeBlock) activeBlock.classList.add('active');
  }
}

function _renderTimeline(dynastyCounts, visibleEras) {
  const track = document.getElementById('eraTimelineTrack');
  if (!track) return;
  track.innerHTML = visibleEras.map((e, idx) => {
    const count = dynastyCounts[e.id] || 0;
    const color = Config.eraColors[e.id] || '#888';
    const flexVal = _timelineFlexCache[idx];
    return `<div class="era-timeline-block${count === 0 ? ' empty' : ''}"
      data-era="${e.id}" style="flex:${flexVal}; background:${color};" title="${e.name}（${count}处）">
      <span class="era-timeline-label">${e.name}</span>
    </div>`;
  }).join('');
}
