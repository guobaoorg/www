import { HashSearch, State, Utils } from '../core.js';

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

  if (HashSearch.getCacheStats().loadedProvinces === 0 && !HashSearch._bgActive) {
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

function runSearch(query, container) {
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
    <div class="building-grid">${results.map(b => Utils.createBuildingCard(b, { matchReasons: b.matchReasons, maxTags: 4 })).join('')}</div>`;
}
