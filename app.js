import { buildChart } from './saju_engine.mjs?v=11';
import * as T from './saju_text.mjs?v=11';
import { dayMasterDescriptions } from './saju_descriptions.mjs?v=10';
import { PALM_QUESTIONS, readPalmistry, detectHandType } from './palmistry.mjs?v=6';
import { readIntegration } from './integration.mjs?v=2';
import { annotate, easySummaryCard } from './glossary.mjs?v=2';

// ───────── 오행 색상 ─────────
const ELEM_COLOR = { 목: '#5cc46a', 화: '#f0584b', 토: '#e0a93a', 금: '#e8ebef', 수: '#4aa3f0' };
const ELEM_EN = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' };
const S_ELEM = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const B_ELEM = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' };
const colorOf = ch => ELEM_COLOR[S_ELEM[ch] || B_ELEM[ch]] || '#fff';

// ───────── 드롭다운(생년월일·시간) 채우기 ─────────
const byId = (id) => document.getElementById(id);

function setOptions(sel, opts) {
  const prev = sel.value;
  sel.innerHTML = opts.map(o =>
    `<option value="${o.v}"${o.disabled ? ' disabled' : ''}${o.sel ? ' selected' : ''}>${o.t}</option>`).join('');
  if (prev !== '' && opts.some(o => String(o.v) === prev)) sel.value = prev;
}

function hourLabel(h) {
  if (h === 0) return '밤 12시 (자정)';
  if (h === 12) return '낮 12시 (정오)';
  if (h < 12) return `오전 ${h}시`;
  return `오후 ${h - 12}시`;
}

function updateDays(sfx) {
  const y = parseInt(byId('birth-year' + sfx).value, 10);
  const m = parseInt(byId('birth-month' + sfx).value, 10);
  const lunar = document.querySelector(`input[name="calendarType${sfx}"]:checked`).value === 'lunar';
  let max = 31;
  if (lunar) max = 30;                              // 음력은 한 달 최대 30일
  else if (y && m) max = new Date(y, m, 0).getDate(); // 양력은 그 달의 실제 일수(윤년 반영)
  const days = [{ v: '', t: '일', disabled: true, sel: true }];
  for (let d = 1; d <= max; d++) days.push({ v: d, t: d + '일' });
  setOptions(byId('birth-day' + sfx), days);
}

function updateMinuteState(sfx) {
  byId('birth-minute' + sfx).disabled = byId('birth-hour' + sfx).value === '';
}

function populatePerson(sfx) {
  const years = [{ v: '', t: '태어난 해', disabled: true, sel: true }];
  const nowY = new Date().getFullYear();
  for (let y = 1930; y <= nowY; y++) years.push({ v: y, t: y + '년' });
  setOptions(byId('birth-year' + sfx), years);

  const months = [{ v: '', t: '월', disabled: true, sel: true }];
  for (let m = 1; m <= 12; m++) months.push({ v: m, t: m + '월' });
  setOptions(byId('birth-month' + sfx), months);

  const hours = [{ v: '', t: '시간 모름', sel: true }];
  for (let h = 0; h < 24; h++) hours.push({ v: h, t: hourLabel(h) });
  setOptions(byId('birth-hour' + sfx), hours);

  const mins = [];
  for (let m = 0; m < 60; m += 5) mins.push({ v: m, t: m + '분' });
  setOptions(byId('birth-minute' + sfx), mins);

  updateDays(sfx);
  updateMinuteState(sfx);
}

['', '2'].forEach(sfx => {
  populatePerson(sfx);
  document.querySelectorAll(`input[name="calendarType${sfx}"]`).forEach(r =>
    r.addEventListener('change', function () {
      byId('leap-month-wrapper' + sfx).classList.toggle('hidden', this.value !== 'lunar');
      updateDays(sfx);
    }));
  byId('birth-year' + sfx).addEventListener('change', () => updateDays(sfx));
  byId('birth-month' + sfx).addEventListener('change', () => updateDays(sfx));
  byId('birth-hour' + sfx).addEventListener('change', () => updateMinuteState(sfx));
});

// 혼자/궁합 모드 토글
document.querySelectorAll('input[name="mode"]').forEach(r =>
  r.addEventListener('change', function () {
    const couple = this.value === 'couple';
    byId('person2').classList.toggle('hidden', !couple);
    document.querySelector('#person1 .person-title').classList.toggle('hidden', !couple);
  }));

// ───────── 보기 선택(사주/관상/수상) ─────────
function selectedViews() {
  return [...document.querySelectorAll('input[name="view"]:checked')].map(c => c.value);
}
function syncViewSections() {
  const v = selectedViews();
  byId('saju-section').classList.toggle('hidden', !v.includes('saju'));
  byId('face-block').classList.toggle('hidden', !v.includes('gwansang'));
  byId('palm-block').classList.toggle('hidden', !v.includes('susang'));
  if (v.includes('susang')) ensurePalmSurvey();
}
document.querySelectorAll('input[name="view"]').forEach(c => c.addEventListener('change', syncViewSections));
syncViewSections();

