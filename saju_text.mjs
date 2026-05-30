// saju_text.mjs
// 명식 계산 결과(saju_engine)를 받아 사람이 읽는 통변 텍스트를 생성한다.
// 종합 전통사주 / 재물·직업·연애·건강운 / 과거·올해·향후10년 운세.

import { STEM_KO, BRANCH_KO, BRANCH_ANIMAL, ELEM_HANJA, STEM_ELEM, TENGOD_GROUP, compatibility } from './saju_engine.mjs';

// ───────────────────────── 데이터 ─────────────────────────
export const TENGOD_INFO = {
  비견: { key: '자립·주관·경쟁', personality: '자존감이 높고 독립적이며 주관이 뚜렷합니다. 남과 어깨를 나란히 하려는 평등 의식과 동료애가 강합니다.', job: '전문직·프리랜서·동업 등 남에게 휘둘리지 않는 영역', excess: '고집·독선이 세지고 재물을 두고 경쟁(군겁쟁재)이 생깁니다.' },
  겁재: { key: '승부·야망·돌파', personality: '승부욕과 추진력이 강하고 목표를 향한 야망이 큽니다. 활동적이고 사교적입니다.', job: '영업·사업·스포츠·투자 등 경쟁이 있는 영역', excess: '무리한 투자·동업 분쟁·재물 손실로 이어지기 쉽습니다.' },
  식신: { key: '표현·연구·식복', personality: '낙천적이고 여유로우며 한 분야를 깊이 파고드는 재능이 있습니다. 의식주의 복이 따릅니다.', job: '연구·요리·교육·기술·콘텐츠', excess: '나태해지거나 한곳에 안주해 추진력이 떨어질 수 있습니다.' },
  상관: { key: '재능·화술·자유', personality: '표현력과 끼가 탁월하고 머리 회전이 빠릅니다. 틀에 매이기 싫어하는 자유로운 기질입니다.', job: '강연·방송·예술·영업·전문기술', excess: '권위에 반항하고 구설·시비를 부를 수 있습니다(상관견관).' },
  편재: { key: '사업·유동재물·활동', personality: '돈의 흐름을 읽는 감각과 통 큰 씀씀이가 있습니다. 활동 반경이 넓고 사람을 잘 다룹니다.', job: '사업·무역·투자·유통·영업', excess: '돈과 이성 문제로 분주해지고 한곳에 정착하기 어렵습니다.' },
  정재: { key: '성실·안정재물·신용', personality: '성실하고 꼼꼼하며 신용을 지킵니다. 꾸준히 모으고 관리하는 안정형입니다.', job: '회계·금융·관리·실무·자산운용', excess: '지나치게 인색하거나 돈에 얽매여 융통성이 떨어집니다.' },
  편관: { key: '권력·결단·카리스마', personality: '강한 추진력과 위기 돌파력, 카리스마가 있습니다. 명예와 권위를 중시합니다.', job: '군·경·검·정치·수술·위기관리', excess: '압박감·사고·구설에 시달리고 극단으로 치달을 수 있습니다.' },
  정관: { key: '명예·책임·규율', personality: '반듯하고 책임감이 강하며 규율을 지킵니다. 신뢰받는 관리자형입니다.', job: '공직·대기업·법무·행정·관리', excess: '원칙에 갇혀 융통성이 없고 체면에 매일 수 있습니다.' },
  편인: { key: '직관·기예·신비', personality: '독특한 통찰과 순발력, 비주류 분야에 대한 감각이 뛰어납니다.', job: '종교·역학·의료·예술·연구·기술', excess: '변덕·고독·게으름이 생기고 시작은 많되 끝맺음이 약합니다.' },
  정인: { key: '학문·문서·수용', personality: '배움을 좋아하고 수용적이며 보살피는 마음이 큽니다. 명예와 문서의 별입니다.', job: '교육·연구·행정·자격전문직', excess: '생각만 많아 실행이 느리고 의존적이 될 수 있습니다.' },
};

