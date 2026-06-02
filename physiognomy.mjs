// physiognomy.mjs — 관상 규칙엔진 (face-api.js 68 landmark 기반)
// AI 호출 없음. 모델 1회 다운로드 후 브라우저 내에서만 추론(비용 0).
// ⚠️ 관상은 과학적으로 검증된 바 없으며, '적중감'의 정체는 바넘효과·확증편향입니다.
//    본 결과는 오락·자기성찰용 참고일 뿐, 타인을 판단·낙인하는 도구가 아닙니다.
//
// 측정은 모두 '정규화 비율'(픽셀 절대값이 아닌 부위 간 비율)이라 사진 크기·거리와 무관합니다.
// 단, face-api 68점은 이마 위 헤어라인을 잡지 못해 '상정(이마)' 측정은 생략하고
// 눈썹~코끝(중정)·코끝~턱(하정) 위주로 봅니다. (자동 관상의 알려진 한계)

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const LIB_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
let _loaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some(s => s.src === src)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('관상 모듈 스크립트 로드에 실패했습니다.'));
    document.head.appendChild(el);
  });
}

// face-api 라이브러리 + 모델을 필요할 때 1회만 동적 로드 (사주만 볼 땐 받지 않음)
export async function loadFaceModels() {
  if (_loaded) return;
  if (typeof faceapi === 'undefined') await loadScript(LIB_URL);
  if (typeof faceapi === 'undefined') throw new Error('관상 분석 모듈(face-api)을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  _loaded = true;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// 이미지 엘리먼트 → 68 랜드마크 좌표 배열 (얼굴 못 찾으면 null)
export async function detectFace(imgEl) {
  await loadFaceModels();
  const det = await faceapi
    .detectSingleFace(imgEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.35 }))
    .withFaceLandmarks();
  return det ? det.landmarks.positions : null;
}

// 랜드마크 68점 → 정규화 비율 측정값
// (임계값은 동양인 정면 사진 평균 기준의 1차 추정 — 실사진으로 미세조정 가능)
export function measureFace(p) {
  const chin = p[8];
  const cheekL = p[2], cheekR = p[14];
  const browYavg = (p[19].y + p[24].y) / 2;
  const noseTop = p[27], noseTip = p[30];
  const faceW = dist(cheekL, cheekR) || 1;        // 광대 폭(기준 가로)
  const faceH = (chin.y - browYavg) || 1;          // 눈썹~턱(기준 세로)
  const midFace = (noseTip.y - browYavg) || 1;     // 중정
  const lowFace = (chin.y - noseTip.y) || 1;       // 하정
  const eyeW = ((dist(p[36], p[39]) + dist(p[42], p[45])) / 2) || 1;
  const interEye = dist(p[39], p[42]);             // 미간(두 눈 안쪽 사이)
  const noseLen = dist(noseTop, noseTip);
  const noseW = dist(p[31], p[35]);                // 콧방울 폭
  const mouthW = dist(p[48], p[54]) || 1;
  const lipH = dist(p[51], p[57]);                 // 입술 두께(위~아래)
  const mouthCornerY = (p[48].y + p[54].y) / 2;
  const lipMidY = p[62].y;
  const jawW = dist(p[4], p[12]);                  // 하관 폭

  // 좌우 대칭: 코 축 기준 대칭쌍 편차 평균(0=완벽 대칭)
  const axis = (noseTop.x + noseTip.x) / 2;
  const pairs = [[36, 45], [39, 42], [31, 35], [48, 54], [2, 14], [5, 11]];
  let symDev = 0;
  pairs.forEach(([l, r]) => { symDev += Math.abs((axis - p[l].x) - (p[r].x - axis)); });
  symDev = symDev / pairs.length / faceW;

  return {
    faceRatio: faceW / faceH,        // 가로/세로 (↑넓음 ↓길쭉)
    jawRatio: jawW / faceW,          // 턱폭/광대폭 (↑각짐)
    midLowRatio: midFace / lowFace,  // 중정/하정
    eyeRatio: eyeW / faceW,          // 눈 크기
    interEyeRatio: interEye / eyeW,  // 미간(눈폭 대비)
    noseLenRatio: noseLen / faceH,   // 코 길이
    noseWRatio: noseW / faceW,       // 콧방울 폭
    mouthRatio: mouthW / faceW,      // 입 크기
    lipRatio: lipH / mouthW,         // 입술 두께
    mouthTiltN: (mouthCornerY - lipMidY) / mouthW, // +처짐 / -올라감
    chinRatio: jawW / faceW,         // 턱 발달
    symDev,
  };
}

// 관인팔법(觀人八法) 유형 → 대표 오행 (조사한 wiki '관인팔법' 기준 느슨한 연계)
const TYPE_ELEM = { 위맹: '화', 후중: '토', 청수: '금', 고괴: '수', 고: '금', 박: '토' };
const TYPE_DESC = { 위맹: '위엄·결단', 후중: '안정·후덕', 청수: '명석·조화', 고괴: '개성·신비', 고: '독립·사색', 박: '섬세·민감' };
const ELEM_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

