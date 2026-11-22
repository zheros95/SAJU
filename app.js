import { buildChart } from './saju_engine.mjs?v=14';
import * as T from './saju_text.mjs?v=15';
import { dayMasterDescriptions } from './saju_descriptions.mjs?v=10';
import { PALM_QUESTIONS, readPalmistry, detectHandType, palmGuide } from './palmistry.mjs?v=9';
import { FACE_QUESTIONS, FACE_PRIMER, YUNYEON } from './physiognomy_text.mjs?v=1';
import { PALM_PRIMER } from './palmistry_text.mjs?v=1';
import { isMobileDevice, normalizeImage, openCameraModal } from './camera.mjs?v=1';
import { readIntegration } from './integration.mjs?v=6';
import { annotate, easySummaryCard } from './glossary.mjs?v=3';

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
  // 최신 연도가 맨 위, 기본 선택은 1980년(피커가 1980년 근처에서 열리도록)
  const years = [];
  const nowY = new Date().getFullYear();
  for (let y = nowY; y >= 1930; y--) years.push({ v: y, t: y + '년', sel: y === 1980 });
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
  if (v.includes('gwansang')) ensureFaceSurvey();
}
document.querySelectorAll('input[name="view"]').forEach(c => c.addEventListener('change', syncViewSections));
syncViewSections();

// ── 설문 폼 (사진 아래 자동 생성) ──
const CIRCLED = ['', '①', '②', '③', '④', '⑤', '⑥'];
function questionHtml(q, prefix) {
  return `<div class="form-group palm-q" data-qid="${q.id}">
    <label>${q.n ? `<span class="q-num">${CIRCLED[q.n]}</span> ` : ''}${q.label} ${q.hint ? `<span class="hint">${q.hint}</span>` : ''}</label>
    <div class="radio-col">
      ${q.options.map(o => `<label class="palm-opt"><input type="radio" name="${prefix}-${q.id}" value="${o.value}"> ${o.label}</label>`).join('')}
    </div>
  </div>`;
}
function readAnswers(questions, prefix) {
  const a = {};
  questions.forEach(q => {
    const sel = document.querySelector(`input[name="${prefix}-${q.id}"]:checked`);
    if (sel) a[q.id] = sel.value;
  });
  return a;
}

let _palmSurveyReady = false;
function ensurePalmSurvey() {
  if (_palmSurveyReady) return;
  const basic = PALM_QUESTIONS.filter(q => !q.more), more = PALM_QUESTIONS.filter(q => q.more);
  const html = `<div class="palm-survey">
    <p class="mini-note">손 모양과 손가락 길이는 사진에서 <b>자동으로 잽니다</b>. 손금은 사진이나 실제 손을 보며 골라 주세요. 번호(①~⑥)는 사진 위 안내선의 번호와 같습니다. <b>‘모르겠다’나 빈 항목은 ‘없다’로 보지 않고 판단 보류</b>로 처리합니다.</p>
    <p id="hand-auto-status" class="hand-auto-status hidden"></p>
    ${basic.map(q => questionHtml(q, 'palm')).join('')}
    <details class="survey-more"><summary>더 자세히 보기 — 보조선·무늬·언덕 (선택, ${more.length}문항)</summary>
      <div class="survey-more-body">${more.map(q => questionHtml(q, 'palm')).join('')}</div>
    </details>
  </div>`;
  byId('palm-block').insertAdjacentHTML('beforeend', html);
  _palmSurveyReady = true;
}
const readPalmAnswers = () => readAnswers(PALM_QUESTIONS, 'palm');

let _faceSurveyReady = false;
function ensureFaceSurvey() {
  if (_faceSurveyReady) return;
  const html = `<div class="palm-survey">
    <p id="face-auto-status" class="hand-auto-status hidden"></p>
    <details class="survey-more"><summary>사진으로 못 재는 부위 직접 고르기 — 이마·귀·코끝 등 (선택, ${FACE_QUESTIONS.length}문항)</summary>
      <div class="survey-more-body">
        <p class="mini-note">이마 머리선, 귀, 살집은 사진에서 잴 수 없습니다. 고른 항목만 풀이에 더하고, 비워 둔 항목은 풀이하지 않습니다.</p>
        ${FACE_QUESTIONS.map(q => questionHtml(q, 'face')).join('')}
      </div>
    </details>
  </div>`;
  byId('face-block').insertAdjacentHTML('beforeend', html);
  _faceSurveyReady = true;
}
const readFaceAnswers = () => readAnswers(FACE_QUESTIONS, 'face');

