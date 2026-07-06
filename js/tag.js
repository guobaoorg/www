import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container, destroyMapFn) {
  const tag = decodeURIComponent(State.currentTag);

  if (HashSearch.getCacheStats().loaded > 0 && State.hasTagBuildingsCache(tag)) {
    return _renderTag(container, tag, destroyMapFn);
  }

  const ts = Config.getTagStyle(tag, 0, State.theme);
  container.innerHTML = `
    <div class="container">
      <div class="tag-header" style="background:${ts.bg};border:1px solid ${ts.color}30;">
        <div class="tag-header-icon" style="background:${ts.color};">${ts.icon}</div>
        <div class="tag-header-info"><h2 class="section-title" style="margin:0;">${i18nT('tag.label')}${tag}</h2>
        <p style="color:var(--text-secondary);margin:0.5rem 0 0 0;">⏳ ${i18nT('common.loading')}</p></div>
      </div>
      <div class="loading"><div class="loading__icon">🔄</div><div>${i18nT('tag.loadingBuildings')}</div></div>
    </div>`;

  if (!HashSearch.isBgActive()) {
    await HashSearch.startBgPreload([...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'], null, State.lang, () => State._resetDerivedCaches());
  } else {
    while (!State.hasTagBuildingsCache(tag) && HashSearch.isBgActive()) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  _renderTag(container, tag, destroyMapFn);
}

async function _renderTag(container, tag, destroyMapFn) {
  const buildings = State.getBuildingsByTag(tag);
  const ts = Config.getTagStyle(tag, 0, State.theme);
  const hasCoords = buildings.filter(b => b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng));

  container.innerHTML = `
    <div class="container">
      <div class="tag-header" style="background:${ts.bg};border:1px solid ${ts.color}30;">
        <div class="tag-header-icon" style="background:${ts.color};">${ts.icon}</div>
        <div class="tag-header-info">
          <h2 class="section-title" style="margin:0;">${i18nT('tag.label')}${tag}</h2>
          <p style="color:var(--text-secondary);margin:0.5rem 0 0 0;">${i18nT('tag.found')} <strong style="color:${ts.color};">${buildings.length}</strong> ${i18nT('tag.relatedBuildings')}</p>
        </div>
      </div>
      ${hasCoords.length > 0 ? `<div class="tag-map" id="tagMap"></div>` : ''}
      ${buildings.length
        ? `<div class="building-grid">${buildings.map(b => Utils.createBuildingCard(b)).join('')}</div>`
        : `<div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">${i18nT('tag.noBuildings')}</div></div>`}
    </div>`;

  UI.setBreadcrumb([
    { name: '🏷️ ' + i18nT('tag.title'), href: '?page=tags' },
    { name: ts.icon + ' ' + tag }
  ]);

  let tagMap = null;
  if (hasCoords.length > 0) {
    tagMap = await UI.setupBuildingMap(document.getElementById('tagMap'), hasCoords, {
      popupBuilder: (b, hash) => `<div class="map__popup"><div class="map__popup-header"><strong>🏛️ ${b.n}</strong></div><div class="map__popup-body"><div class="map__popup-info"><span class="map__popup-era">📅 ${b.e || ''}</span><span class="map__popup-district">📍 ${b.dn || ''}</span></div><a href="${hash(b)}" class="map__popup-link">${i18nT('common.viewDetail')}</a></div></div>`
    });
  }
  if (destroyMapFn && tagMap) destroyMapFn(() => tagMap.remove());
}
