// saju_engine.mjs
// 명리 계산 엔진 — manseryeok(명식 8자)을 입력받아
// 지장간·십성·십이운성·신강약·용신·격국·대운·세운·신살을 도출한다.
// 참조: 옵시디언 wiki/사주 (음양오행·간지, 십성·십이운성, 용신·격국, 신살)

import { calculateSaju, lunarToSolar } from './manseryeok.mjs';

// ───────────────────────── 기본 상수 ─────────────────────────
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const STEM_KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };
export const BRANCH_KO = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
export const BRANCH_ANIMAL = { 子: '쥐', 丑: '소', 寅: '호랑이', 卯: '토끼', 辰: '용', 巳: '뱀', 午: '말', 未: '양', 申: '원숭이', 酉: '닭', 戌: '개', 亥: '돼지' };

export const STEM_ELEM = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
export const BRANCH_ELEM = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' };

// 음양 (천간)
export const STEM_YY = { 甲: '양', 乙: '음', 丙: '양', 丁: '음', 戊: '양', 己: '음', 庚: '양', 辛: '음', 壬: '양', 癸: '음' };

// 지지 정기(본기) — 십성은 정기 지장간으로 판정(체용 일치, 만세력 표기 관행)
export const BRANCH_MAIN = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' };

// 지장간 (천간, 일수) — 여기/중기/정기 순
export const HIDDEN_STEMS = {
  子: [['壬', 10], ['癸', 20]],
  丑: [['癸', 9], ['辛', 3], ['己', 18]],
  寅: [['戊', 7], ['丙', 7], ['甲', 16]],
  卯: [['甲', 10], ['乙', 20]],
  辰: [['乙', 9], ['癸', 3], ['戊', 18]],
  巳: [['戊', 7], ['庚', 7], ['丙', 16]],
  午: [['丙', 10], ['己', 9], ['丁', 11]],
  未: [['丁', 9], ['乙', 3], ['己', 18]],
  申: [['戊', 7], ['壬', 7], ['庚', 16]],
  酉: [['庚', 10], ['辛', 20]],
  戌: [['辛', 9], ['丁', 3], ['戊', 18]],
  亥: [['戊', 7], ['甲', 7], ['壬', 16]],
};

// 오행 상생/상극
export const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // A가 B를 생
export const KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };   // A가 B를 극

export const ELEM_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
export const ELEM_LIST = ['목', '화', '토', '금', '수'];

// 계절(월지 기준)
export const BRANCH_SEASON = {
  寅: '봄', 卯: '봄', 辰: '봄',
  巳: '여름', 午: '여름', 未: '여름',
  申: '가을', 酉: '가을', 戌: '가을',
  亥: '겨울', 子: '겨울', 丑: '겨울',
};

// ───────────────────────── 십성 ─────────────────────────
// 일간(dayStem) 기준 target 천간의 십성
export function tenGodOfStem(dayStem, targetStem) {
  const de = STEM_ELEM[dayStem], te = STEM_ELEM[targetStem];
  const same = STEM_YY[dayStem] === STEM_YY[targetStem];
  if (de === te) return same ? '비견' : '겁재';
  if (SHENG[de] === te) return same ? '식신' : '상관';   // 내가 생함
  if (KE[de] === te) return same ? '편재' : '정재';       // 내가 극함
  if (KE[te] === de) return same ? '편관' : '정관';       // 나를 극함
  if (SHENG[te] === de) return same ? '편인' : '정인';    // 나를 생함
  return '';
}

// 지지의 십성 (정기 기준)
export function tenGodOfBranch(dayStem, branch) {
  return tenGodOfStem(dayStem, BRANCH_MAIN[branch]);
}

// 십성 → 그룹(오성)
export const TENGOD_GROUP = {
  비견: '비겁', 겁재: '비겁',
  식신: '식상', 상관: '식상',
  편재: '재성', 정재: '재성',
  편관: '관성', 정관: '관성',
  편인: '인성', 정인: '인성',
};

// ───────────────────────── 십이운성 ─────────────────────────
const TWELVE = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
// 장생지(화토동법: 戊=丙, 己=丁)
const CHANGSAENG = { 甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申', 乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯' };

export function twelveStage(dayStem, branch) {
  const start = BRANCHES.indexOf(CHANGSAENG[dayStem]);
  const yang = STEM_YY[dayStem] === '양';
  const bi = BRANCHES.indexOf(branch);
  let diff = yang ? bi - start : start - bi;
  diff = ((diff % 12) + 12) % 12;
  return TWELVE[diff];
}

