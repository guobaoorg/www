/**
 * 国保猜猜看 — 修仙等级猜建筑
 */
import { HashSearch, LS_PREFIX, CACHE_VERSION } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { renderAllClues, appendClue, renderClueCardsHTML, initSatelliteMap, disableQuizInputs, correctResultHTML, wrongResultHTML, finalResultHTML, _destroyAllQuizMaps } from './quiz-core.js';
import { t as i18nT } from './i18n.js';

const LEVELS = [
  '炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','炼气十层',
  '炼气十一层','炼气十二层','炼气十三层',
  '筑基初期','筑基中期','筑基后期','筑基巅峰',
  '结丹初期','结丹中期','结丹后期','结丹巅峰',
  '元婴初期','元婴中期','元婴后期','元婴巅峰',
  '化神初期','化神中期','化神后期','化神巅峰',
  '炼虚初期','炼虚中期','炼虚后期','炼虚巅峰',
  '合体初期','合体中期','合体后期','合体巅峰',
  '大乘初期','大乘中期','大乘后期','大乘巅峰',
  '渡劫期',
  '真仙初期','真仙中期','真仙后期','真仙巅峰',
  '金仙初期','金仙中期','金仙后期','金仙巅峰',
  '太乙仙初期','太乙仙中期','太乙仙后期','太乙仙巅峰',
  '大罗仙初期','大罗仙中期','大罗仙后期','大罗仙巅峰',
  '大罗仙圆满',
  '道祖'
];

const STORAGE_KEY = `${LS_PREFIX}_quiz_${CACHE_VERSION}`;

let _currentBuilding = null;
let _currentClueIndex = 0;
let _quizFinished = false;
let _wrongResultHtml = null;
let _userLevel = 0;
let _filterProvince = 'all';
let _filterEra = 'all';
let _score = 0;
let _totalAttempts = 0;
let _usedBuildingKeys = new Set();
let _bgLoading = false;
let _bgTotal = 0;
let _bgLoaded = 0;
let _bgGen = 0;
let _loadedBuildingKey = null;
let _cachedCandidates = null;
let _cachedFilterProvince = 'all';
let _cachedFilterEra = 'all';
let _cachedLang = null;

function _saveState() {
  try {
    const state = { userLevel: _userLevel, score: _score, totalAttempts: _totalAttempts, usedBuildingKeys: [..._usedBuildingKeys], filterProvince: _filterProvince, filterEra: _filterEra, currentClueIndex: _currentClueIndex, quizFinished: _quizFinished, wrongResultHtml: _wrongResultHtml };
    if (_currentBuilding) state.currentBuildingKey = `${_currentBuilding.pid || ''}_${_currentBuilding.d || ''}_${_currentBuilding.n}`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function _loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      _userLevel = s.userLevel || 0; _score = s.score || 0; _totalAttempts = s.totalAttempts || 0;
      _usedBuildingKeys = new Set(s.usedBuildingKeys || []); _filterProvince = s.filterProvince || 'all';
      _filterEra = s.filterEra || 'all'; _currentClueIndex = s.currentClueIndex || 0;
      _quizFinished = s.quizFinished === true; _wrongResultHtml = s.wrongResultHtml || null;
      _loadedBuildingKey = s.currentBuildingKey || null;
    }
  } catch (_) {}
}

function _getLevelName() { return LEVELS[Math.min(_userLevel, LEVELS.length - 1)]; }
function _getLevelProgress() { return _userLevel < LEVELS.length - 1 ? `${_userLevel + 1}/${LEVELS.length}` : 'MAX'; }
function _levelDown() { if (_userLevel > 0) _userLevel--; }

