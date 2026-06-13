/**
 * 国保猜猜看 — 修仙等级猜建筑
 */
import { HashSearch, Config, State, Utils } from '../core.js';
import { renderAllClues, appendClue, renderClueCardsHTML, initSatelliteMap, disableQuizInputs, correctResultHTML, wrongResultHTML, finalResultHTML } from '../quiz-core.js';

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

const STORAGE_KEY = 'guobao_quiz_state';

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
let _loadedBuildingKey = null;
let _cachedCandidates = null;
let _cachedFilterProvince = 'all';
let _cachedFilterEra = 'all';
let _cachedProvinceNameFn = null;
const _getProvinceName = () => { if (!_cachedProvinceNameFn) _cachedProvinceNameFn = State.getProvinceName.bind(State); return _cachedProvinceNameFn; };

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
  if (_cachedCandidates && _cachedFilterProvince === _filterProvince && _cachedFilterEra === _filterEra) return _cachedCandidates;
  _cachedFilterProvince = _filterProvince;
  _cachedFilterEra = _filterEra;
  _cachedCandidates = State.getAllBuildings().filter(b => {
    if (!b.arch && !b.desc && !b.feat && !b.hist) return false;
    if (_filterProvince !== 'all' && b.pid !== _filterProvince) return false;
    if (_filterEra !== 'all') {
      const eraId = Config.getEarliestDynasty(b.e);
      if (eraId !== _filterEra) return false;
    }
    return true;
  });
  return _cachedCandidates;
}

function _pickRandomBuilding() {
  const candidates = _getCandidateBuildings();
  if (candidates.length === 0) return null;
  const available = candidates.filter(b => { const key = `${b.pid}_${b.d}_${b.n}`; return !_usedBuildingKeys.has(key); });
  if (available.length === 0) { _usedBuildingKeys.clear(); _saveState(); return candidates[Math.floor(Math.random() * candidates.length)]; }
  return available[Math.floor(Math.random() * available.length)];
}

function _shortProvince(name) {
  const map = { '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏', '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆', '香港特别行政区': '香港', '澳门特别行政区': '澳门' };
  return map[name] || name;
}

function _shortEra(name) { return name === '中华人民共和国' ? '共和国' : name; }

async function _startRound(container, forceNew = false) {
  if (!forceNew && _currentBuilding && !_quizFinished) { _renderQuizUI(container); return; }
  if (forceNew || _quizFinished) { _currentBuilding = null; _currentClueIndex = 0; _quizFinished = false; _wrongResultHtml = null; _loadedBuildingKey = null; }

  const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];

  if (!_currentBuilding && _loadedBuildingKey) {
    const all = State.getAllBuildings();
    _currentBuilding = all.find(b => { const key = `${b.pid || ''}_${b.d || ''}_${b.n}`; return key === _loadedBuildingKey; }) || null;
    if (!_currentBuilding) {
      await HashSearch.loadProvinces(allProvinceIds);
      const all2 = State.getAllBuildings();
      _currentBuilding = all2.find(b => { const key = `${b.pid || ''}_${b.d || ''}_${b.n}`; return key === _loadedBuildingKey; }) || null;
      if (!_currentBuilding) { _currentClueIndex = 0; _quizFinished = false; _loadedBuildingKey = null; }
    }
  }

  if (!_currentBuilding) _currentBuilding = _pickRandomBuilding();

  if (_currentBuilding) {
    _currentClueIndex = 0; _quizFinished = false; _saveState();
    _renderQuizUI(container); _loadRemainingProvinces(allProvinceIds);
    return;
  }

  const loadedIds = HashSearch.getLoadedProvinceIds();
  if (_filterProvince !== 'all' && !loadedIds.has(_filterProvince)) {
    await HashSearch.loadProvinceData(_filterProvince);
    _currentBuilding = _pickRandomBuilding();
    if (_currentBuilding) { _currentClueIndex = 0; _quizFinished = false; _saveState(); _renderQuizUI(container); _loadRemainingProvinces(allProvinceIds); return; }
  }

  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  await HashSearch.loadProvinces([allProvinceIds[dateSeed % allProvinceIds.length], 'cross']);
  _currentBuilding = _pickRandomBuilding();

  if (_currentBuilding) { _currentClueIndex = 0; _quizFinished = false; _saveState(); _renderQuizUI(container); _loadRemainingProvinces(allProvinceIds); return; }

  await HashSearch.loadProvinces(allProvinceIds);
  _currentBuilding = _pickRandomBuilding(); _currentClueIndex = 0; _quizFinished = false; _saveState(); _renderQuizUI(container);
}

