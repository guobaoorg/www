import { HashSearch } from './hash-search.js';
import { State } from './state.js';
import { Config } from './config.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container, destroyMapFn) {
  const trailId = State.currentTrailId;
  const meta = State.getTrailRegistry()?.find(t => t.id === trailId);
  if (!meta) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">👣</div><div class="empty-state-title">${i18nT('trail.notFound')}</div></div></div>`;
    return;
  }

  const rawData = await HashSearch.loadTrailData(meta.fileName, State.lang);
  if (!rawData) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
    return;
  }

  let data;
  if (meta.type === 'cross' && rawData.bs) {
    const entry = rawData.bs.find(b => b.cid === trailId);
    if (!entry || !entry.route) {
      container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-title">${i18nT('trail.routeNotFound')}</div></div></div>`;
      return;
    }
    data = { route: entry.route };
  } else {
    data = rawData;
  }

  await renderRouteDetail(container, darkMeta(meta), data, destroyMapFn);
}

function darkMeta(meta) {
  if (State.theme !== 'dark') return meta;
  return { ...meta, bgColor: Config.darkenHexBg(meta.bgColor) };
}

async function _loadProvinces(stops) {
  const ids = new Set();
  stops?.forEach(s => s.buildings?.forEach(b => { if (b?.p) ids.add(b.p); }));
  if (ids.size > 0) await HashSearch.loadProvinces([...ids], State.lang);
}

async function renderRouteDetail(container, meta, data, destroyMapFn) {
  const route = data.route;
  if (!route) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-title">${i18nT('trail.routeNotFound')}</div></div></div>`;
    return;
  }

  await _loadProvinces(route.stops);

  const allBuildings = [];
  for (const stop of route.stops) {
    for (const bRef of (stop.buildings || [])) {
      const building = State.resolveBuildingRef(bRef);
      if (building && building.lat && building.lng && isFinite(building.lat) && isFinite(building.lng)) allBuildings.push({ ...building, _articleSrc: meta.id });
    }
  }

  const tocItems = route.stops.map((s, i) => {
    const label = s.title.replace(/第[^站]+站[：··\s]*/, '');
    return `<a href="#" class="route-toc__item" data-toc="${i}">
      <span class="route-toc__num" style="background:${meta.color};">${i + 1}</span> ${label}</a>`;
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
      <div class="topic-intro">${Utils.splitText(route.intro)}</div>
      ${allBuildings.length > 0 ? '<div id="routeMap" class="route-map"></div>' : ''}

      <div class="route-toc">
        <div class="route-toc__bar">
          <span class="route-toc__head">📋 ${meta.title}${i18nT('trail.toc')}</span>
          <a href="#" class="route-toc__item route-toc__item--all" data-toc="all">
            <span class="route-toc__num" style="background:${meta.color};">${i18nT('trail.all')}</span>${i18nT('trail.viewAll')}</a>
        </div>
        <div class="route-toc__list">
          ${tocItems}
        </div>
      </div>

      <div class="route-stops">
          ${route.stops.map((stop, index) => {
            const label = stop.title.replace(/第[^站]+站[：··\s]*/, '');
            return `
            <div class="route-stop" id="stop-${index}">
              <div class="route-stop__head" style="border-left:3px solid ${meta.color};">
                <span class="route-stop__icon">${stop.icon}</span>
                <h3 class="route-stop__title">${index + 1} ${label}</h3>
              </div>
              <div class="route-stop__body">
                ${stop.poem ? `<div class="route-stop__poem"><pre>${stop.poem}</pre></div>` : ''}
                <div class="route-stop__content">${Utils.splitText(stop.content)}</div>
                ${stop.buildings && stop.buildings.length > 0 ? `
                  <div class="route-stop-buildings">
                    <div class="building-grid" style="margin-top:0.5rem;">
                      ${stop.buildings.map(bRef => {
                        const b = State.resolveBuildingRef(bRef);
                        return b ? Utils.createBuildingCard(b) : '';
                      }).join('')}
                    </div>
                  </div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <p class="building-detail-disclaimer">${i18nT('building.disclaimer')} <a href="#" class="feedback-link" data-open-feedback>${i18nT('building.feedback')}</a></p>
      </div>
    </div>`;

  let routeMap = null;
  if (allBuildings.length > 0) { routeMap = await UI.createRouteMap(document.getElementById('routeMap'), allBuildings, meta); }
  if (destroyMapFn && routeMap) destroyMapFn(() => routeMap.remove());
  UI.setBreadcrumb([
    { name: '👣 ' + i18nT('trail.title'), href: meta.type === 'cross' ? '?page=trail&type=cross' : '?page=trail' },
    { name: meta.icon + ' ' + meta.title }
  ]);
  UI.initRouteTOC(container);
  _addTooltips();
}

function _addTooltips() {
  const all = State.getAllBuildings();
  const map = {};
  for (const b of all) {
    if (b.n && b.desc) map[b.n] = b.desc;
  }
  document.querySelectorAll('.route-stop__content a[data-nav]').forEach(el => {
    const name = el.textContent.trim();
    const desc = map[name];
    if (desc) el.setAttribute('title', desc.substring(0, 120));
  });
}
