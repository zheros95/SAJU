// palmistry.mjs — 수상 규칙엔진 (손금 5대선·문양은 사진 보며 체크하는 설문 기반)
// AI 호출 없음. 손금은 자동검출이 불안정해 사용자가 사진을 보며 선택합니다.
// ⚠️ 수상은 과학적으로 검증된 바 없습니다. 주요 손바닥 주름은 태아기에 형성되며,
//    '노력으로 선이 바뀐다'는 주장은 근거가 없어 본 앱은 그런 표현을 쓰지 않습니다.

// 설문 정의 — UI는 이 데이터로 자동 생성됩니다.
export const PALM_QUESTIONS = [
  { id: 'side', label: '🖐 어느 손이야?', hint: '오른손 = 후천·현재, 왼손 = 타고난 천성 (왼손잡이는 의미가 반대일 수 있어요)', options: [
    { value: 'right', label: '오른손 (주로 쓰는 손)' },
    { value: 'left', label: '왼손' },
  ] },
  { id: 'handType', label: '✋ 손 모양', hint: '손바닥과 손가락의 전체 비율', options: [
    { value: 'earth', label: '네모지고 손가락이 짧다 (흙손)' },
    { value: 'fire', label: '손바닥이 길고 손가락이 짧다 (불손)' },
    { value: 'air', label: '네모진 손바닥에 손가락이 길다 (공기손)' },
    { value: 'water', label: '전체가 길쭉하고 손가락이 길다 (물손)' },
  ] },
  { id: 'life', label: '생명선', hint: '엄지를 감싸며 내려오는 곡선', options: [
    { value: 'long_deep', label: '길고 뚜렷하다' },
    { value: 'medium', label: '보통이다' },
    { value: 'short_faint', label: '짧거나 희미하다' },
  ] },
  { id: 'head', label: '두뇌선', hint: '손바닥을 가로지르는 가운데 선', options: [
    { value: 'straight', label: '곧게 뻗는다 (현실·논리형)' },
    { value: 'curved', label: '아래로 휜다 (상상·창의형)' },
    { value: 'short', label: '짧다 (직관·실행형)' },
  ] },
  { id: 'heart', label: '감정선', hint: '손가락 아래 가로로 흐르는 선', options: [
    { value: 'curved', label: '길고 휘어진다 (다정·표현형)' },
    { value: 'straight', label: '곧고 짧다 (절제·이성형)' },
  ] },
  { id: 'fate', label: '운명선', hint: '손목에서 가운데로 올라가는 세로선', options: [
    { value: 'clear', label: '뚜렷하다' },
    { value: 'weak', label: '약하다' },
    { value: 'none', label: '없다 / 모르겠다' },
  ] },
  { id: 'sun', label: '태양선', hint: '약지(넷째) 아래로 오르는 세로선', options: [
    { value: 'yes', label: '있다' },
    { value: 'no', label: '없다 / 모르겠다' },
  ] },
  { id: 'marriage', label: '결혼선', hint: '새끼손가락 아래 짧은 가로선', options: [
    { value: 'clear', label: '뚜렷한 선이 있다' },
    { value: 'faint', label: '희미하다' },
    { value: 'none', label: '없다 / 모르겠다' },
  ] },
  { id: 'simian', label: '막쥔손금(원숭이선)', hint: '두뇌선과 감정선이 한 줄로 손바닥을 가로지름', options: [
    { value: 'no', label: '아니다 (선이 둘로 나뉜다)' },
    { value: 'yes', label: '그렇다 (한 줄로 가로지른다)' },
  ] },
  { id: 'mystic', label: '신비십자', hint: '손바닥 한가운데의 + 자 무늬', options: [
    { value: 'no', label: '없다 / 모르겠다' },
    { value: 'yes', label: '있다' },
  ] },
];

// 손 유형 → 오행·해석 (조사한 wiki '4원소 손유형' 기준)
const HAND = {
  earth: { el: '토', name: '흙손', t: '네모지고 단단한 <b>흙손</b>. 실용적·침착하고 신뢰를 주나, 변화에는 다소 둔감할 수 있습니다.',
    character: '실용적이고 침착한', strength: '성실·신뢰·인내', caution: '변화에 둔감하고 융통성이 부족할 수 있음', aptitude: '실무·기술·관리·제조·행정' },
  fire: { el: '화', name: '불손', t: '손바닥이 길고 손가락이 짧은 <b>불손</b>. 정열·추진력·리더십이 강하나 성급함을 주의하세요.',
    character: '열정적이고 적극적인', strength: '추진력·리더십·결단', caution: '성급하거나 감정 기복이 있을 수 있음', aptitude: '영업·창업·현장·스포츠' },
  air: { el: '목', name: '공기손', t: '네모진 손바닥에 긴 손가락의 <b>공기손</b>. 지적 호기심·소통·분석력이 뛰어납니다.',
    character: '논리적이고 소통에 능한', strength: '분석·기획·언어 감각', caution: '에너지가 분산되거나 과민할 수 있음', aptitude: '기획·교육·IT·미디어·연구' },
  water: { el: '수', name: '물손', t: '길고 섬세한 <b>물손</b>. 직관·감수성·예술성이 풍부하나 쉽게 상처받는 편입니다.',
    character: '직관적이고 감성이 풍부한', strength: '공감·창의·예술성', caution: '예민하고 감정 기복이 있을 수 있음', aptitude: '예술·상담·창작·디자인' },
};