// ───────── 사진 입력: 카메라 촬영 / 앨범 선택 (브라우저 내에서만 처리, 서버 전송 없음) ─────────
const uploadedImages = {};
const photoHooks = {}; // key → 사진이 바뀔 때 실행할 함수
async function setPhoto(key, file) {
  if (!file) return;
  const blob = await normalizeImage(file);
  uploadedImages[key] = blob;
  const box = byId(key + '-uploader'), preview = byId(key + '-preview');
  if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
  preview.dataset.url = preview.src = URL.createObjectURL(blob);
  box.querySelector('.up-placeholder').classList.add('hidden');
  box.querySelector('.up-stage').classList.remove('hidden');
  box.querySelector('.up-again').classList.remove('hidden');
  byId(key + '-overlay').classList.add('hidden');
  if (photoHooks[key]) photoHooks[key]();
}
async function takePhoto(key) {
  if (isMobileDevice()) { byId(key + '-cam').click(); return; } // 폰·태블릿: 기본 카메라 앱이 바로 열림
  try {
    const blob = await openCameraModal(key); // PC: 웹캠 창
    if (blob) await setPhoto(key, blob);
  } catch (e) {
    console.error(e);
    alert('카메라를 열지 못했습니다. 브라우저의 카메라 권한을 확인하거나 ‘앨범에서 고르기’로 사진 파일을 선택해 주세요.');
  }
}
['face', 'palm'].forEach(key => {
  ['file', 'cam'].forEach(sfx => byId(`${key}-${sfx}`).addEventListener('change', function () {
    const f = this.files[0];
    this.value = ''; // 같은 사진을 다시 골라도 change가 뜨게
    setPhoto(key, f);
  }));
});
document.querySelectorAll('.up-btn').forEach(btn => btn.addEventListener('click', () => {
  const key = btn.dataset.up;
  if (btn.dataset.act === 'camera') takePhoto(key);
  else byId(key + '-file').click();
}));

// ── 사진 위 안내선 그리기 ──
function waitImage(img) { // img.decode()는 간헐적으로 영원히 안 풀리는 버그가 있어 폴링으로 로드 대기
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      if (img.complete && img.naturalWidth) return resolve();
      if (++n > 80) return reject(new Error('이미지 로드 실패'));
      setTimeout(tick, 100);
    };
    tick();
  });
}
function overlayCtx(key) {
  const img = byId(key + '-preview'), cv = byId(key + '-overlay');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.classList.remove('hidden');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  return { ctx, W: cv.width, H: cv.height, u: Math.max(cv.width, cv.height) / 500 }; // u: 화면에서 약 1px에 해당하는 굵기 단위
}
function drawFaceOverlay(guide) {
  const o = overlayCtx('face');
  const { ctx, W, H } = o;
  const fx = guide.closed[0].map(p => p[0] * W);
  const u = Math.max(o.u * 0.5, (Math.max(...fx) - Math.min(...fx)) / 220); // 선 굵기는 얼굴 크기에 맞춘다
  const path = (pts, close) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); if (close) ctx.closePath(); ctx.stroke(); };
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(241,201,68,.9)'; ctx.lineWidth = 1.6 * u;
  guide.closed.forEach(p => path(p, true));
  ctx.strokeStyle = 'rgba(120,200,255,.95)'; ctx.lineWidth = 1.4 * u;
  guide.open.forEach(p => path(p, false));
  // 삼정 가로선
  const xs = guide.closed[0].map(p => p[0]);
  const x0 = Math.min(...xs) * W, x1 = Math.max(...xs) * W;
  ctx.setLineDash([5 * u, 4 * u]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1 * u;
  guide.levels.forEach(y => { ctx.beginPath(); ctx.moveTo(x0, y * H); ctx.lineTo(x1, y * H); ctx.stroke(); });
  ctx.setLineDash([]);
}
function drawPalmOverlay(guide, lm) {
  const o = overlayCtx('palm');
  const { ctx, W, H } = o;
  // 글자·선 굵기는 사진 크기가 아니라 손 크기에 맞춘다(손이 작게 찍힌 사진에서 글자가 겹치지 않게)
  const palmPx = Math.hypot((lm[9].x - lm[0].x) * W, (lm[9].y - lm[0].y) * H);
  const u = Math.max(o.u * 0.45, Math.min(o.u * 1.6, palmPx / 150));
  const label = (txt, x, y, bg, k = 1) => {
    ctx.font = `600 ${11 * u * k}px sans-serif`;
    const w = ctx.measureText(txt).width + 8 * u * k, h = 15 * u * k;
    ctx.fillStyle = bg; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = '#14151a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 0.5 * u);
  };
  ctx.lineCap = 'round';
  guide.curves.forEach(c => {
    const [a, m, b] = c.pts.map(([x, y]) => [x * W, y * H]);
    ctx.setLineDash([6 * u, 5 * u]);
    ctx.strokeStyle = 'rgba(20,21,26,.55)'; ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(241,201,68,.95)'; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);
    // 곡선의 가운데쯤에 번호
    const t = 0.5, mx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], my = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1];
    label(CIRCLED[c.n], mx, my, 'rgba(241,201,68,.97)');
  });
  guide.mounts.forEach(mt => label(mt.label, mt.at[0] * W, mt.at[1] * H, 'rgba(160,215,255,.72)', 0.8));
}

