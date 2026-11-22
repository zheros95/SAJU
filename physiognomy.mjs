// physiognomy.mjs — 관상 규칙엔진 (MediaPipe 얼굴 메시 478점 기반)
// AI 호출 없음. 모델을 한 번 내려받은 뒤 브라우저 안에서만 추론한다(사진은 서버로 가지 않는다).
// ⚠️ 관상은 과학적으로 검증된 바 없다. 현대 연구가 지지하는 것은 "얼굴이 첫인상을 만든다"까지이고,
//    그 인상이 실제 성격·능력을 맞힌다는 근거는 약하다. 결과는 자기성찰용 참고일 뿐 타인을 판단하는 도구가 아니다.
//
// 측정 범위: 얼굴 윤곽·눈썹·눈·코·입·턱의 '비율'과 좌우 균형. 고개 방향은 메시의 3D 좌표로 정면화해 보정한다.
// 못 재는 것: 이마 머리선, 귀, 살집의 두께, 피부색(기색), 눈빛, 점·주름 → 설문으로 받거나 풀이에서 뺀다.

import { measureFace, scoreOf, NORMS, PITCH_ZERO, OVAL } from './face_measure.mjs?v=1';
import { loadFaceModel, detectFaceMesh } from './vision.mjs?v=1';
import { SHAPES, GROUPS, FEATURES, FACE_QUESTIONS, SURVEY_READ, YUNYEON, DOMAIN_TITLE } from './physiognomy_text.mjs?v=1';

export { FACE_QUESTIONS };

const ELEM_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // 상생
const KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };    // 상극

export async function loadFaceModels() { await loadFaceModel(); }

// 이미지 엘리먼트 → 얼굴 메시 + 표정 점수 (얼굴을 못 찾으면 null)
export async function detectFace(imgEl) {
  const res = await detectFaceMesh(imgEl);
  if (!res.faceLandmarks || !res.faceLandmarks.length) return null;
  const bs = {};
  ((res.faceBlendshapes && res.faceBlendshapes[0] && res.faceBlendshapes[0].categories) || []).forEach(c => { bs[c.categoryName] = c.score; });
  return {
    lm: res.faceLandmarks[0].map(q => ({ x: q.x, y: q.y, z: q.z })),
    W: imgEl.naturalWidth || imgEl.width || 1,
    H: imgEl.naturalHeight || imgEl.height || 1,
    expr: {
      smile: ((bs.mouthSmileLeft || 0) + (bs.mouthSmileRight || 0)) / 2,
      jawOpen: bs.jawOpen || 0,
      blink: ((bs.eyeBlinkLeft || 0) + (bs.eyeBlinkRight || 0)) / 2,
    },
  };
}

// 표정에 따라 믿기 어려워지는 항목
const SMILE_KEYS = ['mouthW', 'mouthTilt', 'lipThick', 'lipBalance', 'noseW', 'eyeOpen', 'philtrum'];
const OPEN_KEYS = ['midLow', 'chinLen', 'lipThick', 'lipBalance', 'philtrum'];

// 사진 품질 판정 — ok=false면 다시 찍어야 함. warns는 결과에 붙이는 주의, hold는 판정을 보류할 항목
export function faceQuality(m, expr = {}) {
  const yaw = Math.abs(m.yawDeg), pitch = m.pitchDeg - PITCH_ZERO;
  if (yaw > 18) return { ok: false, reason: '얼굴이 옆으로 돌아가 있어요. 카메라를 정면으로 보고 다시 찍어 주세요.' };
  if (Math.abs(pitch) > 20) return { ok: false, reason: `고개를 ${pitch > 0 ? '숙였거나 카메라가 위에' : '들었거나 카메라가 아래에'} 있는 사진 같아요. 카메라를 눈높이에 두고 다시 찍어 주세요.` };
  const warns = [], hold = new Set();
  if (yaw > 9) warns.push('얼굴이 살짝 옆으로 돌아가 있습니다. 3D 좌표로 보정했지만 좌우 폭과 균형 항목은 오차가 클 수 있습니다.');
  if (Math.abs(pitch) > 11) warns.push(`${pitch > 0 ? '고개를 조금 숙인' : '고개를 조금 든'} 사진입니다. 보정했지만 세로 비율 항목은 오차가 클 수 있습니다.`);
  if ((expr.smile || 0) > 0.35) { warns.push('웃는 표정으로 인식됐습니다. 입·입술·콧방울·눈 모양은 표정에 따라 달라져 판정을 보류했습니다. 무표정 사진으로 다시 보면 채워집니다.'); SMILE_KEYS.forEach(k => hold.add(k)); }
  if ((expr.jawOpen || 0) > 0.12 || m.mouthOpen > 0.12) { warns.push('입이 벌어진 사진입니다. 턱 길이와 입술 항목은 판정을 보류했습니다.'); OPEN_KEYS.forEach(k => hold.add(k)); }
  if ((expr.blink || 0) > 0.5) { warns.push('눈을 감았거나 가늘게 뜬 사진입니다. 눈 모양 항목은 판정을 보류했습니다.'); hold.add('eyeOpen'); }
  return { ok: true, warns, hold };
}