// ── 수상 손금 설문 폼 (손 사진 아래 자동 생성) ──
let _palmSurveyReady = false;
function ensurePalmSurvey() {
  if (_palmSurveyReady) return;
  const html = `<div class="palm-survey">
    <p class="mini-note">손 모양은 사진에서 <b>자동 판별</b>돼. 손금·문양은 사진을 보며 골라줘 — <b>모르는 항목은 비워 두면 해석에서 빠져</b>(멋대로 좋게 해석하지 않아).</p>
    <p id="hand-auto-status" class="hand-auto-status hidden"></p>
    ${PALM_QUESTIONS.map(q => `
      <div class="form-group palm-q" data-qid="${q.id}">
        <label>${q.label} ${q.hint ? `<span class="hint">${q.hint}</span>` : ''}</label>
        <div class="radio-col">
          ${q.options.map(o => `<label class="palm-opt"><input type="radio" name="palm-${q.id}" value="${o.value}"> ${o.label}</label>`).join('')}
        </div>
      </div>`).join('')}
  </div>`;
  byId('palm-block').insertAdjacentHTML('beforeend', html);
  _palmSurveyReady = true;
}
function readPalmAnswers() {
  const a = {};
  PALM_QUESTIONS.forEach(q => {
    const sel = document.querySelector(`input[name="palm-${q.id}"]:checked`);
    if (sel) a[q.id] = sel.value;
  });
  return a;
}

// 사진 업로드 미리보기 (브라우저 내에서만 처리, 서버 전송 없음)
const uploadedImages = {};
function wireUploader(fileId, previewId, key) {
  const file = byId(fileId), preview = byId(previewId);
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    uploadedImages[key] = f;
    preview.src = URL.createObjectURL(f);
    preview.classList.remove('hidden');
    file.closest('.uploader').querySelector('.up-placeholder').classList.add('hidden');
  });
}
wireUploader('face-file', 'face-preview', 'face');
wireUploader('palm-file', 'palm-preview', 'palm');

// 손 사진 올리면 손모양(4원소)을 MediaPipe로 자동 판별 → 설문 자동 선택
const HAND_KO = { earth: '흙손', fire: '불손', air: '공기손', water: '물손' };
function setHandAutoStatus(html) {
  const el = byId('hand-auto-status');
  if (el) { el.innerHTML = html; el.classList.remove('hidden'); }
}
// 자동 인식되는 질문(좌우손·손모양) 표시/숨김
function setAutoQuestionsHidden(hidden) {
  ['side', 'handType'].forEach(qid => {
    document.querySelector(`.palm-q[data-qid="${qid}"]`)?.classList.toggle('hidden', hidden);
  });
}
let handDetectPromise = null; // 제출이 자동판별 완료를 기다리도록 추적 (경쟁상태 방지)
byId('palm-file').addEventListener('change', () => {
  ensurePalmSurvey();
  setHandAutoStatus('🤖 손모양 자동 분석 중…');
  handDetectPromise = (async () => {
    const img = byId('palm-preview');
    try {
      // img.decode()는 간헐적으로 영원히 안 풀리는 버그가 있어 폴링으로 로드 대기
      for (let i = 0; i < 50 && !(img.complete && img.naturalWidth); i++) {
        await new Promise(res => setTimeout(res, 100));
      }
      if (!img.naturalWidth) throw new Error('이미지 로드 실패');
      // 모델 로드가 막히면(느린 네트워크·GPU 문제) 20초 후 수동 선택으로 안내
      const r = await Promise.race([
        detectHandType(img),
        new Promise((_, rej) => setTimeout(() => rej(new Error('hand-detect timeout')), 20000)),
      ]);
      if (r && r.type) {
        const radio = document.querySelector(`input[name="palm-handType"][value="${r.type}"]`);
        if (radio) radio.checked = true;
        let sideTxt = '';
        if (r.side) {
          const sideRadio = document.querySelector(`input[name="palm-side"][value="${r.side}"]`);
          if (sideRadio) sideRadio.checked = true;
          sideTxt = `<b>${r.side === 'right' ? '오른손' : '왼손'}</b> · `;
        }
        // 자동 인식된 질문(좌우손·손모양)은 숨기고, 원하면 펼쳐서 고치게
        setAutoQuestionsHidden(true);
        setHandAutoStatus(`🤖 자동 인식: ${sideTxt}<b>${HAND_KO[r.type]}</b> <button type="button" class="edit-auto-btn" id="edit-auto-btn">직접 고치기</button>`);
        byId('edit-auto-btn')?.addEventListener('click', () => {
          setAutoQuestionsHidden(false);
          byId('edit-auto-btn').remove();
        });
      } else {
        setAutoQuestionsHidden(false);
        setHandAutoStatus('🖐 손을 또렷이 못 찾았어요. 어느 손인지·손모양을 아래에서 직접 골라 주세요.');
      }
    } catch (e) {
      console.error(e);
      setHandAutoStatus('손모양 자동 판별은 건너뛰고, 아래에서 직접 골라 주세요.');
    }
  })();
});