// ── 얼굴 사진: 올리는 즉시 메시 인식 → 안내선·촬영 품질 안내 ──
let faceDet = null, faceDetectPromise = null, faceApi = null;
function setFaceStatus(html) {
  const el = byId('face-auto-status');
  if (el) { el.innerHTML = html; el.classList.remove('hidden'); }
}
photoHooks.face = () => {
  ensureFaceSurvey();
  faceDet = null;
  setFaceStatus('🤖 얼굴 인식 중… (처음에는 모델을 내려받느라 조금 걸립니다)');
  faceDetectPromise = (async () => {
    const img = byId('face-preview');
    try {
      await waitImage(img);
      faceApi = faceApi || await import('./physiognomy.mjs?v=3');
      const det = await Promise.race([
        faceApi.detectFace(img),
        new Promise((_, rej) => setTimeout(() => rej(new Error('face-detect timeout')), 40000)),
      ]);
      if (!det) { setFaceStatus('🙂 사진에서 얼굴을 찾지 못했어요. 정면·밝은 곳에서 다시 찍어 주세요.'); return; }
      faceDet = det;
      drawFaceOverlay(faceApi.faceGuide(det));
      const res = faceApi.readPhysiognomy(det);
      if (!res.ok) { faceDet = null; setFaceStatus('⚠️ ' + res.reason); return; }
      const shape = faceApi.autoShape(det);
      const warn = res.warns.length ? `<br>⚠️ ${res.warns.join('<br>⚠️ ')}` : '';
      setFaceStatus(`🤖 얼굴 인식 완료 — 추정 얼굴형 <b>${shape.weak ? '고른 형(계란형)' : shape.name}</b>. 노란 선이 윤곽, 파란 선이 눈썹·눈·코·입, 점선이 삼정 구분선입니다. 선이 얼굴과 어긋나 있으면 다시 찍어 주세요.${warn}`);
    } catch (e) {
      console.error(e);
      setFaceStatus('얼굴 인식 모듈을 불러오지 못했어요. 인터넷 연결을 확인하고 사진을 다시 올려 주세요.');
    }
  })();
};

// ── 손 사진: 올리는 즉시 관절 인식 → 손모양·좌우 자동 선택, 손금 위치 안내선 ──
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
let handAuto = null;
let handDetectPromise = null; // 제출이 자동판별 완료를 기다리도록 추적 (경쟁상태 방지)
photoHooks.palm = () => {
  ensurePalmSurvey();
  handAuto = null;
  setHandAutoStatus('🤖 손 인식 중… (처음에는 모델을 내려받느라 조금 걸립니다)');
  handDetectPromise = (async () => {
    const img = byId('palm-preview');
    try {
      await waitImage(img);
      // 모델 로드가 막히면(느린 네트워크·GPU 문제) 수동 선택으로 안내
      const r = await Promise.race([
        detectHandType(img),
        new Promise((_, rej) => setTimeout(() => rej(new Error('hand-detect timeout')), 30000)),
      ]);
      if (r && r.type) {
        handAuto = r;
        drawPalmOverlay(palmGuide(r.lm), r.lm);
        const radio = document.querySelector(`input[name="palm-handType"][value="${r.type}"]`);
        if (radio) radio.checked = true;
        const sideRadio = document.querySelector(`input[name="palm-side"][value="${r.side}"]`);
        if (sideRadio) sideRadio.checked = true;
        // 자동 인식된 질문(좌우손·손모양)은 숨기고, 원하면 펼쳐서 고치게
        setAutoQuestionsHidden(true);
        const notes = [];
        if (r.border) notes.push('손 모양이 두 유형의 경계에 가깝습니다. 맞지 않으면 직접 고쳐 주세요.');
        if (!r.reliable) notes.push('손가락이 굽었거나 겹쳐 보여 손가락 길이 풀이는 뺍니다. 손을 활짝 펴고 다시 찍으면 포함됩니다.');
        setHandAutoStatus(`🤖 자동 인식: <b>${r.side === 'right' ? '오른손' : '왼손'}</b> · <b>${HAND_KO[r.type]}</b> <button type="button" class="edit-auto-btn" id="edit-auto-btn">직접 고치기</button><br>사진 위 점선은 손금이 <b>보통 지나는 자리</b>를 관절 위치로 어림한 안내선입니다. 실제 선을 인식한 것이 아니니, 그 근처에서 내 손금을 찾아 아래 문항을 골라 주세요.${notes.length ? '<br>⚠️ ' + notes.join('<br>⚠️ ') : ''}`);
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
      setAutoQuestionsHidden(false);
      setHandAutoStatus('손 자동 인식은 건너뛰고, 아래에서 직접 골라 주세요.');
    }
  })();
};

function readPerson(sfx) {
  const year = parseInt(byId('birth-year' + sfx).value, 10);
  const month = parseInt(byId('birth-month' + sfx).value, 10);
  const day = parseInt(byId('birth-day' + sfx).value, 10);
  if (!year || !month || !day) return null;
  if (year < 1900 || year > 2050) return { error: '1900~2050년 출생만 계산할 수 있습니다.' };
  if (new Date(year, month - 1, day) > new Date()) return { error: '미래 날짜는 입력할 수 없습니다. 생년월일을 확인해 주세요.' };
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

    // ── 관상 (얼굴 메시 인식은 사진을 올릴 때 이미 시작됨) ──
    let face = null;
    if (views.includes('gwansang')) {
      setBusy('관상 분석 중…');
      if (faceDetectPromise) await faceDetectPromise.catch(() => {});
      if (!faceDet || !faceApi) { clearBusy(); alert(byId('face-auto-status')?.textContent?.trim() || '사진에서 얼굴을 찾지 못했어요. 정면·밝은 곳에서 찍은 얼굴 사진으로 다시 시도해 주세요.'); return; }
      // 유년(나이별 부위)은 세는나이 기준 — 사주를 함께 볼 때만
      const age = saju ? new Date().getFullYear() - saju.solar.year + 1 : null;
      face = faceApi.readPhysiognomy(faceDet, { answers: readFaceAnswers(), age });
      if (!face.ok) { clearBusy(); alert(face.reason); return; }
      face.photo = snapshotWithOverlay('face', faceDet.lm, 0.3);
    }

    // ── 수상 (손 비율은 자동 측정, 손금은 설문) ──
    let palm = null;
    if (views.includes('susang')) {
      // 손 자동 인식이 진행 중이면 끝까지 대기 (내부에 타임아웃이 있어 유한함)
      if (handDetectPromise) {
        setBusy('손 사진 분석 중…');
        await handDetectPromise.catch(() => {});
      }
      palm = readPalmistry(readPalmAnswers(), handAuto);
      palm.photo = snapshotWithOverlay('palm', handAuto && handAuto.lm, 0.15);
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

// 결과를 PDF 한 파일로 저장
// 폰 폭(420px)으로 맞춘 화면을 A4 비율로 끊어 쪽마다 넣는다. 끊는 위치는 카드 경계 → 문단 경계 순으로 찾는다.
// iOS 홈화면 앱은 download 링크를 무시하므로 공유 시트(파일에 저장)로 넘긴다.
const CAPTURE_W = 420;               // 캡처 폭(CSS px) — 폰 화면 폭
const A4_RATIO = 297 / 210;
const PAGE_MAX_H = Math.floor(CAPTURE_W * A4_RATIO);
const CAPTURE_SCALE = 3;             // 1260px 폭 → A4에서 약 150dpi

function pageBreaks(root) {
  const top0 = root.getBoundingClientRect().top;
  const total = root.scrollHeight;
  const tops = sel => [...new Set([...root.querySelectorAll(sel)]
    .filter(el => el.offsetHeight > 0)
    .map(el => Math.round(el.getBoundingClientRect().top - top0 - 6)))]
    .filter(y => y > 0 && y < total).sort((x, y) => x - y);
  const major = tops('header, .card, .tab-panel > *, #couple-result > *');               // 카드 경계
  const minor = tops('.card p, .card li, .card tr, .card h3, .card h4, .card .jmeta, .card > div > div'); // 문단 경계
  const pages = [];
  let start = 0;
  while (start < total - 4) {
    const limit = start + PAGE_MAX_H;
    if (limit >= total) { pages.push([start, total]); break; }
    const pick = list => list.filter(c => c > start + PAGE_MAX_H * 0.45 && c <= limit).pop();
    const end = pick(major) || pick(minor) || limit;
    pages.push([start, end]);
    start = end;
  }
  return pages;
}

const noAnim = doc => {
  const st = doc.createElement('style');
  st.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  doc.head.appendChild(st);
};

// 페이지 이미지(JPEG dataURL) 목록
async function renderPages(root) {
  const r = root.getBoundingClientRect();
  const pages = pageBreaks(root);
  const chunkMaxH = Math.floor(15e6 / (r.width * CAPTURE_SCALE * CAPTURE_SCALE)); // 캔버스 한도 안에서 묶어 렌더
  const chunks = [];
  pages.forEach(p => {
    const c = chunks[chunks.length - 1];
    if (c && p[1] - c.s <= chunkMaxH) { c.e = p[1]; c.pages.push(p); }
    else chunks.push({ s: p[0], e: p[1], pages: [p] });
  });
  const out = [];
  for (const ch of chunks) {
    const big = await window.html2canvas(root, {
      backgroundColor: '#0b0c10', scale: CAPTURE_SCALE, useCORS: true, onclone: noAnim,
      x: 0, y: ch.s, width: r.width, height: ch.e - ch.s, // x·y는 대상 요소 기준 오프셋
    });
    for (const [s, e] of ch.pages) {
      const sy = Math.round((s - ch.s) * CAPTURE_SCALE);
      const h = Math.min(Math.round((e - s) * CAPTURE_SCALE), big.height - sy);
      const canvas = document.createElement('canvas');
      canvas.width = big.width; canvas.height = h;
      canvas.getContext('2d').drawImage(big, 0, sy, big.width, h, 0, 0, big.width, h);
      out.push({ data: canvas.toDataURL('image/jpeg', 0.88), w: canvas.width, h });
    }
    big.width = big.height = 0;
  }
  return out;
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('스크립트 로드 실패: ' + src));
    document.head.appendChild(s);
  });
}
async function ensureJsPDF() {
  if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  return window.jspdf.jsPDF;
}