// 선·문양별 해석문
const RULES = {
  life: {
    long_deep: '생명선이 길고 뚜렷해 <b>활력과 회복력</b>이 좋고 큰 변고가 적은 편입니다.',
    medium: '생명선이 평균적이라 환경과 관리에 따라 활력이 조절됩니다.',
    short_faint: '생명선이 짧거나 희미하지만 <b>길이가 수명을 뜻하지 않습니다</b>. 체력 관리에 조금만 신경 쓰면 됩니다.',
  },
  head: {
    straight: '두뇌선이 곧아 <b>현실적·논리적</b> 판단이 강점입니다.',
    curved: '두뇌선이 휘어 <b>상상력·창의성</b>이 풍부합니다.',
    short: '두뇌선이 짧아 <b>직관적·실행 중심</b>으로 움직입니다.',
  },
  heart: {
    curved: '감정선이 길고 휘어 <b>정이 많고 표현이 풍부</b>합니다.',
    straight: '감정선이 곧아 감정을 <b>절제하고 이성적</b>으로 다룹니다.',
  },
  fate: {
    clear: '운명선이 뚜렷해 <b>인생 방향과 직업운</b>이 분명한 편입니다.',
    weak: '운명선이 약해 진로를 <b>스스로 개척</b>하는 자유도가 높습니다.',
    none: '운명선이 없어 정해진 틀보다 <b>본인 의지</b>로 길을 만드는 유형입니다(자유=책임).',
  },
  sun: {
    yes: '태양선이 있어 <b>명예·인기·예술적 성취</b>의 기운이 따릅니다.',
    no: '태양선이 뚜렷하지 않습니다. 전통 해석으로는 명예운이 늦게 트이는 편으로 봅니다.',
  },
  marriage: {
    clear: '결혼선이 뚜렷해 <b>인연·애정 관계</b>가 분명한 편입니다.',
    faint: '결혼선이 희미해 인연에 신중하거나 다소 늦을 수 있습니다.',
    none: '결혼선이 잘 안 보이는데, <b>선 개수가 결혼 횟수를 뜻하지는 않습니다</b>.',
  },
  simian: {
    yes: '<b>막쥔손금(원숭이선)</b>이 있어 집중력·추진력이 극단적으로 강합니다. 한번 꽂히면 끝을 보는 카리스마형이나, 자기중심성을 주의하세요.',
    no: '두뇌선과 감정선이 나뉘어 <b>이성과 감정의 균형</b>이 무난합니다.',
  },
  mystic: {
    yes: '<b>신비십자</b>가 있어 직관·영성이 강하고 위기를 잘 피해 간다고 봅니다.',
  },
};

const HANDTYPE_LABEL = id => (PALM_QUESTIONS.find(q => q.id === id)?.options || []);
const optLabel = (id, v) => HANDTYPE_LABEL(id).find(o => o.value === v)?.label || v;