function readPerson(sfx) {
  const year = parseInt(byId('birth-year' + sfx).value, 10);
  const month = parseInt(byId('birth-month' + sfx).value, 10);
  const day = parseInt(byId('birth-day' + sfx).value, 10);
  if (!year || !month || !day) return null;
  if (year < 1900 || year > 2050) return { error: '1900~2050년 출생만 계산할 수 있습니다.' };
  const hv = byId('birth-hour' + sfx).value;
  const hourUnknown = hv === '';
  const hour = hourUnknown ? 12 : parseInt(hv, 10);
  const minute = hourUnknown ? 0 : (parseInt(byId('birth-minute' + sfx).value, 10) || 0);
  const isLunar = document.querySelector(`input[name="calendarType${sfx}"]:checked`).value === 'lunar';
  const isLeap = document.querySelector(`input[name="isLeap${sfx}"]:checked`).value === 'true';
  const gender = document.querySelector(`input[name="gender${sfx}"]:checked`).value;
  return { year, month, day, hour, minute, isLunar, isLeap, gender, hourUnknown };
}

// ───────── 제출 ─────────
document.getElementById('saju-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const views = selectedViews();
  if (!views.length) { alert('무엇을 볼지 하나 이상 선택해 주세요.'); return; }
  if (views.includes('gwansang') && !uploadedImages.face) { alert('관상을 보려면 얼굴 사진을 올려주세요.'); return; }
  if (views.includes('susang') && !uploadedImages.palm) { alert('수상을 보려면 손바닥 사진을 올려주세요.'); return; }

  const btn = e.target.querySelector('.submit-btn');
  const origLabel = btn.innerHTML;
  const setBusy = t => { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t}`; };
  const clearBusy = () => { btn.disabled = false; btn.innerHTML = origLabel; };

  try {
    const mode = document.querySelector('input[name="mode"]:checked').value;

    // 궁합은 '전통사주 단독'만 지원 — 복합 선택 시 상대방 정보가 무시되는 일이 없도록 명시적으로 안내
    if (mode === 'couple' && (!views.includes('saju') || views.length > 1)) {
      alert('💕 궁합 보기는 [전통사주]만 단독 선택했을 때 지원돼요.\n관상·수상을 끄고 다시 눌러 주세요. (관상·수상은 혼자 보기에서 이용 가능)');
      return;
    }

    // ── 사주 ──
    let saju = null;
    if (views.includes('saju')) {
      const p1 = readPerson('');
      if (!p1) { alert('태어난 해 · 월 · 일을 모두 선택해 주세요.'); return; }
      if (p1.error) { alert(p1.error); return; }
      // 궁합은 '전통사주만' 선택했을 때만 (관상·수상과 함께면 혼자보기로 처리)
      if (mode === 'couple' && views.length === 1) {
        const p2 = readPerson('2');
        if (!p2) { alert('상대방의 태어난 해 · 월 · 일을 모두 선택해 주세요.'); return; }
        if (p2.error) { alert('상대방: ' + p2.error); return; }
        const A = buildChart(p1), B = buildChart(p2);
        A.input = p1; B.input = p2;
        renderCouple(A, B);
        return;
      }
      saju = buildChart(p1);
      saju.input = p1;
    }

    // ── 관상 (face-api, 동적 로드) ──
    let face = null;
    if (views.includes('gwansang')) {
      setBusy('관상 분석 중…');
      const { detectFace, readPhysiognomy } = await import('./physiognomy.mjs?v=2');
      const pts = await detectFace(byId('face-preview'));
      if (!pts) { clearBusy(); alert('사진에서 얼굴을 찾지 못했어요. 정면·밝은 곳에서 찍은 얼굴 사진으로 다시 시도해 주세요.'); return; }
      face = readPhysiognomy(pts);
      if (!face.ok) { clearBusy(); alert(face.reason); return; }
    }

    // ── 수상 (손금 설문 기반) ──
    let palm = null;
    if (views.includes('susang')) {
      // 손모양 자동판별이 진행 중이면 완료까지 대기 (기본값으로 확정되는 경쟁상태 방지)
      if (handDetectPromise) {
        setBusy('손 사진 분석 중…');
        await Promise.race([handDetectPromise, new Promise(res => setTimeout(res, 12000))]).catch(() => {});
      }
      palm = readPalmistry(readPalmAnswers());
    }

    // ── 통합 교차통변 (2가지 이상 선택 시) ──
    let integration = null;
    if ([saju, face, palm].filter(Boolean).length >= 2) {
      integration = readIntegration({ saju, face, palm, sajuProfile: saju ? dayMasterDescriptions[saju.dayStem] : null });
    }

    clearBusy();
    renderResults({ saju, face, palm, integration });
  } catch (err) {
    console.error(err);
    clearBusy();
    alert('분석 중 문제가 발생했습니다: ' + (err.message || err));
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('saju-form').classList.remove('hidden');
  document.getElementById('result-section').classList.add('hidden');
  window.scrollTo(0, 0);
});

// 결과를 PNG 이미지로 저장 (모든 탭을 펼쳐 한 장으로)
document.getElementById('save-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-btn');
  if (!window.html2canvas) { alert('이미지 저장 모듈을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'); return; }
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  btn.disabled = true;
  const panels = [...document.querySelectorAll('.tab-panel')];
  const hiddenState = panels.map(p => p.classList.contains('hidden'));
  const tabs = document.querySelector('.tabs');
  const btns = document.querySelector('.result-btns');
  panels.forEach(p => p.classList.remove('hidden'));
  tabs.style.display = 'none';
  btns.style.display = 'none';
  try {
    const canvas = await window.html2canvas(document.querySelector('.glass-container'), { backgroundColor: '#0b0c10', scale: 2 });
    const a = document.createElement('a');
    a.download = `사주명식_${new Date().toISOString().slice(0, 10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    console.error(e);
    alert('이미지 저장에 실패했습니다.');
  } finally {
    panels.forEach((p, i) => { if (hiddenState[i]) p.classList.add('hidden'); });
    tabs.style.display = '';
    btns.style.display = '';
    btn.innerHTML = orig;
    btn.disabled = false;
  }
});

