// palmistry.mjs — 수상 규칙엔진
// 손 모양·손가락 길이는 사진에서 자동으로 재고(MediaPipe 손 관절 21점), 손금 선은 사용자가 사진을 보며 고르는 설문으로 받는다.
// AI 호출 없음. 손금 선 자체의 자동 인식은 불안정해서 하지 않는다.
// ⚠️ 수상은 과학적으로 검증된 바 없다. 손바닥의 주요 주름은 임신 7~14주 무렵 태아기에 생기며,
//    '운이 바뀌면 선이 바뀐다'·'노력하면 선이 굵어진다'는 주장은 추적 근거가 없어 이 앱은 쓰지 않는다.

import { loadHandModel as loadHand, detectHandJoints } from './vision.mjs?v=1';
import { PALM_QUESTIONS, HAND, PALM_GROUPS, RULES, FINGER_READ } from './palmistry_text.mjs?v=1';

export { PALM_QUESTIONS };

// ───────── 손 비율 기준값 ─────────
// 공개 손 사진 중 손가락을 편 51장을 같은 방식으로 재서 얻은 [중앙값, 표준편차(사분위 기반)].
// 손을 카메라와 평행하게 두지 않으면 값이 흔들리므로 경계 근처는 '중간형'으로 알린다.
export const HAND_NORMS = {
  squareness: [0.69, 0.06],   // 손바닥 너비/길이 (↑네모 ↓길쭉)
  fingerRatio: [0.955, 0.08], // 중지 길이/손바닥 길이 (↑긴 손가락)
  idxRing: [0.96, 0.045],     // 검지/약지
  pinky: [-0.09, 0.05],       // 새끼손가락 끝이 약지 손톱 마디 금에서 얼마나 위·아래인지(손바닥 길이 대비)
  thumb: [0.68, 0.055],       // 엄지(두 마디)/검지
};
const zOf = (k, v) => (v - HAND_NORMS[k][0]) / HAND_NORMS[k][1];

export async function loadHandModel() { await loadHand(); }

// 손바닥 네모도 + 손가락 비율 → 4원소 손유형
export function classifyHand(squareness, fingerRatio) {
  const zs = zOf('squareness', squareness), zf = zOf('fingerRatio', fingerRatio);
  const square = zs > 0, longFinger = zf > 0;
  const type = square ? (longFinger ? 'air' : 'earth') : (longFinger ? 'water' : 'fire');
  return {
    type, name: HAND[type].name,
    squareness: +squareness.toFixed(3), fingerRatio: +fingerRatio.toFixed(3),
    border: Math.min(Math.abs(zs), Math.abs(zf)) < 0.4, // 두 축 중 하나라도 경계 근처
  };
}

// 관절점(픽셀 좌표 배열 [[x,y],…]) → 손 비율
export function measureHand(pt) {
  const d = (a, b) => Math.hypot(pt[a][0] - pt[b][0], pt[a][1] - pt[b][1]);
  const len = a => d(a, a + 1) + d(a + 1, a + 2) + d(a + 2, a + 3); // 손가락: 뿌리 관절 → 끝
  const palmL = d(0, 9) || 1;
  const ax = [(pt[9][0] - pt[0][0]) / palmL, (pt[9][1] - pt[0][1]) / palmL];   // 손목 → 중지 뿌리 방향
  const along = i => (pt[i][0] - pt[0][0]) * ax[0] + (pt[i][1] - pt[0][1]) * ax[1];
  const straight = Math.min(...[5, 9, 13, 17].map(a => d(a, a + 3) / (len(a) || 1)));
  return {
    squareness: d(5, 17) / palmL,
    fingerRatio: len(9) / palmL,
    idxRing: len(5) / (len(13) || 1),
    pinky: ((along(17) + len(17)) - (along(13) + d(13, 14) + d(14, 15))) / palmL,
    thumb: (d(2, 3) + d(3, 4)) / (len(5) || 1),
    straight,                                                    // 손가락이 곧게 펴진 정도(1=완전히 폄)
    open: [8, 12, 16, 20].every(t => d(0, t) > d(0, t - 2)),      // 손가락이 손목 바깥으로 펴져 있는가
  };
}

// 손 사진 → 손유형·좌우·손가락 비율·관절점 (손을 못 찾으면 null)
// 좌우 판별: 손바닥이 보이는 사진 전제. 손목→검지 뿌리, 손목→소지 뿌리 벡터의 외적 부호는
// 사진이 기울거나 뒤집혀도 변하지 않는다 — 오른손바닥 양수, 왼손바닥 음수.
export async function detectHandType(imgEl) {
  const res = await detectHandJoints(imgEl);
  if (!res.landmarks || !res.landmarks.length) return null;
  const lm = res.landmarks[0];
  const W = imgEl.naturalWidth || imgEl.width || 1;
  const H = imgEl.naturalHeight || imgEl.height || 1;
  const m = measureHand(lm.map(q => [q.x * W, q.y * H]));
  const out = classifyHand(m.squareness, m.fingerRatio);
  const v1 = [lm[5].x - lm[0].x, lm[5].y - lm[0].y];
  const v2 = [lm[17].x - lm[0].x, lm[17].y - lm[0].y];
  out.side = v1[0] * v2[1] - v1[1] * v2[0] > 0 ? 'right' : 'left';
  out.measures = m;
  out.reliable = m.open && m.straight > 0.95; // 손가락을 굽혔으면 길이 비율을 믿기 어렵다
  out.lm = lm.map(q => ({ x: q.x, y: q.y }));
  return out;
}