// 설문 답 → 수상 해석 결과
export function readPalmistry(answers) {
  const a = answers || {};
  const items = [];
  // 손모양은 자동판별 또는 사용자가 답한 경우에만 — 미응답을 임의 해석하지 않음
  const ht = a.handType ? HAND[a.handType] : null;
  if (ht) items.push({ area: '손 모양', cls: ht.name, text: ht.t });

  const push = (id, area) => {
    const v = a[id];
    if (!v) return;
    const t = RULES[id]?.[v];
    if (t) items.push({ area, cls: optLabel(id, v).replace(/\s*\(.*\)$/, ''), text: t });
  };
  push('life', '생명선');
  // 막쥔손금은 두뇌선·감정선이 하나로 합쳐진 형태 — 개별 해석과 모순되므로 생략
  if (a.simian !== 'yes') {
    push('head', '두뇌선');
    push('heart', '감정선');
  }
  push('fate', '운명선');
  push('sun', '태양선');
  push('marriage', '결혼선');
  push('simian', '막쥔손금');
  if (a.mystic === 'yes') push('mystic', '신비십자');

  const element = ht ? ht.el : null;
  const side = a.side
    ? (a.side === 'left'
      ? { name: '왼손', mean: '타고난 천성·내면의 잠재력' }
      : { name: '오른손', mean: '후천적 노력·현재의 사회적 모습' })
    : null;
  const lines = [];
  if (side) lines.push(`<b>${side.name}</b>을 기준으로 봤으니, 이 풀이는 주로 <b>${side.mean}</b>을 보여 줍니다.`);
  if (ht) lines.push(`손은 <b>${ht.name}</b> 유형으로, 기질을 오행으로 보면 <b>${element}</b> 기운에 가깝습니다. (서양 4원소 손유형을 오행에 대응시킨 <b>본 앱의 해석 틀</b>로, 전통적으로 확립된 공식은 아닙니다)`);
  if (!items.length) lines.push('체크한 항목이 없어 손금 풀이를 생략했습니다. 사진을 보며 아는 항목만 골라 주세요.');
  lines.push(`수상은 과학적으로 검증된 학문이 아닙니다. '잘 맞는다'는 느낌의 정체는 바넘효과·확증편향이니, 자기성찰용 참고로만 보세요.`);

  return {
    ok: true,
    items,
    lines,
    topType: ht ? ht.name : null,
    element,
    profile: ht ? { character: ht.character, strength: ht.strength, caution: ht.caution, aptitude: ht.aptitude } : null,
    side: side ? side.name : null,
    answers: a, // 통합 통변에서 손금 답변 활용
    sections: items.map(it => ({ title: it.area, head: it.cls, body: it.text })),
  };
}

// ───────── 손모양 자동 판별 (MediaPipe Hands, 21 관절점) ─────────
// 손금선은 자동검출 불가. 여기서는 '손 형태'(4원소 손유형)만 자동 판별합니다.
const HAND_LIB = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs';
const HAND_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
let _handLandmarker = null;

export async function loadHandModel() {
  if (_handLandmarker) return;
  const { HandLandmarker, FilesetResolver } = await import(HAND_LIB);
  const resolver = await FilesetResolver.forVisionTasks(HAND_WASM);
  _handLandmarker = await HandLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
    runningMode: 'IMAGE',
    numHands: 1,
  });
}

// 손바닥 네모도(squareness=너비/길이) + 손가락 비율 → 4원소 손유형
export function classifyHand(squareness, fingerRatio) {
  const square = squareness > 0.62;      // 클수록 네모(흙·공기), 작을수록 길쭉(불·물)
  const longFinger = fingerRatio > 0.72; // 클수록 긴 손가락(공기·물)
  let type;
  if (square && !longFinger) type = 'earth';
  else if (!square && !longFinger) type = 'fire';
  else if (square && longFinger) type = 'air';
  else type = 'water';
  return { type, name: HAND[type].name, squareness: +squareness.toFixed(3), fingerRatio: +fingerRatio.toFixed(3) };
}

// 손 사진 → 손유형 + 좌우 판별 (손을 못 찾으면 null)
// 좌우 판별: 손바닥이 보이는 사진 전제(수상은 손바닥만 봄).
// 손목(0)→검지뿌리(5)와 손목(0)→소지뿌리(17) 벡터의 외적 부호는
// 사진이 기울거나 뒤집혀도 변하지 않음 — 오른손바닥 양수, 왼손바닥 음수.
export async function detectHandType(imgEl) {
  await loadHandModel();
  const res = _handLandmarker.detect(imgEl);
  if (!res.landmarks || !res.landmarks.length) return null;
  const lm = res.landmarks[0];
  const W = imgEl.naturalWidth || imgEl.width || 1;
  const H = imgEl.naturalHeight || imgEl.height || 1;
  const d = (a, b) => Math.hypot((lm[a].x - lm[b].x) * W, (lm[a].y - lm[b].y) * H);
  const palmL = d(0, 9) || 1;  // 손목 → 중지 MCP
  const palmW = d(5, 17);      // 검지 MCP → 소지 MCP
  const fingerL = d(9, 12);    // 중지 MCP → 중지 끝
  const out = classifyHand(palmW / palmL, fingerL / palmL);
  // 좌우 판별 (화면 좌표: x→오른쪽, y→아래)
  const v1 = [lm[5].x - lm[0].x, lm[5].y - lm[0].y];
  const v2 = [lm[17].x - lm[0].x, lm[17].y - lm[0].y];
  const cross = v1[0] * v2[1] - v1[1] * v2[0];
  out.side = cross > 0 ? 'right' : 'left';
  // 참고용: MediaPipe 자체 판정(셀피 미러 기준이라 일반 사진은 반대로 줌)
  const mp = res.handedness?.[0]?.[0] || res.handednesses?.[0]?.[0];
  if (mp) out.mpLabel = mp.categoryName + ':' + Math.round((mp.score || 0) * 100);
  return out;
}
