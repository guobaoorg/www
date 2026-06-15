import { HashSearch, State, Utils, Config, UI, ensureLeaflet } from '../core.js';

export async function render(container) {
  container.innerHTML = `
    <div class="container">
      <div class="search-page">
        <div class="search-page-input-wrapper">
          <input type="text" class="search-page-input" placeholder="搜索建筑名称、地点、年代..." id="searchPageInput" autocomplete="off">
          <button class="search-page-clear" id="searchPageClear" style="display:none;">×</button>
        </div>
        <div class="search-page-results" id="searchPageResults">
          <div class="search-page-hint"><p>输入关键词搜索</p></div>
        </div>
      </div>
    </div>`;

  if (HashSearch.getCacheStats().loadedProvinces === 0 && !HashSearch.isBgActive()) {
    HashSearch.startBgPreload([...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross']);
  }

  const input = document.getElementById('searchPageInput');
  const clearBtn = document.getElementById('searchPageClear');
  const results = document.getElementById('searchPageResults');
  if (!input || !results) return;
  input.focus();

  let debounce = null;
  input.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (debounce) clearTimeout(debounce);
    if (q) {
      clearBtn.style.display = 'flex';
      debounce = setTimeout(() => runSearch(q, results), 200);
    } else {
      clearBtn.style.display = 'none';
      results.innerHTML = '<div class="search-page-hint"><p>输入关键词搜索</p></div>';
    }
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    results.innerHTML = '<div class="search-page-hint"><p>输入关键词搜索</p></div>';
    input.focus();
  });
}

let _searchRefreshHandler = null;

function runSearch(query, container) {
  const stats = HashSearch.getCacheStats();
  if (stats.loadedProvinces === 0) {
    container.innerHTML = `
      <div class="search-page-empty">
        <div class="search-empty-icon">⏳</div>
        <div class="search-empty-title">数据加载中...</div>
        <p>建筑数据正在后台加载，请稍后再试</p>
      </div>`;
    _startPreloadForSearch();
    if (!_searchRefreshHandler) {
      _searchRefreshHandler = () => {
        const input = document.getElementById('searchPageInput');
        if (input && input.value.trim()) {
          const results = document.getElementById('searchPageResults');
          if (results) runSearch(input.value.trim(), results);
        }
      };
      window.addEventListener('bg-preload-complete', _searchRefreshHandler, { once: true });
    }
    return;
  }

  const all = State.getAllBuildings();
  const fields = ['n','l','e','t','dn','g','desc','hist','arch','feat'];
  const results = HashSearch.fuzzySearch(all, query, fields);

  if (!results.length) {
    container.innerHTML = `
      <div class="search-page-empty">
        <div class="search-empty-icon">🔍</div>
        <div class="search-empty-title">未找到相关建筑</div>
        <p>请尝试其他关键词</p>
        <div class="search-tips"><p>💡 搜索提示：</p><ul><li>支持搜索建筑名称、地址、年代</li><li>支持搜索建筑描述和历史背景</li><li>支持搜索标签和保护批次</li></ul></div>
      </div>`;
    return;
  }
  container.innerHTML = `
    <div class="search-results-count">找到 <strong>${results.length}</strong> 处相关建筑 <span class="search-query-text">"${query}"</span></div>
    <div class="search-map" id="searchMap"></div>
    <div class="building-grid">${results.map(b => Utils.createBuildingCard(b, { matchReasons: b.matchReasons, maxTags: 4 })).join('')}</div>`;

  // 初始化搜索结果地图
  const coordsBuildings = results.filter(b => b.lat != null && b.lng != null);
  if (coordsBuildings.length > 0) {
    _initSearchMap(coordsBuildings);
  }
}

function _startPreloadForSearch() {
  if (HashSearch.isBgActive()) return;
  const provinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];
  HashSearch.startBgPreload(provinceIds);
}

async function _initSearchMap(buildings) {
  const mapEl = document.getElementById('searchMap');
  if (!mapEl) return;

  await ensureLeaflet();
  const L = window.L;
  if (!L) return;

  const map = UI.createMapWithLayers(mapEl);

  const bounds = L.latLngBounds([]);
  buildings.forEach(b => {
    const ll = L.latLng(b.lat, b.lng);
    bounds.extend(ll);
    const markerIcon = L.divIcon({
      html: `<div class="search-marker-dot"></div>`,
      className: 'search-marker-container',
      iconSize: [10, 10], iconAnchor: [5, 5]
    });
    const marker = L.marker(ll, { icon: markerIcon });
    marker.bindPopup(
      `<div class="map-popup">
        <div class="map-popup-header"><strong>🏛️ ${b.n}</strong></div>
        <div class="map-popup-body">
          <div class="map-popup-info">
            <span class="map-popup-district">📍 ${b.dn || ''}</span>
          </div>
          <a href="${Utils.generateBuildingHash(b)}" class="map-popup-link">查看详情 →</a>
        </div>
      </div>`,
      { maxWidth: 240, className: 'map-popup-container' }
    );
    marker.addTo(map);
  });

  map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

  Utils.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => {
    return buildings.map(b => ({
      name: b.n, lat: b.lat, lng: b.lng,
      distance: Utils.haversineDistance(userLat, userLng, b.lat, b.lng),
      icon: '🏛️',
      detailUrl: Utils.generateBuildingHash(b)
    })).sort((a, b) => a.distance - b.distance).slice(0, 5);
  });
}
