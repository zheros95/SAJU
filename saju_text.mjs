// saju_text.mjs
// 명식 계산 결과(saju_engine)를 받아 사람이 읽는 해설 텍스트를 생성한다.
// 종합 / 재물·직업·연애·건강운 / 과거·올해·향후10년 / 오늘 / 합충형 / 궁합.
// 말투: 정중한 존댓말 + 어려운 한자어는 쉬운 말로 풀고 용어는 괄호로만 보조.

import { STEM_KO, BRANCH_KO, BRANCH_ANIMAL, ELEM_HANJA, STEM_ELEM, TENGOD_GROUP, compatibility, godGroupOfElement } from './saju_engine.mjs?v=11';

// 십성(10가지 기운)을 한 단어 쉬운 말로
const GOD_EASY = {
  비견: '자립심', 겁재: '경쟁심·추진력', 식신: '표현·재능', 상관: '끼·표현력',
  편재: '사업·재물', 정재: '안정적 재물', 편관: '추진·결단', 정관: '명예·책임',
  편인: '직관·아이디어', 정인: '공부·도움복',
};
const godEasy = (g) => GOD_EASY[g] || g;
// 그룹(5가지)을 쉬운 말로
const GRP_EASY = { 비겁: '자립심과 경쟁심', 식상: '표현력과 재능', 재성: '재물과 활동력', 관성: '명예와 책임감', 인성: '배움과 포용력' };
// 오행 이미지
const ELEM_IMG = { 목: '나무', 화: '불', 토: '흙', 금: '쇠·바위', 수: '물' };

// ───────────────────────── 데이터 ─────────────────────────
export const TENGOD_INFO = {
  비견: { key: '자립심이 강하고 주관이 뚜렷한', job: '전문직·프리랜서·동업처럼 남에게 휘둘리지 않는 일', personality: '자존감이 높고 독립적이며 주관이 뚜렷합니다.', excess: '고집이 세지고 재물을 두고 경쟁이 생기기 쉽습니다.' },
  겁재: { key: '승부욕 있고 활동적인', job: '영업·사업·스포츠·투자처럼 경쟁이 있는 일', personality: '승부욕과 추진력이 강하고 활동적입니다.', excess: '무리한 투자·동업 갈등으로 손실이 나기 쉽습니다.' },
  식신: { key: '느긋하고 재주가 많은', job: '연구·요리·교육·기술·콘텐츠 만드는 일', personality: '낙천적이고 한 분야를 깊이 파는 재능이 있습니다.', excess: '편해지면 나태해져 추진력이 떨어질 수 있습니다.' },
  상관: { key: '표현력 좋고 자유로운', job: '강연·방송·예술·영업·전문기술', personality: '표현력과 끼가 뛰어나고 머리 회전이 빠릅니다.', excess: '틀을 거부해 구설·시비를 부를 수 있습니다.' },
  편재: { key: '활동적이고 통이 큰', job: '사업·무역·투자·유통·영업', personality: '돈의 흐름을 읽는 감각이 좋고 사람을 잘 다룹니다.', excess: '돈과 이성 문제로 분주해지기 쉽습니다.' },
  정재: { key: '성실하고 알뜰한', job: '회계·금융·관리·실무·자산운용', personality: '성실하고 꼼꼼하며 신용을 지킵니다.', excess: '지나치게 아끼거나 돈에 얽매일 수 있습니다.' },
  편관: { key: '카리스마 있고 추진력이 강한', job: '군인·경찰·검찰·정치·외과·위기관리', personality: '강한 추진력과 위기 돌파력, 카리스마가 있습니다.', excess: '압박감·사고·구설에 시달릴 수 있습니다.' },
  정관: { key: '반듯하고 책임감이 강한', job: '공무원·대기업·법무·행정·관리직', personality: '반듯하고 책임감이 강하며 규율을 지킵니다.', excess: '원칙에 갇혀 융통성이 떨어질 수 있습니다.' },
  편인: { key: '독특하고 직관이 뛰어난', job: '종교·역학·의료·예술·연구·기술', personality: '남다른 통찰과 순발력이 뛰어납니다.', excess: '변덕·고독이 생기고 끝맺음이 약할 수 있습니다.' },
  정인: { key: '따뜻하고 배움을 좋아하는', job: '교육·연구·행정·자격증 전문직', personality: '배움을 좋아하고 수용적이며 보살피는 마음이 큽니다.', excess: '생각만 많고 실행이 느려질 수 있습니다.' },
};

export const ELEM_INFO = {
  목: { nature: '어질고 성장하는 기운', organ: '간·쓸개, 신경·근육, 눈', excess: '스트레스·근육 긴장·화 조절', lack: '결단력·추진력이 떨어지기 쉬움' },
  화: { nature: '예의 바르고 열정적인 기운', organ: '심장·소장, 혈관, 정신', excess: '심장 부담·불면·조급함', lack: '순환이 약하고 의욕이 떨어지기 쉬움' },
  토: { nature: '믿음직하고 포용하는 기운', organ: '비장·위장 등 소화기', excess: '소화불량·체중 증가', lack: '소화력이 약하고 잔걱정이 많아지기 쉬움' },
  금: { nature: '의리 있고 결단력 있는 기운', organ: '폐·대장, 호흡기·피부', excess: '호흡기·피부 긴장, 지나친 예민함', lack: '폐·대장이 약하고 환절기에 취약하기 쉬움' },
  수: { nature: '지혜롭고 유연한 기운', organ: '콩팥·방광, 생식·호르몬·뼈', excess: '콩팥·방광 부담·부종·냉증', lack: '체력·정력이 떨어지기 쉬움' },
};