// 십이운성의 기세(강/중/약) — 그 글자에 힘이 실렸는지 판단
export const STAGE_STRENGTH = {
  장생: '강', 관대: '강', 건록: '강', 제왕: '강',
  목욕: '중', 양: '중', 쇠: '중', 태: '중',
  병: '약', 사: '약', 묘: '약', 절: '약',
};

// ───────────────────────── 60갑자 인덱스 ─────────────────────────
export function ganzhiIndex(stem, branch) {
  // 천간(10)·지지(12)로 60갑자 인덱스 복원
  const s = STEMS.indexOf(stem), b = BRANCHES.indexOf(branch);
  for (let i = 0; i < 60; i++) {
    if (i % 10 === s && i % 12 === b) return i;
  }
  return -1;
}
export function ganzhiFromIndex(i) {
  i = ((i % 60) + 60) % 60;
  return { stem: STEMS[i % 10], branch: BRANCHES[i % 12] };
}

// ───────────────────────── 오행 분포(지장간 가중) ─────────────────────────
export function elementDistribution(pillars) {
  // pillars: { year:[s,b], month:[s,b], day:[s,b], hour:[s,b] }
  const score = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const stems = [pillars.year[0], pillars.month[0], pillars.day[0], pillars.hour[0]];
  stems.forEach(s => { if (s) score[STEM_ELEM[s]] += 1; });
  // 지지: 지장간 일수비율, 월지는 1.5배 가중(월령)
  const branchEntries = [
    [pillars.year[1], 1], [pillars.month[1], 1.5], [pillars.day[1], 1], [pillars.hour[1], 1],
  ];
  branchEntries.forEach(([b, w]) => {
    if (!b) return;
    HIDDEN_STEMS[b].forEach(([hs, days]) => { score[STEM_ELEM[hs]] += (days / 30) * w; });
  });
  return score;
}

// 단순 글자 카운트(표면 8자) — 차트/오행 개수 표기용
export function simpleElementCount(pillars) {
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  ['year', 'month', 'day', 'hour'].forEach(k => {
    const [s, b] = pillars[k];
    if (s) count[STEM_ELEM[s]]++;
    if (b) count[BRANCH_ELEM[b]]++;
  });
  return count;
}

// ───────────────────────── 신강/신약 ─────────────────────────
export function strength(pillars) {
  const dayStem = pillars.day[0];
  const dayElem = STEM_ELEM[dayStem];
  const inElem = Object.keys(SHENG).find(k => SHENG[k] === dayElem); // 나를 생하는 오행(인성)
  const dist = elementDistribution(pillars);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const support = dist[dayElem] + dist[inElem];       // 비겁 + 인성
  const ratio = total ? support / total : 0;

  // 월령 득령(월지가 나를 돕는 오행이면 가점)
  const monthElem = BRANCH_ELEM[pillars.month[1]];
  const wolryeong = monthElem === dayElem || monthElem === inElem;

  let level;
  if (ratio >= 0.55) level = '신강';
  else if (ratio >= 0.42) level = wolryeong ? '신강' : '중화';
  else if (ratio >= 0.30) level = '신약';
  else level = '극신약';

  return { level, ratio, support, total, dayElem, inElem, wolryeong, dist };
}

