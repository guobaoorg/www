/**
 * 搜索页
 */
import { HashSearch, State, Utils } from '../core.js';

let _searchDebounceTimer = null;

export async function render(container) {
  container.innerHTML = `
    <div class="container">
      <div class="search-page">
        <div class="search-page-input-wrapper">
          <input type="text" class="search-page-input" placeholder="搜索建筑名称、地点、年代..." id="searchPageInput" autocomplete="off">
          <button class="search-page-clear" id="searchPageClear" style="display: none;">×</button>
        </div>
        <div class="search-page-results" id="searchPageResults">
          <div class="search-page-hint"><p>输入关键词搜索</p></div>
        </div>
      </div>
    </div>`;

  await State.ensureDataLoaded();

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
        _searchDebounceTimer = setTimeout(() => renderSearchResults(query, resultsContainer), 250);
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

function renderSearchResults(query, container) {
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