// 격국 = 타고난 '그릇·역할'
export const GYEOKGUK_INFO = {
  식신격: '한 분야를 꾸준히 파면 전문성과 먹고사는 복이 따르는 그릇입니다. 연구·표현에 강합니다.',
  상관격: '재능과 표현력이 무기인 그릇입니다. 전문기술·예술·말솜씨로 두각을 냅니다.',
  정재격: '성실하게 차근차근 모으는 데 강한 그릇입니다. 안정적인 돈 관리에 능합니다.',
  편재격: '활동 범위가 넓고 큰돈을 다루는 그릇입니다. 사업·투자에 어울립니다.',
  정관격: '조직과 공직에서 신뢰와 자리를 얻는 그릇입니다. 반듯하고 책임감이 강합니다.',
  편관격: '결단력과 카리스마로 위기를 다루는 그릇입니다. 전문직·관리에 강합니다.',
  정인격: '배움과 명예, 자격증으로 길을 여는 그릇입니다.',
  편인격: '남다른 감각과 순발력이 무기인 그릇입니다. 독창적 전문성이 강점입니다.',
  건록격: '스스로의 힘으로 일어서는 그릇입니다. 자수성가하며 실력으로 인정받습니다.',
  양인격: '기운이 강하고 밀어붙이는 힘이 센 그릇입니다. 기술·전문직에 어울립니다.',
  월겁격: '내 기운과 동료의 기운이 강한 그릇입니다. 경쟁 속에서 스스로 일어서되, 동업·분배는 신중해야 합니다.',
};

// 십이운성 = 그 시기 '나의 기운 세기' 단계
export const STAGE_INFO = {
  장생: '새로 솟아나는 기운, 시작과 도움을 받는 때', 목욕: '아직 서툴고 변동이 많은 때', 관대: '제법 무르익어 자기 목소리를 내는 때', 건록: '홀로 서서 성취를 이루는 때',
  제왕: '기운이 가장 강한 절정의 때', 쇠: '정점을 지나 안정과 내실을 다지는 때', 병: '활동력이 떨어져 재정비하는 때', 사: '기운이 가라앉아 조용한 때',
  묘: '갈무리하고 쉬어가는 때', 절: '한번 끊고 새로 준비하는 때', 태: '새 기운이 잉태되는 때', 양: '차근차근 자라나는 때',
};

// ───────────────────────── 궁위(자리)·육친(가족) ─────────────────────────
// 네 기둥이 각각 맡는 인생 영역과 시기
const GUNG = {
  year: { name: '연주', label: '뿌리·집안 자리', life: '조상·부모 윗대와 어린 시절(0~20세 무렵), 타고난 환경과 사회적 뿌리' },
  month: { name: '월주', label: '사회·부모 자리', life: '부모·형제와 한창때(20~40대), 직장과 사회활동의 핵심 무대' },
  day: { name: '일주', label: '나·배우자 자리', life: '나 자신과 배우자, 가정, 인생의 중심(중년기)' },
  hour: { name: '시주', label: '자식·말년 자리', life: '자식과 아랫사람, 노년기(60세~), 미래의 꿈과 결실' },
};
// 십성이 뜻하는 가족(성별에 따라 달라지는 것 위주)
function familyOf(god, male) {
  const m = {
    비견: '형제·친구·동료', 겁재: '형제·경쟁자',
    식신: male ? '아랫사람·제자' : '딸·자식', 상관: male ? '아랫사람·제자' : '자식',
    편재: male ? '아버지·애인' : '아버지·재물', 정재: male ? '아내·재물' : '재물',
    편관: male ? '자식' : '애인·남자친구', 정관: male ? '자식·직장' : '남편',
    편인: '이모·계모(문서)', 정인: '어머니(문서·공부)',
  };
  return m[god] || '';
}
// 받침에 맞춰 조사 붙이기
const hasJong = (s) => (s.charCodeAt(s.length - 1) - 0xac00) % 28 !== 0;
const wa = (s) => s + (hasJong(s) ? '과' : '와');
const ira = (s) => s + (hasJong(s) ? '이라' : '라');
// 십이운성 강약을 한 줄로
function stageSentence(stage, level) {
  const lv = { 강: '힘이 꽉 실려 있어', 중: '힘이 보통이라', 약: '힘이 빠져 있어' }[level];
  return `이 자리의 기운은 '${stage}' 단계로 ${lv}`;
}

// 명식 글자별 풀이 — 자리(궁위) × 십성 × 십이운성 강약을 겹쳐 본다
export function pillarReadings(c) {
  const male = c.gender === 'male';
  const order = ['hour', 'day', 'month', 'year']; // 화면 순서: 시-일-월-연
  return order.map(k => {
    const p = c.pillarInfo[k], g = GUNG[k];
    const lines = [];
    if (k === 'day') {
      // 일주: 천간=나, 지지=배우자궁
      lines.push(`천간(겉으로 드러나는 나)은 <b>${p.stem}(${p.stemKo}${p.stemElem})</b> — 이 글자가 바로 '나 자신'입니다.`);
      const bg = godEasy(p.branchGod);
      lines.push(`지지(배우자·가정 자리)는 <b>${p.branch}(${p.branchKo})</b>, 기운은 <b>${bg}</b>${hasJong(bg) ? '이라' : '라'} 배우자는 「${TENGOD_INFO[p.branchGod]?.key || ''}」 사람과 인연이 깊습니다. ${stageSentence(p.stage, p.stageLevel)}, 가정운이 그만큼 ${p.stageLevel === '강' ? '단단합니다' : p.stageLevel === '약' ? '여리니 더 보살펴야 합니다' : '무난합니다'}.`);
    } else {
      const sg = godEasy(p.stemGod), bg = godEasy(p.branchGod);
      lines.push(`천간(겉·심리)은 <b>${p.stem}(${p.stemKo}${p.stemElem})·${sg}</b> — ${TENGOD_INFO[p.stemGod]?.personality || ''} 가족으로는 ${wa(familyOf(p.stemGod, male))} 관련됩니다.`);
      lines.push(`지지(속·현실)는 <b>${p.branch}(${p.branchKo})·${bg}</b>. ${stageSentence(p.stage, p.stageLevel)}, 이 자리가 뜻하는 ${shortLife(k)} 영역에 기운이 ${p.stageLevel === '강' ? '강하게 실립니다' : p.stageLevel === '약' ? '약하게 작용합니다' : '무난히 작용합니다'}.`);
    }
    return { key: k, gung: g.name, label: g.label, life: g.life, stem: p.stem, branch: p.branch, lines };
  });
}
function shortLife(k) {
  return { year: '집안·초년', month: '사회·직장', hour: '자식·말년' }[k] || '';
}