// ───────────────────────── 용신(억부+조후 간이) ─────────────────────────
export function yongsin(pillars) {
  const st = strength(pillars);
  const dayElem = st.dayElem;
  const inElem = st.inElem;                                  // 인성
  const outElem = SHENG[dayElem];                            // 식상(내가 생)
  const wealthElem = KE[dayElem];                            // 재성(내가 극)
  const officerElem = Object.keys(KE).find(k => KE[k] === dayElem); // 관성(나를 극)

  const strong = st.level === '신강' || st.level === '극신강';
  let primary, helper, reason;
  if (strong) {
    // 무엇 때문에 신강인가: 인성과다 vs 비겁과다
    const bijeop = st.dist[dayElem], inseong = st.dist[inElem];
    if (inseong >= bijeop) {
      primary = wealthElem; helper = outElem;          // 인성과다 → 재성으로 인성 극
      reason = '나를 도와주는 기운이 넘쳐서 힘이 센 편이니, 그 힘을 재물·활동으로 풀어내는 것이 좋습니다';
    } else {
      primary = officerElem; helper = outElem;          // 비겁과다 → 관성으로 비겁 극
      reason = '나와 같은 기운이 넘쳐서 힘이 센 편이니, 책임 있는 일과 재능을 펼치는 것으로 기운을 풀어내는 것이 좋습니다';
    }
  } else {
    // 무엇 때문에 신약인가: 식상/재성/관성 중 최대 세력
    const out = st.dist[outElem], we = st.dist[wealthElem], off = st.dist[officerElem];
    const maxDrain = Math.max(out, we, off);
    if (off === maxDrain && off > 0) {
      primary = inElem; helper = dayElem;               // 관살과다 → 인성(살인상생)
      reason = '책임·압박의 기운이 강해 힘이 부치는 편이니, 배움과 윗사람의 도움으로 나를 받쳐주는 것이 좋습니다';
    } else if (we === maxDrain && we > 0) {
      primary = dayElem; helper = inElem;               // 재다신약 → 비겁
      reason = '돈 들어올 자리는 많은데 감당할 힘이 부족한 편이니, 나와 같은 기운(자립심·협력자)으로 힘을 키우는 것이 좋습니다';
    } else {
      primary = inElem; helper = dayElem;               // 식상과다 → 인성
      reason = '재능을 쏟아내느라 기운이 새는 편이니, 배움과 휴식으로 채우고 나를 받쳐주는 것이 좋습니다';
    }
  }

  // 조후 보정 (한난조습) — 월지 계절로 한열을 조절
  const monthB = pillars.month[1];
  let johu = null, johuUrgent = false;
  if (['亥', '子', '丑'].includes(monthB) && st.dist['화'] < 1.6) {       // 겨울 → 따뜻한 화 필요
    johu = '화'; johuUrgent = (monthB === '子' || monthB === '丑');
  } else if (['巳', '午', '未'].includes(monthB) && st.dist['수'] < 1.6) { // 여름 → 시원한 수 필요
    johu = '수'; johuUrgent = (monthB === '午' || monthB === '未');
  } else if (['寅', '卯'].includes(monthB) && st.dist['화'] < 0.6) {      // 초봄 한기 → 화
    johu = '화';
  } else if (['申', '酉'].includes(monthB) && st.dist['화'] < 0.6 && st.dist['수'] > 2) {
    johu = '화';
  }
  // 조후가 용신 체계와 어긋나지 않으면 희신으로 끌어올림
  if (johuUrgent && johu && johu !== primary && johu !== helper) helper = johu;

  return { primary, helper, johu, johuUrgent, reason, method: '억부', strong, level: st.level, detail: st };
}

// ───────────────────────── 격국(월지 기준 간이) ─────────────────────────
export function gyeokguk(pillars) {
  const dayStem = pillars.day[0];
  const monthBranch = pillars.month[1];
  const mainGod = tenGodOfBranch(dayStem, monthBranch); // 월지 정기 십성

  // 월지 지장간이 천간에 투출했는지(본기·중기·여기 순)
  const topStems = [pillars.year[0], pillars.month[0], pillars.hour[0]]; // 일간 제외
  let chosen = null, chosenStem = null;
  for (const [hs] of HIDDEN_STEMS[monthBranch]) {
    if (topStems.includes(hs) && hs !== dayStem) { chosen = tenGodOfStem(dayStem, hs); chosenStem = hs; break; }
  }
  const godForGyeok = chosen || mainGod;

  // 비겁이면 건록/양인격
  let name;
  if (godForGyeok === '비견') name = '건록격';
  else if (godForGyeok === '겁재') name = '양인격';
  else name = godForGyeok + '격';

  return { name, baseGod: godForGyeok, transparent: !!chosen, mainGod, monthBranch };
}

// ───────────────────────── 절입일까지 일수(대운수) ─────────────────────────
function daysToTerm(sy, sm, sd, forward) {
  // 양력 기준. 월주(monthPillar)가 바뀌는 경계를 탐색
  const base = calculateSaju(sy, sm, sd, 12, 0).monthPillarHanja;
  const d = new Date(sy, sm - 1, sd);
  const step = forward ? 1 : -1;
  for (let i = 1; i <= 62; i++) {
    d.setDate(d.getDate() + step);
    const mp = calculateSaju(d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, 0).monthPillarHanja;
    if (mp !== base) {
      // 순행: i일 뒤가 새 절기 → 일수 = i
      // 역행: i일 전이 이전 절기 → 직전 절입일까지 = i - 1
      return forward ? i : i - 1;
    }
  }
  return 0;
}