// 얼굴형 → 오형 점수. z는 평균 대비 표준편차 배수
function shapeScores(m) {
  const z = k => scoreOf(k, m[k]).z;
  const a = z('faceAspect'), j = z('jawTaper'), c = z('chinTaper'), g = z('jawAngle');
  const thick = (z('noseW') + z('lipThick')) / 2;
  return {
    목: -a,                                     // 길다
    금: -0.7 * g + 0.5 * j + 0.4 * c,           // 턱 모서리가 각지고 하관이 넓다
    수: 0.6 * a + 0.8 * g,                      // 넓고 턱선이 둥글다
    토: 0.5 * a + 0.5 * j + 0.5 * c + 0.2 * thick, // 넓고 하관·턱끝까지 두툼하다
    화: -0.8 * c - 0.6 * j,                     // 하관이 좁고 턱끝이 뾰족하다
  };
}

function pickShape(m, answers) {
  const s = shapeScores(m);
  const order = Object.keys(s).sort((x, y) => s[y] - s[x]);
  const sum = order.reduce((t, k) => t + Math.exp(s[k]), 0);
  const pct = {};
  order.forEach(k => { pct[k] = Math.round(Math.exp(s[k]) / sum * 100); });
  const auto = order[0];
  const chosen = answers && answers.shape && answers.shape !== 'auto' && SHAPES[answers.shape] ? answers.shape : null;
  const main = chosen || auto;
  const second = order.find(k => k !== main);
  return {
    main, auto, second, pct, byUser: !!chosen,
    weak: s[auto] < 0.6,                        // 어느 형도 뚜렷하지 않음
    mixed: s[second] > 0.4 && s[main] - s[second] < 0.8,
  };
}

// 주형과 섞인 형의 관계 — 옛 상서는 섞인 기운이 주형을 살리면 좋게, 치면 꺼렸다(단 '조금'과 '많이'에 따라 뒤집힌다)
const BATCHIM = { 목: true, 화: false, 토: false, 금: true, 수: false };
const el = (e, withJosa) => `${e}(${ELEM_HANJA[e]})${withJosa ? (BATCHIM[e] ? withJosa[0] : withJosa[1]) : ''}`;
function mixText(main, second) {
  let rel;
  if (SHENG[second] === main) rel = `${el(second, '이가')} ${el(main, '을를')} 살리는 상생 관계라 옛 상서는 좋은 섞임으로 봅니다.`;
  else if (SHENG[main] === second) rel = `${el(main, '이가')} ${el(second, '을를')} 낳는 관계라 기운이 밖으로 흘러 나간다고 봅니다.`;
  else if (KE[second] === main) rel = `${el(second, '이가')} ${el(main, '을를')} 치는 상극 관계라 옛 상서는 꺼리는 섞임으로 봅니다.`;
  else rel = `${el(main, '이가')} ${el(second, '을를')} 누르는 관계라 주형이 이기는 섞임으로 봅니다.`;
  return `${SHAPES[second].name}의 기운이 조금 섞여 있습니다. ${rel} 다만 상서 스스로 “조금 섞였는지 많이 섞였는지에 따라 길흉이 뒤집힌다”고 적어, 단정할 일은 아닙니다.`;
}

const LEVEL_WORD = { '-2': '뚜렷이', '-1': '약간', 1: '약간', 2: '뚜렷이' };

