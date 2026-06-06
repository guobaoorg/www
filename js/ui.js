/**
 * UI 模块 — 主题、面包屑、导航等 UI 交互
 */
import Config from './config.js';
import State from './state.js';

const UI = {
  /** 设置主题 */
  setupTheme() {
    document.documentElement.setAttribute('data-theme', State.theme);
  },

  /** 切换主题 */
  toggleTheme() {
    State.theme = State.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', State.theme);
    localStorage.setItem('theme', State.theme);
  },

  /** 绑定事件监听 */
  setupEventListeners(onNavigate) {
    // 主题切换
    document.querySelector('.theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // 移动端菜单
    document.querySelector('.nav-toggle')?.addEventListener('click', () => {
      document.querySelector('.nav-menu')?.classList.toggle('active');
    });

    // 卡片点击导航
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.building-card');
      if (card) {
        const url = card.getAttribute('data-href');
        if (url) {
          e.preventDefault();
          e.stopPropagation();
          onNavigate(url);
        }
      }
    });

    // data-nav 链接导航
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-nav]');
      if (link) {
        e.preventDefault();
        onNavigate(link.getAttribute('href') || link.getAttribute('data-nav'));
      }
    });

    // 浏览器前进/后退
    window.addEventListener('popstate', () => {
      window.dispatchEvent(new CustomEvent('route-change'));
    });
  },

  /** 更新面包屑导航 */
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
      if (province) {
        items.push({ name: `${Config.getProvinceStyle(State.currentProvince).icon} ${province.name}`, href: `?page=province&id=${province.id}` });
        const district = State.getDistrictData(State.currentProvince, State.currentDistrict);
        if (district) items.push({ name: `📍 ${district.name}` });
      }
    } else if (v === 'building' && State.currentBuildingName) {
      const building = State.findBuildingByFullPath(State.currentBuildingName);
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      if (building) {
        const pStyle = Config.getProvinceStyle(building.provinceId);
        if (building.provinceId === 'cross') {
          items.push({ name: `${pStyle.icon} ${building.province}`, href: '?page=cross' });
          items.push({ name: `📍 ${building.districtName}`, href: '?page=cross' });
        } else {
          items.push({ name: `${pStyle.icon} ${building.province}`, href: `?page=province&id=${building.provinceId}` });
          items.push({ name: `📍 ${building.districtName}`, href: `?page=district&pid=${building.provinceId}&did=${building.district}` });
        }
        items.push({ name: `🏛️ ${building.name}` });
      }
    } else if (v === 'tags') items.push({ name: '🏷️ 标签' });
    else if (v === 'tag') {
      items.push({ name: '🏷️ 标签', href: '?page=tags' });
      items.push({ name: `${Config.getTagStyle(decodeURIComponent(State.currentTag), 0).icon} ${decodeURIComponent(State.currentTag)}` });
    } else if (v === 'search') items.push({ name: '🔍 搜索' });
    else if (v === 'quiz') items.push({ name: '🔍 识保' });
    else if (v === 'cross') items.push({ name: '🌊 跨省文物保护单位' });
    else if (v === 'trail') items.push({ name: '👣 足迹' });
    else if (v === 'map') items.push({ name: '🗺️ 地图' });
    else if (v === 'trail-detail' && State.currentTrailId) {
      items.push({ name: '👣 足迹', href: '?page=trail' });
      const trail = State.getTrailRegistry()?.find(t => t.id === State.currentTrailId);
      if (trail) items.push({ name: `${trail.icon} ${trail.title}` });
    }

    breadcrumbList.innerHTML = items.map((item, index) => {
      if (index === items.length - 1 || !item.href) {
        return `<li class="active">${item.name}</li>`;
      }
      return `<li><a href="${item.href}" data-nav>${item.name}</a></li>`;
    }).join('');
  },

  /** 更新导航活跃状态 */
  updateActiveNav() {
    document.querySelectorAll('.nav-menu__link').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      const v = State.currentView;
      if ((v === 'trail' || v === 'trail-detail') && href === '?page=trail') link.classList.add('active');
      else if (href === `?page=${v}`) link.classList.add('active');
    });
  },

  /** 注入结构化数据 */
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
      if (a) {
        breadcrumbs.push({ '@type': 'ListItem', position: i + 1, name, item: new URL(a.href, location.origin).href });
      } else {
        breadcrumbs.push({ '@type': 'ListItem', position: i + 1, name });
      }
    });
    const ld = { '@context': 'https://schema.org', '@graph': [] };
    if (breadcrumbs.length > 1) {
      ld['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: breadcrumbs });
    }
    script.textContent = JSON.stringify(ld);
  }
};

export default UI;