// ───────────────────────── 대운 ─────────────────────────
export function computeDaeun(solar, pillars, gender) {
  // solar: {year, month, day}  (양력)
  const yangYear = STEM_YY[pillars.year[0]] === '양';
  // 양남음녀 순행 / 음남양녀 역행
  const forward = (yangYear && gender === 'male') || (!yangYear && gender === 'female');
  const days = daysToTerm(solar.year, solar.month, solar.day, forward);
  let startAge = Math.round(days / 3);
  if (startAge < 1) startAge = 1;

  const dayStem = pillars.day[0];
  let gz = ganzhiIndex(pillars.month[0], pillars.month[1]);
  const list = [];
  for (let i = 0; i < 10; i++) {
    gz = forward ? gz + 1 : gz - 1;
    const { stem, branch } = ganzhiFromIndex(gz);
    list.push({
      age: startAge + i * 10,
      endAge: startAge + i * 10 + 9,
      stem, branch,
      stemGod: tenGodOfStem(dayStem, stem),
      branchGod: tenGodOfBranch(dayStem, branch),
      stage: twelveStage(dayStem, branch),
    });
  }
  return { forward, startAge, days, list };
}

// ───────────────────────── 세운(연운) ─────────────────────────
export function yearPillar(year) {
  const i = ((year - 4) % 60 + 60) % 60;
  return { stem: STEMS[i % 10], branch: BRANCHES[i % 12] };
}

export function computeSeun(pillars, fromYear, count = 10) {
  const dayStem = pillars.day[0];
  const out = [];
  for (let y = fromYear; y < fromYear + count; y++) {
    const { stem, branch } = yearPillar(y);
    out.push({
      year: y, stem, branch,
      stemGod: tenGodOfStem(dayStem, stem),
      branchGod: tenGodOfBranch(dayStem, branch),
      stage: twelveStage(dayStem, branch),
    });
  }
  return out;
}

// ───────────────────────── 운(運) 길흉 판정 ─────────────────────────
// 오행 하나가 용신 체계에서 길한지
export function fortuneOfElement(elem, ys) {
  if (elem === ys.primary) return 2;          // 용신
  if (elem === ys.helper) return 1.5;         // 희신
  if (SHENG[elem] === ys.primary) return 1;   // 용신을 생함
  if (KE[elem] === ys.primary) return -2;     // 용신을 극함(기신)
  if (KE[elem] === ys.helper) return -1;      // 희신을 극함
  return 0;
}
// 간지(천간+지지)의 종합 길흉
export function rateGanzhi(stem, branch, ys) {
  const sf = fortuneOfElement(STEM_ELEM[stem], ys);
  const bf = fortuneOfElement(BRANCH_ELEM[branch], ys);
  const score = sf + bf * 1.2; // 지지(현실) 비중 약간 ↑
  let level, mark;
  if (score >= 3) { level = '대길'; mark = '◎'; }
  else if (score >= 1) { level = '길'; mark = '○'; }
  else if (score > -1) { level = '평'; mark = '–'; }
  else if (score > -3) { level = '주의'; mark = '△'; }
  else { level = '흉'; mark = '✕'; }
  return { score, level, mark };
}

// 만나이 (기준일 기준)
export function ageAt(solar, refDate) {
  let age = refDate.getFullYear() - solar.year;
  const m = refDate.getMonth() + 1, d = refDate.getDate();
  if (m < solar.month || (m === solar.month && d < solar.day)) age--;
  return age;
}

// ───────────────────────── 신살 ─────────────────────────
const CHEONEUL = { // 천을귀인 (일간 기준)
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  辛: ['寅', '午'], 壬: ['巳', '卯'], 癸: ['巳', '卯'],
};
// 삼합 그룹 기준 신살
const SAMHAP = { // 지지 → [도화, 역마, 화개]
  寅: ['卯', '申', '戌'], 午: ['卯', '申', '戌'], 戌: ['卯', '申', '戌'],
  申: ['酉', '寅', '辰'], 子: ['酉', '寅', '辰'], 辰: ['酉', '寅', '辰'],
  巳: ['午', '亥', '丑'], 酉: ['午', '亥', '丑'], 丑: ['午', '亥', '丑'],
  亥: ['子', '巳', '未'], 卯: ['子', '巳', '未'], 未: ['子', '巳', '未'],
};
const YANGIN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }; // 양인(양간)
const GWAEGANG = ['庚辰', '庚戌', '壬辰', '壬戌', '戊戌']; // 괴강
const BAEKHO = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑']; // 백호