// 사진 위에 그릴 손금 위치 안내(정규화 좌표). 실제 선을 인식한 것이 아니라 관절점에서 계산한 '대략의 자리'다.
// 관절점 5·9·13·17은 손가락 뿌리 주름이 아니라 그보다 손목 쪽에 있는 관절 중심이다.
// 손바닥 쪽에서 보면 감정선이 대략 이 관절 줄을 따라 지나고, 손가락 밑 언덕은 관절보다 손가락 쪽에 있다.
export function palmGuide(lm, W = 1, H = 1) {
  const P = i => [lm[i].x * W, lm[i].y * H];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const wrist = P(0), T1 = P(1), T2 = P(2), I = P(5), M = P(9), R = P(13), K = P(17);
  const start = mix(I, T2, 0.38);                        // 엄지·검지 사이, 생명선·두뇌선이 출발하는 자리
  const out = [K[0] + (K[0] - R[0]) * 0.55, K[1] + (K[1] - R[1]) * 0.55]; // 소지 관절 바깥의 손날
  const edge = mix(out, wrist, 0.1);                     // 감정선이 손날에서 들어오는 자리
  const mEdge = mix(out, P(18), 0.28);                   // 결혼선: 감정선과 소지 뿌리 사이의 손날
  const norm = v => v.map(([x, y]) => [x / W, y / H]);
  const curve = (n, label, a, c, b) => ({ n, label, pts: norm([a, c, b]) });
  return {
    curves: [
      curve(1, '생명선', start, mix(mix(M, wrist, 0.6), T2, 0.08), mix(wrist, T1, 0.3)),
      curve(2, '두뇌선', start, mix(M, wrist, 0.36), mix(mix(out, wrist, 0.45), M, 0.2)),
      curve(3, '감정선', edge, mix(R, wrist, 0.14), mix(mix(I, M, 0.55), P(6), 0.12)),
      curve(4, '운명선', mix(wrist, M, 0.14), mix(wrist, M, 0.5), mix(wrist, M, 0.86)),
      curve(5, '태양선', mix(wrist, R, 0.6), mix(wrist, R, 0.82), mix(R, P(14), 0.12)),
      curve(6, '결혼선', mEdge, mix(mEdge, R, 0.14), mix(mEdge, R, 0.3)),
    ],
    mounts: [
      ['금성구', mix(mix(T1, T2, 0.55), mix(wrist, M, 0.4), 0.38)], ['월구', mix(mix(out, wrist, 0.68), M, 0.12)],
      ['목성구', mix(I, P(6), 0.22)], ['토성구', mix(M, P(10), 0.22)], ['태양구', mix(R, P(14), 0.22)], ['수성구', mix(K, P(18), 0.22)],
    ].map(([label, p]) => ({ label, at: [p[0] / W, p[1] / H] })),
  };
}

const optLabel = (id, v) => (PALM_QUESTIONS.find(q => q.id === id)?.options || []).find(o => o.value === v)?.label || v;
const LINE_QS = [['생명선', ['life', 'lifeArc']], ['두뇌선', ['lifeHead', 'head', 'headLen']], ['감정선', ['heart', 'heartEnd']], ['운명선', ['fate']], ['태양선', ['sun']], ['결혼선', ['marriage']], ['막쥔손금', ['simian']]];

