import { Config, State, UI } from './core.js';
import { ensureLeaflet } from './leaflet.js';

const Utils = {

  darkenHexBg(hex) {
    // Convert a light pastel hex bg color to a dark-friendly version
    if (!hex || !hex.startsWith('#')) return hex || '';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Darken by blending with dark background: mix with #0d1117 at ~15% lightness
    const dr = Math.round(r * 0.2 + 13 * 0.8);
    const dg = Math.round(g * 0.2 + 17 * 0.8);
    const db = Math.round(b * 0.2 + 23 * 0.8);
    const toHex = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
    return `#${toHex(dr)}${toHex(dg)}${toHex(db)}`;
  },

  truncateText(text, maxLength, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
  },

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  CLUE_STAGES: [
    { key: 'architecture', label: '建筑风格', icon: '🏗️', hint: '这道建筑以什么风格著称？' },
    { key: 'description', label: '特色介绍', icon: '✨', hint: '看看它的特色描述...' },
    { key: 'features', label: '特色与价值', icon: '💎', hint: '它有什么独特价值？' },
    { key: 'history', label: '历史背景', icon: '📜', hint: '回顾它的历史...' },
    { key: 'location', label: '地区', icon: '📍', hint: '它在哪里？' },
    { key: 'era', label: '年代', icon: '📅', hint: '它属于什么年代？' }
  ],

  getLocationClue(b) { return b.l || '暂无地区信息'; },

  _hintPrompts: [
    '🤔提示？它的建筑风格很特别！', '🧐没头绪？我来描绘它的特色～',
    '🎯再想想？它的特点会有帮助！', '📖或许答案就在它的故事里：',
    '🗺️方向不对？看看它在哪里！', '⏳最后一击！年代即将揭晓～'
  ],

  getHintPrompt(nextStageIndex) {
    return this._hintPrompts[nextStageIndex] || '💡 让我来帮你！';
  },

  getClueText(stageKey, building) {
    switch (stageKey) {
      case 'architecture': return building.arch || '暂无建筑风格信息';
      case 'description': return building.desc || '暂无特色介绍';
      case 'features': return building.feat || '暂无特色与价值信息';
      case 'history': return building.hist || '暂无历史背景信息';
      case 'location': return this.getLocationClue(building) || '暂无地区信息';
      case 'era': {
        const eraTags = (building.g || []).join(' · ');
        return `年代：${building.e || '暂无信息'} · ${eraTags || '暂无标签'}`;
      }
      default: return '';
    }
  },

  checkAnswer(userInput, correctName) {
    if (!userInput.trim()) return false;
    const input = userInput.trim().toLowerCase();
    const correct = correctName.toLowerCase();
    const correctLen = correct.length;
    if (input === correct) return true;
    const minInputLen = correctLen <= 3 ? correctLen : Math.max(3, Math.ceil(correctLen * 0.75));
    const stripped = correct.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海)$/, '');
    if (stripped !== correct && input === stripped) return true;
    if (correct.includes(input) && input.length >= minInputLen) return true;
    if (input.includes(correct) && correctLen >= minInputLen && correctLen >= 3) return true;
    return false;
  },

  sanitizeClueText(text, building, stageKey) {
    if (!text || !building) return text;
    let result = text.replaceAll(building.n, '该建筑');
    const coreName = building.n.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海|旧址|古墓|建筑群|衙门|祠堂|民居|大院|庄园|关隘|长城|烽燧|驿站|会馆|书院|孔庙|文庙|道观|佛寺|寺院|庵堂|宫观|教堂|清真寺|墓园|石刻|碑林|造像|经幢|古建|群)$/, '');
    if (coreName !== building.n && coreName.length >= 2) result = result.replaceAll(coreName, '该建筑');
    if (stageKey && stageKey !== 'location' && stageKey !== 'era') {
      if (building.p) result = result.replaceAll(building.p, '该地区');
      if (building.dn) result = result.replaceAll(building.dn, '当地');
      if (building.e) result = result.replaceAll(building.e, '某个时期');
    }
    return result;
  },

  generateProtectionBadge(building) {
    if (building.wh) {
      return `<span class="protection-badge protection-badge--heritage">🌍 世界遗产${building.why ? '·' + building.why : ''}</span>`;
    }
    const pl = building.protectionLevel || '全国重点文物保护单位';
    if (pl.includes('全国重点文物保护单位')) {
      return `<span class="protection-badge protection-badge--national">${building.pb || '全国重点'}</span>`;
    }
    return '';
  },

  generateBuildingHash(building, getProvinceName) {
    const provinceName = building.p || (getProvinceName ? getProvinceName(building.pid) : '') || '';
    const districtName = building.dn || '';
    const pid = building.pid ? `&pid=${building.pid}` : '';
    return `?page=building&name=${encodeURIComponent(`${provinceName}${districtName}${building.n}`)}${pid}`;
  },

  _cardPriority: {'世界遗产':1,'古建筑':1,'近代建筑':1,'寺庙':1,'宫殿':1,'园林':1,'陵墓':1,'石窟':1,'塔':1,'桥梁':1,'革命遗址':1,'名人故居':1},

  _fmtDist(d) { return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`; },

  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  _getProvinceNameCached() {
    return this.getProvinceNameFn();
  },

  createBuildingCard(building, opts = {}) {
    const { matchReasons, maxTags = 5 } = opts;
    const href = this.generateBuildingHash(building, this._getProvinceNameCached());
    const provinceStyle = Config.getProvinceStyle(building.pid);
    const protectionBadge = this.generateProtectionBadge(building);
    const desc = building.desc;
    const shortDesc = desc ? (desc.length > 60 ? desc.slice(0, 60) : desc) : '';
    const tags = building.g || [];
    const maxT = maxTags;
    const tagCount = tags.length;
    let sortedTags = tags;
    if (tagCount > maxT) {
      const priority = this._cardPriority;
      sortedTags = [...tags].sort((a, b) => (priority[b] || 0) - (priority[a] || 0));
    }
    const matchHtml = matchReasons?.length ? `<div class="match-reasons">${matchReasons.map(r => `<span class="match-reason">${r}</span>`).join('')}</div>` : '';
    const dn = building.dn === '跨省文物保护单位' ? '跨省' : building.dn;
    const t12 = this.truncateText(building.t, 12);
    const tagsHtml = sortedTags.slice(0, maxT).map((tag, idx) => {
      const ts = Config.getTagStyle(tag, idx);
      return `<span class="building-tag" style="background:${ts.bg};color:${ts.color};">${ts.icon} ${tag}</span>`;
    }).join('');
    return `<div class="building-card" data-href="${href}" style="border-left-color:${provinceStyle.color};"><div class="building-card-header" style="background:${provinceStyle.bgColor};"><div class="building-card-header-left"><div class="building-province-icon" style="color:${provinceStyle.color};">${provinceStyle.icon}</div><div class="building-district">${dn}</div></div>${protectionBadge}</div><div class="building-content"><h3 class="building-title">${building.n}</h3>${matchHtml}<div class="building-meta"><span class="building-era">📅 ${building.e}</span><span class="building-type">${t12}</span></div><p class="building-desc">${shortDesc}</p><div class="building-tags">${tagsHtml}</div></div></div>`;
  },

  // 全屏地图功能：注入展开/关闭/定位按钮，返回 invalidate 回调
  // getNearby(userLat, userLng): 可选回调，返回 [{name, lat, lng, icon, detailUrl}] 按距离排序
  enableMapFullscreen(containerEl, onResize, getNearby) {
    if (!containerEl) return;
    containerEl.style.position = 'relative';

    // 避免重复注入
    if (containerEl.querySelector('.map-fs-controls')) return;

    const controls = document.createElement('div');
    controls.className = 'map-fs-controls';
    controls.innerHTML = `
      <button class="map-fs-btn map-fs-layer-btn" title="切换图层" aria-label="切换图层">🗺️</button>
      <button class="map-fs-btn map-fs-geo" title="定位到我" aria-label="定位到我">📍</button>
      <button class="map-fs-btn map-fs-close" title="退出全屏" aria-label="退出全屏">✕</button>
      <button class="map-fs-btn map-fs-open" title="全屏地图" aria-label="全屏地图">⛶</button>
    `;
    containerEl.appendChild(controls);

    // 距离面板（使用事件代理监听折叠）
    const distPanel = document.createElement('div');
    distPanel.className = 'map-fs-dist-panel';
    distPanel.style.display = 'none';
    containerEl.appendChild(distPanel);
    distPanel.addEventListener('click', (e) => {
      if (e.target.closest('.map-fs-dist-header')) distPanel.classList.toggle('collapsed');
    });

    let _userMarker = null;
    let _geoWatchId = null;
    let _nearbyMarkers = [];

    const enterFS = () => {
      containerEl.classList.add('map-container-fs');
      document.body.style.overflow = 'hidden';
      setTimeout(() => onResize?.(), 300);
    };

    const exitFS = () => {
      containerEl.classList.remove('map-container-fs');
      document.body.style.overflow = '';
      _stopGeolocation();
      setTimeout(() => onResize?.(), 300);
    };

    controls.querySelector('.map-fs-open').addEventListener('click', enterFS);
    controls.querySelector('.map-fs-close').addEventListener('click', exitFS);

    // ESC 退出全屏
    const escHandler = (e) => {
      if (e.key === 'Escape' && containerEl.classList.contains('map-container-fs')) exitFS();
    };
    document.addEventListener('keydown', escHandler);

    const geoBtn = controls.querySelector('.map-fs-geo');
    const layerBtn = controls.querySelector('.map-fs-layer-btn');
    const LAYER_NAMES = ['standard', 'satellite', 'historical'];
    const LAYER_ICONS = ['🗺️', '🛰️', '📜'];
    let _layerIndex = 1;

    // 自动检测初始图层状态
    if (containerEl._fsTileLayers) {
      const tl = containerEl._fsTileLayers;
      if (tl.satellite?._map) _layerIndex = 1;
      else if (tl.standard?._map) _layerIndex = 0;
      else if (tl.historical?._map) _layerIndex = 2;
      layerBtn.textContent = LAYER_ICONS[_layerIndex];
    }

    // 图层切换（循环切换：街道 → 卫星 → 历史 → 街道）
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
        distPanel.innerHTML = '<div class="map-fs-dist-empty">附近暂无国保建筑</div>';
        distPanel.style.display = 'block';
        return;
      }

      _clearNearbyMarkers();
      const L = window.L;
      const top5 = buildings.slice(0, 5);

      for (let i = 0; i < top5.length; i++) {
        const b = top5[i];
        if (!b.lat || !b.lng) continue;
        const icon = L.divIcon({
          html: `<div class="map-fs-dist-marker">${this._fmtDist(b.distance)}</div>`,
          className: 'map-fs-dist-marker-container',
          iconSize: [60, 22], iconAnchor: [30, 28]
        });
        _nearbyMarkers.push(L.marker([b.lat, b.lng], { icon, interactive: false, zIndexOffset: 5000 + i }).addTo(mapInstance));
      }

      distPanel.innerHTML = `<div class="map-fs-dist-header"><div class="map-fs-dist-title">📍 已定位 · 附近国保</div><button class="map-fs-dist-toggle" aria-label="折叠面板">▼</button></div>${top5.map(b => `<a class="map-fs-dist-item"${b.detailUrl ? ` href="${b.detailUrl}" target="_blank"` : ''}><span class="map-fs-dist-icon">${b.icon || '🏛️'}</span><span class="map-fs-dist-name">${b.name}</span><span class="map-fs-dist-val">${this._fmtDist(b.distance)}</span></a>`).join('')}`;
      distPanel.style.display = 'block';

    };

    const _findLeafletMap = (el) => el._fsMap || null;

    const _geoBtnMsg = (msg, ms) => { geoBtn.textContent = msg; if (ms) setTimeout(() => { geoBtn.textContent = '📍'; }, ms); };

    geoBtn.addEventListener('click', () => {
      if (_geoWatchId) { _stopGeolocation(); return; }
      if (!window.isSecureContext) { _geoBtnMsg('📍 需HTTPS', 2500); return; }
      if (!navigator.geolocation) { _geoBtnMsg('📍 不支持', 2000); return; }

      geoBtn.classList.add('map-fs-geo-pulse');
      geoBtn.textContent = '📍 定位中...';
      const L = window.L;
      const mapInstance = _findLeafletMap(containerEl);
      if (!L || !mapInstance) { _geoBtnMsg('📍', 0); geoBtn.classList.remove('map-fs-geo-pulse'); return; }

      const _onPosition = (pos) => {
        geoBtn.classList.remove('map-fs-geo-pulse');
        geoBtn.classList.add('active');
        geoBtn.textContent = '📍';
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        if (_userMarker) _userMarker.setLatLng(latlng);
        else _userMarker = L.marker(latlng, { icon: L.divIcon({ className: 'user-location-dot', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 10000 }).addTo(mapInstance);

        if (getNearby) {
          const buildings = getNearby(pos.coords.latitude, pos.coords.longitude);
          if (buildings && buildings.length > 0) {
            const bounds = L.latLngBounds([latlng]);
            for (let i = 0; i < buildings.length && i < 5; i++) {
              const b = buildings[i];
              if (b.lat && b.lng) bounds.extend(L.latLng(b.lat, b.lng));
            }
            mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          } else mapInstance.setView(latlng, Math.max(mapInstance.getZoom(), 14));
        } else mapInstance.setView(latlng, Math.max(mapInstance.getZoom(), 14));
        _updateDistPanel(pos.coords.latitude, pos.coords.longitude, mapInstance);
      };

      const _onError = (err) => {
        geoBtn.classList.remove('map-fs-geo-pulse');
        if (_geoWatchId) { navigator.geolocation.clearWatch(_geoWatchId); _geoWatchId = null; }
        const msgs = { 1: '📍 已拒绝', 2: '📍 无信号', 3: '📍 超时' };
        _geoBtnMsg(msgs[err.code] || '📍 定位失败', 2500);
      };

      navigator.geolocation.getCurrentPosition(
        pos => { _onPosition(pos); _geoWatchId = navigator.geolocation.watchPosition(_onPosition, _onError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }); },
        _onError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  },

  // Shared province name function (avoids duplication across files)
  getProvinceNameFn() {
    if (!this._provinceNameFn) this._provinceNameFn = State.getProvinceName.bind(State);
    return this._provinceNameFn;
  },

  // Shared simple marker creation (eliminates duplication in 5+ page modules)
  createSimpleMarker(building, opts = {}) {
    const L = window.L;
    if (!L) return null;
    const { popupHTML, className = 'marker-dot', containerClass = 'marker-container', iconSize = 10, maxWidth = 240 } = opts;
    const ll = L.latLng(building.lat, building.lng);
    const divIcon = L.divIcon({ html: `<div class="${className}"></div>`, className: containerClass, iconSize: [iconSize, iconSize], iconAnchor: [iconSize / 2, iconSize / 2] });
    const marker = L.marker(ll, { icon: divIcon });
    marker.bindTooltip(building.n, { direction: 'top', offset: L.point(0, -iconSize / 2 - 4), className: 'rm-tooltip' });
    if (popupHTML) marker.bindPopup(popupHTML, { maxWidth, className: 'map-popup-container' });
    return marker;
  },

  // Setup a simple building map with markers (replaces 5+ nearly identical functions)
  async setupBuildingMap(mapEl, buildings, opts = {}) {
    if (!mapEl || !buildings?.length) return;
    await ensureLeaflet();
    const L = window.L;
    if (!L) return;
    const map = UI.createMapWithLayers(mapEl);
    const bounds = L.latLngBounds([]);
    const _pfn = this.getProvinceNameFn();
    const _hash = b => this.generateBuildingHash(b, _pfn);
    const defaultPopup = b => `<div class="map-popup"><div class="map-popup-header"><strong>🏛️ ${b.n}</strong></div><div class="map-popup-body"><a href="${_hash(b)}" class="map-popup-link">查看详情 →</a></div></div>`;
    const popupBuilder = opts.popupBuilder ? b => opts.popupBuilder(b, _hash) : defaultPopup;
    buildings.forEach(b => {
      bounds.extend(L.latLng(b.lat, b.lng));
      const marker = this.createSimpleMarker(b, { popupHTML: popupBuilder(b) });
      if (marker) marker.addTo(map);
    });
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: opts.maxZoom || 14 });
    this.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => buildings.map(b => ({
      name: b.n, lat: b.lat, lng: b.lng, distance: this.haversineDistance(userLat, userLng, b.lat, b.lng), icon: '🏛️', detailUrl: _hash(b)
    })).sort((a, b) => a.distance - b.distance).slice(0, 5));
  }
};

export { Utils };