export function computeSinsal(pillars) {
  const dayStem = pillars.day[0];
  const allBranches = [pillars.year[1], pillars.month[1], pillars.day[1], pillars.hour[1]];
  const found = [];
  const add = (name, pos, desc) => found.push({ name, pos, desc });

  // 천을귀인
  const cheoneul = CHEONEUL[dayStem] || [];
  allBranches.forEach((b, i) => {
    if (cheoneul.includes(b)) add('천을귀인', POS[i], '하늘이 돕는 최고 길신. 위기에 귀인의 조력을 받는다.');
  });

  // 도화/역마/화개 — 일지·연지 기준
  [['day', pillars.day[1]], ['year', pillars.year[1]]].forEach(([key, baseB]) => {
    const sam = SAMHAP[baseB];
    if (!sam) return;
    const [do_, yeok, hwa] = sam;
    allBranches.forEach((b, i) => {
      if (b === do_) add('도화살', POS[i], '매력·인기·이성운. 끼와 예술성이 있으나 구설 주의.');
      if (b === yeok) add('역마살', POS[i], '이동·변동·해외·활동성. 한곳에 머물지 않는 기운.');
      if (b === hwa) add('화개살', POS[i], '예술·학문·종교·고독. 재주가 많고 사색적.');
    });
  });

  // 양인
  if (YANGIN[dayStem]) {
    allBranches.forEach((b, i) => {
      if (b === YANGIN[dayStem]) add('양인살', POS[i], '강한 추진력·결단력. 과하면 극단·다툼. 무관/기술직에 길.');
    });
  }

  // 괴강·백호 (일주 중심으로 표기, 각 주 확인)
  ['year', 'month', 'day', 'hour'].forEach((k, i) => {
    const gz = pillars[k][0] + pillars[k][1];
    if (GWAEGANG.includes(gz)) add('괴강살', POS[i], '총명·카리스마·극단성. 리더십 강하나 굴곡도 큼.');
    if (BAEKHO.includes(gz)) add('백호살', POS[i], '강렬한 기운·전문성. 피를 보는 직업(의료·법·군경)에 발현.');
  });

  // 중복 제거
  const uniq = [];
  const seen = new Set();
  found.forEach(f => {
    const key = f.name + f.pos;
    if (!seen.has(key)) { seen.add(key); uniq.push(f); }
  });
  return uniq;
}
const POS = ['연주', '월주', '일주', '시주'];