function _getCandidateBuildings() {
  const curLang = State.lang;
  if (_cachedCandidates !== null && _cachedFilterProvince === _filterProvince && _cachedFilterEra === _filterEra && _cachedLang === curLang) return _cachedCandidates;
  _cachedFilterProvince = _filterProvince;
  _cachedFilterEra = _filterEra;
  _cachedLang = curLang;
  const candidates = State.getAllBuildings().filter(b => {
    if (!b.arch && !b.desc && !b.feat && !b.hist) return false;
    if (_filterProvince !== 'all' && b.pid !== _filterProvince) return false;
    if (_filterEra !== 'all') {
      const eraId = Config.getEarliestDynasty(b.e);
      if (eraId !== _filterEra) return false;
    }
    return true;
  });
  _cachedCandidates = candidates.length > 0 ? candidates : null;
  return candidates;
}

function _pickRandomBuilding() {
  const candidates = _getCandidateBuildings();
  if (candidates.length === 0) return null;
  const available = candidates.filter(b => { const key = `${b.pid}_${b.d}_${b.n}`; return !_usedBuildingKeys.has(key); });
  if (available.length === 0) { _usedBuildingKeys.clear(); _saveState(); return candidates[Math.floor(Math.random() * candidates.length)]; }
  return available[Math.floor(Math.random() * available.length)];
}

const _provinceShortMap = { '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏', '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆', '香港特别行政区': '香港', '澳门特别行政区': '澳门' };
function _shortProvince(name) { return _provinceShortMap[name] || name; }

function _shortEra(name) { return name === '中华人民共和国' ? '共和国' : name; }

async function _startRound(container, forceNew = false) {
  if (!forceNew && _currentBuilding && !_quizFinished) { await _renderQuizUI(container); return; }
  if (forceNew || _quizFinished) { _destroyAllQuizMaps(); _currentBuilding = null; _currentClueIndex = 0; _quizFinished = false; _wrongResultHtml = null; _loadedBuildingKey = null; }

  const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || [])];

  if (!_currentBuilding && _loadedBuildingKey) {
    const all = State.getAllBuildings();
    _currentBuilding = all.find(b => { const key = `${b.pid || ''}_${b.d || ''}_${b.n}`; return key === _loadedBuildingKey; }) || null;
    if (!_currentBuilding) {
      await HashSearch.loadProvinces(allProvinceIds, State.lang);
      const all2 = State.getAllBuildings();
      _currentBuilding = all2.find(b => { const key = `${b.pid || ''}_${b.d || ''}_${b.n}`; return key === _loadedBuildingKey; }) || null;
      if (!_currentBuilding) { _currentClueIndex = 0; _quizFinished = false; _loadedBuildingKey = null; }
    }
  }

  if (!_currentBuilding) _currentBuilding = _pickRandomBuilding();

  if (_currentBuilding) {
    _currentClueIndex = 0; _quizFinished = false; _saveState();
    await _renderQuizUI(container); _loadRemainingProvinces(allProvinceIds);
    return;
  }

  const loadedIds = HashSearch.getLoadedProvinceIds(State.lang);
  if (_filterProvince !== 'all' && !loadedIds.has(_filterProvince)) {
    await HashSearch.loadProvinceData(_filterProvince, State.lang);
    _currentBuilding = _pickRandomBuilding();
    if (_currentBuilding) { _currentClueIndex = 0; _quizFinished = false; _saveState(); await _renderQuizUI(container); _loadRemainingProvinces(allProvinceIds); return; }
  }

  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  await HashSearch.loadProvinces([allProvinceIds[dateSeed % allProvinceIds.length]], State.lang);
  _currentBuilding = _pickRandomBuilding();

  if (_currentBuilding) { _currentClueIndex = 0; _quizFinished = false; _saveState(); await _renderQuizUI(container); _loadRemainingProvinces(allProvinceIds); return; }

  await HashSearch.loadProvinces(allProvinceIds, State.lang);
  _currentBuilding = _pickRandomBuilding(); _currentClueIndex = 0; _quizFinished = false; _saveState(); await _renderQuizUI(container);
}

/* ===== 后台渐进式加载 ===== */