// 운에서 들어오는 기운의 테마(쉬운 말)
export function godTheme(god) {
  const grp = TENGOD_GROUP[god];
  const map = {
    비겁: '경쟁·독립·사람 관계, 그리고 돈을 나누는 일이 화두가 됩니다. 이직·창업·동업을 고민하기 쉬운 시기입니다.',
    식상: '내 재능과 끼를 밖으로 펼치는 기운입니다. 진로 변화·창작·새 도전이 활발하고, 여성은 출산과도 관련됩니다.',
    재성: '돈과 사업, 활동의 기운입니다. 벌고 쓰는 일이 활발해지고, 남성은 이성 인연과도 관련됩니다.',
    관성: '직장·명예·책임의 기운입니다. 승진·시험·조직 변화가 일어나기 쉽고, 여성은 결혼과도 관련됩니다.',
    인성: '공부·자격·문서·안정의 기운입니다. 배움·시험·부동산·계약, 그리고 윗사람이나 귀인의 도움이 따릅니다.',
  };
  return map[grp] || '';
}

const grade = (s) => s >= 78 ? { label: '매우 좋음', cls: 'g5' } : s >= 64 ? { label: '좋음', cls: 'g4' } : s >= 48 ? { label: '보통', cls: 'g3' } : s >= 36 ? { label: '주의', cls: 'g2' } : { label: '약함', cls: 'g1' };
const clamp = (s) => Math.max(8, Math.min(96, Math.round(s)));

const gz = (s, b) => `${s}${b}(${STEM_KO[s]}${BRANCH_KO[b]})`;

// ───────────────────────── 종합 풀이 ─────────────────────────
export function comprehensiveSummary(c) {
  const lines = [];
  const day = c.pillarInfo.day;
  const st = c.strength, ys = c.yongsin, gg = c.gyeokguk;

  lines.push(`사주의 주인공인 '나'는 <b>${day.stem}${ELEM_HANJA[day.stemElem]}(${day.stemKo}${day.stemElem})</b> — '${ELEM_IMG[day.stemElem]}' 같은 기운으로 태어났습니다. 모든 풀이는 이 글자를 기준으로 합니다.`);

  // 격국(그릇)
  const ggDesc = GYEOKGUK_INFO[gg.name] || '타고난 사회적 역할을 뜻하는 그릇입니다.';
  lines.push(`타고난 그릇·역할(격국)은 <b>${gg.name}</b>입니다 — ${ggDesc}`);

  // 신강약(기운 세기)
  const strongTxt = {
    극신강: '기운이 한쪽으로 아주 강하게 쏠려 있습니다. 넘치는 힘을 밖으로 풀어내는 시기에 잘 풀립니다.',
    신강: '나를 받쳐주는 힘이 넉넉한 편입니다(신강). 주관과 추진력이 강하니, 가진 힘을 일·재능·베풂으로 쓰는 방향이 좋습니다.',
    중화: '받쳐주는 힘과 빼는 힘이 균형을 이룹니다(중화). 어떤 운이 와도 비교적 유연하게 적응합니다.',
    신약: '나를 받쳐주는 힘이 다소 부족한 편입니다(신약). 혼자보다 협력이 필요하고, 나를 도와주는 운이 올 때 크게 풀립니다.',
    극신약: '나를 받쳐주는 힘이 많이 부족합니다. 무리한 확장보다 내실·건강·귀인을 챙기는 편이 유리합니다.',
  };
  lines.push(`기운의 세기는 <b>${st.level}</b>입니다. ${strongTxt[st.level]}`);

  // 용신(도움 기운)
  let yLine = `나에게 가장 도움이 되는 기운은 <b>${ys.primary}(${ELEM_HANJA[ys.primary]})</b>, 그다음은 <b>${ys.helper}(${ELEM_HANJA[ys.helper]})</b>입니다. ${ys.reason}.`;
  if (ys.johu) {
    yLine += ys.johuUrgent
      ? ` 또 한겨울/한여름에 태어나, <b>${ys.johu}(${ELEM_HANJA[ys.johu]})</b> 기운으로 추위·더위의 균형을 잡는 것이 특히 중요합니다.`
      : ` 더해서 <b>${ys.johu}(${ELEM_HANJA[ys.johu]})</b> 기운이 있으면 계절의 균형이 맞아 더 좋습니다.`;
  }
  yLine += ` 이 기운(${ys.primary}·${ys.helper})이 들어오는 시기가 인생의 좋은 기회입니다.`;
  lines.push(yLine);

  // 가장 강한 기운
  const groups = Object.entries(c.groupCount).sort((a, b) => b[1] - a[1]);
  const topGrp = groups[0];
  if (topGrp[1] >= 3) {
    lines.push(`여러 기운 중 <b>${GRP_EASY[topGrp[0]]}</b>이(가) 가장 두드러집니다 — 이것이 인생을 이끄는 주된 힘입니다.`);
  }

  // 없는 오행
  const zero = Object.entries(c.elementCount).filter(([, v]) => v === 0).map(([k]) => k);
  if (zero.length) lines.push(`사주에 <b>${zero.map(z => z + ELEM_HANJA[z]).join('·')}</b> 기운은 겉으로 드러나 있지 않습니다. 이 기운이 맡는 부분은 운에서 채워질 때 비로소 살아납니다.`);

  return lines;
}