export const ELEM_INFO = {
  목: { nature: '인(仁)·성장·기획', organ: '간·담, 신경·근육, 눈', excess: '간열·스트레스·근골격 긴장, 분노 조절', lack: '간담이 약하고 결단력·추진력이 떨어지기 쉬움' },
  화: { nature: '예(禮)·열정·표현', organ: '심장·소장, 혈관·정신', excess: '심혈관 부담·불면·조급함', lack: '순환 저하·저혈압·의욕 저하, 우울 경향' },
  토: { nature: '신(信)·중재·포용', organ: '비장·위장, 소화기', excess: '소화불량·습담·체중 증가', lack: '비위 허약·소화력 저하·잔걱정' },
  금: { nature: '의(義)·결단·정리', organ: '폐·대장, 호흡기·피부', excess: '호흡기·피부 긴장, 지나친 예민함', lack: '폐·대장 허약·면역 저하·환절기 취약' },
  수: { nature: '지(智)·지혜·유연', organ: '신장·방광, 생식·호르몬·뼈', excess: '신·방광 부담·부종·냉증', lack: '신허·정력 저하·골밀도·체력 저하' },
};

export const GYEOKGUK_INFO = {
  식신격: '연구·표현·의식주의 별. 한 분야를 꾸준히 파면 식복과 전문성이 따릅니다.',
  상관격: '재능·표현의 별. 전문기술·예술·언변으로 두각을 냅니다.',
  정재격: '성실·신용의 별. 꾸준한 축재와 안정된 자산 관리에 강합니다.',
  편재격: '사업·재물의 별. 활동 범위가 넓고 큰 돈을 다루는 그릇입니다.',
  정관격: '명예·관리의 별. 조직·공직에서 신뢰와 지위를 얻습니다.',
  편관격: '권력·결단의 별. 위기관리·전문직에서 카리스마를 발휘합니다.',
  정인격: '학문·문서의 별. 배움과 명예, 자격으로 길을 엽니다.',
  편인격: '직관·기예의 별. 독창적 전문성과 순발력이 무기입니다.',
  건록격: '자립·실력의 별. 자수성가하며 전문성으로 인정받습니다.',
  양인격: '강건·돌파의 별. 기세가 강해 기술·무관·전문직에 어울립니다.',
};

export const STAGE_INFO = {
  장생: '새로 솟는 기운, 시작과 후원', 목욕: '미숙·변동·시행착오', 관대: '성숙·자기주장', 건록: '독립·자수성가·성취',
  제왕: '기세의 정점, 최강', 쇠: '정점을 지나 안정·내실', 병: '활동력 저하·재정비', 사: '에너지 수렴·정적',
  묘: '갈무리·휴식·답답함', 절: '단절·전환·새 준비', 태: '잉태된 잠재력', 양: '성장·양육의 기운',
};

// 운에서 들어오는 십성의 테마
export function godTheme(god) {
  const grp = TENGOD_GROUP[god];
  const map = {
    비겁: '경쟁·독립·인간관계와 재물 분배가 화두가 됩니다. 동업·이직·자기사업을 고민하기 쉽습니다.',
    식상: '표현·활동·새 시도의 기운입니다. 진로 변화·창작·출산(여성)·말과 글로 펼치는 일이 활발합니다.',
    재성: '재물·사업·확장의 기운입니다. 돈을 벌고 쓰는 일, 이성(남성)·현실적 성과가 두드러집니다.',
    관성: '직장·명예·책임의 기운입니다. 승진·시험·결혼(여성)·조직 변화가 일어나기 쉽습니다.',
    인성: '공부·자격·문서·안정의 기운입니다. 배움·시험·부동산·계약, 어머니·귀인의 도움이 따릅니다.',
  };
  return map[grp] || '';
}

const grade = (s) => s >= 78 ? { label: '매우 좋음', cls: 'g5' } : s >= 64 ? { label: '좋음', cls: 'g4' } : s >= 48 ? { label: '보통', cls: 'g3' } : s >= 36 ? { label: '주의', cls: 'g2' } : { label: '약함', cls: 'g1' };
const clamp = (s) => Math.max(8, Math.min(96, Math.round(s)));

const gz = (s, b) => `${s}${b}(${STEM_KO[s]}${BRANCH_KO[b]})`;