async function _loadRemainingProvinces(allProvinceIds) {
  if (_bgLoading) return;
  _bgLoading = true;
  const gen = ++_bgGen;
  try {
    const loadedIds = HashSearch.getLoadedProvinceIds(State.lang);
    const remaining = allProvinceIds.filter(id => !loadedIds.has(id));
    _bgTotal = remaining.length; _bgLoaded = 0;
    if (_bgTotal === 0) { _bgLoading = false; _hideBgProgress(); return; }
    _showBgProgress();
    const batchSize = 5;
    for (let i = 0; i < remaining.length; i += batchSize) {
      if (_bgGen !== gen) return;
      const batch = remaining.slice(i, i + batchSize);
      await HashSearch.loadProvinces(batch, State.lang);
      _bgLoaded += batch.length;
      if (_bgGen !== gen) return;
      _updateBgProgress();
      window.dispatchEvent(new CustomEvent('provinces-loaded', { detail: { loaded: _bgLoaded, total: _bgTotal } }));
    }
    State._resetDerivedCaches();
  } catch (e) { }
  finally { if (_bgGen === gen) { _bgLoading = false; _hideBgProgress(); } }
}

function _showBgProgress() {
  _hideBgProgress();
  const statusBar = document.querySelector('.quiz__status-bar');
  if (!statusBar) return;
  const el = document.createElement('div');
  el.id = 'quizBgProgress';
  el.className = 'quiz__bg-progress';
  const pct = _bgTotal > 0 ? Math.round(_bgLoaded / _bgTotal * 100) : 0;
  el.innerHTML = `<span class="quiz__bg-progress-text">🗂️ ${i18nT('common.loading')} ${_bgLoaded}/${_bgTotal}</span><div class="quiz__bg-progress-bar"><div class="quiz__bg-progress-fill" style="width:${pct}%"></div></div>`;
  statusBar.after(el);
}

function _updateBgProgress() {
  const el = document.getElementById('quizBgProgress');
  if (!el) return;
  const pct = _bgTotal > 0 ? Math.round(_bgLoaded / _bgTotal * 100) : 0;
  el.innerHTML = `<span class="quiz__bg-progress-text">🗂️ ${i18nT('common.loading')} ${_bgLoaded}/${_bgTotal}</span><div class="quiz__bg-progress-bar"><div class="quiz__bg-progress-fill" style="width:${pct}%"></div></div>`;
}

function _hideBgProgress() { const el = document.getElementById('quizBgProgress'); if (el) el.remove(); }