async function buildPdf(imgs) {
  const JsPDF = await ensureJsPDF();
  const W = 210, H = 297;
  const pdf = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  imgs.forEach((im, i) => {
    if (i) pdf.addPage();
    pdf.setFillColor(11, 12, 16);
    pdf.rect(0, 0, W, H, 'F');
    const h = Math.min(H, W * im.h / im.w);
    pdf.addImage(im.data, 'JPEG', 0, 0, W, h, undefined, 'FAST');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`${i + 1} / ${imgs.length}`, W - 8, H - 6, { align: 'right' });
  });
  return pdf.output('blob');
}

function showPdfSheet(blob, filename, pageCount) {
  const url = URL.createObjectURL(blob);
  const file = new File([blob], filename, { type: 'application/pdf' });
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const kb = Math.round(blob.size / 1024);
  const sheet = document.createElement('div');
  sheet.className = 'img-sheet pdf-sheet';
  sheet.innerHTML = `
    <div class="img-sheet-bar">
      <span>PDF를 만들었어요</span>
      <button type="button" class="img-sheet-close" aria-label="닫기"><i class="fas fa-xmark"></i></button>
    </div>
    <div class="pdf-sheet-body">
      <i class="fas fa-file-pdf"></i>
      <div class="pdf-name">${filename}</div>
      <div class="pdf-meta">${pageCount}쪽 · ${kb >= 1024 ? (kb / 1024).toFixed(1) + 'MB' : kb + 'KB'}</div>
      <p class="pdf-hint">${canShare ? '‘저장 / 공유’를 누른 뒤 <b>파일에 저장</b>을 고르면 됩니다. 카카오톡·메일로 바로 보낼 수도 있어요.' : '‘다운로드’를 누르면 다운로드 폴더에 저장됩니다.'}</p>
    </div>
    <div class="img-sheet-btns">
      ${canShare ? '<button type="button" class="submit-btn img-sheet-share"><i class="fas fa-arrow-up-from-bracket"></i> 저장 / 공유</button>' : ''}
      <a class="submit-btn outline-btn img-sheet-dl" href="${url}" download="${filename}" target="_blank" rel="noopener"><i class="fas fa-${canShare ? 'eye' : 'download'}"></i> ${canShare ? '미리보기' : '다운로드'}</a>
    </div>`;
  const close = () => { sheet.remove(); document.body.classList.remove('no-scroll'); setTimeout(() => URL.revokeObjectURL(url), 60000); };
  sheet.querySelector('.img-sheet-close').addEventListener('click', close);
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  const shareBtn = sheet.querySelector('.img-sheet-share');
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    try { await navigator.share({ files: [file], title: filename }); }
    catch (e) { if (e && e.name !== 'AbortError') alert('공유 시트를 열지 못했습니다. 미리보기에서 공유 버튼으로 저장해 주세요.'); }
  });
  document.body.appendChild(sheet);
  document.body.classList.add('no-scroll');
}