// ───────────────────────── 합·충·형 ─────────────────────────
const STEM_HAP = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const STEM_HAP_ELEM = { 甲己: '토', 乙庚: '금', 丙辛: '수', 丁壬: '목', 戊癸: '화' };
const STEM_CHUNG = { 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' };
const YUKHAP = { 子丑: '토', 丑子: '토', 寅亥: '목', 亥寅: '목', 卯戌: '화', 戌卯: '화', 辰酉: '금', 酉辰: '금', 巳申: '수', 申巳: '수', 午未: '화', 未午: '화' };
const YUKCHUNG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const SAMHAP3 = [['申', '子', '辰', '수', '子'], ['寅', '午', '戌', '화', '午'], ['巳', '酉', '丑', '금', '酉'], ['亥', '卯', '未', '목', '卯']];
const BANGHAP = [['寅', '卯', '辰', '목'], ['巳', '午', '未', '화'], ['申', '酉', '戌', '금'], ['亥', '子', '丑', '수']];
const SAMHYEONG = [['寅', '巳', '申', '지세지형(은혜를 잊는 형)'], ['丑', '戌', '未', '무은지형(세력을 믿는 형)']];
const JAHYEONG = ['辰', '午', '酉', '亥'];

function hapElem(a, b) { return STEM_HAP_ELEM[a + b] || STEM_HAP_ELEM[b + a]; }
function isChung(a, b) { return YUKCHUNG.some(([x, y]) => (a === x && b === y) || (a === y && b === x)); }

export function computeRelations(pillars) {
  const stems = ['year', 'month', 'day', 'hour'].map(k => pillars[k][0]);
  const branches = ['year', 'month', 'day', 'hour'].map(k => pillars[k][1]);
  const rel = [];

  // 천간 합/충 (전체 쌍) — layer:'천간'(심리·생각), positions로 궁위 추적
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if (STEM_HAP[stems[i]] === stems[j])
      rel.push({ kind: '합', type: '천간합', layer: '천간', glyphs: `${stems[i]}${stems[j]}`, where: `${POS[i]}·${POS[j]}`, positions: [i, j], result: hapElem(stems[i], stems[j]), good: true });
    if (STEM_CHUNG[stems[i]] === stems[j])
      rel.push({ kind: '충', type: '천간충', layer: '천간', glyphs: `${stems[i]}${stems[j]}`, where: `${POS[i]}·${POS[j]}`, positions: [i, j], good: false });
  }
  // 지지 육합/육충 — layer:'지지'(현실·사건)
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = branches[i], b = branches[j];
    if (YUKHAP[a + b]) rel.push({ kind: '합', type: '육합', layer: '지지', glyphs: `${a}${b}`, where: `${POS[i]}·${POS[j]}`, positions: [i, j], result: YUKHAP[a + b], good: true });
    if (isChung(a, b)) rel.push({ kind: '충', type: '지지충', layer: '지지', glyphs: `${a}${b}`, where: `${POS[i]}·${POS[j]}`, positions: [i, j], good: false });
  }
  // 삼합·반합 (왕지 포함 2개 = 반합)
  SAMHAP3.forEach(([a, b, c, el, wang]) => {
    const set = [a, b, c];
    const have = set.filter(x => branches.includes(x));
    if (have.length === 3) rel.push({ kind: '합', type: '삼합', glyphs: `${a}${b}${c}`, where: '지지', result: el, good: true, strong: true });
    else if (have.length === 2 && have.includes(wang)) rel.push({ kind: '합', type: '반합', glyphs: have.join(''), where: '지지', result: el, good: true });
  });
  // 방합 (3개 완성만)
  BANGHAP.forEach(([a, b, c, el]) => {
    if ([a, b, c].every(x => branches.includes(x))) rel.push({ kind: '합', type: '방합', glyphs: `${a}${b}${c}`, where: '지지', result: el, good: true, strong: true });
  });
  // 삼형
  SAMHYEONG.forEach(([a, b, c, name]) => {
    if ([a, b, c].every(x => branches.includes(x))) rel.push({ kind: '형', type: '삼형', glyphs: `${a}${b}${c}`, where: '지지', desc: name, good: false });
  });
  // 子卯 상형
  if (branches.includes('子') && branches.includes('卯')) rel.push({ kind: '형', type: '상형', glyphs: '子卯', where: '지지', desc: '무례지형', good: false });
  // 자형 (같은 글자 2개 이상)
  JAHYEONG.forEach(x => { if (branches.filter(b => b === x).length >= 2) rel.push({ kind: '형', type: '자형', glyphs: `${x}${x}`, where: '지지', good: false }); });

  return rel;
}

// ───────────────────────── 오늘 일진 ─────────────────────────
export function computeToday(pillars, ys, refDate) {
  const t = refDate || new Date();
  const raw = calculateSaju(t.getFullYear(), t.getMonth() + 1, t.getDate(), 12, 0);
  const stem = raw.dayPillarHanja[0], branch = raw.dayPillarHanja[1];
  const dayStem = pillars.day[0];
  const myBranch = pillars.day[1], myYearBranch = pillars.year[1];
  // 오늘 지지와 내 일지/연지의 관계
  const interplay = [];
  if (isChung(branch, myBranch)) interplay.push('일지충(변동·이동·다툼 주의)');
  else if (YUKHAP[branch + myBranch]) interplay.push('일지합(인연·협력·안정)');
  if (isChung(branch, myYearBranch)) interplay.push('연지충');
  return {
    date: { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() },
    stem, branch,
    stemGod: tenGodOfStem(dayStem, stem),
    branchGod: tenGodOfBranch(dayStem, branch),
    stage: twelveStage(dayStem, branch),
    fortune: rateGanzhi(stem, branch, ys),
    interplay,
  };
}

