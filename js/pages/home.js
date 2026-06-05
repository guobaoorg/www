/**
 * 首页模块 — 动态加载足迹故事
 */
import HashSearch from '../hash-search.js';
import State from '../state.js';
import Utils from '../utils.js';

let _destroyMap = null;

export async function render(container, destroyMapFn) {
  _destroyMap = destroyMapFn;
  if (_destroyMap) _destroyMap();

  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">🏛️</div><div>正在加载精彩内容...</div></div></div>`;
  await _renderHomeTrails(container);
}

async function _renderHomeTrails(container) {
  const trailRegistry = State.getTrailRegistry() || [];
  const selectedTrails = Utils.shuffleArray([...trailRegistry]).slice(0, 3);

  if (selectedTrails.length === 0) return;

  const trailDataArr = await Promise.all(selectedTrails.map(t => HashSearch.fetchJSON(`/trail/${t.fileName}`)));
  const validTrails = [];
  for (let i = 0; i < selectedTrails.length; i++) {
    const data = trailDataArr[i];
    if (data) {
      const content = data.story || data.route;
      if (content) validTrails.push({ ...selectedTrails[i], data, content });
    }
  }
  if (validTrails.length === 0) return;

  const typeLabels = { game: '🎮 游戏', story: '📚 故事', route: '🗺️ 路线' };
  let sectionsHTML = '';
  const loadTasks = [];

  validTrails.forEach((trail, index) => {
    const content = trail.content;
    const chapters = content.chapters || content.stops || [];
    if (chapters.length === 0) return;
    const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
    const paragraphs = randomChapter.content.split('\n\n').filter(p => p.trim()).slice(0, 2);
    const containerId = `home-section-buildings-${index}`;

    sectionsHTML += `
      <div class="home-topic-section" onclick="window._navigate('?page=trail-detail&id=${trail.id}')" style="${index > 0 ? 'margin-top: 2rem;' : ''}">
        <div class="home-topic-header" style="display: flex; align-items: center; gap: 0.625rem; margin-bottom: 0.875rem; padding-bottom: 0.625rem; border-bottom: 2px solid ${trail.color}30; cursor: pointer;">
          <span style="font-size: 1.5rem;">${trail.icon}</span>
          <div>
            <div style="font-size: 1.0625rem; font-weight: 700; color: var(--text-primary);">${trail.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${typeLabels[trail.type] || ''} · ${trail.subtitle}</div>
          </div>
        </div>
        <div class="home-chapter-layout">
          <div class="home-chapter-content">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0;">
              <span>${randomChapter.icon}</span> ${randomChapter.title}
            </h3>
            <div style="font-size: 0.875rem; line-height: 1.7; color: var(--text-secondary);">
              ${paragraphs.map(p => `<p style="margin: 0 0 0.5rem 0;">${p}</p>`).join('')}
            </div>
          </div>
          <div class="home-featured-buildings" id="${containerId}">
            <div style="flex:1;min-width:0;padding:1rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">🏛️ 加载中...</div>
          </div>
        </div>
      </div>`;
    loadTasks.push({ trail, chapter: randomChapter, containerId, index });
  });

  const trailContainer = container.querySelector('.container');
  if (trailContainer) {
    trailContainer.innerHTML = sectionsHTML;
  }

  for (const task of loadTasks) {
    _loadHomeFeaturedBuildings(task.trail, task.chapter, task.containerId);
  }
}

async function _loadHomeFeaturedBuildings(trail, chapter, containerId) {
  const provincesToLoad = new Set();
  if (chapter.buildings) {
    chapter.buildings.forEach(b => { if (b?.province) provincesToLoad.add(b.province); });
  }
  if (provincesToLoad.size > 0) await HashSearch.loadProvinces([...provincesToLoad]);

  const container = document.getElementById(containerId);
  if (!container) return;

  if (chapter.buildings?.length > 0) {
    const shuffled = Utils.shuffleArray([...chapter.buildings]);
    const featured = shuffled.slice(0, 2)
      .map(b => State.resolveBuildingRef(b))
      .filter(b => b !== null);

    if (featured.length > 0) {
      container.innerHTML = featured.map(b => `
        <div class="home-featured-building" onclick="event.stopPropagation(); window._navigate('${Utils.generateBuildingHash(b, State.getProvinceName.bind(State))}')">
          ${Utils.createBuildingCard(b)}
        </div>`).join('');
    } else {
      container.style.display = 'none';
    }
  } else {
    container.style.display = 'none';
  }
}

