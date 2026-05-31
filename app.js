import { buildChart } from './saju_engine.mjs';
import * as T from './saju_text.mjs';
import { dayMasterDescriptions } from './saju_descriptions.mjs';

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
document.getElementById('saju-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const p1 = readPerson('');
  if (!p1) { alert('생년월일을 입력해 주세요.'); return; }
  if (p1.error) { alert(p1.error); return; }

  try {
    if (mode === 'couple') {
      const p2 = readPerson('2');
      if (!p2) { alert('상대방 생년월일을 입력해 주세요.'); return; }
      if (p2.error) { alert('상대방: ' + p2.error); return; }
      const A = buildChart(p1), B = buildChart(p2);
      A.input = p1; B.input = p2;
      renderCouple(A, B);
    } else {
      const c = buildChart(p1);
      c.input = p1;
      renderAll(c);
    }
  } catch (err) {
    console.error(err);
    alert('사주 계산에 실패했습니다. 입력값(특히 음력 날짜·윤달)을 확인해 주세요.');
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

// 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('hidden', p.id !== 'tab-' + btn.dataset.tab));
  }));

// ───────── 렌더 ─────────
function renderAll(c) {
  document.getElementById('saju-form').classList.add('hidden');
  document.getElementById('result-section').classList.remove('hidden');

  renderHead(c);
  renderToday(c);
  document.getElementById('tab-chart').innerHTML = renderChartTab(c);
  document.getElementById('tab-luck').innerHTML = renderLuckTab(c);
  document.getElementById('tab-time').innerHTML = renderTimeTab(c);

  // 첫 탭 활성화
  document.querySelector('.tab-btn[data-tab="chart"]').click();
  // 게이지 애니메이션
  setTimeout(() => document.querySelectorAll('.gauge-fill,[data-w]').forEach(el => { el.style.width = el.dataset.w; }), 80);
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  return mingsikTable(c) + relationsCard(c) + ohaengCard(c) + summaryCard(c) + dayMasterCard(c) + sinsalCard(c);
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
  const note = c.input.hourUnknown ? `<p class="mini-note">※ 태어난 시간을 몰라 시주(時柱)는 참고용입니다. 시주 관련 해석(자식·말년·잠재력)은 정확도가 낮습니다.</p>` : '';
  return `<div class="card"><h2><i class="fas fa-table-cells"></i> 사주 명식 (四柱八字)</h2>
    <div class="pillars-grid">${cols}</div>
    <p class="mini-note">칸 안 위→아래 순서: 십성 · 천간 · 지지 · 십성 · 십이운성 · 지장간</p>${note}</div>`;
}

function ohaengCard(c) {
  const bars = ['목', '화', '토', '금', '수'].map(el => {
    const n = c.elementCount[el];
    return `<div class="element-bar">
      <span class="label">${el}(${({ 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' })[el]})</span>
      <div class="bar-fill"><div class="fill ${ELEM_EN[el]}" data-w="${(n / 8) * 100}%"></div></div>
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
  return items.map(([title, icon, r]) => `
    <div class="card luck-card">
      <div class="luck-head">
        <h2><i class="fas ${icon}"></i> ${title}</h2>
        <span class="grade ${r.grade.cls}">${r.grade.label} · ${r.score}점</span>
      </div>
      <div class="gauge"><div class="gauge-fill ${r.grade.cls}" data-w="${r.score}%"></div></div>
      <ul class="luck-lines">${r.lines.map(l => `<li>${l}</li>`).join('')}</ul>
    </div>`).join('');
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
    const cur = s.year === c.today.getFullYear();
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