// ───────────────────────── 궁합 (2인 비교) ─────────────────────────
export function compatibility(A, B) {
  const ae = STEM_ELEM[A.dayStem], be = STEM_ELEM[B.dayStem];

  // 1) 일간(나 자신) 오행 관계
  let stemRel, stemScore, stemDesc;
  if (ae === be) {
    stemRel = '비슷한 기질'; stemScore = 72;
    stemDesc = '두 사람의 타고난 기운이 같아 가치관과 성향이 비슷합니다. 친구처럼 편하지만, 닮은 만큼 고집이 부딪힐 수 있습니다.';
  } else if (SHENG[be] === ae) {
    stemRel = '상대가 나를 북돋아 줌'; stemScore = 86;
    stemDesc = '상대의 기운이 나를 북돋아 줍니다. 상대에게 받고 기대게 되는, 편안하고 보살핌받는 인연입니다.';
  } else if (SHENG[ae] === be) {
    stemRel = '내가 상대를 북돋아 줌'; stemScore = 80;
    stemDesc = '내 기운이 상대를 살려 줍니다. 내가 베풀고 이끄는 사이로, 헌신적이지만 한쪽으로만 기울지 않게 균형이 필요합니다.';
  } else if (KE[be] === ae) {
    stemRel = '상대가 나를 누르는 편'; stemScore = 56;
    stemDesc = '상대에게 끌리면서도 약간의 긴장이 흐릅니다. 적당하면 좋은 자극이 되지만, 과하면 눌리는 느낌을 받을 수 있습니다.';
  } else {
    stemRel = '내가 상대를 이끄는 편'; stemScore = 58;
    stemDesc = '내가 주도하는 사이입니다. 상대를 이끌되, 배려가 없으면 상대가 답답해할 수 있습니다.';
  }

  // 2) 일지(배우자궁) 합·충
  const aB = A.pillars.day[1], bB = B.pillars.day[1];
  const _ai = BRANCHES.indexOf(aB), _bi = BRANCHES.indexOf(bB);
  const _HAPIDX = { '0,1': '토', '2,11': '목', '3,10': '화', '4,9': '금', '5,8': '수', '6,7': '화' };
  const hap = _HAPIDX[[_ai, _bi].sort((x, y) => x - y).join(',')] || null;
  const chung = Math.abs(_ai - _bi) === 6;
  let branchRel, branchScore, branchDesc;
  if (hap) {
    branchRel = '마음 자리가 딱 맞음'; branchScore = 92;
    branchDesc = '배우자 자리가 서로 착 맞아떨어지는 천생연분형입니다. 함께 있으면 안정되고 끌어당기는 힘이 강합니다.';
  } else if (chung) {
    branchRel = '마음 자리가 부딪힘'; branchScore = 42;
    branchDesc = '배우자 자리가 서로 부딪힙니다. 강하게 끌리지만 다툼·변동이 잦으니, 서로의 공간을 존중하는 노력이 필요합니다.';
  } else if (aB === bB) {
    branchRel = '생활 코드가 같음'; branchScore = 72;
    branchDesc = '배우자 자리가 같아 생활 습관·취향이 잘 맞습니다.';
  } else {
    branchRel = '무난함'; branchScore = 64;
    branchDesc = '배우자 자리에 특별한 끌림이나 부딪힘이 없어, 무난하고 담담한 관계입니다.';
  }

  // 3) 오행 보완 (서로의 부족을 채워주는가)
  const aZero = ELEM_LIST.filter(e => A.elementCount[e] === 0);
  const bZero = ELEM_LIST.filter(e => B.elementCount[e] === 0);
  const bFillsA = aZero.filter(e => B.elementCount[e] >= 2);
  const aFillsB = bZero.filter(e => A.elementCount[e] >= 2);
  const complementCount = bFillsA.length + aFillsB.length;
  const complementScore = Math.min(95, 58 + complementCount * 14);

  // 4) 십성(서로에게 어떤 존재인가)
  const aToB = tenGodOfStem(A.dayStem, B.dayStem); // 나(A) 기준 상대(B)
  const bToA = tenGodOfStem(B.dayStem, A.dayStem); // 상대(B) 기준 나(A)

  // 남녀 배우자성 매칭(A남↔B녀 등)
  let spouseMatch = false, spouseDesc = '';
  const aSpouse = A.gender === 'male' ? '재성' : '관성';
  const bSpouse = B.gender === 'male' ? '재성' : '관성';
  if (TENGOD_GROUP[aToB] === aSpouse && TENGOD_GROUP[bToA] === bSpouse) {
    spouseMatch = true;
    spouseDesc = '서로가 서로에게 자연스러운 이성으로 작용하는, 부부 인연이 깊은 조합입니다.';
  } else if (TENGOD_GROUP[aToB] === aSpouse || TENGOD_GROUP[bToA] === bSpouse) {
    spouseDesc = '한쪽에게 상대가 자연스러운 이성으로 작용해, 이성으로서의 끌림이 있는 인연입니다.';
  }

  const score = Math.round(stemScore * 0.32 + branchScore * 0.4 + complementScore * 0.28 + (spouseMatch ? 4 : 0));

  return {
    score: Math.max(20, Math.min(98, score)),
    stem: { rel: stemRel, score: stemScore, desc: stemDesc },
    branch: { rel: branchRel, score: branchScore, desc: branchDesc },
    complement: { count: complementCount, bFillsA, aFillsB, score: complementScore },
    sipseong: { aToB, bToA, spouseMatch, spouseDesc },
  };
}

