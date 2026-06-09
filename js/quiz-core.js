/**
 * 猜保共享逻辑 — home.js 和 quiz.js 共用的线索渲染、答案检查、结果展示
 */
import { Utils, UI } from './core.js';

/** 渲染所有已揭示的线索列表 */
export function renderAllClues(building, currentClueIndex) {
  const clues = [];
  for (let i = 0; i <= currentClueIndex; i++) {
    const stage = Utils.CLUE_STAGES[i];
    const text = Utils.sanitizeClueText(Utils.getClueText(stage.key, building), building, stage.key);
    const isNewest = i === currentClueIndex;
    const hasMap = stage.key === 'location' && building.lat && building.lng;
    clues.push({ stage, text, isNewest, index: i + 1, hasMap });
  }
  return clues;
}

/** 追加一条新线索卡片到 DOM */
export function appendClue(building, clueIndex) {
  const clueList = document.querySelector('.quiz-clue-list');
  if (!clueList || !building) return;

  const stage = Utils.CLUE_STAGES[clueIndex];
  const text = Utils.sanitizeClueText(Utils.getClueText(stage.key, building), building, stage.key);
  const hasMap = stage.key === 'location' && building.lat && building.lng;

  clueList.querySelectorAll('.quiz-clue-card-newest').forEach(el => el.classList.remove('quiz-clue-card-newest'));

  const div = document.createElement('div');
  div.className = 'quiz-clue-card quiz-clue-card-newest';
  div.innerHTML = `<div class="quiz-clue-content"><p>${text}</p>${hasMap ? '<div class="quiz-satellite-map"></div>' : ''}</div>`;
  clueList.appendChild(div);

  if (hasMap) initSatelliteMap(building);
}

/** 渲染线索卡片列表 HTML */
export function renderClueCardsHTML(clues) {
  return clues.map(c => `
    <div class="quiz-clue-card${c.isNewest ? ' quiz-clue-card-newest' : ''}">
      <div class="quiz-clue-content">
        <p>${c.text}</p>
        ${c.hasMap ? '<div class="quiz-satellite-map"></div>' : ''}
      </div>
    </div>`).join('');
}

/** 初始化最后一张线索卡片中的卫星地图 */
export function initSatelliteMap(building) {
  const mapDivs = document.querySelectorAll('.quiz-satellite-map');
  const mapDiv = mapDivs[mapDivs.length - 1];
  UI.createSatelliteMap(mapDiv, building?.lat, building?.lng);
}

/** 生成彩色字符结果 HTML */
export function colorChars(answer, correctName) {
  const correctSet = new Set(correctName);
  return answer.split('').map(ch =>
    `<span class="char-${correctSet.has(ch) ? 'correct' : 'wrong'}">${ch}</span>`
  ).join('');
}

/** 生成全绿字符 HTML */
export function greenChars(answer) {
  return answer.split('').map(ch => `<span class="char-correct">${ch}</span>`).join('');
}

/** 禁用一个题目中所有的输入控件 */
export function disableQuizInputs() {
  const input = document.getElementById('quizAnswerInput') || document.getElementById('dailyQuizInput');
  if (input) input.disabled = true;
  const submitBtn = document.getElementById('quizSubmit') || document.getElementById('dailyQuizSubmit');
  if (submitBtn) submitBtn.disabled = true;
  ['quizMoreHint', 'dailyQuizMoreHint', 'quizSkip', 'quizReveal', 'dailyQuizReveal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

/** 生成回答正确的结果 HTML */
export function correctResultHTML(building, userAnswer, showLevelUp, levelName, getProvinceName) {
  return `
    <div class="quiz-result-icon">✅</div>
    <div class="quiz-result-title">回答正确！太棒了</div>
    <div class="quiz-result-chars"><div class="quiz-result-chars-row">${greenChars(userAnswer)}</div></div>
    <div class="quiz-result-answer">答案：<strong>${building.name}</strong></div>
    <div class="quiz-result-detail">${building.province} · ${building.districtName} · ${building.era}</div>
    ${showLevelUp ? `<div class="quiz-result-level">⬆ 境界提升至 <strong>${levelName}</strong></div>` : ''}
    <div class="quiz-result-actions">
      <a href="${Utils.generateBuildingHash(building, getProvinceName)}" class="quiz-btn quiz-btn-outline">查看详情 ↗</a>
      <a href="?page=quiz" class="quiz-btn quiz-btn-outline" data-nav>继续挑战 →</a>
    </div>`;
}

/** 生成回答错误的结果 HTML */
export function wrongResultHTML(userAnswer, correctName, levelName) {
  return `
    <div class="quiz-result-icon">❌</div>
    <div class="quiz-result-title">不对哦，再想想！</div>
    <div class="quiz-result-chars">
      <div class="quiz-result-chars-hint">🟢 正确字 · ⚪ 错误/多输的字</div>
      <div class="quiz-result-chars-row">${colorChars(userAnswer, correctName)}</div>
    </div>
    ${levelName ? `<div class="quiz-result-level">⬇ 境界降至 <strong>${levelName}</strong></div>` : ''}`;
}

/** 生成揭晓/跳过等最终结果 HTML */
export function finalResultHTML(building, type, icon, title, levelName, getProvinceName) {
  return `
    <div class="quiz-result-icon">${icon}</div>
    <div class="quiz-result-title">${title}</div>
    <div class="quiz-result-answer">答案：<strong>${building.name}</strong></div>
    <div class="quiz-result-detail">${building.province} · ${building.districtName} · ${building.era}</div>
    ${levelName ? `<div class="quiz-result-level">⬇ 境界降至 <strong>${levelName}</strong></div>` : ''}
    <div class="quiz-result-actions">
      <a href="${Utils.generateBuildingHash(building, getProvinceName)}" class="quiz-btn quiz-btn-outline">查看详情 ↗</a>
      <a href="?page=quiz" class="quiz-btn quiz-btn-outline" data-nav>继续挑战 →</a>
    </div>`;
}