// 관인팔법 유형별 성격 프로필 (통합 종합판용)
const TYPE_PROFILE = {
  위맹: { character: '결단력 있고 주도적인', strength: '리더십·추진력·위기 돌파력', caution: '독선적이거나 강압적으로 비칠 수 있음', aptitude: '경영·조직 관리·정치·현장 지휘', relation: '이끄는 역할이 어울리나 부드러움을 더하면 따르는 사람이 늘어남' },
  후중: { character: '듬직하고 포용력 있는', strength: '안정감·신뢰·끈기', caution: '변화에 둔감하고 고집이 셀 수 있음', aptitude: '관리·금융·부동산·인사·요식', relation: '신뢰를 주는 맏형·맏언니형, 곁에 사람이 모임' },
  청수: { character: '맑고 명석한', strength: '지성·기획력·심미안', caution: '예민하거나 이상에 치우칠 수 있음', aptitude: '학문·연구·예술·전문직·기획', relation: '정신적 교류를 중시해 깊이 통하는 사람을 찾음' },
  고괴: { character: '개성 강하고 독창적인', strength: '창의력·직관·돌파력', caution: '고립되거나 감정 기복이 클 수 있음', aptitude: '예술·연구·벤처·창작', relation: '소수와 깊게 사귀며 넓은 관계는 피곤해함' },
  고: { character: '독립적이고 사색적인', strength: '자립심·집중력·통찰', caution: '외로움·단절에 빠지기 쉬움', aptitude: '연구·전문기술·1인 사업', relation: '혼자만의 충전 시간이 꼭 필요한 유형' },
  박: { character: '섬세하고 감수성 풍부한', strength: '공감·디테일·배려', caution: '상처받기 쉽고 자신감이 흔들릴 수 있음', aptitude: '상담·디자인·서비스·돌봄', relation: '섬세해 잘 맞춰 주나 휘둘리지 않도록 주의' },
};

// 랜드마크 → 관상 해석 결과
// 정면·수평 정상 사진인지 1차 게이트 (비정면이면 측정 비율이 왜곡됨)
export function faceQuality(m) {
  if (m.faceRatio < 0.55 || m.faceRatio > 1.25)
    return { ok: false, reason: '얼굴이 기울었거나 정면이 아닌 듯해요. 카메라를 정면으로 본 수평 사진으로 다시 시도해 주세요.' };
  if (m.midLowRatio < 0.4 || m.midLowRatio > 2.2)
    return { ok: false, reason: '고개가 위/아래로 기운 사진 같아요. 턱을 당기거나 들지 말고 정면으로 다시 찍어 주세요.' };
  if (m.symDev > 0.2)
    return { ok: false, reason: '얼굴이 옆으로 틀어진 듯해요. 정면 사진으로 다시 시도해 주세요.' };
  return { ok: true };
}