// ───────────────────────── 종합 전통사주 ─────────────────────────
export function comprehensiveSummary(c) {
  const lines = [];
  const day = c.pillarInfo.day;
  const st = c.strength, ys = c.yongsin, gg = c.gyeokguk;

  lines.push(`일간(나)은 <b>${day.stem}${ELEM_HANJA[day.stemElem]}(${day.stemKo}${day.stemElem})</b>입니다. 사주의 중심이자 '나 자신'을 뜻하며, 모든 해석은 이 글자를 기준으로 풉니다.`);

  // 격국
  const ggDesc = GYEOKGUK_INFO[gg.name] || '월령에서 도출한 사회적 그릇입니다.';
  lines.push(`격국은 <b>${gg.name}</b> — ${ggDesc}${gg.transparent ? ' (월지 기운이 천간에 투출해 격이 뚜렷합니다.)' : ''}`);

  // 신강약
  const strongTxt = {
    극신강: '기운이 한쪽으로 매우 강하게 쏠려 있습니다. 넘치는 힘을 덜어내고 흘려보내는 운에서 길합니다.',
    신강: '나를 돕는 기운(비겁·인성)이 충분해 주체성과 추진력이 강합니다. 기운을 쓰고 덜어내는 방향이 이롭습니다.',
    중화: '돕는 기운과 빼는 기운이 균형을 이뤄, 운의 흐름에 유연하게 적응하는 편입니다.',
    신약: '나를 빼는 기운(식상·재성·관성)이 우세해 협력과 보강이 필요합니다. 나를 돕는 운에서 크게 발복합니다.',
    극신약: '나를 빼는 기운이 매우 강합니다. 무리한 확장보다 내실과 건강·귀인을 챙기는 전략이 유리합니다.',
  };
  lines.push(`신강·신약은 <b>${st.level}</b>입니다. ${strongTxt[st.level]}`);

  // 용신
  let yLine = `용신(用神)은 <b>${ys.primary}(${ELEM_HANJA[ys.primary]})</b>, 희신은 <b>${ys.helper}(${ELEM_HANJA[ys.helper]})</b>입니다. ${ys.reason}.`;
  if (ys.johu) {
    yLine += ys.johuUrgent
      ? ` 또한 한겨울/한여름에 태어나 <b>${ys.johu}(${ELEM_HANJA[ys.johu]})</b> 기운(조후)이 시급합니다 — 한난조습의 균형이 이 사주의 핵심 열쇠입니다.`
      : ` 더하여 태어난 계절상 <b>${ys.johu}(${ELEM_HANJA[ys.johu]})</b> 기운(조후)이 있으면 더욱 좋습니다.`;
  }
  yLine += ` → <b>${ys.primary}·${ys.helper}</b> 오행이 들어오는 운(대운·세운)이 인생의 호기(好機)입니다.`;
  lines.push(yLine);

  // 가장 강한 십성
  const groups = Object.entries(c.groupCount).sort((a, b) => b[1] - a[1]);
  const topGrp = groups[0];
  if (topGrp[1] >= 3) {
    const gMap = { 비겁: '자립심과 경쟁심', 식상: '표현력과 재능', 재성: '재물과 활동성', 관성: '명예와 책임감', 인성: '학문과 수용성' };
    lines.push(`십성 분포에서 <b>${topGrp[0]}</b>의 기운이 가장 두드러집니다 — ${gMap[topGrp[0]]}이 인생의 주된 동력입니다.`);
  }

  // 무(無)오행
  const zero = Object.entries(c.elementCount).filter(([, v]) => v === 0).map(([k]) => k);
  if (zero.length) lines.push(`원국에 <b>${zero.map(z => z + ELEM_HANJA[z]).join('·')}</b> 기운이 드러나 있지 않습니다. 해당 오행이 상징하는 영역은 운에서 채워질 때 비로소 발현됩니다.`);

  return lines;
}

