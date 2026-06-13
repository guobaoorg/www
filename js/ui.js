import { ensureLeaflet } from './leaflet.js';
import { Config } from './core.js';
import { State } from './core.js';

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
    document.querySelector('.nav-toggle')?.addEventListener('click', () => {
      document.querySelector('.nav-menu')?.classList.toggle('active');
    });
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

  updateBreadcrumb() {
    const breadcrumbList = document.getElementById('breadcrumbList');
    if (!breadcrumbList) return;
    let items = [{ name: '🏠 首页', href: '?page=home' }];
    const v = State.currentView;
    if (v === 'provinces') items.push({ name: '🗺️ 省份' });
    else if (v === 'province' && State.currentProvince) {
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      const province = State.getProvinceById(State.currentProvince);
      if (province) items.push({ name: `${Config.getProvinceStyle(State.currentProvince).icon} ${province.name}` });
    } else if (v === 'district') {
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      const province = State.getProvinceById(State.currentProvince);
      if (province) items.push({ name: `${Config.getProvinceStyle(State.currentProvince).icon} ${province.name}`, href: `?page=province&id=${province.id}` });
      const district = State.getDistrictData(State.currentProvince, State.currentDistrict);
      if (district) items.push({ name: `📍 ${district.n}` });
    } else if (v === 'building' && State.currentBuildingName) {
      const building = State.findBuildingByFullPath(State.currentBuildingName);
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      if (building) {
        const pStyle = Config.getProvinceStyle(building.pid);
        if (building.pid === 'cross') {
          items.push({ name: `${pStyle.icon} ${building.p}`, href: '?page=cross' });
          items.push({ name: `📍 ${building.dn}`, href: '?page=cross' });
        } else {
          items.push({ name: `${pStyle.icon} ${building.p}`, href: `?page=province&id=${building.pid}` });
          items.push({ name: `📍 ${building.dn}`, href: `?page=district&pid=${building.pid}&did=${building.d}` });
        }
        items.push({ name: `🏛️ ${building.n}` });
      }
    } else if (v === 'tags') items.push({ name: '🏷️ 标签' });
    else if (v === 'tag') {
      items.push({ name: '🏷️ 标签', href: '?page=tags' });
      items.push({ name: `${Config.getTagStyle(decodeURIComponent(State.currentTag), 0).icon} ${decodeURIComponent(State.currentTag)}` });
    } else if (v === 'search') items.push({ name: '🔍 搜索' });
    else if (v === 'quiz') items.push({ name: '🗝️ 猜保' });
    else if (v === 'cross') items.push({ name: '🌊 跨省文物保护单位' });
    else if (v === 'trail') items.push({ name: '👣 足迹' });
    else if (v === 'map') items.push({ name: '🗺️ 地图' });
    else if (v === 'trail-detail' && State.currentTrailId) {
      items.push({ name: '👣 足迹', href: '?page=trail' });
      const trail = State.getTrailRegistry()?.find(t => t.id === State.currentTrailId);
      if (trail) {
        const _tl = { game: '🎮 游戏', novel: '📚 古典', journal: '📝 游记', drama: '🎭 戏曲', history: '📜 历史' };
        if (trail.type && _tl[trail.type]) items.push({ name: _tl[trail.type], href: `?page=trail&type=${trail.type}` });
        items.push({ name: `${trail.icon} ${trail.title}` });
      }
    }
    breadcrumbList.innerHTML = items.map((item, index) => {
      if (index === items.length - 1 || !item.href) return `<li class="active">${item.name}</li>`;
      return `<li><a href="${item.href}" data-nav>${item.name}</a></li>`;
    }).join('');
  },

  updateActiveNav() {
    document.querySelectorAll('.nav-menu__link').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      const v = State.currentView;
      if ((v === 'trail' || v === 'trail-detail') && href === '?page=trail') link.classList.add('active');
      else if (href === `?page=${v}`) link.classList.add('active');
    });
  },

  async createSatelliteMap(mapDiv, lat, lng) {
    if (!mapDiv || !lat || !lng) return;
    await ensureLeaflet();
    const map = L.map(mapDiv, {
      center: [lat, lng], zoom: 15, zoomControl: true, attributionControl: false
    });
    const osm = L.tileLayer(Config.TILE_URLS.OSM, { maxZoom: 18, attribution: '© OpenStreetMap' });
    const sat = L.tileLayer(Config.TILE_URLS.SAT, { maxZoom: 19 });
    const road = L.tileLayer(Config.TILE_URLS.ROAD, { maxZoom: 18, opacity: 0.7 });
    const labels = L.tileLayer(Config.TILE_URLS.LABELS, { maxZoom: 18, opacity: 0.6 });
    const satGroup = L.layerGroup([sat, road, labels]);
    L.control.layers({ '标准': osm, '卫星': satGroup }, null, { position: 'bottomleft', collapsed: true }).addTo(map);
    satGroup.addTo(map);
    const markerIcon = L.divIcon({
      className: 'quiz-satellite-marker',
      html: '<div class="quiz-satellite-pin"></div><div class="quiz-satellite-pulse"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10]
    });
    L.marker([lat, lng], { icon: markerIcon }).addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 100);
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
  }
};

export { UI };