import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { ensureLeaflet } from './leaflet.js';
import { t as i18nT } from './i18n.js';

let _map = null;
let _markerCluster = null;
let _mapMarkers = [];
let _activeEraFilter = 'all';
let _activeCategoryFilter = 'all';
let _loadGeneration = 0;
const _el = {};

function _nearbyCallback(userLat, userLng) {
    if (!_mapMarkers.length) return [];
    const category = Config.buildingCategories;
    return _mapMarkers.reduce((acc, m) => {
      if (!_passesFilters(m.categoryKey, m.eraId)) return acc;
      const ll = m.marker.getLatLng();
      if (!ll) return acc;
      const b = m.marker._building || {};
      const cat = category[m.categoryKey];
      if (!b.n) return acc;
      const displayName = State.lang === 'en' ? (b.en || b.n) : b.n;
      acc.push({ name: displayName, lat: ll.lat, lng: ll.lng, distance: UI.haversineDistance(userLat, userLng, ll.lat, ll.lng), icon: cat?.icon || '🏛️', detailUrl: Utils.generateBuildingUrl(b) });
      return acc;
    }, []).sort((a, b) => a.distance - b.distance).slice(0, 5);
}

export async function render(container, destroyMapFn) {
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
      <div class="map__timeline" id="mapTimeline">
        <div class="era-timeline-all active" data-era="all">${i18nT('map.allEras')}</div>
        <div class="era-timeline-track" id="eraTimelineTrack"></div>
      </div>
      <div class="map__legend" id="mapLegend">
        <div class="map__legend-item active" data-cat="all">
          <span class="map__legend-dot" style="background:#666;"></span>
          <span class="map__legend-label">${i18nT('map.allCategories')}</span>
        </div>
        ${Object.entries(Config.buildingCategories).map(([key, cat]) =>
          `<div class="map__legend-item" data-cat="${key}">
            <span class="map__legend-dot" style="background:${cat.markerColor};"></span>
            <span class="map__legend-label">${cat.icon} ${Config.getCategoryLabel(cat, State.lang)}</span>
          </div>`
        ).join('')}
      </div>
      <div class="map__stats-bar">
        <div class="map__stats-inner">
          <div class="map__stat-item">
            <span class="map__stat-label" id="mapStatLabel">${i18nT('map.allEraLabel')} · ${i18nT('map.allCatLabel')}</span>
            <span class="map__stat-num" id="mapStatTotal">0</span>
          </div>
          <span class="map__stat-sep">·</span>
          <div class="map__stat-item">
            <span class="map__stat-label">${i18nT('map.cover')}</span>
            <span class="map__stat-num" id="mapStatProvinces">${State.getProvinceMeta()?.provinces?.length || 0}</span>
            <span class="map__stat-label">${i18nT('map.provinceShort')}</span>
          </div>
          <span class="map__stat-sep">·</span>
          <div class="map__stat-item map__stat--loading" id="mapStatLoading">
            <span class="map__stat-num map__stat-num--loading" id="mapStatLoaded">0</span>
            <span class="map__stat-sep" style="font-size:0.5rem;">/</span>
            <span class="map__stat-num map__stat-num--loading" id="mapTotalCount2">${allProvinceIds.length}</span>
            <span class="map__stat-text--loading" id="mapStatLoadingText">${i18nT('map.statLoaded')}</span>
          </div>
        </div>
        <span class="map__stats-tip">${i18nT('map.tip')}</span>
      </div>
      <div class="map__full-wrapper">
        <div id="mapFull" class="map__full"></div>
        <div class="map__progress-bar" id="mapProgressBar"><div class="map__progress-fill" id="mapProgressFill"></div></div>
      </div>
    </div>`;

  _cacheDOM();
  // 立即渲染时间轴骨架（所有朝代都可点击），避免部分数据加载时出现空朝代按钮
  _renderTimeline({}, _visibleEras);
  _updateMapLabel();
  _el.timeline?.addEventListener('click', e => {
    const allBtn = e.target.closest('.era-timeline-all');
    const block = e.target.closest('.era-timeline-block');
    if (allBtn) { _setEraFilter('all'); return; }
    if (!block || block.classList.contains('empty')) return;
    const eraId = block.dataset.era;
    if (eraId) _setEraFilter(eraId);
  });

  _el.legend?.addEventListener('click', e => {
    const item = e.target.closest('.map__legend-item');
    if (!item) return;
    const cat = item.dataset.cat;
    _el.legend.querySelectorAll('.map__legend-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    _setCategoryFilter(cat);
  });

  if (_el.mapFull) { await ensureLeaflet(); _initMap(_el.mapFull); UI.enableMapFullscreen(_el.mapFull, () => _map?.invalidateSize(), _nearbyCallback); }
  if (destroyMapFn) destroyMapFn(() => _destroyMap());
  _loadMapDataAsync(allProvinceIds);
}



function _initMap(container) {
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
        html: `<div class="map__cluster map__cluster--${size}"><span>${count}</span></div>`,
        className: 'map__cluster-container', iconSize: L.point(40, 40)
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
  const eraName = ae && ae !== 'all' ? (() => { const e = Config.getEraById(ae); return e ? Config.getEraName(e, State.lang) : ae; })() : i18nT('map.allEras');
  const catName = ac && ac !== 'all' ? (Config.getCategoryLabel(Config.buildingCategories[ac], State.lang) || ac) : i18nT('map.allCategories');
  _el.statLabel.textContent = eraName + ' · ' + catName;
}

function _createMapMarker(building) {
  const category = Config.getBuildingCategory(building);
  const size = category.size || 20;
  const wh = category.isWorldHeritage;
  const mc = category.markerColor;
  const icon = L.divIcon({
    html: `<div class="map__marker${wh ? ' map__marker--world' : ''}" style="background:${mc};width:${size}px;height:${size}px;" title="${building.n}"><span>${category.icon}</span></div>`,
    className: 'map__marker-container', iconSize: [size + 4, size + 4], iconAnchor: [(size + 4) / 2, (size + 4) / 2]
  });
  const marker = L.marker([building.lat, building.lng], { icon });
  marker.bindTooltip(Utils.getDisplayName(building), { direction: 'top', offset: L.point(0, -size / 2 - 4), className: 'route-map__tooltip' });
  const badge = Utils.generateProtectionBadge(building);
  marker.bindPopup(`<div class="map__popup"><div class="map__popup-header" style="border-left:3px solid ${mc};padding-left:8px;"><strong>${category.icon} ${Utils.getDisplayName(building)}</strong></div><div class="map__popup-body"><div class="map__popup-info"><span class="map__popup-era">📅 ${building.e}</span><span class="map__popup-district">📍 ${building.dn}</span></div>${badge ? `<div class="map__popup-badge">${badge}</div>` : ''}<p class="map__popup-desc">${Utils.truncateText(building.desc, 80)}</p><a href="${Utils.generateBuildingUrl(building)}" target="_blank" class="map__popup-link">${i18nT('common.viewDetail')}</a></div></div>`, { maxWidth: 280, className: 'map__popup-container' });
  marker._categoryKey = category.key;
  marker._provinceId = building.pid;
  marker._building = { n: building.n, en: building.en, e: building.e, dn: building.dn, pid: building.pid, d: building.d, p: null };
  return marker;
}

const _visibleEras = Config.eras.filter(e => e.timeline !== false);
const _timelineFlexCache = _visibleEras.map(e => {
  if (!isFinite(e.yearMin)) return 14;
  const rawSpan = Math.max(1, e.yearMax - e.yearMin);
  const exponent = e.yearMax < -1000 ? 0.18 : 0.32;
  return Math.max(3, Math.min(14, Math.pow(rawSpan, exponent)));
});

async function _loadMapDataAsync(allIds) {
  const gen = ++_loadGeneration;
  _mapMarkers = [];
  const addedNames = new Set();
  let totalBuildings = 0;
  const dynastyCounts = {};
  const loadedProvinces = new Set();
  const maxConcurrency = 6;

  const _processProvinceChunk = (id, data, startIdx, endIdx, batchContainer, provinceName) => {
    for (let i = startIdx; i < endIdx && i < data.length; i++) {
      const b = data[i];
      const key = `${id}_${b.d}_${b.dn}_${b.n}`;
      if (addedNames.has(key) || b.lat == null || b.lng == null || !isFinite(b.lat) || !isFinite(b.lng)) continue;
      addedNames.add(key);
      b.p = provinceName;
      b.pid = id;
      const marker = _createMapMarker(b);
      const eraId = Config.getEarliestDynasty(b.e);
      _mapMarkers.push({ marker, categoryKey: marker._categoryKey, eraId });
      if (_passesFilters(marker._categoryKey, eraId)) {
        batchContainer.push(marker);
      }
      totalBuildings++;
      if (eraId) dynastyCounts[eraId] = (dynastyCounts[eraId] || 0) + 1;
    }
  };

  const _processProvince = async (id, data) => {
    if (!Array.isArray(data) || !_markerCluster || _loadGeneration !== gen) return;
    loadedProvinces.add(id);
    const provinceName = State.getProvinceName(id);
    const batchContainer = [];
    const chunkSize = 200;

    for (let start = 0; start < data.length; start += chunkSize) {
      if (_loadGeneration !== gen || !_markerCluster) return;
      const end = Math.min(start + chunkSize, data.length);
      _processProvinceChunk(id, data, start, end, batchContainer, provinceName);
      if (start + chunkSize < data.length) await new Promise(r => setTimeout(r, 0));
    }

    if (batchContainer.length > 0 && _markerCluster && _loadGeneration === gen) {
      _markerCluster.addLayers(batchContainer);
    }

    const batchLoaded = loadedProvinces.size;
    const pct = Math.round(batchLoaded / allIds.length * 100);
    if (_loadGeneration !== gen) return;
    if (_el.statLoaded) _el.statLoaded.textContent = batchLoaded;
    if (_el.statTotal) _el.statTotal.textContent = totalBuildings;
    if (_el.progressFill) _el.progressFill.style.width = pct + '%';
    if (batchLoaded === 1) { _updateMapLabel(); }
  };

  const queue = [...allIds];
  const workers = Array.from({ length: maxConcurrency }, () => (async () => {
    while (queue.length > 0 && _markerCluster && _loadGeneration === gen) {
      const id = queue.shift();
      try {
        const data = await HashSearch.loadProvinceData(id, State.lang);
        if (_loadGeneration === gen) await _processProvince(id, data);
      } catch (_) {}
    }
  })());
  await Promise.allSettled(workers);

  if (_loadGeneration !== gen) return;
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
  const isSkeleton = !dynastyCounts || Object.keys(dynastyCounts).length === 0;
  _el.eraTrack.innerHTML = visibleEras.map((e, idx) => {
    const count = dynastyCounts[e.id] || 0;
    const color = Config.eraColors[e.id] || '#888';
    const flexVal = _timelineFlexCache[idx];
    const emptyClass = (!isSkeleton && count === 0) ? ' empty' : '';
    return `<div class="era-timeline-block${emptyClass}" data-era="${e.id}" style="flex:${flexVal};background:${color};" title="${Config.getEraName(e, State.lang)}${isSkeleton ? '' : `（${count}${State.lang === 'en' ? ' sites' : '处'}`}"><span class="era-timeline-label">${Config.getEraName(e, State.lang)}</span></div>`;
  }).join('');
}