export function readPhysiognomy(p) {
  const m = measureFace(p);
  const q = faceQuality(m);
  if (!q.ok) return { ok: false, reason: q.reason, measures: m };
  const items = [];   // {area, cls, text}
  const tally = {};   // 관인팔법 유형 집계
  const add = (area, cls, type, text) => {
    items.push({ area, cls, text });
    if (type) tally[type] = (tally[type] || 0) + 1;
  };

  // 얼굴형
  if (m.faceRatio > 0.95) {
    if (m.jawRatio > 0.8) add('얼굴형', '사각형 · 위맹', '위맹', '광대와 턱이 단단한 <b>사각형</b>. 위맹(威猛)의 상으로 결단력·통솔력과 강한 추진 에너지를 지녔습니다.');
    else add('얼굴형', '둥근형 · 후중', '후중', '살집이 도톰한 <b>둥근형</b>. 후중(厚重)의 상으로 정서가 안정되고 대인관계·재복이 따릅니다.');
  } else if (m.faceRatio < 0.72) {
    add('얼굴형', '긴형 · 고', '고', '세로로 긴 <b>장방형</b>. 사색적이고 자기 세계가 뚜렷하나, 다소 고독을 즐기는 기질이 있습니다.');
  } else if (m.jawRatio < 0.62) {
    add('얼굴형', '역삼각 · 청수', '청수', '턱이 갸름한 <b>역삼각형</b>. 두뇌가 명석하고 창의적이나 감정이 예민한 편입니다.');
  } else {
    add('얼굴형', '계란형 · 청수', '청수', '균형 잡힌 <b>계란형</b>. 지성과 조화의 청수(淸秀)한 상으로 학문·예술·전문직에 어울립니다.');
  }

  // 중·하정 균형
  if (m.midLowRatio > 1.15) add('삼정(三庭)', '중정 발달', null, '코까지의 <b>중정(中庭)</b>이 길어 30~50대 중년의 활동력과 재물 추구가 왕성합니다.');
  else if (m.midLowRatio < 0.85) add('삼정(三庭)', '하정 발달', null, '턱 쪽 <b>하정(下庭)</b>이 넉넉해 말년운과 아랫사람·부동산 복이 두텁습니다.');
  else add('삼정(三庭)', '중·하정 균형', null, '중정과 하정이 고르게 균형 잡혀 중년과 말년의 흐름이 안정적입니다.');

  // 눈
  if (m.eyeRatio > 0.235) add('눈(眼)', '크고 시원한 눈', '청수', '<b>크고 시원한 눈</b>. 감수성·표현력이 풍부하고 사람을 끄는 힘이 있습니다.');
  else if (m.eyeRatio < 0.19) add('눈(眼)', '작고 야무진 눈', '후중', '<b>작고 야무진 눈</b>. 신중하고 관찰력이 깊으며 속을 쉽게 드러내지 않습니다.');
  else add('눈(眼)', '균형 잡힌 눈', null, '이성과 감성의 조화가 무난한 눈매입니다.');

  // 미간
  if (m.interEyeRatio > 1.15) add('미간(印堂)', '넓은 미간', '후중', '<b>미간이 넓어</b> 마음이 너그럽고 낙천적이나, 때로 추진력이 느슨할 수 있습니다.');
  else if (m.interEyeRatio < 0.85) add('미간(印堂)', '좁은 미간', '위맹', '<b>미간이 좁아</b> 집중력이 강하고 예민하며, 한 가지에 몰두하는 힘이 있습니다.');

  // 코
  if (m.noseLenRatio > 0.46) add('코(鼻)', '곧고 긴 코', '청수', '<b>콧대가 길고 곧아</b> 자존심이 높고 명예·재물을 추구하는 힘이 강합니다.');
  if (m.noseWRatio > 0.28) add('코(鼻)', '넉넉한 콧방울', '후중', '<b>콧방울이 넉넉해</b> 재물을 담는 그릇이 크고 생활력이 강합니다.');
  else if (m.noseWRatio < 0.2) add('코(鼻)', '가는 콧방울', '고', '<b>콧방울이 가늘어</b> 섬세하나 재물을 모으기보다 쓰는 편이니 관리가 필요합니다.');

  // 입
  if (m.mouthRatio > 0.42) add('입(口)', '큰 입', '위맹', '<b>입이 커</b> 적극적이고 사교적이며 리더십·생활력이 강합니다.');
  else if (m.mouthRatio < 0.32) add('입(口)', '작은 입', '고', '<b>입이 작아</b> 신중하고 섬세하나 자기표현을 아끼는 편입니다.');
  if (m.lipRatio > 0.5) add('입술(脣)', '도톰한 입술', '후중', '입술이 도톰해 정이 많고 표현이 따뜻합니다.');
  else if (m.lipRatio < 0.3) add('입술(脣)', '얇은 입술', '청수', '입술이 얇아 이성적이고 말이 깔끔하나, 다소 냉정해 보일 수 있습니다.');

  // 입꼬리(인상)
  if (m.mouthTiltN < -0.04) add('인상', '올라간 입꼬리', null, '입꼬리가 올라가 <b>밝고 긍정적인 인상</b>을 줍니다. 대인운에 유리합니다.');
  else if (m.mouthTiltN > 0.08) add('인상', '처진 입꼬리', null, '입꼬리가 다소 처져 <b>진중해 보이나</b>, 의식적으로 미소를 더하면 인상이 한결 부드러워집니다.');

  // 턱
  if (m.chinRatio > 0.78) add('턱(地閣)', '발달한 턱', '위맹', '<b>턱이 단단해</b> 의지와 책임감이 강하고 끝맺음이 야무집니다.');
  else if (m.chinRatio < 0.55) add('턱(地閣)', '갸름한 턱', '청수', '<b>턱이 갸름해</b> 섬세하고 세련됐으나, 끈기를 의식적으로 보완하면 좋습니다.');

  // 좌우 대칭
  if (m.symDev < 0.04) add('균형(對稱)', '좌우 대칭', '청수', '얼굴 좌우가 고르게 <b>균형</b> 잡혀 안정감과 신뢰감을 줍니다.');
  else if (m.symDev > 0.09) add('균형(對稱)', '약한 비대칭', null, '좌우 균형이 다소 어긋나 보이는데, 표정 습관·촬영 각도의 영향이 큽니다. 과하게 의미 두지 마세요.');

  // 대표 유형 → 오행
  const topType = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || '청수';
  const element = TYPE_ELEM[topType] || '금';

  const lines = [
    `전체적으로 <b>${topType}(${TYPE_DESC[topType]})</b> 기운이 두드러지는 상입니다.`,
    `관상의 기질을 오행으로 환산하면 <b>${element}(${ELEM_HANJA[element]})</b> 기운에 가깝습니다. ${'사주의 오행 분포와 함께 보면 더 입체적으로 읽을 수 있습니다.'}`,
  ];

  return {
    ok: true,
    items,
    lines,
    topType,
    element,      // 통합 통변에서 사주 오행과 교차
    profile: TYPE_PROFILE[topType] || null, // 통합 종합판용 성격 프로필
    measures: m,  // 디버그/튜닝용
    sections: items.map(it => ({ title: it.area, head: it.cls, body: it.text })),
  };
}