// 궁합 결과 버튼
document.getElementById('couple-reset-btn').addEventListener('click', () => {
  document.getElementById('saju-form').classList.remove('hidden');
  document.getElementById('couple-result').classList.add('hidden');
  window.scrollTo(0, 0);
});

document.getElementById('couple-save-btn').addEventListener('click', async () => {
  const btn = document.getElementById('couple-save-btn');
  if (!window.html2canvas) { alert('이미지 저장 모듈을 불러오지 못했습니다.'); return; }
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  btn.disabled = true;
  const btns = document.querySelector('#couple-result .result-btns');
  btns.style.display = 'none';
  try {
    const canvas = await window.html2canvas(document.querySelector('.glass-container'), { backgroundColor: '#0b0c10', scale: 2 });
    const a = document.createElement('a');
    a.download = `궁합_${new Date().toISOString().slice(0, 10)}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    console.error(e);
    alert('이미지 저장에 실패했습니다.');
  } finally {
    btns.style.display = '';
    btn.innerHTML = orig;
    btn.disabled = false;
  }
});

// 쉬운 풀이 토글 (양쪽 체크박스 동기화, 끄면 .easy 전체 숨김)
document.querySelectorAll('.easy-toggle-input').forEach(cb =>
  cb.addEventListener('change', function () {
    document.querySelectorAll('.easy-toggle-input').forEach(o => { o.checked = this.checked; });
    document.body.classList.toggle('easy-off', !this.checked);
  }));

// 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('hidden', p.id !== 'tab-' + btn.dataset.tab));
  }));

// ───────── 렌더 ─────────
function setTabVisible(tab, on) {
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.toggle('hidden', !on);
}

function renderResults({ saju, face, palm, integration }) {
  document.getElementById('saju-form').classList.add('hidden');
  document.getElementById('couple-result').classList.add('hidden');
  document.getElementById('result-section').classList.remove('hidden');

  // 헤더·오늘 배너는 사주가 있을 때만 — 미사용 영역은 반드시 비움
  // (이전 분석 내용이 남아 있으면 '이미지로 저장' 때 전체 펼침에 섞여 들어감)
  byId('result-head').classList.toggle('hidden', !saju);
  byId('today-banner').classList.toggle('hidden', !saju);
  if (saju) { renderHead(saju); renderToday(saju); }
  else { byId('result-head').innerHTML = ''; byId('today-banner').innerHTML = ''; }

  // 사주 탭
  setTabVisible('chart', !!saju);
  setTabVisible('luck', !!saju);
  setTabVisible('time', !!saju);
  if (saju) {
    byId('tab-chart').innerHTML = renderChartTab(saju);
    byId('tab-luck').innerHTML = renderLuckTab(saju);
    byId('tab-time').innerHTML = renderTimeTab(saju);
  } else {
    byId('tab-chart').innerHTML = ''; byId('tab-luck').innerHTML = ''; byId('tab-time').innerHTML = '';
  }

  // 관상 탭
  setTabVisible('gwansang', !!face);
  byId('tab-gwansang').innerHTML = face ? renderGwansangTab(face) : '';

  // 수상 탭
  setTabVisible('susang', !!palm);
  byId('tab-susang').innerHTML = palm ? renderSusangTab(palm) : '';

  // 통합 탭
  setTabVisible('integration', !!integration);
  byId('tab-integration').innerHTML = integration ? renderIntegrationTab(integration) : '';

  // 어려운 용어 옆에 쉬운 풀이 부착 (원문 유지)
  ['today-banner', 'tab-chart', 'tab-luck', 'tab-time', 'tab-gwansang', 'tab-susang', 'tab-integration']
    .forEach(id => annotate(byId(id)));

  // 켜져 있는 첫 탭 활성화 (통합이 있으면 통합을 먼저 보여줌)
  const first = ['integration', 'chart', 'gwansang', 'susang'].find(
    t => !document.querySelector(`.tab-btn[data-tab="${t}"]`).classList.contains('hidden'));
  if (first) document.querySelector(`.tab-btn[data-tab="${first}"]`).click();

  setTimeout(() => document.querySelectorAll('.gauge-fill,[data-w]').forEach(el => { el.style.width = el.dataset.w; }), 80);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── 관상 탭 렌더 ──
function renderGwansangTab(face) {
  const head = `<div class="card">
    <h2><i class="fas fa-eye"></i> 관상 종합</h2>
    <div class="prose">${face.lines.map(l => `<p>${l}</p>`).join('')}</div>
    <div class="badges">
      <span class="badge good"><i class="fas fa-user-tag"></i> ${face.topType}</span>
      <span class="badge"><i class="fas fa-circle-half-stroke"></i> 오행 ${face.element}</span>
    </div>
  </div>`;
  const parts = `<div class="card">
    <h2><i class="fas fa-list-ul"></i> 부위별 풀이</h2>
    <p class="mini-note">face-api 얼굴 68점 자동 측정 기반 · 정면 사진일수록 정확합니다. 이마(상정)는 사진에서 측정되지 않아 제외됩니다.</p>
    <div class="sinsal-list">
      ${face.items.map(it => `<div class="sinsal-chip"><b>${it.area}</b> <span>${it.cls}</span><p>${it.text}</p></div>`).join('')}
    </div>
  </div>`;
  const disc = `<p class="disclaimer">관상은 통계적으로 검증된 학문이 아니며, '잘 맞는다'는 느낌의 정체는 <b>바넘효과·확증편향</b>입니다. 자기성찰용 참고로만 보고, 외모로 자신이나 타인을 단정하지 마세요. 얼굴은 표정·마음가짐·노력으로 바뀝니다.</p>`;
  return head + parts + disc;
}

// ── 수상 탭 렌더 ──
function renderSusangTab(palm) {
  const head = `<div class="card">
    <h2><i class="fas fa-hand"></i> 수상 종합</h2>
    <div class="prose">${palm.lines.map(l => `<p>${l}</p>`).join('')}</div>
    <div class="badges">
      <span class="badge good"><i class="fas fa-hand-sparkles"></i> ${palm.topType}</span>
      <span class="badge"><i class="fas fa-circle-half-stroke"></i> 오행 ${palm.element}</span>
    </div>
  </div>`;
  const parts = `<div class="card">
    <h2><i class="fas fa-list-ul"></i> 손금·손모양 풀이</h2>
    <div class="sinsal-list">
      ${palm.items.map(it => `<div class="sinsal-chip"><b>${it.area}</b> <span>${it.cls}</span><p>${it.text}</p></div>`).join('')}
    </div>
  </div>`;
  const disc = `<p class="disclaimer">수상은 통계적으로 검증된 학문이 아닙니다(주요 손금은 태아기에 형성됩니다). '잘 맞는다'는 느낌은 <b>바넘효과·확증편향</b>이니 자기성찰용 참고로만 보세요.</p>`;
  return head + parts + disc;
}

// ── 통합 교차통변 탭 렌더 ──
function renderIntegrationTab(intg) {
  const chips = Object.entries(intg.els).map(([k, v]) =>
    `<span class="badge"><i class="fas fa-circle-half-stroke"></i> ${k} ${v}</span>`).join('');
  const head = `<div class="card integration-card">
    <h2><i class="fas fa-circle-nodes"></i> 통합 사주 — 종합 통변</h2>
    <p class="mini-note">전통 사주(命)를 중심에 두고 관상·수상을 오행으로 엮은 종합 인물평입니다.</p>
    <div class="badges">${chips}</div>
    <div class="prose">${intg.lines.map(l => `<p>${l}</p>`).join('')}</div>
  </div>`;
  const secs = (intg.sections || []).map(s => `<div class="card">
    <h2><i class="fas ${s.icon}"></i> ${s.title}</h2>
    <div class="prose"><p>${s.body}</p></div>
  </div>`).join('');
  const disc = `<p class="disclaimer">통합 해석은 사주(命)를 중심에 두고 관상·수상을 보조로 엮은 <b>참고용</b>입니다. 운명은 정해진 것이 아니라 개척하는 것이며, 관상·수상은 통계적으로 검증된 학문이 아닙니다.</p>`;
  return head + secs + disc;
}

// ───────── 궁합 렌더 ─────────
function renderCouple(A, B) {
  document.getElementById('saju-form').classList.add('hidden');
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('couple-result').classList.remove('hidden');
  const r = T.compatibilityReading(A, B);

  const pCard = (c, label) => {
    const P = c.pillarInfo;
    const ming = ['hour', 'day', 'month', 'year'].map(k => `<span style="color:${colorOf(P[k].stem)}">${P[k].stem}</span><span style="color:${colorOf(P[k].branch)}">${P[k].branch}</span>`).join(' ');
    const i = c.input;
    const cal = i.isLunar ? `음력 ${i.year}.${pad(i.month)}.${pad(i.day)}` : `${i.year}.${pad(i.month)}.${pad(i.day)}`;
    return `<div class="cp-person">
      <div class="cp-plabel">${label} · ${i.gender === 'male' ? '남' : '여'}</div>
      <div class="cp-day" style="color:${colorOf(c.dayStem)}">${c.dayStem}${P.day.branch}</div>
      <div class="cp-ming">${ming}</div>
      <div class="cp-cal">${cal} · ${c.curAge}세</div></div>`;
  };

  document.getElementById('couple-head').innerHTML = `
    <div class="result-head"><div class="ming">💕 궁합 분석</div></div>
    <div class="cp-persons">
      ${pCard(A, '나')}
      <div class="cp-score">
        <div class="cp-score-num ${r.grade.cls}">${r.score}<small>점</small></div>
        <div class="cp-grade ${r.grade.cls}">${r.grade.label}</div>
      </div>
      ${pCard(B, '상대')}
    </div>
    <div class="gauge"><div class="gauge-fill ${r.grade.cls}" data-w="${r.score}%"></div></div>`;

  const secCards = r.sections.map(s => `
    <div class="card cp-sec">
      <div class="cp-sec-head"><h2><i class="fas ${s.icon}"></i> ${s.title}</h2>${s.score != null ? `<span class="cp-sec-score">${s.score}점</span>` : ''}</div>
      <p class="cp-sec-rel">${s.head}</p>
      <p class="cp-sec-body">${s.body}</p>
    </div>`).join('');

  document.getElementById('couple-body').innerHTML = `
    <div class="card"><div class="prose">${r.lines.map(l => `<p>${l}</p>`).join('')}</div></div>
    ${secCards}`;
  annotate(document.getElementById('couple-body'));

  setTimeout(() => document.querySelectorAll('#couple-result [data-w]').forEach(el => { el.style.width = el.dataset.w; }), 80);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHead(c) {
  const P = c.pillarInfo;
  const ming = ['year', 'month', 'day', 'hour'].map(k =>
    `<span style="color:${colorOf(P[k].stem)}">${P[k].stem}</span><span style="color:${colorOf(P[k].branch)}">${P[k].branch}</span>`).join(' ');
  const i = c.input;
  const cal = i.isLunar ? `음력 ${i.year}-${pad(i.month)}-${pad(i.day)}${i.isLeap ? '(윤달)' : ''}` : `양력 ${i.year}-${pad(i.month)}-${pad(i.day)}`;
  const time = i.hourUnknown ? '시간 미상' : `${pad(i.hour)}:${pad(i.minute)}`;
  const g = i.gender === 'male' ? '남' : '여';
  const dp = c.pillarInfo.day;
  document.getElementById('result-head').innerHTML =
    `<div class="ming">${ming}</div>
     <div class="ming-sub">${cal} ${time} · ${g} · ${c.curAge}세 · 일간 <b style="color:${colorOf(c.dayStem)}">${c.dayStem}(${dp.stemKo}${dp.stemElem})</b></div>`;
}

const GRADE_CLS = { 대길: 'g5', 길: 'g4', 평: 'g3', 주의: 'g2', 흉: 'g1' };

function renderToday(c) {
  const r = T.todayReading(c);
  const t = c.todayLuck;
  document.getElementById('today-banner').innerHTML = `
    <div class="today-card">
      <div class="today-gz">
        <div class="t-label">오늘의 운세</div>
        <div class="t-gz"><span style="color:${colorOf(t.stem)}">${t.stem}</span><span style="color:${colorOf(t.branch)}">${t.branch}</span></div>
        <div class="t-mark ${GRADE_CLS[t.fortune.level]}">${t.fortune.level} ${t.fortune.mark}</div>
      </div>
      <div class="today-text">${r.lines.map(l => `<p>${l}</p>`).join('')}</div>
    </div>`;
}

// ── 탭1: 명식·종합 ──
function renderChartTab(c) {
  return easySummaryCard(c) + mingsikTable(c) + pillarCard(c) + relationsCard(c) + ohaengCard(c) + summaryCard(c) + dayMasterCard(c) + sinsalCard(c);
}

// 명식 글자별 풀이 (자리×십성×십이운성 강약)
function pillarCard(c) {
  const lvCls = { 강: 'lv-strong', 중: 'lv-mid', 약: 'lv-weak' };
  const blocks = T.pillarReadings(c).map(pr => {
    const p = c.pillarInfo[pr.key];
    const lv = p.stageLevel;
    return `<div class="pr-block">
      <div class="pr-head">
        <span class="pr-gz"><span style="color:${colorOf(pr.stem)}">${pr.stem}</span><span style="color:${colorOf(pr.branch)}">${pr.branch}</span></span>
        <span class="pr-title">${pr.gung} · ${pr.label}</span>
        <span class="pr-stage ${lvCls[lv]}">${p.stage}·${lv}</span>
      </div>
      <div class="pr-life">${pr.life}</div>
      ${pr.lines.map(l => `<p>${l}</p>`).join('')}
    </div>`;
  }).join('');
  return `<div class="card"><h2><i class="fas fa-list-ul"></i> 명식 글자별 풀이</h2>
    <p class="mini-note">각 자리(궁위)가 맡는 인생 영역에, 어떤 기운(십성)이 얼마만큼의 힘(십이운성)으로 들어있는지 봅니다.</p>
    <div class="pr-list">${blocks}</div></div>`;
}

function relationsCard(c) {
  const r = T.relationsReading(c);
  const lines = r.lines.map(l => `<p>${l}</p>`).join('');
  const items = r.items.map(it => {
    const cls = it.kind === '합' ? 'rel-hap' : it.kind === '충' ? 'rel-chung' : 'rel-hyeong';
    return `<div class="rel-chip ${cls}">
      <div class="rel-top"><b>${it.type}</b> <span class="rel-gl">${it.glyphs}</span>${it.result ? ` <span class="rel-res">→ ${it.result}</span>` : ''} <span class="rel-where">${it.where}</span></div>
      <p>${it.desc}</p></div>`;
  }).join('');
  return `<div class="card"><h2><i class="fas fa-link"></i> 합·충·형 (글자 간 작용)</h2>
    <div class="prose">${lines}</div>
    ${items ? `<div class="rel-list">${items}</div>` : ''}</div>`;
}

function mingsikTable(c) {
  const order = [['hour', '시주', '時柱'], ['day', '일주', '日柱'], ['month', '월주', '月柱'], ['year', '년주', '年柱']];
  const cols = order.map(([k, ko, hj]) => {
    const p = c.pillarInfo[k];
    const isDay = k === 'day';
    const topGod = isDay ? '<span class="me">日 元</span>' : p.stemGod;
    return `<div class="pcol ${isDay ? 'is-day' : ''} ${c.input.hourUnknown && k === 'hour' ? 'dim' : ''}">
      <div class="pcol-h">${ko}<small>${hj}</small></div>
      <div class="god">${topGod}</div>
      <div class="glyph" style="color:${colorOf(p.stem)}">${p.stem}<small>${p.stemKo}</small></div>
      <div class="glyph" style="color:${colorOf(p.branch)}">${p.branch}<small>${p.branchKo}</small></div>
      <div class="god">${p.branchGod}</div>
      <div class="meta">${p.stage}</div>
      <div class="meta jj">${p.hidden.join('')}</div>
    </div>`;
  }).join('');
  let note = c.input.hourUnknown ? `<p class="mini-note">※ 태어난 시간을 몰라 <b>시주(時柱)는 표시만 하고, 아래 모든 해석(오행·신강약·용신·운세)은 시주를 뺀 3주(三柱) 기준</b>으로 계산했습니다. 정확한 출생 시각을 알면 더 정밀해집니다.</p>` : '';
  if (c.termWarning != null) note += `<p class="mini-note warn-note">⚠️ 출생 시각이 절기 경계에서 약 <b>${c.termWarning}분</b> 거리입니다. 절입시각 계산 오차(±수 분)로 년주·월주가 달라질 수 있으니, 중요한 판단에는 정밀 만세력 대조를 권합니다.</p>`;
  if (c.tzHalf) note += `<p class="mini-note">※ 출생 시기의 한국 표준시(UTC+8:30)를 현행 기준으로 자동 보정했습니다(+30분). 단, 서머타임 시행 시기는 반영되지 않습니다.</p>`;
  return `<div class="card"><h2><i class="fas fa-table-cells"></i> 사주 명식 (四柱八字)</h2>
    <div class="pillars-grid">${cols}</div>
    <p class="mini-note">칸 안 위→아래 순서: 십성 · 천간 · 지지 · 십성 · 십이운성 · 지장간</p>${note}</div>`;
}

function ohaengCard(c) {
  const totalGlyphs = Object.values(c.elementCount).reduce((a, b) => a + b, 0) || 8;
  const bars = ['목', '화', '토', '금', '수'].map(el => {
    const n = c.elementCount[el];
    return `<div class="element-bar">
      <span class="label">${el}(${({ 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' })[el]})</span>
      <div class="bar-fill"><div class="fill ${ELEM_EN[el]}" data-w="${(n / totalGlyphs) * 100}%"></div></div>
      <span class="count">${n}</span></div>`;
  }).join('');
  const st = c.strength, ys = c.yongsin;
  const badges = `<div class="badges">
    <span class="badge"><i class="fas fa-scale-balanced"></i> ${st.level}</span>
    <span class="badge"><i class="fas fa-landmark"></i> ${c.gyeokguk.name}</span>
    <span class="badge good"><i class="fas fa-star"></i> 용신 ${ys.primary}·희신 ${ys.helper}</span>
  </div>`;
  return `<div class="card"><h2><i class="fas fa-chart-simple"></i> 음양오행 균형</h2>
    <div class="elements-chart">${bars}</div>${badges}</div>`;
}

function summaryCard(c) {
  const lines = T.comprehensiveSummary(c).map(l => `<p>${l}</p>`).join('');
  return `<div class="card"><h2><i class="fas fa-scroll"></i> 종합 통변 (전통 명리)</h2><div class="prose">${lines}</div></div>`;
}

function dayMasterCard(c) {
  const dm = dayMasterDescriptions[c.dayStem];
  if (!dm) return '';
  return `<div class="card"><h2><i class="fas fa-user"></i> 일간으로 본 나의 본성</h2><div class="prose">
    <p><b>기본 성향</b><br>${dm.basic}</p>
    <p><b>직무·적성</b><br>${dm.aptitude}</p>
    <p><b>대인관계</b><br>${dm.relationship}</p>
    <p><b>조언</b><br>${dm.advice}</p></div></div>`;
}

function sinsalCard(c) {
  if (!c.sinsal.length) return `<div class="card"><h2><i class="fas fa-wand-magic-sparkles"></i> 신살(神煞)</h2><p class="prose">두드러진 주요 신살은 없습니다. 신살은 보조 지표이니 격국·억부 해석을 우선하세요.</p></div>`;
  const chips = c.sinsal.map(s => `<div class="sinsal-chip"><b>${s.name}</b> <span>${s.pos}</span><p>${s.desc}</p></div>`).join('');
  return `<div class="card"><h2><i class="fas fa-wand-magic-sparkles"></i> 신살(神煞)</h2>
    <p class="mini-note">신살은 보조 지표입니다. 맹신하지 말고 사주 전체의 흐름과 함께 참고하세요.</p>
    <div class="sinsal-list">${chips}</div></div>`;
}

// ── 탭2: 운세 ──
function renderLuckTab(c) {
  const items = [
    ['재물운', 'fa-coins', T.wealthLuck(c)],
    ['직업운', 'fa-briefcase', T.careerLuck(c)],
    ['연애·결혼운', 'fa-heart', T.loveLuck(c)],
    ['건강운', 'fa-heart-pulse', T.healthLuck(c)],
  ];
  const scoreNote = `<p class="mini-note">점수는 전통 명리의 공식이 아니라 <b>이 앱의 규칙으로 매긴 상대 지표</b>입니다. 숫자 자체보다 항목별 설명을 참고하세요.</p>`;
  const healthNote = `<p class="disclaimer">건강운은 오행 균형에 대한 <b>전통적 관점의 참고</b>일 뿐, 의학적 진단·예측이 아닙니다. 건강 이상은 반드시 의료 전문가와 상담하세요.</p>`;
  return scoreNote + items.map(([title, icon, r]) => `
    <div class="card luck-card">
      <div class="luck-head">
        <h2><i class="fas ${icon}"></i> ${title}</h2>
        <span class="grade ${r.grade.cls}">${r.grade.label} · ${r.score}점</span>
      </div>
      <div class="gauge"><div class="gauge-fill ${r.grade.cls}" data-w="${r.score}%"></div></div>
      <ul class="luck-lines">${r.lines.map(l => `<li>${l}</li>`).join('')}</ul>
    </div>`).join('') + healthNote;
}

// ── 탭3: 과거·올해·미래 ──
function renderTimeTab(c) {
  const past = T.pastReading(c);
  const yr = T.yearReading(c);
  const fut = T.futureReading(c);

  const pastBlock = `<div class="card">
    <h2><i class="fas fa-book-open"></i> 이때까지의 사주 (지나온 대운)</h2>
    <div class="prose">${past.lines.map(l => `<p>${l}</p>`).join('')}</div>
  </div>`;

  const yearBlock = `<div class="card">
    <h2><i class="fas fa-bullseye"></i> 올해 사주 (${yr.year}년 세운)</h2>
    <div class="prose">${yr.lines.map(l => `<p>${l}</p>`).join('')}</div>
  </div>`;

  const futBlock = `<div class="card">
    <h2><i class="fas fa-road"></i> 앞으로 10년 (대운·세운)</h2>
    <div class="prose">${fut.lines.map(l => `<p>${l}</p>`).join('')}</div>
    <h3 class="sub">대운 흐름 (10년 단위)</h3>
    ${daeunTimeline(c)}
    <h3 class="sub">세운 흐름 (${c.seun[0].year}~${c.seun[c.seun.length - 1].year})</h3>
    ${seunTimeline(c)}
  </div>`;

  return pastBlock + yearBlock + futBlock;
}

function daeunTimeline(c) {
  const cells = c.daeun.list.map((d, i) => {
    const cur = i === c.daeun.currentIdx;
    const pastCls = i < c.daeun.currentIdx ? 'past' : '';
    return `<div class="tl-cell f-${d.fortune.level} ${cur ? 'current' : ''} ${pastCls}">
      <div class="tl-age">${d.age}세</div>
      <div class="tl-gz"><span style="color:${colorOf(d.stem)}">${d.stem}</span><span style="color:${colorOf(d.branch)}">${d.branch}</span></div>
      <div class="tl-god">${d.stemGod}<br>${d.branchGod}</div>
      <div class="tl-mark">${d.fortune.mark}</div>
    </div>`;
  }).join('');
  return `<div class="timeline">${cells}</div>
    <p class="legend">◎대길 ○길 –평 △주의 ✕흉 · <span class="now-dot"></span>현재 대운</p>`;
}

function seunTimeline(c) {
  const cells = c.seun.map(s => {
    const cur = s.year === (c.curSajuYear || c.today.getFullYear());
    return `<div class="tl-cell sm f-${s.fortune.level} ${cur ? 'current' : ''}">
      <div class="tl-age">${s.year}</div>
      <div class="tl-gz"><span style="color:${colorOf(s.stem)}">${s.stem}</span><span style="color:${colorOf(s.branch)}">${s.branch}</span></div>
      <div class="tl-god">${s.stemGod}</div>
      <div class="tl-mark">${s.fortune.mark}</div>
    </div>`;
  }).join('');
  return `<div class="timeline">${cells}</div>`;
}

const pad = n => String(n).padStart(2, '0');
