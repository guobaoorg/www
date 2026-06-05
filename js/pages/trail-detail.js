/**
 * 足迹详情页
 */
import HashSearch from '../hash-search.js';
import State from '../state.js';
import Utils from '../utils.js';

export async function render(container) {
  const trailId = State.currentTrailId;
  const meta = State.getTrailRegistry()?.find(t => t.id === trailId);
  if (!meta) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">👣</div><div class="empty-state-title">足迹未找到</div></div></div>`;
    return;
  }

  const data = await HashSearch.fetchJSON(`/trail/${meta.fileName}`);
  if (!data) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">加载失败</div></div></div>`;
    return;
  }

  if (meta.type === 'route') {
    await renderRouteDetail(container, meta, data);
  } else {
    await renderStoryDetail(container, meta, data);
  }
}

async function renderStoryDetail(container, meta, data) {
  const story = data.story;
  if (!story) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">内容未找到</div></div></div>`;
    return;
  }

  const provincesToLoad = new Set();
  story.chapters?.forEach(ch => {
    ch.buildings?.forEach(b => { if (b?.province) provincesToLoad.add(b.province); });
  });
  if (provincesToLoad.size > 0) await HashSearch.loadProvinces([...provincesToLoad]);

  container.innerHTML = `
    <div class="container">
      <div class="topic-detail-header" style="background: linear-gradient(135deg, ${meta.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${meta.color}25;">
        <div class="topic-detail-icon" style="background: ${meta.color};">${meta.icon}</div>
        <div class="topic-detail-info">
          <h1 class="topic-detail-title">${story.title}</h1>
          <p class="topic-detail-subtitle">${meta.subtitle}</p>
        </div>
      </div>
      <div class="topic-intro">${story.intro.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
      <div class="topic-chapters">
        ${story.chapters.map((chapter, index) => {
          const chapterBuildings = (chapter.buildings || [])
            .map(b => State.resolveBuildingRef(b))
            .filter(b => b !== null);
          return `
            <div class="topic-chapter" id="chapter-${index}">
              <h3 class="topic-chapter-title"><span class="topic-chapter-icon">${chapter.icon}</span>${chapter.title}</h3>
              <div class="topic-chapter-content">${chapter.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
              ${chapterBuildings.length > 0 ? `
                <div class="topic-chapter-buildings">
                  <h4 class="topic-buildings-title">🏛️ 相关古建</h4>
                  <div class="building-grid compact">${chapterBuildings.map(b => Utils.createBuildingCard(b)).join('')}</div>
                </div>` : ''}
            </div>`;
        }).join('')}
      </div>
      ${story.allBuildings?.length > 0 ? `
        <div class="topic-all-buildings">
          <h3 class="section-title"><span class="section-icon">🏛️</span> 涉及古建一览</h3>
          <div class="building-grid">
            ${story.allBuildings.map(b => {
              const building = State.resolveBuildingRef(b);
              return building ? Utils.createBuildingCard(building) : '';
            }).join('')}
          </div>
        </div>` : ''}
    </div>`;
}

async function renderRouteDetail(container, meta, data) {
  const route = data.route;
  if (!route) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🗺️</div><div class="empty-state-title">路线未找到</div></div></div>`;
    return;
  }

  const provincesToLoad = new Set();
  route.stops?.forEach(stop => {
    stop.buildings?.forEach(b => { if (b?.province) provincesToLoad.add(b.province); });
  });
  if (provincesToLoad.size > 0) await HashSearch.loadProvinces([...provincesToLoad]);

  const totalStops = route.stops?.length || 0;

  container.innerHTML = `
    <div class="container">
      <div class="topic-detail-header" style="background: linear-gradient(135deg, ${meta.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${meta.color}25;">
        <div class="topic-detail-icon" style="background: ${meta.color};">${meta.icon}</div>
        <div class="topic-detail-info">
          <h1 class="topic-detail-title">${route.title}</h1>
          <p class="topic-detail-subtitle">${meta.subtitle}</p>
        </div>
      </div>
      <div class="topic-intro">${route.intro.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
      <div class="route-timeline" style="position: relative; margin: 2rem 0;">
        <div class="route-timeline-line" style="position: absolute; left: 24px; top: 0; bottom: 0; width: 3px; background: linear-gradient(to bottom, ${meta.color}40, ${meta.color}); border-radius: 3px;"></div>
        ${route.stops.map((stop, index) => {
          const isLast = index === totalStops - 1;
          const stopBuildings = (stop.buildings || [])
            .map(b => State.resolveBuildingRef(b))
            .filter(b => b !== null);
          return `
            <div class="route-stop" style="position: relative; padding-left: 64px; margin-bottom: ${isLast ? '0' : '2rem'};">
              <div class="route-stop-marker" style="position: absolute; left: 12px; top: 0; width: 28px; height: 28px; border-radius: 50%; background: ${meta.color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; border: 3px solid var(--bg-card); box-shadow: 0 0 0 3px ${meta.color}40; z-index: 1;">${index + 1}</div>
              <div class="route-stop-card">
                <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); background: linear-gradient(135deg, ${meta.bgColor}80 0%, var(--bg-card) 100%);">
                  <div style="display: flex; align-items: center; gap: 0.625rem;">
                    <span style="font-size: 1.25rem;">${stop.icon}</span>
                    <div>
                      <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">${stop.title}</h3>
                      ${stop.poet ? `<div style="font-size: 0.75rem; color: ${meta.color}; margin-top: 0.25rem;">📜 ${stop.poet}</div>` : ''}
                    </div>
                  </div>
                </div>
                ${stop.poem ? `<div style="padding: 1rem 1.25rem; background: var(--bg-secondary); border-bottom: 1px solid var(--border-light);"><pre style="font-family: inherit; font-size: 0.875rem; line-height: 1.8; color: var(--text-primary); margin: 0; white-space: pre-wrap;">${stop.poem}</pre></div>` : ''}
                <div style="padding: 1rem 1.25rem;"><div class="topic-chapter-content" style="font-size: 0.875rem; line-height: 1.7; color: var(--text-secondary);">${stop.content.split('\n\n').map(p => `<p style="margin: 0 0 0.5rem 0;">${p}</p>`).join('')}</div></div>
                ${stopBuildings.length > 0 ? `<div style="padding: 0 1.25rem 1rem;"><div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.75rem;">🏛️ 相关古建</div><div class="building-grid compact">${stopBuildings.map(b => Utils.createBuildingCard(b)).join('')}</div></div>` : ''}
              </div>
              ${!isLast ? `<div style="display: flex; align-items: center; justify-content: center; margin-top: 1rem; margin-left: -64px;"><div style="display: flex; align-items: center; gap: 0.5rem; color: ${meta.color}; font-size: 0.75rem; font-weight: 600;"><span>↓</span><span>前往下一站</span><span>↓</span></div></div>` : ''}
            </div>`;
        }).join('')}
      </div>
      ${route.allBuildings?.length > 0 ? `
        <div class="topic-all-buildings">
          <h3 class="section-title"><span class="section-icon">🏛️</span> 路线涉及古建一览</h3>
          <div class="building-grid">${route.allBuildings.map(b => { const building = State.resolveBuildingRef(b); return building ? Utils.createBuildingCard(building) : ''; }).join('')}</div>
        </div>` : ''}
    </div>`;
}