// 측정값(+설문) → 관상 풀이. age는 세는나이(없으면 유년 안내 생략)
export function interpretFace(m, { expr = {}, answers = {}, age = null } = {}) {
  const q = faceQuality(m, expr);
  if (!q.ok) return { ok: false, reason: q.reason, measures: m };
  const ans = answers || {};

  // ── 얼굴형·오형 ──
  const sh = pickShape(m, ans);
  const S = SHAPES[sh.main];
  const even = sh.weak && !sh.byUser; // 어느 형으로도 뚜렷이 기울지 않음(흔히 말하는 계란형)
  const shapeName = even ? '고른 형(계란형)' : S.name;
  let shapeLines;
  if (even) shapeLines = [
    `윤곽의 비율이 어느 한 형으로 뚜렷이 기울지 않는 <b>고른 형</b>입니다. 흔히 계란형이라 부르는 얼굴로, 고전의 오형에는 직접 대응하는 이름이 없습니다. 굳이 가르면 <b>${sh.main}형</b>(${S.name})에 가장 가깝습니다.`,
    '오형론은 형이 한쪽으로 순수할수록 그 기운이 뚜렷하다고 보기 때문에, 고른 형은 오행의 특색이 약한 대신 치우침도 없는 얼굴로 읽습니다. 맞지 않다고 느끼면 사진 아래 설문에서 얼굴형을 직접 고를 수 있습니다.',
  ];
  else {
    shapeLines = [S.text, S.pure];
    if (sh.byUser && sh.auto !== sh.main) shapeLines.push(`직접 고르신 얼굴형을 따랐습니다. 사진으로 추정한 값은 ${SHAPES[sh.auto].name}이었습니다.`);
    if (sh.mixed && !sh.byUser) shapeLines.push(mixText(sh.main, sh.second));
  }

  // ── 부위별 ──
  const groups = GROUPS.map(g => ({ ...g, feats: [], normals: [], held: [], survey: [] }));
  const byId = Object.fromEntries(groups.map(g => [g.id, g]));
  const notable = [];
  FEATURES.forEach(f => {
    const g = byId[f.group];
    const sc = scoreOf(f.key, m[f.key]);
    if (q.hold.has(f.key)) { g.held.push(f.label); return; }
    if (sc.level === 0) { g.normals.push({ label: f.label, text: f.mid, pos: sc.pos }); return; }
    const r = sc.level < 0 ? f.lo : f.hi;
    const feat = { key: f.key, label: f.label, level: sc.level, z: sc.z, pos: sc.pos, loWord: f.loWord, hiWord: f.hiWord,
      head: r.head, degree: LEVEL_WORD[sc.level], text: r.text, dom: r.dom, brief: r.brief, group: g.title };
    g.feats.push(feat);
    notable.push(feat);
  });

  // 좌우 균형
  const bal = byId.balance;
  if (m.symDev <= 0.011) bal.feats.push({ key: 'symDev', label: '좌우 균형', level: 1, head: '고른 좌우', degree: '', group: bal.title,
    text: '얼굴 좌우가 고르게 맞습니다. 옛 상서의 말로는 바르고(正) 고른(稱) 상입니다. 다만 현대 연구에서 얼굴 대칭과 건강의 관련은 확인되지 않았습니다.' });
  else if (m.symDev >= 0.02) bal.feats.push({ key: 'symDev', label: '좌우 균형', level: -1, head: '좌우가 조금 다름', degree: '', group: bal.title,
    text: '좌우가 조금 다르게 재졌습니다. 사람 얼굴은 누구나 어느 정도 비대칭이고 촬영 각도와 표정의 영향이 큽니다. 옛 상서는 치우침(偏)을 꺼렸지만, 15세 4,700여 명을 3D로 잰 영국 추적 연구에서 얼굴 비대칭은 건강 지표와 관련이 없었습니다.' });
  else bal.normals.push({ label: '좌우 균형', text: '좌우의 어긋남은 보통 범위입니다.' });

  // ── 설문(사진으로 못 재는 부위) ──
  const surveyUsed = [];
  Object.keys(SURVEY_READ).forEach(id => {
    const v = ans[id];
    const def = SURVEY_READ[id];
    if (!v || v === 'unknown' || !def[v]) return;
    const r = def[v];
    const item = { key: id, label: def.area, head: r.head, text: r.text, dom: r.dom, brief: r.brief, group: byId[def.group].title, survey: true };
    byId[def.group].survey.push(item);
    surveyUsed.push(item);
  });

  // ── 분야별 모아 보기 ──
  const domains = Object.keys(DOMAIN_TITLE).map(d => ({
    title: DOMAIN_TITLE[d],
    items: [...notable, ...surveyUsed].filter(x => x.dom === d && x.brief).map(x => ({ src: x.label, text: x.brief })),
  })).filter(d => d.items.length);

  // ── 두드러진 특징 ──
  const highlights = [...notable].sort((x, y) => Math.abs(y.z) - Math.abs(x.z)).slice(0, 4)
    .map(x => ({ label: x.label, head: x.head, group: x.group }));

  // ── 유년(지금 나이의 부위) ──
  let yun = null;
  if (age && age >= 1) {
    const a = Math.min(age, 99);
    const row = YUNYEON.find(r => a >= r[0] && a <= r[1]);
    if (row) yun = { age, area: row[2], group: row[3] ? byId[row[3]].title : null };
  }

  const measured = notable.length + groups.reduce((n, g) => n + g.normals.length, 0);
  const lines = [
    even
      ? `얼굴형은 어느 한쪽으로 기울지 않는 <b>고른 형(계란형)</b>이고, 오형으로는 굳이 가르면 <b>${sh.main}형(${ELEM_HANJA[sh.main]}形)</b>에 가장 가깝습니다.`
      : `얼굴형은 <b>${S.name}</b>, 오형으로는 <b>${sh.main}형(${ELEM_HANJA[sh.main]}形)</b>에 가깝습니다. ${sh.byUser ? '직접 고르신 값입니다.' : '사진의 윤곽 비율로 추정한 값입니다.'}`,
    notable.length
      ? `${measured}개 항목을 쟀고, 평균에서 눈에 띄게 벗어난 것이 <b>${notable.length}개</b>입니다. 관상은 평균적인 부위보다 두드러진 부위를 중심으로 읽기 때문에 아래 풀이도 그 순서로 적었습니다.`
      : `${measured}개 항목을 쟀고, 모두 평균 범위 안에 있습니다. 옛 상서의 말로는 어느 한 곳이 튀지 않는 고른 상입니다.`,
    '풀이의 “옛 상서”는 주로 명대의 《신상전편》(마의·진희이 계열 글 수록)이고, 고전에 근거가 없는 풀이는 “통속 해석”이라고 따로 밝혔습니다.',
  ];

  // 통합 화면·이전 형식과의 호환용 평면 목록
  const items = [{ area: '얼굴형', cls: `${shapeName} · ${sh.main}형`, text: shapeLines[0] }];
  groups.forEach(g => [...g.feats, ...g.survey].forEach(f => items.push({ area: f.label, cls: f.head, text: f.text })));

  return {
    ok: true,
    warns: q.warns,
    pose: { yaw: m.yawDeg, pitch: m.pitchDeg - PITCH_ZERO, roll: m.rollDeg },
    shape: { key: sh.main, name: shapeName, even, word: S.word, element: sh.main, pct: sh.pct, auto: sh.auto, byUser: sh.byUser, lines: shapeLines },
    groups: groups.filter(g => g.feats.length || g.normals.length || g.survey.length || g.held.length),
    highlights, domains, yun, lines, items,
    topType: `${sh.main}형`,
    element: sh.main,
    profile: S.profile,
    measures: m,
    sections: items.map(it => ({ title: it.area, head: it.cls, body: it.text })),
  };
}