// ───────────────────────── 통합 계산 ─────────────────────────
export function buildChart({ year, month, day, hour, minute, isLunar, isLeap, gender, hourUnknown }) {
  let sy = year, sm = month, sd = day;
  if (isLunar) {
    const s = lunarToSolar(year, month, day, isLeap);
    sy = s.solar.year; sm = s.solar.month; sd = s.solar.day;
  }
  const h = hourUnknown ? 12 : hour;
  const mi = hourUnknown ? 0 : minute;
  const raw = calculateSaju(sy, sm, sd, h, mi);

  const pillars = {
    year: [raw.yearPillarHanja[0], raw.yearPillarHanja[1]],
    month: [raw.monthPillarHanja[0], raw.monthPillarHanja[1]],
    day: [raw.dayPillarHanja[0], raw.dayPillarHanja[1]],
    hour: [raw.hourPillarHanja[0], raw.hourPillarHanja[1]],
  };
  const solar = { year: sy, month: sm, day: sd };
  const dayStem = pillars.day[0];

  // 각 기둥 분석
  const pillarInfo = {};
  ['year', 'month', 'day', 'hour'].forEach(k => {
    const [s, b] = pillars[k];
    pillarInfo[k] = {
      stem: s, branch: b,
      stemKo: STEM_KO[s], branchKo: BRANCH_KO[b],
      stemElem: STEM_ELEM[s], branchElem: BRANCH_ELEM[b],
      stemGod: k === 'day' ? '일간(我)' : tenGodOfStem(dayStem, s),
      branchGod: tenGodOfBranch(dayStem, b),
      stage: twelveStage(dayStem, b),
      stageLevel: STAGE_STRENGTH[twelveStage(dayStem, b)],
      hidden: HIDDEN_STEMS[b].map(([hs]) => hs),
    };
  });

  // 십성 분포 카운트(표면 8자, 일간 제외 7자 + 지지정기)
  const godCount = {};
  ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].forEach(g => godCount[g] = 0);
  ['year', 'month', 'hour'].forEach(k => { godCount[tenGodOfStem(dayStem, pillars[k][0])]++; });
  ['year', 'month', 'day', 'hour'].forEach(k => { godCount[tenGodOfBranch(dayStem, pillars[k][1])]++; });

  const groupCount = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  Object.entries(godCount).forEach(([g, c]) => { groupCount[TENGOD_GROUP[g]] += c; });

  const st = strength(pillars);
  const ys = yongsin(pillars);
  const gg = gyeokguk(pillars);
  const sinsal = computeSinsal(pillars);
  const daeun = computeDaeun(solar, pillars, gender);
  const today = new Date();
  const curAge = ageAt(solar, today);
  const seun = computeSeun(pillars, today.getFullYear(), 11);

  // 대운·세운에 길흉 등급 부여
  daeun.list.forEach(d => { d.fortune = rateGanzhi(d.stem, d.branch, ys); });
  seun.forEach(s => { s.fortune = rateGanzhi(s.stem, s.branch, ys); });
  // 현재 대운 인덱스
  daeun.currentIdx = daeun.list.findIndex(d => curAge >= d.age && curAge <= d.endAge);

  const relations = computeRelations(pillars);
  const todayLuck = computeToday(pillars, ys, today);

  return {
    raw, solar, pillars, pillarInfo, dayStem,
    elementCount: simpleElementCount(pillars),
    elementDist: elementDistribution(pillars),
    godCount, groupCount,
    strength: st, yongsin: ys, gyeokguk: gg, sinsal,
    daeun, seun, curAge, gender,
    relations, todayLuck,
    today,
  };
}