// 설문 답(+사진에서 잰 손 비율) → 수상 풀이
export function readPalmistry(answers, auto = null) {
  const a = { ...(answers || {}) };
  const groups = PALM_GROUPS.map(g => ({ ...g, items: [] }));
  const G = Object.fromEntries(groups.map(g => [g.id, g]));
  const unread = []; // 판단 보류 — '모르겠다' 또는 미응답. 없다고 해석하지 않는다
  const simian = a.simian === 'yes';

  // ── 손 모양·손가락 ──
  const ht = a.handType ? HAND[a.handType] : null;
  if (ht) G.shape.items.push({ area: '손 모양', cls: ht.name, text: ht.t + (auto && auto.border && auto.type === a.handType ? ' 사진으로 잰 비율이 두 유형의 경계에 가까워, 다른 각도의 사진에서는 옆 유형으로 나올 수 있습니다.' : '') });
  const m = auto && auto.reliable ? auto.measures : null;
  if (m) {
    Object.keys(FINGER_READ).forEach(k => {
      const z = zOf(k, m[k]);
      if (Math.abs(z) < 1) return;
      const def = FINGER_READ[k], r = z < 0 ? def.lo : def.hi;
      G.shape.items.push({ area: def.label, cls: r.head, text: r.text, pos: Math.max(0.03, Math.min(0.97, 0.5 + z / 6)), loWord: def.loWord, hiWord: def.hiWord, auto: true,
        note: k === 'idxRing' ? '검지와 약지의 길이 비(2D:4D)를 성격·호르몬과 잇는 연구는 재현에 실패한 것이 많아, 재미로만 보세요.' : null });
    });
  }

  // ── 설문 항목 ──
  const answered = id => a[id] && a[id] !== 'unknown';
  const push = id => {
    const def = RULES[id];
    if (!answered(id)) return;
    const v = a[id], r = def[v];
    if (!r) return;
    const cls = ['marriage', 'life', 'fate', 'sun', 'simian'].includes(id) ? optLabel(id, v).replace(/\s*\(.*\)$/, '') : r.head;
    G[def.group].items.push({ area: def.area, cls, text: r.text });
  };
  push('life'); push('lifeArc');
  // 막쥔손금은 두뇌선·감정선이 하나로 합쳐진 형태 — 개별 풀이와 모순되므로 생략
  if (!simian) {
    push('lifeHead'); push('head'); push('headLen'); push('headFork');
    push('heart'); push('heartEnd');
  }
  push('fate');
  if (a.fate !== 'none') push('fateStart');
  push('sun'); push('marriage'); push('simian');
  ['mercury', 'venusGirdle', 'mystic', 'mLetter', 'fineLines', 'thumbFlex', 'mount'].forEach(push);

  // 판단 보류는 선 단위 — 그 선에 딸린 문항을 하나도 답하지 않았을 때만
  LINE_QS.forEach(([name, ids]) => {
    if (simian && (name === '두뇌선' || name === '감정선')) return;
    if (!ids.some(answered)) unread.push(name);
  });
  const unreadFinal = unread;

  const element = ht ? ht.el : null;
  // 손의 의미는 '주로 쓰는 손' 기준 — 주로 쓰는 손 = 후천·현재, 반대 손 = 천성
  let side = null;
  if (a.side) {
    const name = a.side === 'left' ? '왼손' : '오른손';
    if (a.dominant) {
      const isDom = a.side === a.dominant;
      side = { name, mean: isDom ? '후천적 노력·현재의 사회적 모습' : '타고난 천성·내면의 잠재력', basis: `주로 쓰는 손이 ${a.dominant === 'left' ? '왼손' : '오른손'}` };
    } else side = { name, mean: null, basis: '주로 쓰는 손을 답하지 않아 어느 쪽 의미인지 정하지 않음' };
  }

  const flat = [];
  groups.forEach(g => g.items.forEach(it => flat.push(it)));

  const lines = [];
  if (side && side.mean) lines.push(`<b>${side.name}</b> 사진이고 ${side.basis}이니, 주로 <b>${side.mean}</b>을 보는 손입니다. 벤험과 케이로 모두 한 손만 보면 잘못 읽는다고 했으니, 반대 손도 따로 보고 견주면 좋습니다.`);
  else if (side) lines.push(`<b>${side.name}</b> 사진입니다. ${side.basis}. (주로 쓰는 손이면 후천·현재, 반대 손이면 천성으로 봅니다)`);
  if (ht) lines.push(`손은 <b>${ht.name}</b> 유형으로, 기질을 오행으로 보면 <b>${element}</b> 기운에 가깝습니다. 서양의 4원소 손유형을 오행에 대응시킨 것은 <b>이 앱의 해석 틀</b>이고 전통 공식이 아닙니다. 동양의 오행 손형은 기준이 달라, 예컨대 동양의 수형(둥글고 살진 손)과 서양의 물손(길고 가는 손)은 이름만 같습니다.`);
  if (!flat.length) lines.push('체크한 항목이 없어 손금 풀이를 생략했습니다. 사진을 보며 아는 항목만 골라 주세요.');
  if (unreadFinal.length) lines.push(`<b>판단 보류</b>: ${unreadFinal.join('·')} — 확인하지 못한 항목은 '없다'로 보지 않고 풀이에서 뺐습니다.`);
  if (auto && !auto.reliable) lines.push('사진에서 손가락이 굽었거나 겹쳐 보여, 손가락 길이 비율은 풀이에서 뺐습니다.');
  lines.push('풀이는 서양 수상의 고전인 벤험(1900)·케이로(1916)와 동양의 《신상전편》을 따랐고, 두 쪽이 엇갈리는 대목은 엇갈린다고 적었습니다.');

  return {
    ok: true,
    items: flat,
    groups: groups.filter(g => g.items.length),
    lines,
    topType: ht ? ht.name : null,
    element,
    profile: ht ? { character: ht.character, strength: ht.strength, caution: ht.caution, aptitude: ht.aptitude } : null,
    side: side ? side.name : null,
    sideMeaning: side ? side.mean : null,
    unread: unreadFinal,
    answers: a, // 통합 화면에서 손금 답변 활용
    measures: m,
    sections: flat.map(it => ({ title: it.area, head: it.cls, body: it.text })),
  };
}