/* ===== 后台渐进式加载 ===== */

async function _loadRemainingProvinces(allProvinceIds) {
  if (_bgLoading) return;
  _bgLoading = true;
  try {
    const loadedIds = HashSearch.getLoadedProvinceIds();
    const remaining = allProvinceIds.filter(id => !loadedIds.has(id));
    _bgTotal = remaining.length; _bgLoaded = 0;
    if (_bgTotal === 0) { _bgLoading = false; _hideBgProgress(); return; }
    _showBgProgress();
    const batchSize = 5;
    for (let i = 0; i < remaining.length; i += batchSize) {
      const batch = remaining.slice(i, i + batchSize);
      await HashSearch.loadProvinces(batch);
      _bgLoaded += batch.length;
      _updateBgProgress();
      window.dispatchEvent(new CustomEvent('provinces-loaded', { detail: { loaded: _bgLoaded, total: _bgTotal } }));
    }
    State.clearCache();
  } catch (e) { console.error('后台加载数据失败:', e); }
  finally { _bgLoading = false; _hideBgProgress(); }
}

function _showBgProgress() {
  _hideBgProgress();
  const statusBar = document.querySelector('.quiz-status-bar');
  if (!statusBar) return;
  const el = document.createElement('div');
  el.id = 'quizBgProgress';
  el.className = 'quiz-bg-progress';
  const pct = _bgTotal > 0 ? Math.round(_bgLoaded / _bgTotal * 100) : 0;
  el.innerHTML = `<span class="quiz-bg-progress-text">🗂️ 加载中 ${_bgLoaded}/${_bgTotal}</span><div class="quiz-bg-progress-bar"><div class="quiz-bg-progress-fill" style="width:${pct}%"></div></div>`;
  statusBar.after(el);
}

function _updateBgProgress() {
  const el = document.getElementById('quizBgProgress');
  if (!el) return;
  const pct = _bgTotal > 0 ? Math.round(_bgLoaded / _bgTotal * 100) : 0;
  el.innerHTML = `<span class="quiz-bg-progress-text">🗂️ 加载中 ${_bgLoaded}/${_bgTotal}</span><div class="quiz-bg-progress-bar"><div class="quiz-bg-progress-fill" style="width:${pct}%"></div></div>`;
}

function _hideBgProgress() { const el = document.getElementById('quizBgProgress'); if (el) el.remove(); }

