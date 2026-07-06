import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

const _activeQuizMaps = [];

export function _destroyAllQuizMaps() {
  while (_activeQuizMaps.length) {
    const m = _activeQuizMaps.pop();
    try { m.remove(); } catch (_) {}
  }
}

function _clueData(stageKey, building) {
  const text = Utils.sanitizeClueText(Utils.getClueText(stageKey, building), building, stageKey);
  const hasMap = stageKey === 'location' && building.lat && building.lng && isFinite(building.lat) && isFinite(building.lng);
  return { text, hasMap };
}

export function renderAllClues(building, currentClueIndex) {
  return Utils.CLUE_STAGES.slice(0, currentClueIndex + 1).map((stage, i) => {
    const { text, hasMap } = _clueData(stage.key, building);
    return { stage, text, isNewest: i === currentClueIndex, index: i + 1, hasMap };
  });
}

export async function appendClue(building, clueIndex) {
  const clueList = document.querySelector('.quiz__clue-list');
  if (!clueList || !building) return;
  const stage = Utils.CLUE_STAGES[clueIndex];
  const { text, hasMap } = _clueData(stage.key, building);
  clueList.querySelectorAll('.quiz__clue-card--newest').forEach(el => el.classList.remove('quiz__clue-card--newest'));
  const div = document.createElement('div');
  div.className = 'quiz__clue-card quiz__clue-card--newest';
  div.innerHTML = `<div class="quiz__clue-content"><p>${text}</p>${hasMap ? '<div class="quiz__satellite-map"></div>' : ''}</div>`;
  clueList.appendChild(div);
  if (hasMap) await initSatelliteMap(building);
}

export function renderClueCardsHTML(clues) {
  return clues.map(c =>
    `<div class="quiz__clue-card${c.isNewest ? ' quiz__clue-card--newest' : ''}"><div class="quiz__clue-content"><p>${c.text}</p>${c.hasMap ? '<div class="quiz__satellite-map"></div>' : ''}</div></div>`
  ).join('');
}

export async function initSatelliteMap(building) {
  const mapDivs = document.querySelectorAll('.quiz__satellite-map');
  const mapDiv = mapDivs[mapDivs.length - 1];
  if (mapDiv && building?.lat != null && building?.lng != null && isFinite(building.lat) && isFinite(building.lng)) {
    const map = await UI.createSatelliteMap(mapDiv, building.lat, building.lng, building.n);
    if (map) _activeQuizMaps.push(map);
  }
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
  const input = document.getElementById('quizAnswerInput');
  const submit = document.getElementById('quizSubmit');
  return { input, submit };
}

export function disableQuizInputs() {
  const { input, submit } = _quizInputs();
  if (input) input.disabled = true;
  if (submit) submit.disabled = true;
  ['quizMoreHint', 'quizSkip', 'quizReveal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function _resultActions(building) {
  return `<div class="quiz__result-actions"><a href="${Utils.generateBuildingUrl(building)}" class="quiz__btn quiz__btn--outline">${i18nT('common.viewDetail')}</a><a href="?page=quiz" class="quiz__btn quiz__btn--outline" data-nav>${i18nT('quiz.continue')}</a></div>`;
}

function _resultMeta(building) {
  return `<div class="quiz__result-answer">${i18nT('quiz.revealed')}：<strong>${building.n}</strong></div><div class="quiz__result-detail">${building.p} · ${building.dn} · ${building.e}</div>`;
}

export function correctResultHTML(building, userAnswer, showLevelUp, levelName) {
  return `<div class="quiz__result-icon">✅</div><div class="quiz__result-title">${i18nT('quiz.correctTitle')}</div><div class="quiz__result-chars"><div class="quiz__result-chars-row">${greenChars(userAnswer)}</div></div>${_resultMeta(building)}${showLevelUp ? `<div class="quiz__result-level">${i18nT('quiz.levelUp')} <strong>${levelName}</strong></div>` : ''}${_resultActions(building)}`;
}

export function wrongResultHTML(userAnswer, correctName, levelName) {
  return `<div class="quiz__result-icon">❌</div><div class="quiz__result-title">${i18nT('quiz.wrongTitle')}</div><div class="quiz__result-chars"><div class="quiz__result-chars-hint">${i18nT('quiz.charHint')}</div><div class="quiz__result-chars-row">${colorChars(userAnswer, correctName)}</div></div>${levelName ? `<div class="quiz__result-level">${i18nT('quiz.levelDown')} <strong>${levelName}</strong></div>` : ''}`;
}

export function finalResultHTML(building, type, icon, title, levelName) {
  return `<div class="quiz__result-icon">${icon}</div><div class="quiz__result-title">${title}</div>${_resultMeta(building)}${levelName ? `<div class="quiz__result-level">${i18nT('quiz.levelDown')} <strong>${levelName}</strong></div>` : ''}${_resultActions(building)}`;
}