async function _renderQuizUI(container) {
  const totalCandidates = _getCandidateBuildings().length;
  const eraOptions = Config.eras.filter(e => e.timeline !== false);
  const provinceOptsHTML = (State.getProvinceMeta()?.provinces || []).map(p => `<option value="${p.id}" ${_filterProvince === p.id ? 'selected' : ''}>${Config.getProvinceStyle(p.id, State.theme).icon} ${_shortProvince(p.name)}</option>`).join('');
  const eraOptsHTML = eraOptions.map(e => `<option value="${e.id}" ${_filterEra === e.id ? 'selected' : ''}>${_shortEra(e.name)}</option>`).join('');

  if (!_currentBuilding) {
    const resetBtn = '<button class="quiz__btn quiz__btn--submit" style="margin-top:0.75rem;" id="quizResetFilters">' + i18nT('quiz.resetFilter') + '</button>';
    container.innerHTML = `
      <div class="container"><div class="quiz-page">
        <div class="quiz__status-bar">
          <div class="quiz__status-level"><span class="quiz__status-icon">⚡</span><span class="quiz__status-label">${i18nT('quiz.realm')}</span><span class="quiz__status-value">${_getLevelName()}</span><span class="quiz__status-progress">${_getLevelProgress()}</span></div>
          <div class="quiz__status-stats"><span>🏆 ${_score} ${i18nT('quiz.correct')}</span></div>
        </div>
        <div class="quiz__filters">
          <select class="quiz__filter-select" id="quizFilterProvince"><option value="all">🌏 ${i18nT('quiz.region')}</option>${provinceOptsHTML}</select>
          <select class="quiz__filter-select" id="quizFilterEra"><option value="all">📅 ${i18nT('quiz.era')}</option>${eraOptsHTML}</select>
          <button class="quiz__filter-apply" id="quizFilterApply">${i18nT('quiz.filter')}</button>
        </div>
        <div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">${i18nT('quiz.noMatch')}</div><p>${totalCandidates === 0 ? i18nT('quiz.noMatchHint') : i18nT('quiz.allAnswered')}</p>${totalCandidates === 0 ? resetBtn : ''}</div>
      </div></div>`;

    const applyFilter = () => { _filterProvince = document.getElementById('quizFilterProvince')?.value || 'all'; _filterEra = document.getElementById('quizFilterEra')?.value || 'all'; _cachedCandidates = null; _saveState(); _quizFinished = true; _startRound(container, true); };
    document.getElementById('quizFilterApply')?.addEventListener('click', applyFilter);
    document.getElementById('quizResetFilters')?.addEventListener('click', () => { _filterProvince = 'all'; _filterEra = 'all'; _cachedCandidates = null; _saveState(); _quizFinished = true; _startRound(container, true); });
    return;
  }

  const levelName = _getLevelName();
  const accuracy = _totalAttempts > 0 ? Math.round(_score / _totalAttempts * 100) : 0;
  const remainingClues = Utils.CLUE_STAGES.length - _currentClueIndex - 1;
  const allClues = renderAllClues(_currentBuilding, _currentClueIndex);

  container.innerHTML = `
    <div class="container"><div class="quiz-page">
      <div class="quiz__status-bar">
        <div class="quiz__status-level"><span class="quiz__status-icon">⚡</span><span class="quiz__status-label">${i18nT('quiz.realm')}</span><span class="quiz__status-value" id="quizLevelName">${levelName}</span><span class="quiz__status-progress">${_getLevelProgress()}</span></div>
        <div class="quiz__status-stats"><span>🏆 ${_score} ${i18nT('quiz.correct')}</span><span>📊 ${accuracy}% ${i18nT('quiz.accuracy')}</span></div>
      </div>
      <div class="quiz__filters">
        <select class="quiz__filter-select" id="quizFilterProvince"><option value="all">🌏 ${i18nT('quiz.region')}</option>${provinceOptsHTML}</select>
        <select class="quiz__filter-select" id="quizFilterEra"><option value="all">📅 ${i18nT('quiz.era')}</option>${eraOptsHTML}</select>
        <button class="quiz__filter-apply" id="quizFilterApply">${i18nT('quiz.filter')}</button>
      </div>
      <div class="quiz__clue-list">${renderClueCardsHTML(allClues)}</div>
      <div class="quiz__input-area">
        ${remainingClues > 0 ? `<button class="quiz__btn quiz__btn--hint" id="quizMoreHint">${Utils.getHintPrompt(_currentClueIndex + 1)}</button>` : ''}
        <div class="quiz__input-row"><input type="text" class="quiz__input" id="quizAnswerInput" placeholder="${i18nT('quiz.placeholder')}" autocomplete="off"><button class="quiz__btn quiz__btn--submit" id="quizSubmit">${i18nT('quiz.submit')}</button></div>
        <button class="quiz__btn quiz__btn--reveal" id="quizReveal">${i18nT('quiz.reveal')}</button>
        <button class="quiz__btn quiz__btn--skip" id="quizSkip">${i18nT('quiz.skip')}</button>
      </div>
      ${_wrongResultHtml ? `<div class="quiz__result quiz__result--wrong" id="quizResult">${_wrongResultHtml}</div>` : `<div class="quiz__result" id="quizResult" style="display:none;"></div>`}
    </div></div>`;

  _bindQuizEvents(container);
  await initSatelliteMap(_currentBuilding);
  UI.setBreadcrumb([{ name: '🎮 ' + i18nT('quiz.title') }]);
}