function _renderQuizUI(container) {
  const totalCandidates = _getCandidateBuildings().length;
  const eraOptions = Config.eras.filter(e => e.timeline !== false);
  const provinceOptsHTML = (State.getProvinceMeta()?.provinces || []).map(p => `<option value="${p.id}" ${_filterProvince === p.id ? 'selected' : ''}>${Config.getProvinceStyle(p.id).icon} ${_shortProvince(p.name)}</option>`).join('');
  const eraOptsHTML = eraOptions.map(e => `<option value="${e.id}" ${_filterEra === e.id ? 'selected' : ''}>${_shortEra(e.name)}</option>`).join('');

  if (!_currentBuilding) {
    container.innerHTML = `
      <div class="container"><div class="quiz-page">
        <div class="quiz-status-bar">
          <div class="quiz-status-level"><span class="quiz-status-icon">⚡</span><span class="quiz-status-label">境界</span><span class="quiz-status-value">${_getLevelName()}</span><span class="quiz-status-progress">${_getLevelProgress()}</span></div>
          <div class="quiz-status-stats"><span>🏆 ${_score} 答对</span></div>
        </div>
        <div class="quiz-filters">
          <select class="quiz-filter-select" id="quizFilterProvince"><option value="all">🌏 地区</option>${provinceOptsHTML}</select>
          <select class="quiz-filter-select" id="quizFilterEra"><option value="all">📅 年代</option>${eraOptsHTML}</select>
          <button class="quiz-filter-apply" id="quizFilterApply">筛选</button>
        </div>
        <div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">没有符合条件的建筑</div><p>${totalCandidates === 0 ? '当前筛选条件下无建筑，请调整地区或年代' : '所有建筑已答完，请调整筛选条件或继续答题'}</p>${totalCandidates === 0 ? '<button class="quiz-btn quiz-btn-submit" style="margin-top:0.75rem;" id="quizResetFilters">重置筛选</button>' : ''}</div>
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
      <div class="quiz-status-bar">
        <div class="quiz-status-level"><span class="quiz-status-icon">⚡</span><span class="quiz-status-label">境界</span><span class="quiz-status-value" id="quizLevelName">${levelName}</span><span class="quiz-status-progress">${_getLevelProgress()}</span></div>
        <div class="quiz-status-stats"><span>🏆 ${_score} 答对</span><span>📊 ${accuracy}% 正确率</span></div>
      </div>
      <div class="quiz-filters">
        <select class="quiz-filter-select" id="quizFilterProvince"><option value="all">🌏 地区</option>${provinceOptsHTML}</select>
        <select class="quiz-filter-select" id="quizFilterEra"><option value="all">📅 年代</option>${eraOptsHTML}</select>
        <button class="quiz-filter-apply" id="quizFilterApply">筛选</button>
      </div>
      <div class="quiz-clue-list">${renderClueCardsHTML(allClues)}</div>
      <div class="quiz-input-area">
        ${remainingClues > 0 ? `<button class="quiz-btn quiz-btn-hint" id="quizMoreHint">${Utils.getHintPrompt(_currentClueIndex + 1)}</button>` : ''}
        <div class="quiz-input-row"><input type="text" class="quiz-input" id="quizAnswerInput" placeholder="输入建筑名称..." autocomplete="off"><button class="quiz-btn quiz-btn-submit" id="quizSubmit">提交答案</button></div>
        <button class="quiz-btn quiz-btn-reveal" id="quizReveal">💡 猜不出来？直接看答案</button>
        <button class="quiz-btn quiz-btn-skip" id="quizSkip">⏭️ 跳过此题</button>
      </div>
      ${_wrongResultHtml ? `<div class="quiz-result quiz-result-wrong" id="quizResult">${_wrongResultHtml}</div>` : `<div class="quiz-result" id="quizResult" style="display:none;"></div>`}
    </div></div>`;

  _bindQuizEvents(container);
  initSatelliteMap(_currentBuilding);
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

  skipBtn?.addEventListener('click', () => _handleFinal(container, 'skip', '⏭️', '已跳过'));
  revealBtn?.addEventListener('click', () => _handleFinal(container, 'reveal', '💡', '答案揭晓'));

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
  resultArea.className = `quiz-result quiz-result-${type}`;
  resultArea.innerHTML = finalResultHTML(_currentBuilding, type, icon, title, _getLevelName(), _getProvinceName());
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
    resultArea.className = 'quiz-result quiz-result-correct';
    resultArea.innerHTML = correctResultHTML(_currentBuilding, userAnswer, true, _getLevelName(), _getProvinceName());
    disableQuizInputs();
  } else {
    _levelDown(); _saveState();
    _wrongResultHtml = wrongResultHTML(userAnswer, _currentBuilding.n, _getLevelName());
    resultArea.style.display = 'block';
    resultArea.className = 'quiz-result quiz-result-wrong';
    resultArea.innerHTML = _wrongResultHtml;
    input.value = ''; input.focus();
  }
}

export async function render(container) { _loadState(); _startRound(container); }