// ───────────────────────── 재물운 ─────────────────────────
export function wealthLuck(c) {
  const g = c.groupCount, ys = c.yongsin, lines = [];
  let s = 50;
  const jaeStar = c.godCount.정재 + c.godCount.편재;

  if (g.재성 >= 2) { s += 16; lines.push('재성(財星)이 발달해 돈을 벌고 굴리는 감각이 좋습니다. 재물에 대한 욕구와 현실 감각이 뚜렷합니다.'); }
  else if (g.재성 === 1) { s += 6; lines.push('재성이 적정해 분수에 맞는 재물 관리가 가능합니다.'); }
  else { s -= 6; lines.push('원국에 재성이 드러나지 않아 큰 재물보다 명예·전문성으로 가치를 쌓는 편이 유리합니다. 재성 운이 올 때 기회가 열립니다.'); }

  if (g.식상 >= 1 && g.재성 >= 1) { s += 12; lines.push('식상생재(食傷生財) 구조 — 재능·노력이 자연스럽게 수입으로 이어지는 좋은 흐름입니다.'); }
  if (ys.strong && g.재성 >= 1) { s += 10; lines.push('신강하여 재물을 감당할 그릇이 충분합니다. 적극적으로 재물을 추구해도 좋습니다.'); }
  if (!ys.strong && g.재성 >= 2) { s -= 12; lines.push('재다신약(財多身弱) — 돈은 보이나 그것을 감당할 힘이 부족합니다. 욕심을 내기보다 건강·협력자를 먼저 챙기세요.'); }
  if (g.비겁 >= 3) { s -= 8; lines.push('비겁이 강해 군겁쟁재(群劫爭財)의 소지가 있습니다. 동업·보증·공동투자는 신중해야 합니다.'); }
  if (ys.primary === '재성' || TENGOD_GROUP[c.gyeokguk.baseGod] === '재성') s += 6;

  // 편재 vs 정재
  if (c.godCount.편재 > c.godCount.정재 && c.godCount.편재 >= 1) lines.push('편재(偏財)가 강해 사업·투자 등 유동적 큰 재물에 인연이 있습니다.');
  else if (c.godCount.정재 >= 1) lines.push('정재(正財)가 있어 봉급·임대 등 꾸준하고 안정적인 재물에 강합니다.');

  // 현재 대운의 재성 여부
  const cur = c.daeun.list[c.daeun.currentIdx];
  if (cur && (TENGOD_GROUP[cur.stemGod] === '재성' || TENGOD_GROUP[cur.branchGod] === '재성')) {
    s += 8; lines.push(`현재 대운(${gz(cur.stem, cur.branch)})에 재성이 들어와 재물 활동이 활발해지는 시기입니다.`);
  }
  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 직업운 ─────────────────────────
export function careerLuck(c) {
  const g = c.groupCount, lines = [];
  let s = 52;
  const gg = c.gyeokguk;
  lines.push(`격국 <b>${gg.name}</b> 기준 — ${GYEOKGUK_INFO[gg.name] || ''}`);

  if (g.관성 >= 1 && g.인성 >= 1) { s += 14; lines.push('관인상생(官印相生) — 조직·공직·자격 기반 직업에서 안정적으로 성장합니다.'); }
  if (g.식상 >= 2) { s += 10; lines.push('식상이 강해 기술·창작·교육·전문서비스 등 자기 재능을 펼치는 일이 잘 맞습니다.'); }
  if (g.관성 >= 2) { s += 8; lines.push('관성이 강해 명예·조직·관리 직무에 적합하나, 책임과 압박을 잘 다스려야 합니다.'); }
  if (g.재성 >= 2) { s += 8; lines.push('재성이 강해 사업·영업·금융 등 현실적 성과가 보이는 일에 강합니다.'); }
  if (g.관성 === 0 && g.재성 === 0) { s -= 6; lines.push('관성·재성이 약해 조직 생활보다 전문성·기술·연구로 독립하는 길이 유리할 수 있습니다.'); }

  // 대표 적성(가장 강한 십성)
  const topGod = Object.entries(c.godCount).sort((a, b) => b[1] - a[1])[0];
  if (topGod[1] >= 1) lines.push(`적성: <b>${topGod[0]}</b>의 기운이 강해 「${TENGOD_INFO[topGod[0]].job}」 분야와 인연이 깊습니다.`);

  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 연애·결혼운 ─────────────────────────
export function loveLuck(c) {
  const male = c.gender === 'male';
  const spouseGrp = male ? '재성' : '관성';
  const spouseName = male ? '재성(財星·여자)' : '관성(官星·남자)';
  const g = c.groupCount, lines = [];
  let s = 50;

  if (g[spouseGrp] >= 1 && g[spouseGrp] <= 2) { s += 14; lines.push(`배우자성인 ${spouseName}이 적정하게 자리해, 이성 인연과 배우자 복이 무난합니다.`); }
  else if (g[spouseGrp] >= 3) { s += 4; lines.push(`${spouseName}이 다소 많아 이성 인연은 풍부하나, 관계가 복잡해지지 않도록 한 사람에게 집중하는 노력이 필요합니다.`); }
  else { s -= 8; lines.push(`${spouseName}이 약해 인연이 늦거나 적극적으로 다가가야 하는 편입니다. 배우자성 운이 올 때 인연이 활발해집니다.`); }

  // 일지(배우자궁)
  const dayBranchGod = c.pillarInfo.day.branchGod;
  lines.push(`배우자궁(일지)은 <b>${BRANCH_KO[c.pillarInfo.day.branch]}(${c.pillarInfo.day.branch})·${dayBranchGod}</b>으로, 배우자는 「${TENGOD_INFO[dayBranchGod]?.key || ''}」의 기질과 인연이 깊습니다.`);

  // 도화살
  const dohwa = c.sinsal.find(x => x.name === '도화살');
  if (dohwa) { s += 6; lines.push(`도화살(${dohwa.pos})이 있어 이성에게 끌리는 매력과 인기가 있습니다. 끼를 긍정적으로 쓰면 매력이 되지만, 구설은 조심하세요.`); }

  if (male && g.비겁 >= 3) { s -= 6; lines.push('비겁이 강해 재성(여자)을 두고 경쟁이 생기기 쉬우니, 삼각관계·금전 얽힘을 주의하세요.'); }
  if (!male && g.식상 >= 3) { s -= 6; lines.push('식상이 강해 관성(남자)을 극하는 경향이 있어, 배우자에게 기대치를 낮추고 배려하는 태도가 관계를 부드럽게 합니다.'); }

  // 배우자성 운
  const cur = c.daeun.list[c.daeun.currentIdx];
  if (cur && (TENGOD_GROUP[cur.stemGod] === spouseGrp || TENGOD_GROUP[cur.branchGod] === spouseGrp)) {
    s += 8; lines.push(`현재 대운(${gz(cur.stem, cur.branch)})에 배우자성이 들어와 인연·결혼·관계 변화가 활발한 시기입니다.`);
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

  // 편중도
  const spread = maxE[1] - minE[1];
  if (spread <= 1.6) { s += 10; lines.push('오행이 비교적 고르게 갖춰져 기본 체질이 균형적입니다.'); }
  else { s -= 8; lines.push('오행의 편중이 있어, 강한 기운과 약한 기운이 상징하는 장부의 균형 관리가 필요합니다.'); }

  // 과다 오행
  if (maxE[1] >= total * 0.34) lines.push(`<b>${maxE[0]}(${ELEM_HANJA[maxE[0]]})</b> 기운이 과다 — ${ELEM_INFO[maxE[0]].excess}에 유의하세요.`);
  // 부족/고립 오행
  const zeroElems = Object.entries(c.elementCount).filter(([, v]) => v === 0).map(([k]) => k);
  if (zeroElems.length) zeroElems.forEach(z => lines.push(`<b>${z}(${ELEM_HANJA[z]})</b> 기운이 약함 — ${ELEM_INFO[z].lack}. 관련 장부(${ELEM_INFO[z].organ})를 평소 돌보세요.`));
  else lines.push(`<b>${minE[0]}(${ELEM_HANJA[minE[0]]})</b> 기운이 상대적으로 약함 — ${ELEM_INFO[minE[0]].organ} 쪽을 신경 쓰면 좋습니다.`);

  // 백호·양인 등 건강 관련 신살
  if (c.sinsal.some(x => x.name === '백호살')) { s -= 4; lines.push('백호살이 있어 사고·수술 등 급작스러운 일에 주의가 필요합니다(전문직에선 오히려 강점이 됩니다).'); }

  s = clamp(s);
  return { score: s, grade: grade(s), lines };
}

// ───────────────────────── 과거(지나온 대운) ─────────────────────────
export function pastReading(c) {
  const past = c.daeun.list.filter((d, i) => i < c.daeun.currentIdx);
  const lines = [];
  if (!past.length) {
    lines.push('아직 첫 대운을 지나는 중이거나 대운 진입 전입니다. 본격적인 인생의 큰 흐름은 이제부터 펼쳐집니다.');
    return { lines, items: [] };
  }
  lines.push(`지금까지 <b>${past.length}개의 대운</b>을 지나오셨습니다. 10년 단위로 인생의 큰 무대(환경)가 바뀌어 왔습니다.`);
  const items = past.map(d => ({
    range: `${d.age}~${d.endAge}세`,
    ganzhi: gz(d.stem, d.branch),
    god: `${d.stemGod}·${d.branchGod}`,
    fortune: d.fortune,
    theme: godTheme(d.stemGod),
  }));
  // 가장 좋았던 / 힘들었던 시기
  const best = [...past].sort((a, b) => b.fortune.score - a.fortune.score)[0];
  const worst = [...past].sort((a, b) => a.fortune.score - b.fortune.score)[0];
  if (best.fortune.score > 0) lines.push(`그중 <b>${best.age}~${best.endAge}세 ${gz(best.stem, best.branch)}</b> 대운은 용신·희신이 들어와 비교적 순풍이 불던 시기였습니다.`);
  if (worst.fortune.score < 0) lines.push(`반면 <b>${worst.age}~${worst.endAge}세 ${gz(worst.stem, worst.branch)}</b> 대운은 기신운으로 시련과 단련의 시기였을 수 있습니다.`);
  return { lines, items };
}

// ───────────────────────── 올해 운세 ─────────────────────────
export function yearReading(c) {
  const y = c.today.getFullYear();
  const s = c.seun.find(x => x.year === y) || c.seun[0];
  const cur = c.daeun.list[c.daeun.currentIdx];
  const lines = [];
  lines.push(`<b>${y}년</b>은 <b>${gz(s.stem, s.branch)} ${BRANCH_ANIMAL[s.branch]}띠 해</b>입니다. 올해 세운은 천간 <b>${s.stemGod}</b>, 지지 <b>${s.branchGod}</b>의 기운으로 들어옵니다.`);
  lines.push(godTheme(s.stemGod));
  lines.push(`올해의 길흉 등급: <b>${s.fortune.level}</b> ${s.fortune.mark} — ${fortuneSentence(s.fortune.level)}`);
  if (cur) lines.push(`현재 대운 <b>${gz(cur.stem, cur.branch)}</b>(${cur.age}~${cur.endAge}세)라는 큰 무대 위에서 올해라는 한 해가 흘러갑니다. 대운이 좋으면 세운의 굴곡도 무난히 넘기고, 대운이 험하면 세운이 좋아도 신중함이 필요합니다.`);
  return { year: y, seun: s, lines };
}

// ───────────────────────── 앞으로 10년 ─────────────────────────
export function futureReading(c) {
  const lines = [];
  const idx = c.daeun.currentIdx;
  const cur = c.daeun.list[idx];
  const next = c.daeun.list[idx + 1];

  if (cur) {
    lines.push(`<b>현재 대운: ${gz(cur.stem, cur.branch)} (${cur.age}~${cur.endAge}세)</b> · 길흉 ${cur.fortune.level} ${cur.fortune.mark}`);
    lines.push(godTheme(cur.stemGod));
    lines.push(`십이운성으로는 <b>${cur.stage}</b> 단계 — ${STAGE_INFO[cur.stage]}의 기운이 함께합니다.`);
  }
  if (next) {
    lines.push(`<b>다음 대운: ${gz(next.stem, next.branch)} (${next.age}~${next.endAge}세)</b> · 길흉 ${next.fortune.level} ${next.fortune.mark}`);
    lines.push(`${next.age}세 무렵 인생의 무대가 한 번 더 전환됩니다. ${godTheme(next.stemGod)}`);
  }
  // 향후 10년 세운 요약
  const goodYears = c.seun.filter(s => s.fortune.score >= 1).map(s => s.year);
  const badYears = c.seun.filter(s => s.fortune.score <= -1).map(s => s.year);
  if (goodYears.length) lines.push(`향후 10년 중 <b>${goodYears.join('·')}년</b>은 용신·희신이 들어와 흐름이 좋은 해입니다. 중요한 일을 추진하기 좋습니다.`);
  if (badYears.length) lines.push(`반면 <b>${badYears.join('·')}년</b>은 기운이 거스르는 해이니, 무리한 확장보다 수비적으로 운영하세요.`);
  return { current: cur, next, lines };
}

function fortuneSentence(level) {
  return {
    대길: '용신이 힘차게 들어와 노력의 결실이 크게 맺히는 해입니다. 적극적으로 도전하세요.',
    길: '흐름이 순조로워 추진하는 일에 도움이 따릅니다.',
    평: '큰 굴곡 없이 평탄합니다. 기본에 충실하면 무난합니다.',
    주의: '기운이 다소 거스릅니다. 새 일의 확장보다 관리와 점검이 유리합니다.',
    흉: '기신이 강하게 작용하니 무리한 결정·투자·갈등을 피하고 건강과 안전을 우선하세요.',
  }[level];
}

// 타임라인용 한 줄(대운/세운 공용)
export function daeunLine(d) { return { range: `${d.age}~${d.endAge}세`, ganzhi: gz(d.stem, d.branch), gods: `${d.stemGod}·${d.branchGod}`, stage: d.stage, fortune: d.fortune }; }
export function seunLine(s) { return { year: s.year, ganzhi: gz(s.stem, s.branch), animal: BRANCH_ANIMAL[s.branch], gods: `${s.stemGod}·${s.branchGod}`, fortune: s.fortune }; }

// ───────────────────────── 오늘 운세 (일진) ─────────────────────────
function dayTip(level) {
  return {
    대길: '일이 잘 풀리는 날입니다. 중요한 미팅·제안·결정에 적극적으로 나서기 좋습니다.',
    길: '순조로운 날입니다. 계획대로 진행하면 도움이 따릅니다.',
    평: '평범한 날입니다. 큰 기대보다 루틴에 충실하면 무난합니다.',
    주의: '컨디션·감정 기복에 유의하세요. 큰 결정이나 충돌은 한 박자 미루는 게 좋습니다.',
    흉: '마찰·실수가 생기기 쉬운 날입니다. 말과 행동을 삼가고 안전·건강을 챙기세요.',
  }[level];
}

export function todayReading(c) {
  const t = c.todayLuck;
  const lines = [];
  lines.push(`오늘 <b>${t.date.m}월 ${t.date.d}일</b>의 일진(日辰)은 <b>${gz(t.stem, t.branch)}</b>입니다. 내 일간(${c.dayStem}) 기준 천간 <b>${t.stemGod}</b>, 지지 <b>${t.branchGod}</b>의 기운이 들어옵니다.`);
  lines.push(`오늘의 기운: <b>${t.fortune.level}</b> ${t.fortune.mark} — ${dayTip(t.fortune.level)}`);
  lines.push(godTheme(t.stemGod));
  if (t.interplay.length) lines.push(`내 사주와의 작용 — ${t.interplay.join(' · ')}.`);
  return { lines, today: t };
}

// ───────────────────────── 합·충·형 ─────────────────────────
function relDesc(r) {
  if (r.type === '천간합') return `천간이 합하여 <b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운으로 묶입니다. 두 글자가 서로 끌려 본래 십성의 작용이 변하거나 묶일 수 있습니다(유정·결속).`;
  if (r.type === '천간충') return `천간이 정면으로 부딪칩니다. 해당 자리가 상징하는 영역에 생각의 충돌·결단·변동이 생깁니다.`;
  if (r.type === '육합') return `두 지지가 합하여 <b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운으로 결속됩니다. 인연·협력·안정의 작용입니다.`;
  if (r.type === '지지충') return `두 지지가 충돌합니다. 해당 궁(자리)에 이동·이사·변화·갈등이 일어나기 쉽습니다.`;
  if (r.type === '삼합' || r.type === '방합') return `세 지지가 모여 강력한 <b>${r.result}(${ELEM_HANJA[r.result]})</b> 국(局)을 이룹니다. 그 오행의 세력이 크게 강해져 사주의 중심축이 됩니다.`;
  if (r.type === '반합') return `<b>${r.result}(${ELEM_HANJA[r.result]})</b> 기운으로 부분 결속합니다(반합). 해당 오행이 어느 정도 힘을 받습니다.`;
  if (r.type === '삼형') return `형살(刑殺)입니다 — ${r.desc}. 갈등·송사·구설·수술 등이 따를 수 있으나, 법·의료·군경 등 형(刑)을 다루는 직업에서는 오히려 강점이 됩니다.`;
  if (r.type === '상형') return `${r.desc}(子卯) — 예의·관계에서 마찰이 생기기 쉽습니다.`;
  if (r.type === '자형') return `같은 글자가 겹친 자형(自刑)입니다. 스스로를 괴롭히거나 내적 갈등이 생기기 쉬우니 자기관리가 필요합니다.`;
  return '';
}

// ───────────────────────── 궁합 ─────────────────────────
export function compatibilityReading(A, B) {
  const cp = compatibility(A, B);
  const g = grade(cp.score);
  const lines = [];

  let head = `두 분의 궁합은 <b>${cp.score}점 (${g.label})</b>입니다. `;
  if (cp.score >= 78) head += '일간과 배우자궁이 잘 어우러지는 좋은 인연입니다. 서로를 자연스럽게 끌어당깁니다.';
  else if (cp.score >= 64) head += '무난하고 발전 가능성이 큰 관계입니다. 작은 차이를 맞춰가면 깊어집니다.';
  else if (cp.score >= 48) head += '서로 노력으로 맞춰가는 관계입니다. 다름을 인정하면 보완이 됩니다.';
  else head += '서로의 다름이 큰 편이라, 이해와 배려의 노력이 많이 필요한 관계입니다.';
  lines.push(head);

  const grpMeaning = g2 => ({ 비겁: '동료·경쟁자', 식상: '돌봐주고 표현하게 되는 대상', 재성: '아끼고 다루고 싶은 대상(남성에겐 이성)', 관성: '나를 이끌고 책임지게 하는 대상(여성에겐 이성)', 인성: '배움과 보살핌을 주는 윗사람 같은 존재' }[TENGOD_GROUP[g2]]);

  const sections = [
    { title: '일간(본질) 궁합', icon: 'fa-user-group', score: cp.stem.score, head: cp.stem.rel, body: cp.stem.desc },
    { title: '배우자궁(일지) 궁합', icon: 'fa-heart', score: cp.branch.score, head: cp.branch.rel, body: cp.branch.desc },
    {
      title: '오행 보완', icon: 'fa-puzzle-piece', score: cp.complement.score,
      head: cp.complement.count ? `${cp.complement.count}가지 기운 보완` : '비슷한 구성',
      body: complementText(cp),
    },
    {
      title: '서로의 십성', icon: 'fa-arrows-left-right', score: null,
      head: `상대→나: ${cp.sipseong.bToA} / 나→상대: ${cp.sipseong.aToB}`,
      body: `상대는 나에게 <b>${cp.sipseong.aToB}</b> — ${grpMeaning(cp.sipseong.aToB)}.<br>나는 상대에게 <b>${cp.sipseong.bToA}</b> — ${grpMeaning(cp.sipseong.bToA)}.${cp.sipseong.spouseDesc ? '<br>' + cp.sipseong.spouseDesc : ''}`,
    },
  ];

  return { score: cp.score, grade: g, lines, sections, cp };
}

function complementText(cp) {
  const parts = [];
  if (cp.complement.bFillsA.length) parts.push(`상대가 나의 부족한 <b>${cp.complement.bFillsA.join('·')}</b> 기운을 채워줍니다`);
  if (cp.complement.aFillsB.length) parts.push(`내가 상대의 부족한 <b>${cp.complement.aFillsB.join('·')}</b> 기운을 채워줍니다`);
  if (parts.length) return parts.join('. ') + '. 서로의 빈 곳을 메워 주는 좋은 조합입니다.';
  return '두 사람의 오행 구성이 비슷해, 보완보다는 공감대와 비슷한 생활 리듬이 강점인 관계입니다.';
}

export function relationsReading(c) {
  const rel = c.relations;
  if (!rel.length) return { lines: ['명식 내 두드러진 합·충·형은 없습니다. 글자 간 직접적 작용이 적어 비교적 독립적이고 담백한 구조입니다.'], items: [] };
  const hap = rel.filter(r => r.kind === '합').length;
  const chung = rel.filter(r => r.kind === '충').length;
  const hyeong = rel.filter(r => r.kind === '형').length;
  const lines = [];
  let head = `명식에 `;
  const parts = [];
  if (hap) parts.push(`합(合) ${hap}`);
  if (chung) parts.push(`충(沖) ${chung}`);
  if (hyeong) parts.push(`형(刑) ${hyeong}`);
  head += parts.join(' · ') + '개의 작용이 있습니다. ';
  if (hap > chung + hyeong) head += '합이 많아 인연·결속·협력의 기운이 강한 구조입니다.';
  else if (chung + hyeong > hap) head += '충·형이 많아 역동적이고 변동이 잦으며, 그만큼 단련을 통해 성장하는 구조입니다.';
  else head += '합과 충이 섞여 있어 만남과 헤어짐, 안정과 변화가 교차합니다.';
  lines.push(head);
  const items = rel.map(r => ({ kind: r.kind, type: r.type, glyphs: r.glyphs, where: r.where, good: r.good, strong: r.strong, desc: relDesc(r) }));
  return { lines, items };
}
