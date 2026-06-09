import { Utils, UI } from './core.js';

function _clueData(stageKey, building) {
  const text = Utils.sanitizeClueText(Utils.getClueText(stageKey, building), building, stageKey);
  const hasMap = stageKey === 'location' && building.lat && building.lng;
  return { text, hasMap };
}

export function renderAllClues(building, currentClueIndex) {
  return Utils.CLUE_STAGES.slice(0, currentClueIndex + 1).map((stage, i) => {
    const { text, hasMap } = _clueData(stage.key, building);
    return { stage, text, isNewest: i === currentClueIndex, index: i + 1, hasMap };
  });
}

export function appendClue(building, clueIndex) {
  const clueList = document.querySelector('.quiz-clue-list');
  if (!clueList || !building) return;
  const stage = Utils.CLUE_STAGES[clueIndex];
  const { text, hasMap } = _clueData(stage.key, building);
  clueList.querySelectorAll('.quiz-clue-card-newest').forEach(el => el.classList.remove('quiz-clue-card-newest'));
  const div = document.createElement('div');
  div.className = 'quiz-clue-card quiz-clue-card-newest';
  div.innerHTML = `<div class="quiz-clue-content"><p>${text}</p>${hasMap ? '<div class="quiz-satellite-map"></div>' : ''}</div>`;
  clueList.appendChild(div);
  if (hasMap) initSatelliteMap(building);
}

export function renderClueCardsHTML(clues) {
  return clues.map(c =>
    `<div class="quiz-clue-card${c.isNewest ? ' quiz-clue-card-newest' : ''}"><div class="quiz-clue-content"><p>${c.text}</p>${c.hasMap ? '<div class="quiz-satellite-map"></div>' : ''}</div></div>`
  ).join('');
}

export function initSatelliteMap(building) {
  const mapDivs = document.querySelectorAll('.quiz-satellite-map');
  const mapDiv = mapDivs[mapDivs.length - 1];
  if (mapDiv) UI.createSatelliteMap(mapDiv, building?.lat, building?.lng);
}

export function colorChars(answer, correctName) {
  const correctSet = new Set(correctName);
  return answer.split('').map(ch =>
    `<span class="char-${correctSet.has(ch) ? 'correct' : 'wrong'}">${ch}</span>`
  ).join('');
}

export function greenChars(answer) {
  return answer.split('').map(ch => `<span class="char-correct">${ch}</span>`).join('');
}

function _quizInputs() {
  const input = document.getElementById('quizAnswerInput') || document.getElementById('dailyQuizInput');
  const submit = document.getElementById('quizSubmit') || document.getElementById('dailyQuizSubmit');
  return { input, submit };
}

export function disableQuizInputs() {
  const { input, submit } = _quizInputs();
  if (input) input.disabled = true;
  if (submit) submit.disabled = true;
  ['quizMoreHint', 'dailyQuizMoreHint', 'quizSkip', 'quizReveal', 'dailyQuizReveal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function _resultActions(building, getProvinceName) {
  return `<div class="quiz-result-actions"><a href="${Utils.generateBuildingHash(building, getProvinceName)}" class="quiz-btn quiz-btn-outline">查看详情 ↗</a><a href="?page=quiz" class="quiz-btn quiz-btn-outline" data-nav>继续挑战 →</a></div>`;
}

function _resultMeta(building) {
  return `<div class="quiz-result-answer">答案：<strong>${building.name}</strong></div><div class="quiz-result-detail">${building.province} · ${building.districtName} · ${building.era}</div>`;
}

export function correctResultHTML(building, userAnswer, showLevelUp, levelName, getProvinceName) {
  return `<div class="quiz-result-icon">✅</div><div class="quiz-result-title">回答正确！太棒了</div><div class="quiz-result-chars"><div class="quiz-result-chars-row">${greenChars(userAnswer)}</div></div>${_resultMeta(building)}${showLevelUp ? `<div class="quiz-result-level">⬆ 境界提升至 <strong>${levelName}</strong></div>` : ''}${_resultActions(building, getProvinceName)}`;
}

export function wrongResultHTML(userAnswer, correctName, levelName) {
  return `<div class="quiz-result-icon">❌</div><div class="quiz-result-title">不对哦，再想想！</div><div class="quiz-result-chars"><div class="quiz-result-chars-hint">🟢 正确字 · ⚪ 错误/多输的字</div><div class="quiz-result-chars-row">${colorChars(userAnswer, correctName)}</div></div>${levelName ? `<div class="quiz-result-level">⬇ 境界降至 <strong>${levelName}</strong></div>` : ''}`;
}

export function finalResultHTML(building, type, icon, title, levelName, getProvinceName) {
  return `<div class="quiz-result-icon">${icon}</div><div class="quiz-result-title">${title}</div>${_resultMeta(building)}${levelName ? `<div class="quiz-result-level">⬇ 境界降至 <strong>${levelName}</strong></div>` : ''}${_resultActions(building, getProvinceName)}`;
}