async function saveAsPdf(btn, base, prepare) {
  if (!window.html2canvas) { alert('저장 모듈을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'); return; }
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF 만드는 중...';
  btn.disabled = true;
  const restore = prepare();
  const scrollY = window.scrollY;
  document.body.classList.add('capture-mode');
  void document.querySelector('.glass-container').offsetWidth; // 레이아웃 즉시 반영
  await new Promise(r => setTimeout(r, 30));
  let imgs = null;
  try {
    imgs = await renderPages(document.querySelector('.glass-container'));
  } catch (e) {
    console.error(e);
  } finally {
    document.body.classList.remove('capture-mode');
    restore();
    window.scrollTo(0, scrollY);
  }
  try {
    if (!imgs) throw new Error('캡처 실패');
    const blob = await buildPdf(imgs);
    showPdfSheet(blob, `${base}.pdf`, imgs.length);
  } catch (e) {
    console.error(e);
    alert('PDF 저장에 실패했습니다. 인터넷 연결을 확인해 주세요.');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

document.getElementById('save-btn').addEventListener('click', () => {
  saveAsPdf(document.getElementById('save-btn'), `사주명식_${today()}`, () => {
    // 모든 탭을 펼쳐서 캡처
    const panels = [...document.querySelectorAll('.tab-panel')];
    const hiddenState = panels.map(p => p.classList.contains('hidden'));
    const tabs = document.querySelector('.tabs');
    const btns = document.querySelector('.result-btns');
    panels.forEach(p => p.classList.remove('hidden'));
    tabs.style.display = 'none';
    btns.style.display = 'none';
    // 접어 둔 해설도 PDF에는 펼쳐서 싣는다
    const folds = [...document.querySelectorAll('#result-section details')];
    const foldState = folds.map(d => d.open);
    folds.forEach(d => { d.open = true; });
    return () => {
      folds.forEach((d, i) => { d.open = foldState[i]; });
      panels.forEach((p, i) => { if (hiddenState[i]) p.classList.add('hidden'); });
      tabs.style.display = '';
      btns.style.display = '';
    };
  });
});

// 궁합 결과 버튼
document.getElementById('couple-reset-btn').addEventListener('click', () => {
  document.getElementById('saju-form').classList.remove('hidden');
  document.getElementById('couple-result').classList.add('hidden');
  window.scrollTo(0, 0);
});

document.getElementById('couple-save-btn').addEventListener('click', () => {
  saveAsPdf(document.getElementById('couple-save-btn'), `궁합_${today()}`, () => {
    const btns = document.querySelector('#couple-result .result-btns');
    btns.style.display = 'none';
    return () => { btns.style.display = ''; };
  });
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
  // (이전 분석 내용이 남아 있으면 'PDF로 저장' 때 전체 펼침에 섞여 들어감)
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

// ── 관상·수상 탭 공통 조각 ──
// 사진과 안내선을 한 장으로 합쳐 결과 화면(과 PDF)에 싣는다. 브라우저 안에서만 만든다.
function snapshotWithOverlay(key, pts, margin = 0.3) {
  try {
    const img = byId(key + '-preview'), ov = byId(key + '-overlay');
    const W = img.naturalWidth, H = img.naturalHeight;
    if (!W) return null;
    // 인식된 점들의 둘레에 여백을 붙여 잘라 낸다(점이 없으면 사진 전체)
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    if (pts && pts.length) {
      const xs = pts.map(q => q.x * W), ys = pts.map(q => q.y * H);
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      x0 = Math.max(0, Math.min(...xs) - bw * margin); x1 = Math.min(W, Math.max(...xs) + bw * margin);
      y0 = Math.max(0, Math.min(...ys) - bh * margin); y1 = Math.min(H, Math.max(...ys) + bh * margin);
    }
    const cw = x1 - x0, ch = y1 - y0;
    const s = Math.min(1, 720 / Math.max(cw, ch));
    const cv = document.createElement('canvas');
    cv.width = Math.round(cw * s); cv.height = Math.round(ch * s);
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, x0, y0, cw, ch, 0, 0, cv.width, cv.height);
    if (!ov.classList.contains('hidden') && ov.width) ctx.drawImage(ov, x0, y0, cw, ch, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.85);
  } catch (e) { console.warn(e); return null; }
}
const gaugeHtml = it => (it.pos == null ? '' : `<div class="fgauge"><span>${it.loWord}</span><div class="ftrack"><i style="left:${(it.pos * 100).toFixed(1)}%"></i></div><span>${it.hiWord}</span></div>`);
const primerHtml = (title, list) => `<div class="card"><h2><i class="fas fa-book-open"></i> ${title}</h2>
  ${list.map(p => `<details class="primer"><summary>${p.title}</summary><p>${p.body}</p></details>`).join('')}</div>`;
const photoHtml = (src, cap) => (src ? `<figure class="read-photo"><img src="${src}" alt=""><figcaption>${cap}</figcaption></figure>` : '');

// ── 관상 탭 렌더 ──
function renderGwansangTab(face) {
  const sh = face.shape;
  const head = `<div class="card">
    <h2><i class="fas fa-eye"></i> 관상 종합</h2>
    ${photoHtml(face.photo, '노란 선은 윤곽, 파란 선은 눈썹·눈·코·입, 점선은 삼정 구분선(눈썹·코밑·턱끝)')}
    <div class="prose">${face.lines.map(l => `<p>${l}</p>`).join('')}</div>
    <div class="badges">
      <span class="badge good"><i class="fas fa-user-tag"></i> ${sh.name}</span>
      <span class="badge"><i class="fas fa-circle-half-stroke"></i> 오형 ${face.topType}</span>
    </div>
    ${face.highlights.length ? `<h3 class="sub">두드러진 특징</h3><ul class="hl-list">${face.highlights.map(h => `<li><b>${h.head}</b> <span>${h.group}</span></li>`).join('')}</ul>` : ''}
    ${face.warns.length ? `<div class="read-warn">${face.warns.map(w => `<p><i class="fas fa-triangle-exclamation"></i> ${w}</p>`).join('')}</div>` : ''}
  </div>`;

  const pctRows = Object.entries(sh.pct).map(([k, v]) => `<div class="element-bar"><span class="label">${k}형</span><div class="bar-fill"><div class="fill ${ELEM_EN[k]}" data-w="${v}%"></div></div><span class="count">${v}%</span></div>`).join('');
  const pf = face.profile;
  const shape = `<div class="card">
    <h2><i class="fas fa-shapes"></i> 얼굴형과 오형 <span class="h2-sub">五形</span></h2>
    <div class="prose">${sh.lines.map(l => `<p>${l}</p>`).join('')}</div>
    <h3 class="sub">윤곽 비율로 본 다섯 형의 가까운 정도</h3>
    <div class="elements-chart">${pctRows}</div>
    <p class="mini-note">얼굴 가로세로비, 하관 폭, 턱끝 폭, 턱 모서리 각으로 계산한 상대 점수입니다. 살집의 두께와 얼굴빛은 반영되지 않습니다.</p>
    <h3 class="sub">${face.topType}의 기질 <span class="h3-sub">통속 성격론</span></h3>
    <table class="kv-table">
      <tr><th>기질</th><td>${pf.character}</td></tr>
      <tr><th>강점</th><td>${pf.strength}</td></tr>
      <tr><th>주의</th><td>${pf.caution}</td></tr>
      <tr><th>맞는 일</th><td>${pf.aptitude}</td></tr>
      <tr><th>관계</th><td>${pf.relation}</td></tr>
    </table>
    <p class="mini-note">고전 상서는 오형을 성격으로 길게 풀지 않고 형이 순수한지만 봤습니다. 이 표는 오행에 인·예·신·의·지를 붙인 데서 나온 요즘의 통속 성격론입니다.</p>
  </div>`;

  const groups = face.groups.map(g => {
    const feats = [...g.feats, ...g.survey].map(f => `<div class="read-item">
        <div class="read-head"><b>${f.head}</b>${f.degree ? `<span class="deg">${f.degree}</span>` : ''}${f.survey ? '<span class="deg alt">직접 선택</span>' : ''}<span class="read-area">${f.label}</span></div>
        ${gaugeHtml(f)}
        <p>${f.text}</p>
      </div>`).join('');
    const normals = g.normals.length ? `<p class="read-normal"><b>평균 범위</b> ${g.normals.map(n => n.label).join(' · ')}</p>` : '';
    const held = g.held.length ? `<p class="read-normal"><b>판정 보류</b> ${g.held.join(' · ')} — 표정의 영향이 커서 뺐습니다.</p>` : '';
    return `<div class="card">
      <h2>${g.title} <span class="h2-sub">${g.hanja}</span>${g.yun ? `<span class="yun-tag">유년 ${g.yun}</span>` : ''}</h2>
      <p class="read-intro">${g.intro}</p>
      ${feats || '<p class="read-none">이 부위에서 평균을 눈에 띄게 벗어난 항목은 없습니다.</p>'}
      ${normals}${held}
    </div>`;
  }).join('');

  const domains = face.domains.length ? `<div class="card">
    <h2><i class="fas fa-layer-group"></i> 분야별로 모아 보기</h2>
    <p class="read-intro">위 풀이를 분야별로 다시 묶었습니다. 같은 분야에 서로 다른 방향의 풀이가 함께 있으면 어느 한쪽으로 합치지 않고 그대로 둡니다.</p>
    ${face.domains.map(d => `<h3 class="sub">${d.title}</h3><ul class="dom-list">${d.items.map(i => `<li><span>${i.src}</span>${i.text}</li>`).join('')}</ul>`).join('')}
  </div>` : '';

  const yun = face.yun ? `<div class="card">
    <h2><i class="fas fa-hourglass-half"></i> 지금 나이의 자리 <span class="h2-sub">流年</span></h2>
    <div class="prose"><p>세는나이 <b>${face.yun.age}세</b>에 옛 상서가 보는 자리는 <b>${face.yun.area}</b>입니다.${face.yun.group ? ` 위의 ‘${face.yun.group}’ 묶음이 지금 시기에 해당합니다.` : ' 이 자리는 사진으로 잴 수 없어 풀이가 없습니다.'}</p></div>
    <details class="primer"><summary>나이별 자리 전체 보기</summary>
      <table class="kv-table">${YUNYEON.map(r => `<tr${face.yun.age >= r[0] && face.yun.age <= r[1] ? ' class="now"' : ''}><th>${r[0] === r[1] ? r[0] : r[0] + '~' + r[1]}세</th><td>${r[2]}</td></tr>`).join('')}</table>
    </details>
    <p class="mini-note">《신상전편》 유년운기부위가의 세는나이 기준입니다. 사주에 입력한 생년으로 계산했습니다.</p>
  </div>` : '';

  const method = `<p class="mini-note">측정 방법: 얼굴 메시 478점의 3D 좌표로 고개 방향을 정면으로 돌려놓은 뒤 부위 간 비율을 잽니다. 기준값은 한국인 정면 사진 60장을 같은 방식으로 재서 얻은 평균과 편차이고, 표본이 작아 정밀한 통계는 아닙니다. 이마 머리선·귀·살집·얼굴빛·눈빛은 잴 수 없습니다.</p>`;
  const disc = `<p class="disclaimer">관상은 검증된 학문이 아닙니다. 현대 연구가 확인한 것은 얼굴이 첫인상을 만든다는 데까지이고, ‘잘 맞는다’는 느낌은 <b>바넘효과·확증편향</b>에서 옵니다. 자기성찰용 참고로만 보고, 외모로 자신이나 타인을 단정하지 마세요.</p>`;
  return head + shape + groups + domains + yun + primerHtml('관상을 읽는 틀', FACE_PRIMER) + method + disc;
}

// ── 수상 탭 렌더 ──
function renderSusangTab(palm) {
  const head = `<div class="card">
    <h2><i class="fas fa-hand"></i> 수상 종합</h2>
    ${photoHtml(palm.photo, '점선과 번호는 손금이 보통 지나는 자리를 어림한 안내선입니다(실제 선을 인식한 것이 아닙니다)')}
    <div class="prose">${palm.lines.map(l => `<p>${l}</p>`).join('')}</div>
    <div class="badges">
      ${palm.side ? `<span class="badge"><i class="fas fa-hand"></i> ${palm.side}</span>` : ''}
      ${palm.topType ? `<span class="badge good"><i class="fas fa-hand-sparkles"></i> ${palm.topType}</span>` : ''}
      ${palm.element ? `<span class="badge"><i class="fas fa-circle-half-stroke"></i> 오행 ${palm.element}</span>` : ''}
    </div>
  </div>`;
  const groups = (palm.groups || []).map(g => `<div class="card">
      <h2>${g.n ? `<span class="q-num">${CIRCLED[g.n]}</span> ` : ''}${g.title} <span class="h2-sub">${g.hanja}</span></h2>
      <p class="read-intro">${g.intro}</p>
      ${g.items.map(it => `<div class="read-item">
        <div class="read-head"><b>${it.cls}</b>${it.auto ? '<span class="deg alt">사진 측정</span>' : ''}<span class="read-area">${it.area}</span></div>
        ${gaugeHtml(it)}
        <p>${it.text}</p>
        ${it.note ? `<p class="read-note">${it.note}</p>` : ''}
      </div>`).join('')}
    </div>`).join('');
  const disc = `<p class="disclaimer">수상은 검증된 학문이 아닙니다. 손바닥의 주요 주름은 태아기에 생기고 평생 거의 변하지 않습니다. ‘잘 맞는다’는 느낌은 <b>바넘효과·확증편향</b>에서 오니 자기성찰용 참고로만 보세요.</p>`;
  return head + groups + primerHtml('손금을 읽는 틀', PALM_PRIMER) + disc;
}

// ── 통합 교차통변 탭 렌더 ──
function renderIntegrationTab(intg) {
  const chips = Object.entries(intg.els).map(([k, v]) =>
    `<span class="badge"><i class="fas fa-circle-half-stroke"></i> ${k} ${v}</span>`).join('');
  const title = `${(intg.srcNames || []).join('·')} 나란히 보기`;
  const srcRows = (intg.sources || []).map(s => `<tr><th>${s.name}</th><td>${s.conclusion}</td><td>${s.basis}</td><td class="dim-text">${s.limits}</td></tr>`).join('');
  const srcTable = srcRows ? `<div class="table-wrap"><table class="cmp-table"><thead><tr><th>체계</th><th>결론</th><th>근거</th><th>한계</th></tr></thead><tbody>${srcRows}</tbody></table></div>` : '';
  const vCls = { '일치': 'good', '상충': 'warn', '판단 불가': '' };
  const cmpRows = (intg.compare || []).map(c => `<tr><td>${c.topic}</td><td>${c.a || '—'}</td><td>${c.b || '—'}</td><td><span class="badge ${vCls[c.verdict] || ''}">${c.verdict}</span></td></tr>`).join('');
  const cmpTable = cmpRows ? `<h3>비교</h3><div class="table-wrap"><table class="cmp-table"><thead><tr><th>항목</th><th>앞</th><th>뒤</th><th>판정</th></tr></thead><tbody>${cmpRows}</tbody></table></div>` : '';
  const head = `<div class="card integration-card">
    <h2><i class="fas fa-circle-nodes"></i> ${title}</h2>
    <p class="mini-note">각 체계의 결론과 근거를 따로 보여 줍니다. 하나의 오행으로 합치지 않습니다.</p>
    <div class="badges">${chips}</div>
    ${srcTable}
    ${cmpTable}
    <div class="prose">${intg.lines.map(l => `<p>${l}</p>`).join('')}</div>
  </div>`;
  const secs = (intg.sections || []).map(s => `<div class="card">
    <h2><i class="fas ${s.icon}"></i> ${s.title}</h2>
    <div class="prose"><p>${s.body}</p></div>
  </div>`).join('');
  const disc = `<p class="disclaimer">사주·관상·수상은 통계적으로 검증된 학문이 아닙니다. 관상·수상의 오행은 이 앱의 대응표에서 나온 값이라, 사주와 같아도 독립된 교차검증이 아닙니다.</p>`;
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
    ${items ? `<div class="rel-list">${items}</div>` : ''}
    <p class="mini-note">※ 합·충 표시는 글자 조합 기준의 참고입니다. 실제 합화(合化)의 성립은 글자 간 거리·세력·충파 여부까지 따져야 하며(午未합의 오행은 화·토로 견해가 갈림), 여기서는 반영하지 않습니다.</p></div>`;
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
  if (c.hourSensitivity) {
    const label = { strength: '신강약', yongsin: '용신', gyeokguk: '격국' };
    const rows = Object.entries(c.hourSensitivity).map(([k, v]) => {
      const dist = v.values.map(x => `${x.value} ${x.count}`).join(' · ');
      return `<li><b>${label[k]}</b>: ${v.stable ? `<span class="badge good">유지</span> ${v.base}` : `<span class="badge warn">시각에 따라 바뀜</span> 3주 기준 ${v.base} / 12개 시주 대입 시 ${dist}`}</li>`;
    }).join('');
    note += `<div class="mini-note"><b>시각 미상 검사</b> — 12개 시주를 모두 대입해 결론이 유지되는지 봤습니다.<ul class="luck-lines">${rows}</ul>'시각에 따라 바뀜'인 결론은 단정하지 마세요.</div>`;
  }
  if (c.termWarning != null) note += `<p class="mini-note warn-note">⚠️ 출생 시각이 절기 경계에서 약 <b>${c.termWarning}분</b> 거리입니다. 절입시각 계산은 한국천문연구원 자료와 1분 이내로 맞췄지만, 출생 시각 기록의 오차만으로도 년주·월주가 달라질 수 있습니다.</p>`;
  if (c.termDayWarning) note += `<p class="mini-note warn-note">⚠️ 이날은 <b>절기(입춘 등) 당일</b>입니다. 출생 시간을 모르면 년주·월주 자체가 달라질 수 있어, 여기서는 정오 기준으로 표시했습니다. 출생 시각을 확인해 다시 보길 권합니다.</p>`;
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
  const scoreNote = `<p class="mini-note">각 항목은 <b>결론 → 근거 → 반대 근거 → 성립 조건 → 유보</b> 순으로 적었습니다. <span class="jstat jstat-ok">성립</span> 근거가 갖춰짐 · <span class="jstat jstat-cond">조건부</span> 반대 근거가 있어 조건이 붙음 · <span class="jstat jstat-hold">보류</span> 판단하지 않음 · <span class="jstat jstat-no">불성립</span> 글자는 있으나 작용하지 않음. 점수는 성립 항목만 전액, 조건부는 절반 반영한 <b>이 앱의 상대 지표</b>입니다.</p>`;
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
      <div class="tl-age">${d.age}세<br><small>${d.startYM}~</small></div>
      <div class="tl-gz"><span style="color:${colorOf(d.stem)}">${d.stem}</span><span style="color:${colorOf(d.branch)}">${d.branch}</span></div>
      <div class="tl-god">${d.stemGod}<br>${d.branchGod}</div>
      <div class="tl-mark">${d.fortune.mark}</div>
    </div>`;
  }).join('');
  const se = c.daeun.startExact;
  const startTxt = se ? ` · 첫 대운 교체: 생후 ${se.years}년 ${se.months}개월(${se.ym}), 이후 10년마다. 나이는 교체일 기준 만 나이` : '';
  return `<div class="timeline">${cells}</div>
    <p class="legend">◎대길 ○길 –평 △주의 ✕흉 · <span class="now-dot"></span>현재 대운${startTxt}</p>`;
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
