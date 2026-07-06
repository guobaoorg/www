import { HashSearch } from './hash-search.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container, destroyMapFn) {
  container.innerHTML = `
    <div class="container">
      <div class="search-page">
        <div class="search__input-wrapper">
          <input type="text" class="search__input" placeholder="${i18nT('search.placeholder')}" id="searchPageInput" autocomplete="off">
          <button class="search__clear" id="searchPageClear" style="display:none;">×</button>
        </div>
        <div class="search-page-results" id="searchPageResults">
          <div class="search__hint"><p>${i18nT('search.hint')}</p></div>
        </div>
      </div>
    </div>`;

  UI.setBreadcrumb([{ name: '🔍 ' + i18nT('search.title') }]);

  if (HashSearch.getCacheStats().loaded === 0 && !HashSearch.isBgActive()) {
    HashSearch.startBgPreload([...(State.getProvinceMeta()?.provinces?.map(p => p.id) || [])], null, State.lang, () => State._resetDerivedCaches());
  }

  const input = document.getElementById('searchPageInput');
  const clearBtn = document.getElementById('searchPageClear');
  const results = document.getElementById('searchPageResults');
  if (!input || !results) return;
  input.focus();

  let _searchMap = null;
  const _cleanupMap = () => { if (_searchMap) { try { _searchMap.remove(); } catch(_){} _searchMap = null; } };
  if (destroyMapFn) destroyMapFn(_cleanupMap);

  let debounce = null;
  input.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (debounce) clearTimeout(debounce);
    if (q) {
      clearBtn.style.display = 'flex';
      debounce = setTimeout(() => runSearch(q, results, (m) => { _cleanupMap(); _searchMap = m; }), 200);
    } else {
      clearBtn.style.display = 'none';
      _cleanupMap();
      results.innerHTML = `<div class="search__hint"><p>${i18nT('search.hint')}</p></div>`;
    }
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    _cleanupMap();
    results.innerHTML = `<div class="search__hint"><p>${i18nT('search.hint')}</p></div>`;
    input.focus();
  });
}

function _tryRefreshSearch() {
  const inp = document.getElementById('searchPageInput');
  if (inp && inp.value.trim()) runSearch(inp.value.trim(), document.getElementById('searchPageResults'));
}

async function runSearch(query, container, onMapCreate) {
  if (!HashSearch.getCacheStats().loaded) {
    container.innerHTML = `
      <div class="search__empty">
        <div class="search__empty-icon">⏳</div>
        <div class="search__empty-title">${i18nT('common.loading')}</div>
        <p>${i18nT('search.loadingHint')}</p>
      </div>`;
    if (!HashSearch.isBgActive()) {
      const provinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || [])];
      HashSearch.startBgPreload(provinceIds, null, State.lang, () => State._resetDerivedCaches());
    }
    window.addEventListener('bg-preload-complete', _tryRefreshSearch, { once: true });
    return;
  }

  const results = HashSearch.fuzzySearch(State.getAllBuildings(), query, ['n','en','cn','e','t','dn','g','desc','hist','arch','feat'], State._searchTextIndex);

  if (!results.length) {
    container.innerHTML = `
      <div class="search__empty">
        <div class="search__empty-icon">🔍</div>
        <div class="search__empty-title">${i18nT('search.noResults')}</div>
        <p>${i18nT('search.tryOther')}</p>
        <div class="search__tips"><p>${i18nT('search.tips')}</p><ul><li>${i18nT('search.hint')}</li><li>${i18nT('search.loadingHint')}</li></ul></div>
      </div>`;
    return;
  }
  container.innerHTML = `
    <div class="search__results-count">${i18nT('search.found')} <strong>${results.length}</strong> ${i18nT('search.relatedBuildings')} <span class="search__query-text">"${query}"</span></div>
    <div class="search-map" id="searchMap"></div>
    <div class="building-grid">${results.map(b => Utils.createBuildingCard(b, { matchReasons: b.matchReasons, maxTags: 4 })).join('')}</div>`;

  const withCoords = [];
  for (let i = 0, len = results.length; i < len; i++) { const b = results[i]; if (b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng)) withCoords.push(b); }
  if (withCoords.length) {
    const map = await UI.setupBuildingMap(document.getElementById('searchMap'), withCoords, {
      popupBuilder: (b, hash) => `<div class="map__popup"><div class="map__popup-header"><strong>🏛️ ${b.n}</strong></div><div class="map__popup-body"><div class="map__popup-info"><span class="map__popup-district">📍 ${b.dn || ''}</span></div><a href="${hash(b)}" class="map__popup-link">${i18nT('common.viewDetail')}</a></div></div>`
    });
    if (onMapCreate) onMapCreate(map);
  }
}