// ───────────────────────── 재물운 ─────────────────────────
export function wealthLuck(c) {
  const g = c.groupCount, ys = c.yongsin, lines = [];
  let s = 50;

  if (g.재성 >= 2) { s += 16; lines.push('돈을 벌고 굴리는 감각(재물의 기운)이 발달했습니다. 돈에 대한 욕구와 현실 감각이 뚜렷합니다.'); }
  else if (g.재성 === 1) { s += 6; lines.push('재물의 기운이 적당해서, 분수에 맞는 돈 관리가 잘 됩니다.'); }
  else { s -= 6; lines.push('돈을 직접 좇기보다 명예·전문성으로 가치를 쌓는 편이 유리합니다. 재물 운이 들어오는 시기에 기회가 열립니다.'); }

  if (g.식상 >= 1 && g.재성 >= 1) { s += 12; lines.push('재능을 발휘하면 그게 자연스럽게 수입으로 이어지는 좋은 짜임새입니다.'); }
  if (ys.strong && g.재성 >= 1) { s += 10; lines.push('기운이 든든해서 돈을 감당할 그릇이 충분합니다. 적극적으로 재물을 추구해도 좋습니다.'); }
  if (!ys.strong && g.재성 >= 2) { s -= 12; lines.push('돈 들어올 자리는 많은데 그걸 감당할 내 힘이 부족한 편입니다. 욕심내기보다 건강과 협력자를 먼저 챙기세요.'); }
  if (g.비겁 >= 3) { s -= 8; lines.push('나와 비슷한 기운이 강해, 재물을 두고 경쟁·분배가 생기기 쉽습니다. 동업·보증·공동투자는 신중해야 합니다.'); }
  if (godGroupOfElement(c.dayStem, ys.primary) === '재성' || TENGOD_GROUP[c.gyeokguk.baseGod] === '재성') s += 6;

  if (c.godCount.편재 > c.godCount.정재 && c.godCount.편재 >= 1) lines.push('사업·투자처럼 크게 움직이는 돈(편재)에 인연이 있습니다.');
  else if (c.godCount.정재 >= 1) lines.push('월급·임대처럼 꾸준하고 안정적인 돈(정재)에 강합니다.');

  const cur = c.daeun.list[c.daeun.currentIdx];
  if (cur && (TENGOD_GROUP[cur.stemGod] === '재성' || TENGOD_GROUP[cur.branchGod] === '재성')) {
    s += 8; lines.push(`지금의 큰 운(${gz(cur.stem, cur.branch)})에 재물의 기운이 들어와, 돈 관련 활동이 활발해지는 시기입니다.`);
  }
  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 직업운 ─────────────────────────
export function careerLuck(c) {
  const g = c.groupCount, lines = [];
  let s = 52;
  const gg = c.gyeokguk;
  lines.push(`타고난 그릇은 <b>${gg.name}</b> — ${GYEOKGUK_INFO[gg.name] || ''}`);

  if (g.관성 >= 1 && g.인성 >= 1) { s += 14; lines.push('직장운(명예·책임)과 공부운(배움·문서)이 서로 받쳐주는 좋은 짜임새라, 조직·공직·자격이 필요한 일에서 안정적으로 성장합니다.'); }
  if (g.식상 >= 2) { s += 10; lines.push('재능을 펼치는 기운이 강해, 기술·창작·교육·전문서비스처럼 내 능력을 직접 보여주는 일이 잘 맞습니다.'); }
  if (g.관성 >= 2) { s += 8; lines.push('명예·책임의 기운이 강해 조직·관리 직무에 어울리나, 책임과 압박을 잘 다스려야 합니다.'); }
  if (g.재성 >= 2) { s += 8; lines.push('재물·활동의 기운이 강해 사업·영업·금융처럼 성과가 눈에 보이는 일에 강합니다.'); }
  if (g.관성 === 0 && g.재성 === 0) { s -= 6; lines.push('조직 생활보다 전문성·기술·연구로 홀로 서는 길이 더 유리할 수 있습니다.'); }

  const topGod = Object.entries(c.godCount).sort((a, b) => b[1] - a[1])[0];
  if (topGod[1] >= 1) lines.push(`잘 맞는 분야: <b>${godEasy(topGod[0])}</b>의 기운이 강해 「${TENGOD_INFO[topGod[0]].job}」과(와) 인연이 깊습니다.`);

  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 연애·결혼운 ─────────────────────────
export function loveLuck(c) {
  const male = c.gender === 'male';
  const spouseGrp = male ? '재성' : '관성';
  const spouseName = male ? '이성(여성)을 뜻하는 기운' : '이성(남성)을 뜻하는 기운';
  const g = c.groupCount, lines = [];
  let s = 50;

  if (g[spouseGrp] >= 1 && g[spouseGrp] <= 2) { s += 14; lines.push(`${spouseName}이 알맞게 자리해, 이성 인연과 배우자 복이 무난합니다.`); }
  else if (g[spouseGrp] >= 3) { s += 4; lines.push(`${spouseName}이 다소 많아 이성 인연은 풍부하지만, 관계가 복잡해지지 않게 한 사람에게 집중하는 노력이 필요합니다.`); }
  else { s -= 8; lines.push(`${spouseName}이 약한 편이라 인연이 늦거나 적극적으로 다가가야 합니다. 그 기운이 들어오는 시기에 인연이 활발해집니다.`); }

  const dayBranchGod = c.pillarInfo.day.branchGod;
  lines.push(`배우자 자리(일지)는 <b>${BRANCH_KO[c.pillarInfo.day.branch]}(${c.pillarInfo.day.branch})</b>이고 그 기운은 <b>${godEasy(dayBranchGod)}</b>이라서, 「${TENGOD_INFO[dayBranchGod]?.key || ''}」 사람과 인연이 깊습니다.`);

  const dohwa = c.sinsal.find(x => x.name === '도화살');
  if (dohwa) { s += 6; lines.push('이성에게 끌리는 매력과 인기가 있습니다(도화살). 매력으로 잘 쓰면 좋지만, 괜한 구설은 조심하세요.'); }

  if (male && g.비겁 >= 3) { s -= 6; lines.push('나와 비슷한 기운이 강해 이성을 두고 경쟁이 생기기 쉬우니, 삼각관계·금전 얽힘을 주의하세요.'); }
  if (!male && g.식상 >= 3) { s -= 6; lines.push('표현·재능의 기운이 강해 배우자(남성)와 부딪히기 쉬우니, 기대치를 낮추고 배려하는 태도가 관계를 부드럽게 합니다.'); }

  const cur = c.daeun.list[c.daeun.currentIdx];
  if (cur && (TENGOD_GROUP[cur.stemGod] === spouseGrp || TENGOD_GROUP[cur.branchGod] === spouseGrp)) {
    s += 8; lines.push(`지금의 큰 운(${gz(cur.stem, cur.branch)})에 이성의 기운이 들어와, 인연·결혼·관계 변화가 활발한 시기입니다.`);
  }
  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 건강운 ─────────────────────────
export function healthLuck(c) {
  const dist = c.elementDist, lines = [];
  let s = 60;
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const maxE = entries[0], minE = entries[entries.length - 1];
  const total = Object.values(dist).reduce((a, b) => a + b, 0);

  const spread = maxE[1] - minE[1];
  if (spread <= 1.6) { s += 10; lines.push('다섯 기운(오행)이 비교적 고르게 갖춰져, 기본 체질이 균형 잡힌 편입니다.'); }
  else { s -= 8; lines.push('기운이 한쪽으로 치우쳐 있어, 강한 기운과 약한 기운에 해당하는 몸의 균형 관리가 필요합니다.'); }

  if (maxE[1] >= total * 0.34) lines.push(`<b>${maxE[0]}(${ELEM_HANJA[maxE[0]]})</b> 기운이 너무 강합니다 — ${ELEM_INFO[maxE[0]].excess}에 유의하세요. (관련: ${ELEM_INFO[maxE[0]].organ})`);
  const zeroElems = Object.entries(c.elementCount).filter(([, v]) => v === 0).map(([k]) => k);
  if (zeroElems.length) zeroElems.forEach(z => lines.push(`<b>${z}(${ELEM_HANJA[z]})</b> 기운이 약합니다 — ${ELEM_INFO[z].lack}. 관련 부위(${ELEM_INFO[z].organ})를 평소 돌보세요.`));
  else lines.push(`<b>${minE[0]}(${ELEM_HANJA[minE[0]]})</b> 기운이 상대적으로 약하니, 관련 부위(${ELEM_INFO[minE[0]].organ})를 신경 쓰면 좋습니다.`);

  if (c.sinsal.some(x => x.name === '백호살')) { s -= 4; lines.push('갑작스러운 사고·수술 등에 주의가 필요한 기운(백호살)이 있습니다. (의료·법·군경 같은 전문직에선 오히려 강점이 됩니다.)'); }

  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 지나온 운 ─────────────────────────
export function pastReading(c) {
  const past = c.daeun.list.filter((d, i) => i < c.daeun.currentIdx);
  const lines = [];
  if (!past.length) {
    lines.push('아직 첫 번째 큰 운에 들어서는 단계입니다. 인생의 본격적인 큰 흐름은 이제부터 펼쳐집니다.');
    return { lines, items: [] };
  }
  lines.push(`지금까지 <b>${past.length}번</b>의 큰 운(10년 단위로 바뀌는 흐름)을 지나오셨습니다. 인생의 무대가 10년마다 바뀌어 왔습니다.`);
  const items = past.map(d => ({
    range: `${d.age}~${d.endAge}세`,
    ganzhi: gz(d.stem, d.branch),
    god: `${d.stemGod}·${d.branchGod}`,
    fortune: d.fortune,
    theme: godTheme(d.stemGod),
  }));
  const best = [...past].sort((a, b) => b.fortune.score - a.fortune.score)[0];
  const worst = [...past].sort((a, b) => a.fortune.score - b.fortune.score)[0];
  if (best.fortune.score > 0) lines.push(`그중 <b>${best.age}~${best.endAge}세</b>는 도움 되는 기운이 들어와, 비교적 순풍이 불던 시기였습니다.`);
  if (worst.fortune.score < 0) lines.push(`반면 <b>${worst.age}~${worst.endAge}세</b>는 기운이 거슬러, 시련과 단련의 시기였을 수 있습니다.`);
  return { lines, items };
}

// ───────────────────────── 올해 운세 ─────────────────────────
export function yearReading(c) {
  const y = c.curSajuYear || c.today.getFullYear(); // 세운은 입춘 기준으로 바뀜
  const s = c.seun.find(x => x.year === y) || c.seun[0];
  const cur = c.daeun.list[c.daeun.currentIdx];
  const lines = [];
  lines.push(`<b>${y}년</b>은 <b>${BRANCH_ANIMAL[s.branch]}띠 해</b>(${gz(s.stem, s.branch)})입니다(사주의 해는 1월 1일이 아닌 <b>입춘</b>에 바뀝니다). 올해는 나에게 <b>${godEasy(s.stemGod)}</b>과(와) <b>${godEasy(s.branchGod)}</b>의 기운이 들어옵니다.`);
  lines.push(godTheme(s.stemGod));
  lines.push(`올해의 기운: <b>${s.fortune.level}</b> ${s.fortune.mark} — ${fortuneSentence(s.fortune.level)}`);
  if (cur) lines.push(`지금의 큰 운(${cur.age}~${cur.endAge}세)이라는 큰 흐름 위에서 올해 한 해가 흘러갑니다. 큰 운이 좋으면 한 해의 작은 굴곡도 무난히 넘기고, 큰 운이 험하면 한 해가 좋아도 신중함이 필요합니다.`);
  return { year: y, seun: s, lines };
}

// ───────────────────────── 앞으로 10년 ─────────────────────────
export function futureReading(c) {
  const lines = [];
  const idx = c.daeun.currentIdx;
  const cur = c.daeun.list[idx];
  const next = c.daeun.list[idx + 1];

  if (cur) {
    lines.push(`<b>지금의 큰 운: ${cur.age}~${cur.endAge}세</b> (${gz(cur.stem, cur.branch)}) · 기운 ${cur.fortune.level} ${cur.fortune.mark}`);
    lines.push(godTheme(cur.stemGod));
    lines.push(`지금 나의 기운 세기는 '${cur.stage}' 단계 — ${STAGE_INFO[cur.stage]}입니다.`);
  }
  if (next) {
    lines.push(`<b>다음 큰 운: ${next.age}~${next.endAge}세</b> (${gz(next.stem, next.branch)}) · 기운 ${next.fortune.level} ${next.fortune.mark}`);
    lines.push(`${next.age}세 무렵 인생의 무대가 한 번 더 바뀝니다. ${godTheme(next.stemGod)}`);
  }
  const goodYears = c.seun.filter(s => s.fortune.score >= 1).map(s => s.year);
  const badYears = c.seun.filter(s => s.fortune.score <= -1).map(s => s.year);
  if (goodYears.length) lines.push(`앞으로 10년 중 <b>${goodYears.join('·')}년</b>은 도움 되는 기운이 들어와 흐름이 좋은 해입니다. 중요한 일을 추진하기 좋습니다.`);
  if (badYears.length) lines.push(`반면 <b>${badYears.join('·')}년</b>은 기운이 거스르니, 크게 벌이기보다 지키며 가는 편이 좋습니다.`);
  return { current: cur, next, lines };
}

function fortuneSentence(level) {
  return {
    대길: '운이 활짝 열리는 해입니다. 노력한 만큼 크게 결실을 맺으니 적극적으로 도전하세요.',
    길: '흐름이 순조로워 하는 일에 도움이 따르는 해입니다.',
    평: '큰 굴곡 없이 무난한 해입니다. 기본에 충실하면 됩니다.',
    주의: '기운이 살짝 어긋나는 해입니다. 새로 크게 벌이기보다 지키고 점검하는 게 좋습니다.',
    흉: '운이 거스르는 해입니다. 무리한 결정·투자·다툼을 피하고 건강과 안전을 먼저 챙기세요.',
  }[level];
}

// 타임라인용 한 줄
export function daeunLine(d) { return { range: `${d.age}~${d.endAge}세`, ganzhi: gz(d.stem, d.branch), gods: `${d.stemGod}·${d.branchGod}`, stage: d.stage, fortune: d.fortune }; }
export function seunLine(s) { return { year: s.year, ganzhi: gz(s.stem, s.branch), animal: BRANCH_ANIMAL[s.branch], gods: `${s.stemGod}·${s.branchGod}`, fortune: s.fortune }; }

// ───────────────────────── 오늘 운세 ─────────────────────────
function dayTip(level) {
  return {
    대길: '일이 잘 풀리는 날입니다. 중요한 미팅·제안·결정에 적극적으로 나서기 좋습니다.',
    길: '순조로운 날입니다. 계획대로 진행하면 도움이 따릅니다.',
    평: '평범한 날입니다. 큰 기대보다 평소대로 하면 무난합니다.',
    주의: '컨디션·감정 기복에 유의하세요. 큰 결정이나 다툼은 한 박자 미루는 게 좋습니다.',
    흉: '마찰·실수가 생기기 쉬운 날입니다. 말과 행동을 삼가고 안전·건강을 챙기세요.',
  }[level];
}

export function todayReading(c) {
  const t = c.todayLuck;
  const lines = [];
  lines.push(`오늘 <b>${t.date.m}월 ${t.date.d}일</b>은 나에게 <b>${godEasy(t.stemGod)}</b>과(와) <b>${godEasy(t.branchGod)}</b>의 기운이 들어오는 날입니다. (오늘의 일진 ${gz(t.stem, t.branch)})`);
  lines.push(`오늘의 기운: <b>${t.fortune.level}</b> ${t.fortune.mark} — ${dayTip(t.fortune.level)}`);
  lines.push(godTheme(t.stemGod));
  if (t.interplay.length) lines.push(`내 사주와의 작용 — ${t.interplay.join(' · ')}.`);
  return { lines, today: t };
}

// ───────────────────────── 글자끼리의 작용(합·충·형) ─────────────────────────
// 자리(궁위)별로 충/변동이 어느 인생 영역에 영향 주는지
const GUNG_FIELD = {
  연주: '집안·조상·초년 시절', 월주: '직장·사회활동·부모',
  일주: '나 자신·배우자·가정', 시주: '자식·아랫사람·말년',
};
// 충이 일어난 자리들 → 영향받는 영역 문장
function chungField(positions) {
  if (!positions) return '';
  const POS = ['연주', '월주', '일주', '시주'];
  const fields = positions.map(i => GUNG_FIELD[POS[i]]).filter(Boolean);
  return fields.length ? ` 특히 <b>${fields.join('</b>·<b>')}</b> 영역에서 변화가 나타나기 쉽습니다.` : '';
}
function hapField(positions) {
  if (!positions) return '';
  const POS = ['연주', '월주', '일주', '시주'];
  const fields = positions.map(i => GUNG_FIELD[POS[i]]).filter(Boolean);
  return fields.length ? ` <b>${fields.join('</b>·<b>')}</b> 영역이 안정되고 인연이 깊어집니다.` : '';
}

// 사길신(생해서 살림)·사흉신(극해서 다스림) — 자평진전 순용·역용
const GOOD_GODS = ['정관', '정재', '편재', '정인', '식신'];
const BAD_GODS = ['편관', '상관', '겁재', '편인'];
// 십성이 관장하는 인생 영역(한 단어)
const GOD_FIELD = { 비겁: '경쟁·동료', 식상: '재능·표현', 재성: '재물·이성', 관성: '직장·명예', 인성: '공부·문서' };
const godField = (g) => GOD_FIELD[TENGOD_GROUP[g]] || '';

const uniqGods = (r) => [...new Set((r.gods || []).filter(g => g && g !== '일간'))];
const godWithField = (g) => `${godEasy(g)}(${godField(g)})`;

// 합이 십성에 미치는 작용: 길신은 묶이고(아쉬움), 흉신은 순화(좋음) + 용신/기신 역할
function hapGodEffect(r) {
  const gods = uniqGods(r);
  const roles = r.roles || [];
  let s = '';
  if (gods.length) {
    const good = gods.filter(g => GOOD_GODS.includes(g));
    const bad = gods.filter(g => BAD_GODS.includes(g));
    const etc = gods.filter(g => !GOOD_GODS.includes(g) && !BAD_GODS.includes(g));
    const segs = [];
    if (good.length) segs.push(`<b>${good.map(godWithField).join('·')}</b>의 복이 한데 묶입니다`);
    if (bad.length) segs.push(`<b>${bad.map(godEasy).join('·')}</b>의 거친 기운이 순해집니다`);
    if (etc.length) segs.push(`<b>${etc.map(godEasy).join('·')}</b> 기운이 묶입니다`);
    s += ' ' + segs.join('; ') + '.';
  }
  if (roles.includes('용신') || roles.includes('희신')) s += ' 나에게 도움 되는 기운이 묶여 있어, 그 복을 온전히 쓰려면 합을 풀어주는 운이 와야 시원하게 발현됩니다.';
  else if (roles.includes('기신')) s += ' 마침 거슬리던 기운이 합으로 묶여(합거), 그 부담이 줄어드는 좋은 작용입니다.';
  return s;
}
// 충이 십성에 미치는 작용: 그 영역이 흔들림 + 용신충(흉)/기신충(풀림)
function chungGodEffect(r) {
  const gods = uniqGods(r);
  const roles = r.roles || [];
  let s = '';
  if (gods.length) s += ` <b>${gods.map(godWithField).join('·')}</b> 영역이 흔들려 변동이 생기기 쉽습니다.`;
  if (roles.includes('용신') || roles.includes('희신')) s += ' 하필 도움 되는 기운이 충을 맞으니, 그 시기엔 더욱 신중해야 합니다.';
  else if (roles.includes('기신')) s += ' 거슬리던 기운이 충으로 흔들려(충거), 오히려 묵은 문제가 풀리기도 합니다.';
  return s;
}

function relDesc(r) {
  if (r.type === '천간합') return `겉(생각·심리)에서 두 글자가 잘 맞아 <b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운으로 뭉칩니다.${hapGodEffect(r)}${hapField(r.positions)}`;
  if (r.type === '천간충') return `겉(생각·심리)에서 두 글자가 정면으로 부딪쳐 가치관 충돌이나 마음의 변화가 생깁니다.${chungGodEffect(r)}${chungField(r.positions)}`;
  if (r.type === '육합') return `현실(사건·관계)에서 두 글자가 어울려 <b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운으로 뭉칩니다.${hapGodEffect(r)}${hapField(r.positions)}`;
  if (r.type === '지지충') return `현실(사건)에서 두 글자가 부딪쳐 이동·이사·이직 같은 변화가 생기기 쉽습니다.${chungGodEffect(r)}${chungField(r.positions)}`;
  if (r.type === '삼합' || r.type === '방합') {
    const grp = r.hapGroup ? ` 일간 기준 <b>${GRP_EASY[r.hapGroup]}</b> 기운이 크게 강해집니다.` : '';
    return `세 글자가 모여 강한 <b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운 덩어리를 이룹니다.${grp} 이 기운이 사주의 중심축이 되어 인생 전반에 크게 작용합니다.`;
  }
  if (r.type === '반합') {
    const grp = r.hapGroup ? ` (일간 기준 <b>${GRP_EASY[r.hapGroup]}</b> 기운)` : '';
    return `<b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운으로 부분적으로 뭉쳐, 그 기운이 어느 정도 힘을 받습니다.${grp}`;
  }
  if (r.type === '삼형') return `글자끼리 강하게 부딪치는 긴장 관계입니다(형). 다툼·구설·송사가 따를 수 있지만, 법·의료·군경처럼 날카로움을 다루는 일에서는 오히려 강점이 됩니다.`;
  if (r.type === '상형') return `예의·관계에서 마찰이 생기기 쉬운 긴장(형)입니다.`;
  if (r.type === '자형') return `같은 글자가 겹쳐 스스로 갈등하기 쉬운 기운(형)입니다. 자기관리가 필요합니다.`;
  return '';
}

export function relationsReading(c) {
  const rel = c.relations;
  if (!rel.length) return { lines: ['글자끼리 두드러진 작용(합·충·형)은 없습니다. 직접적인 끌림이나 부딪힘이 적어, 비교적 독립적이고 담백한 구조입니다.'], items: [] };
  const hap = rel.filter(r => r.kind === '합').length;
  const chung = rel.filter(r => r.kind === '충').length;
  const hyeong = rel.filter(r => r.kind === '형').length;
  const lines = [];
  const parts = [];
  if (hap) parts.push(`잘 어울리는 작용(합) ${hap}개`);
  if (chung) parts.push(`부딪히는 작용(충) ${chung}개`);
  if (hyeong) parts.push(`긴장하는 작용(형) ${hyeong}개`);
  let head = `사주 안에 ${parts.join(' · ')}가 있습니다. `;
  if (hap > chung + hyeong) head += '어울림이 많아 인연·협력의 기운이 강한 편입니다.';
  else if (chung + hyeong > hap) head += '부딪힘이 많아 변화가 잦고 역동적이며, 그만큼 단련을 통해 성장하는 구조입니다.';
  else head += '어울림과 부딪힘이 섞여, 만남과 헤어짐·안정과 변화가 교차합니다.';
  head += ' <span class="rel-tip">(겉=천간은 생각·마음, 속=지지는 현실·사건을 뜻합니다.)</span>';
  lines.push(head);
  const items = rel.map(r => ({ kind: r.kind, type: r.type, glyphs: r.glyphs, where: r.where, good: r.good, strong: r.strong, desc: relDesc(r) }));
  return { lines, items };
}

// ───────────────────────── 궁합 ─────────────────────────
export function compatibilityReading(A, B) {
  const cp = compatibility(A, B);
  const g = grade(cp.score);
  const lines = [];

  let head = `두 분의 궁합은 <b>${cp.score}점 (${g.label})</b>입니다. `;
  if (cp.score >= 78) head += '서로의 본바탕과 마음 자리가 잘 어우러지는 좋은 인연입니다. 자연스럽게 끌립니다.';
  else if (cp.score >= 64) head += '무난하고 발전 가능성이 큰 관계입니다. 작은 차이를 맞춰가면 더 깊어집니다.';
  else if (cp.score >= 48) head += '서로 노력으로 맞춰가는 관계입니다. 다름을 인정하면 좋은 짝이 됩니다.';
  else head += '서로 다른 점이 많은 편이라, 이해와 배려의 노력이 많이 필요한 관계입니다.';
  lines.push(head);

  const grpMeaning = g2 => ({ 비겁: '친구·동료처럼 편한 사이', 식상: '내가 돌봐주고 챙기게 되는 상대', 재성: '내가 아끼고 이끌고 싶은 상대(남성에겐 이성)', 관성: '나를 이끌고 기대게 하는 상대(여성에겐 이성)', 인성: '배움과 보살핌을 주는 윗사람 같은 상대' }[TENGOD_GROUP[g2]]);

  const sections = [
    { title: '본바탕 궁합', icon: 'fa-user-group', score: cp.stem.score, head: cp.stem.rel, body: cp.stem.desc },
    { title: '마음 자리 궁합', icon: 'fa-heart', score: cp.branch.score, head: cp.branch.rel, body: cp.branch.desc },
    {
      title: '서로 채워주는 기운', icon: 'fa-puzzle-piece', score: cp.complement.score,
      head: cp.complement.count ? `${cp.complement.count}가지 기운을 보완` : '비슷한 구성',
      body: complementText(cp),
    },
    {
      title: '서로에게 어떤 존재인가', icon: 'fa-arrows-left-right', score: null,
      head: `상대는 나에게 ‘${godEasy(cp.sipseong.aToB)}’, 나는 상대에게 ‘${godEasy(cp.sipseong.bToA)}’`,
      body: `상대는 나에게 <b>${grpMeaning(cp.sipseong.aToB)}</b>입니다.<br>나는 상대에게 <b>${grpMeaning(cp.sipseong.bToA)}</b>입니다.${cp.sipseong.spouseDesc ? '<br>' + cp.sipseong.spouseDesc : ''}`,
    },
  ];

  return { score: cp.score, grade: g, lines, sections, cp };
}

function complementText(cp) {
  const parts = [];
  if (cp.complement.bFillsA.length) parts.push(`상대가 나의 부족한 <b>${cp.complement.bFillsA.join('·')}</b> 기운을 채워줍니다`);
  if (cp.complement.aFillsB.length) parts.push(`내가 상대의 부족한 <b>${cp.complement.aFillsB.join('·')}</b> 기운을 채워줍니다`);
  if (parts.length) return parts.join('. ') + '. 서로의 빈 곳을 메워 주는 좋은 조합입니다.';
  return '두 사람의 기운 구성이 비슷해, 채워주기보다는 공감대와 비슷한 생활 리듬이 강점인 관계입니다.';
}