function _bindQuizEvents(container) {
  const input = document.getElementById('quizAnswerInput');
  const submitBtn = document.getElementById('quizSubmit');
  const hintBtn = document.getElementById('quizMoreHint');
  const skipBtn = document.getElementById('quizSkip');
  const revealBtn = document.getElementById('quizReveal');
  const filterApply = document.getElementById('quizFilterApply');

  if (input) input.focus();

  submitBtn?.addEventListener('click', () => _handleSubmit());
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') _handleSubmit(); });

  hintBtn?.addEventListener('click', async () => {
    if (_currentClueIndex < Utils.CLUE_STAGES.length - 1) {
      _currentClueIndex++;
      await appendClue(_currentBuilding, _currentClueIndex);
      const remaining = Utils.CLUE_STAGES.length - _currentClueIndex - 1;
      if (remaining > 0) hintBtn.textContent = Utils.getHintPrompt(_currentClueIndex + 1);
      else hintBtn.style.display = 'none';
      document.getElementById('quizAnswerInput')?.focus();
    }
  });

  skipBtn?.addEventListener('click', () => _handleFinal(container, 'skip', '⏭️', i18nT('quiz.skipped')));
  revealBtn?.addEventListener('click', () => _handleFinal(container, 'reveal', '💡', i18nT('quiz.revealed')));

  filterApply?.addEventListener('click', () => {
    _filterProvince = document.getElementById('quizFilterProvince')?.value || 'all';
    _filterEra = document.getElementById('quizFilterEra')?.value || 'all';
    _cachedCandidates = null; _saveState(); _quizFinished = true; _startRound(container, true);
  });
}

function _markCompleted() {
  const key = `${_currentBuilding.pid}_${_currentBuilding.d}_${_currentBuilding.n}`;
  _usedBuildingKeys.add(key);
  if (_usedBuildingKeys.size > 500) {
    const arr = [..._usedBuildingKeys];
    _usedBuildingKeys = new Set(arr.slice(arr.length - 350));
  }
  _totalAttempts++; _quizFinished = true; _saveState();
}

function _handleFinal(container, type, icon, title) {
  if (!_currentBuilding) return;
  _levelDown(); _markCompleted();
  const resultArea = document.getElementById('quizResult');
  if (!resultArea) return;
  resultArea.style.display = 'block';
  resultArea.className = `quiz__result quiz__result-${type}`;
  resultArea.innerHTML = finalResultHTML(_currentBuilding, type, icon, title, _getLevelName());
  disableQuizInputs();
}

function _handleSubmit() {
  const input = document.getElementById('quizAnswerInput');
  const resultArea = document.getElementById('quizResult');
  if (!input || !resultArea || !_currentBuilding) return;

  const userAnswer = input.value.trim();
  if (!userAnswer) return;

  _wrongResultHtml = null; _totalAttempts++;
  const isCorrect = Utils.checkAnswer(userAnswer, _currentBuilding.n);

  if (isCorrect) {
    _score++;
    if (_userLevel < LEVELS.length - 1) _userLevel++;
    _markCompleted();
    resultArea.style.display = 'block';
    resultArea.className = 'quiz__result quiz__result--correct';
    resultArea.innerHTML = correctResultHTML(_currentBuilding, userAnswer, true, _getLevelName());
    disableQuizInputs();
  } else {
    _levelDown(); _saveState();
    _wrongResultHtml = wrongResultHTML(userAnswer, _currentBuilding.n, _getLevelName());
    resultArea.style.display = 'block';
    resultArea.className = 'quiz__result quiz__result--wrong';
    resultArea.innerHTML = _wrongResultHtml;
    input.value = ''; input.focus();
  }
}

export async function render(container, destroyMapFn) {
  _destroyAllQuizMaps();
  _bgGen++;
  _bgLoading = false;
  if (destroyMapFn) destroyMapFn(_destroyAllQuizMaps);
  _loadState(); await _startRound(container);
}