// 인식 결과 → 관상 풀이
export function readPhysiognomy(det, opts = {}) {
  return interpretFace(measureFace(det.lm, det.W, det.H), { ...opts, expr: det.expr });
}

// 사진 위에 그릴 안내선(정규화 좌표) — 인식이 제대로 됐는지 눈으로 확인하는 용도
export function faceGuide(det) {
  const P = i => [det.lm[i].x, det.lm[i].y];
  const line = idx => idx.map(P);
  return {
    closed: [line(OVAL)],
    open: [
      line([70, 63, 105, 66, 107]), line([300, 293, 334, 296, 336]),                 // 눈썹
      line([33, 160, 159, 158, 133, 153, 145, 144, 33]), line([362, 385, 386, 387, 263, 373, 374, 380, 362]), // 눈
      line([168, 6, 197, 195, 5, 4, 1, 2]), line([129, 98, 2, 327, 358]),            // 콧대·콧방울
      line([61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91, 61]),                // 입술
    ],
    // 삼정 가로선: 눈썹선 · 코밑 · 턱끝
    levels: [[P(105), P(334)], [P(98), P(327)], [P(148), P(377)]].map(([a, b]) => (a[1] + b[1]) / 2),
  };
}

// 사진 추정 얼굴형(설문 기본값 안내용)
export function autoShape(det) {
  const sh = pickShape(measureFace(det.lm, det.W, det.H), null);
  return { key: sh.auto, name: SHAPES[sh.auto].name, weak: sh.weak };
}

export { NORMS };
