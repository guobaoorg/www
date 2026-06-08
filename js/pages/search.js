import { HashSearch, State, Utils } from '../core.js';

let _searchDebounceTimer = null;
let _dataLoading = false;

export async function render(container) {
  container.innerHTML = `
    <div class="container">
      <div class="search-page">
        <div class="search-page-input-wrapper">
          <input type="text" class="search-page-input" placeholder="搜索建筑名称、地点、年代..." id="searchPageInput" autocomplete="off">
          <button class="search-page-clear" id="searchPageClear" style="display: none;">×</button>
        </div>
        <div id="searchLoadHint" class="search-page-hint"></div>
        <div class="search-page-results" id="searchPageResults">
          <div class="search-page-hint"><p>输入关键词搜索</p></div>
        </div>
      </div>
    </div>`;

  const needLoad = HashSearch.getCacheStats().loadedProvinces === 0;
  if (needLoad) {
    const hintEl = document.getElementById('searchLoadHint');
    if (hintEl) hintEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.75rem;">⏳ 数据后台加载中，输入后自动搜索</p>';
    loadDataInBackground();
  }

  const input = document.getElementById('searchPageInput');
  const clearBtn = document.getElementById('searchPageClear');
  const resultsContainer = document.getElementById('searchPageResults');

  if (input) {
    input.focus();
    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
      if (query) {
        clearBtn.style.display = 'flex';
        _searchDebounceTimer = setTimeout(() => doSearch(query, resultsContainer), 200);
      } else {
        clearBtn.style.display = 'none';
        resultsContainer.innerHTML = '<div class="search-page-hint"><p>输入关键词搜索</p></div>';
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      resultsContainer.innerHTML = '<div class="search-page-hint"><p>输入关键词搜索</p></div>';
      input.focus();
    });
  }
}

async function loadDataInBackground() {
  if (_dataLoading) return;
  _dataLoading = true;
  const allIds = State.getProvinceMeta()?.provinces?.map(p => p.id) || [];
  const batchSize = 6;
  for (let i = 0; i < allIds.length; i += batchSize) {
    await HashSearch.loadProvinces(allIds.slice(i, i + batchSize));
    State.clearCache();
  }
  const hintEl = document.getElementById('searchLoadHint');
  if (hintEl) { hintEl.innerHTML = ''; hintEl.style.display = 'none'; }
  _dataLoading = false;
}

function doSearch(query, container) {
  const allBuildings = State.getAllBuildings();
  const searchFields = ['name', 'location', 'era', 'type', 'districtName', 'tags', 'description', 'history', 'architecture', 'features'];
  const results = HashSearch.fuzzySearch(allBuildings, query, searchFields);

  if (results.length === 0) {
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
    <div class="building-grid">${results.map(b => Utils.createBuildingCard(b, { matchReasons: b.matchReasons, maxTags: 4 })).join('')}</div>`;
}
