// judgments.mjs — 판단 기록
// 해석 문장은 여기서 만든 '판단 기록'을 설명하는 역할로 제한한다.
// 기록 하나 = { id, claim, status, evidence[], counter[], conditions[], hold[], delta }
//   status: 성립 | 조건부 | 보류 | 불성립
//   delta : 점수 반영값 — 성립이면 전액, 조건부면 절반, 보류·불성립이면 0
// '있다'와 '작용한다'를 구분한다: 십성이 있어도 투간·통근·월령·위치(연결)·일간 지지력·방해 관계를 본 뒤에만 성립으로 둔다.
// 기준: 자평 계열의 통상적 원칙(투간·통근·인접 연결·억부)을 간이 적용. 합화 성립, 형충에 의한 손상은 아직 미반영(한계에 표기).

import { STEM_ELEM, BRANCH_MAIN, HIDDEN_STEMS, TENGOD_GROUP, tenGodOfStem, tenGodOfBranch } from './saju_engine.mjs?v=14';

const POS = ['year', 'month', 'day', 'hour'];
const POS_KO = { year: '연', month: '월', day: '일', hour: '시' };
const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
const LEVEL_KO = { strong: '강', mid: '중', weak: '약', none: '무' };

// ───────── 십성 그룹별 세력 ─────────
// stems: 투간(일간 제외) / mains: 지지 본기 / hidden: 지장간 중기·여기 / rooted: 투간 중 통근한 것 / monthLing: 월지 본기
export function godForce(pillars) {
  const dayStem = pillars.day[0];
  const f = {};
  GROUPS.forEach(g => { f[g] = { stems: [], mains: [], hidden: [], rooted: [], monthLing: false, gods: {} }; });
  const branches = POS.map(p => pillars[p][1]).filter(Boolean);
  const bump = (grp, god) => { f[grp].gods[god] = (f[grp].gods[god] || 0) + 1; };

  POS.forEach(pos => {
    const [s, b] = pillars[pos];
    if (s && pos !== 'day') {
      const god = tenGodOfStem(dayStem, s), grp = TENGOD_GROUP[god];
      f[grp].stems.push({ pos, stem: s, god }); bump(grp, god);
    }
    if (b) {
      const mainGod = tenGodOfBranch(dayStem, b), mgrp = TENGOD_GROUP[mainGod];
      f[mgrp].mains.push({ pos, branch: b, god: mainGod }); bump(mgrp, mainGod);
      if (pos === 'month') f[mgrp].monthLing = true;
      HIDDEN_STEMS[b].forEach(([hs]) => {
        if (hs === BRANCH_MAIN[b]) return;
        const god = tenGodOfStem(dayStem, hs), grp = TENGOD_GROUP[god];
        f[grp].hidden.push({ pos, branch: b, stem: hs, god });
      });
    }
  });
  // 통근: 투간한 천간과 같은 오행이 어느 지지의 지장간에라도 있으면
  GROUPS.forEach(g => {
    f[g].stems.forEach(st => {
      const el = STEM_ELEM[st.stem];
      const roots = branches.filter(b => HIDDEN_STEMS[b].some(([hs]) => STEM_ELEM[hs] === el));
      if (roots.length) f[g].rooted.push({ ...st, roots });
    });
    const x = f[g];
    if (x.monthLing || x.rooted.length || x.mains.length >= 2) x.level = 'strong';
    else if (x.stems.length || x.mains.length === 1) x.level = 'mid';
    else if (x.hidden.length) x.level = 'weak';
    else x.level = 'none';
    x.spots = [...x.stems.map(s => s.pos), ...x.mains.map(m => m.pos)];
    x.desc = describe(x);
  });
  return f;
}

function describe(x) {
  const parts = [];
  if (x.stems.length) parts.push('투간 ' + x.stems.map(s => `${POS_KO[s.pos]}간 ${s.stem}(${s.god})`).join('·'));
  if (x.rooted.length) parts.push('통근 ' + x.rooted.map(r => `${r.stem}→${r.roots.join('')}`).join('·'));
  if (x.mains.length) parts.push('지지 본기 ' + x.mains.map(m => `${POS_KO[m.pos]}지 ${m.branch}(${m.god})`).join('·'));
  if (x.monthLing) parts.push('월령 득');
  if (!parts.length && x.hidden.length) parts.push('지장간에만 ' + x.hidden.map(h => `${POS_KO[h.pos]}지 ${h.branch}中${h.stem}`).join('·'));
  if (!parts.length) parts.push('없음');
  return `세력 ${LEVEL_KO[x.level]} — ${parts.join(', ')}`;
}

// 두 그룹이 인접 기둥(또는 같은 기둥)에 있는가 — 생·극이 실제로 작용하는 최소 조건
function connected(a, b) {
  return a.spots.some(p => b.spots.some(q => Math.abs(POS.indexOf(p) - POS.indexOf(q)) <= 1));
}
const atLeast = (lv, min) => ['none', 'weak', 'mid', 'strong'].indexOf(lv) >= ['none', 'weak', 'mid', 'strong'].indexOf(min);

function J(id, claim, delta) {
  return { id, claim, delta, status: '성립', evidence: [], counter: [], conditions: [], hold: [] };
}
function settle(j) {
  if (j.status === '성립' && j.counter.length) j.status = '조건부';
  return j;
}

// ───────── 판단 묶음 ─────────
// c: buildChart 결과. 시각 미상이면 시주를 뺀 3주(calcPillars)로 본다.
export function buildJudgments(c) {
  const pillars = c.input && c.input.hourUnknown ? { ...c.pillars, hour: [null, null] } : c.pillars;
  const f = godForce(pillars);
  const st = c.strength, lv = st.level;
  const weakDay = lv === '신약' || lv === '극신약';
  const strongDay = lv === '신강' || lv === '극신강';
  const hourHold = c.input && c.input.hourUnknown ? '시각 미상: 시주를 뺀 3주 기준. 시주에 오는 글자에 따라 세력·연결이 달라질 수 있음' : null;
  const out = { wealth: [], career: [], love: [] };
  const push = (k, j) => { if (hourHold) j.hold.push(hourHold); out[k].push(settle(j)); };

  // ═══ 재물 ═══
  {
    const jae = f.재성, sik = f.식상, bi = f.비겁, in_ = f.인성, gwan = f.관성;
    // 1) 재성 세력
    let j;
    if (jae.level === 'strong') { j = J('jae_force', '재물의 기운(재성)이 힘 있게 자리해, 돈을 벌고 굴리는 감각이 뚜렷한 편', 14); j.evidence.push(jae.desc); }
    else if (jae.level === 'mid') { j = J('jae_force', '재성이 드러나 있으나 뿌리가 약해, 재물 감각은 있되 꾸준함은 운의 뒷받침이 필요', 6); j.evidence.push(jae.desc); j.conditions.push('재성이 통근하거나 재성 운이 들어올 때 뚜렷해짐'); }
    else if (jae.level === 'weak') { j = J('jae_force', '재성이 지장간에만 있어 겉으로 드러나지 않음 — 재물 감각을 단정하지 않음', 0); j.status = '보류'; j.evidence.push(jae.desc); j.conditions.push('재성이 운에서 투출될 때 판단 가능'); }
    else { j = J('jae_force', '재성이 없어 돈을 직접 좇기보다 명예·전문성으로 가치를 쌓는 경로가 어울림', -6); j.evidence.push(jae.desc); }
    push('wealth', j);

    // 2) 식상생재 — 있음 ≠ 작용함
    if (atLeast(sik.level, 'weak') && atLeast(jae.level, 'weak')) {
      j = J('siksang_saengjae', '재능·활동(식상)이 수입(재성)으로 이어지는 흐름(식상생재)', 12);
      j.evidence.push('식상 ' + sik.desc, '재성 ' + jae.desc);
      if (!atLeast(sik.level, 'mid') || !atLeast(jae.level, 'mid')) { j.status = '불성립'; j.counter.push('식상 또는 재성이 지장간에만 있어 생(生)이 겉으로 작용하지 않음'); }
      else {
        if (!connected(sik, jae)) j.counter.push('식상과 재성이 떨어진 기둥에 있어 연결이 약함(인접 기둥이어야 생이 통함)');
        if (weakDay) j.counter.push(`일간이 ${lv}이라 벌어들인 재를 감당할 힘이 부족(재다신약 쪽으로 기움)`);
        if (in_.level === 'strong') j.counter.push('인성이 강해 식상을 극(도식)하므로 재능의 발현이 눌릴 수 있음');
        j.conditions.push('식상·재성이 인접하고 일간이 중화 이상일 때만 "재능이 곧 수입" 풀이를 적용');
      }
      push('wealth', j);
    }
    // 3) 재다신약
    if (jae.level === 'strong' && weakDay) {
      j = J('jae_da_sin_yak', '돈 들어올 자리는 많은데 감당할 내 힘이 부족한 구조(재다신약)', -12);
      j.evidence.push(`일간 ${lv}(비겁+인성 ${Math.round(st.ratio * 100)}%)`, jae.desc);
      if (in_.level === 'strong' || bi.level === 'strong') j.counter.push('인성·비겁이 뿌리를 두고 있어 힘을 보태면 완화됨');
      j.conditions.push('비겁·인성 운이 올 때 재를 감당하게 되어 재물이 실제로 남는 시기');
      push('wealth', j);
    }
    // 4) 일간 강한데 재성 있음 — 재를 감당
    if (strongDay && atLeast(jae.level, 'mid')) {
      j = J('strong_holds_jae', '기운이 든든해 재물을 감당할 그릇이 있음', 10);
      j.evidence.push(`일간 ${lv}`, jae.desc);
      if (jae.level === 'mid') j.counter.push('재성 자체는 뿌리가 약해 그릇에 비해 재원이 적을 수 있음');
      push('wealth', j);
    }
    // 5) 비겁쟁재
    if (bi.level === 'strong' && atLeast(jae.level, 'mid')) {
      j = J('bigeop_jaengjae', '나와 같은 기운이 강해 재물을 두고 경쟁·분배가 생기기 쉬움(비겁쟁재) — 동업·보증·공동투자 신중', -8);
      j.evidence.push('비겁 ' + bi.desc, '재성 ' + jae.desc);
      if (gwan.level === 'strong') j.counter.push('관성이 강해 비겁을 제어하므로 쟁재가 완화됨');
      if (f.식상.level === 'strong') j.counter.push('식상이 강해 비겁의 힘을 재성으로 흘려보내는 통로가 있음');
      push('wealth', j);
    }
    // 6) 편재/정재 성향 — 투간·본기만 세고 지장간은 제외
    const pj = jae.gods['편재'] || 0, jj = jae.gods['정재'] || 0;
    if (pj || jj) {
      j = J('jae_kind', pj > jj ? '사업·투자처럼 크게 움직이는 돈(편재)과 인연' : '월급·임대처럼 꾸준한 돈(정재)에 강함', 0);
      j.evidence.push(`편재 ${pj} · 정재 ${jj} (투간·지지 본기 기준)`);
      if (pj && jj) j.counter.push('편재·정재가 섞여 있어 한쪽으로 단정하기 어려움');
      push('wealth', j);
    }
    // 7) 용신·격국이 재성
    const yongIsJae = c.yongsin && c.yongsin.primary && groupOfElemForDay(c.dayStem, c.yongsin.primary) === '재성';
    const gyeokIsJae = c.gyeokguk && TENGOD_GROUP[c.gyeokguk.baseGod] === '재성';
    if (yongIsJae || gyeokIsJae) {
      j = J('jae_role', yongIsJae ? '재성이 용신이라 재물 활동이 곧 균형을 잡는 길' : `격국이 ${c.gyeokguk.name}이라 재물이 인생의 주제`, 6);
      if (yongIsJae) j.evidence.push(`용신 ${c.yongsin.primary} = 재성 (${c.yongsin.method})`);
      if (gyeokIsJae) j.evidence.push(`격국 ${c.gyeokguk.name} (월지 ${c.gyeokguk.monthBranch} 본기 ${c.gyeokguk.mainGod}${c.gyeokguk.transparent ? ', 투출' : ', 미투출'})`);
      if (gyeokIsJae && !atLeast(jae.level, 'mid')) j.counter.push('격의 글자가 드러나지 않아 격이 온전하지 않음');
      push('wealth', j);
    }
    // 8) 현재 대운
    const cur = c.daeun.list[c.daeun.currentIdx];
    if (cur && (TENGOD_GROUP[cur.stemGod] === '재성' || TENGOD_GROUP[cur.branchGod] === '재성')) {
      j = J('daeun_jae', `지금의 큰 운(${cur.stem}${cur.branch})에 재물의 기운이 들어와 돈 관련 활동이 활발한 시기`, 8);
      j.evidence.push(`대운 ${cur.stem}(${cur.stemGod}) ${cur.branch}(${cur.branchGod}), ${cur.age}~${cur.endAge}세`);
      if (weakDay) j.counter.push('일간이 약해 들어온 재를 감당하기 어려울 수 있음 — 재는 늘어도 지출·부담도 같이 늘 수 있음');
      j.conditions.push('원국의 재성과 같은 자리를 건드리는지(합·충)는 아직 반영하지 않음');
      push('wealth', j);
    }
  }

  // ═══ 직업 ═══
  {
    const gwan = f.관성, in_ = f.인성, sik = f.식상, jae = f.재성;
    let j;
    const gg = c.gyeokguk;
    j = J('gyeok', `타고난 그릇(격국)은 ${gg.name}`, 0);
    j.evidence.push(`월지 ${gg.monthBranch} 본기 ${gg.mainGod}, ${gg.transparent ? '격의 글자가 천간에 투출' : '투출 없이 월지 본기로 취격'}`);
    j.hold.push('격의 성패(成敗)·구응(救應)은 아직 판단하지 않음');
    push('career', j);

    // 관인상생
    if (atLeast(gwan.level, 'weak') && atLeast(in_.level, 'weak')) {
      j = J('gwan_in', '직장운(관성)과 공부운(인성)이 서로 받쳐주는 구조(관인상생) — 조직·공직·자격 분야에서 안정적 성장', 14);
      j.evidence.push('관성 ' + gwan.desc, '인성 ' + in_.desc);
      if (!atLeast(gwan.level, 'mid') || !atLeast(in_.level, 'mid')) { j.status = '불성립'; j.counter.push('관성 또는 인성이 지장간에만 있어 생이 겉으로 작용하지 않음'); }
      else {
        if (!connected(gwan, in_)) j.counter.push('관성과 인성이 떨어진 기둥에 있어 연결이 약함');
        if (jae.level === 'strong') j.counter.push('재성이 강해 인성을 극(재극인)하므로 관→인→나의 흐름이 끊길 수 있음');
        if ((gwan.gods['정관'] || 0) > 0 && (sik.gods['상관'] || 0) > 0 && connected(gwan, sik)) j.counter.push('상관이 정관 옆에 있어 관을 다치게 함(상관견관)');
        j.conditions.push('관·인이 인접하고 재성이 인성을 극하지 않을 때만 "조직에서 안정 성장" 풀이를 적용');
      }
      push('career', j);
    }
    // 식상 세력
    if (atLeast(sik.level, 'mid')) {
      j = J('sik_force', '재능을 펼치는 기운(식상)이 있어 기술·창작·교육·전문서비스처럼 능력을 직접 보여주는 일이 맞음', sik.level === 'strong' ? 10 : 5);
      j.evidence.push(sik.desc);
      if (in_.level === 'strong') j.counter.push('인성이 강해 식상을 누르므로(도식) 표현보다 학습·자격 쪽으로 기울 수 있음');
      if (weakDay && sik.level === 'strong') j.counter.push('일간이 약한데 식상이 강하면 기운이 새어 나가 지치기 쉬움');
      push('career', j);
    }
    // 관성 세력
    if (atLeast(gwan.level, 'mid')) {
      j = J('gwan_force', '명예·책임의 기운(관성)이 있어 조직·관리 직무에 어울림', gwan.level === 'strong' ? 8 : 4);
      j.evidence.push(gwan.desc);
      if (weakDay && gwan.level === 'strong' && in_.level === 'none') j.counter.push('일간이 약하고 인성의 완충이 없어 책임·압박이 부담으로 작용');
      push('career', j);
    }
    // 재성 세력
    if (jae.level === 'strong') {
      j = J('jae_career', '재물·활동의 기운이 강해 사업·영업·금융처럼 성과가 보이는 일에 강함', 8);
      j.evidence.push(jae.desc);
      if (weakDay) j.counter.push('일간이 약해 큰 재를 굴리기보다 관리·실무 쪽이 안전');
      push('career', j);
    }
    if (gwan.level === 'none' && jae.level === 'none') {
      j = J('no_gwan_jae', '관성·재성이 없어 조직 생활보다 전문성·기술·연구로 홀로 서는 길이 유리할 수 있음', -6);
      j.evidence.push('관성 없음, 재성 없음(지장간 포함)');
      push('career', j);
    }
  }

  // ═══ 연애 ═══
  {
    const male = c.gender === 'male';
    const spouseGrp = male ? '재성' : '관성';
    const sp = f[spouseGrp], name = male ? '이성(여성)을 뜻하는 기운' : '이성(남성)을 뜻하는 기운';
    const cnt = sp.stems.length + sp.mains.length;
    let j;
    if (sp.level === 'strong' && cnt >= 3) { j = J('spouse_force', `${name}이 많아 이성 인연은 풍부하지만 관계가 복잡해지기 쉬움`, 4); }
    else if (atLeast(sp.level, 'mid')) { j = J('spouse_force', `${name}이 드러나 있어 이성 인연과 배우자 복이 무난`, 14); }
    else if (sp.level === 'weak') { j = J('spouse_force', `${name}이 지장간에만 있어 인연이 늦거나 드러나지 않는 편`, -4); j.conditions.push('그 기운이 운에서 투출될 때 인연이 활발'); }
    else { j = J('spouse_force', `${name}이 없어 인연이 늦거나 적극적으로 다가가야 함`, -8); j.conditions.push('그 기운이 들어오는 운에 인연이 열림'); }
    j.evidence.push(sp.desc);
    push('love', j);

    const dayB = c.pillarInfo.day;
    j = J('spouse_palace', `배우자 자리(일지)는 ${dayB.branch}, 그 기운은 ${dayB.branchGod}`, 0);
    j.evidence.push(`일지 본기 ${BRANCH_MAIN[dayB.branch]} → ${dayB.branchGod}`);
    j.hold.push('일지가 합·충으로 흔들리는지는 합충 탭 참고 — 여기서는 반영하지 않음');
    push('love', j);

    if (c.sinsal.some(x => x.name === '도화살')) {
      j = J('dohwa', '이성에게 끌리는 매력(도화살)', 6);
      j.evidence.push('신살 도화살');
      j.hold.push('신살은 보조 지표 — 세력 판단과 무관');
      push('love', j);
    }
    if (male && f.비겁.level === 'strong' && atLeast(f.재성.level, 'mid')) {
      j = J('love_jaengjae', '나와 같은 기운이 강해 이성을 두고 경쟁이 생기기 쉬움(비겁쟁재)', -6);
      j.evidence.push('비겁 ' + f.비겁.desc, '재성 ' + f.재성.desc);
      if (f.관성.level === 'strong') j.counter.push('관성이 비겁을 제어해 완화');
      push('love', j);
    }
    if (!male && f.식상.level === 'strong' && atLeast(f.관성.level, 'weak')) {
      j = J('love_sanggwan', '표현·재능의 기운이 강해 배우자 기운(관성)과 부딪히기 쉬움(상관견관 경향)', -6);
      j.evidence.push('식상 ' + f.식상.desc, '관성 ' + f.관성.desc);
      if (atLeast(f.재성.level, 'mid')) j.counter.push('재성이 있어 식상→재→관으로 통관되므로 충돌이 완화');
      if (f.인성.level === 'strong') j.counter.push('인성이 식상을 제어해 완화');
      if (!connected(f.식상, f.관성)) j.counter.push('식상과 관성이 떨어져 있어 직접 부딪히지 않음');
      push('love', j);
    }
    const cur = c.daeun.list[c.daeun.currentIdx];
    if (cur && (TENGOD_GROUP[cur.stemGod] === spouseGrp || TENGOD_GROUP[cur.branchGod] === spouseGrp)) {
      j = J('daeun_love', `지금의 큰 운(${cur.stem}${cur.branch})에 이성의 기운이 들어와 인연·관계 변화가 활발한 시기`, 8);
      j.evidence.push(`대운 ${cur.stem}(${cur.stemGod}) ${cur.branch}(${cur.branchGod})`);
      push('love', j);
    }
  }

  return { force: f, ...out };
}

// 일간 기준 오행 → 그룹 (엔진의 godGroupOfElement와 동일 논리, 순환 import 회피용)
function groupOfElemForDay(dayStem, elem) {
  const de = STEM_ELEM[dayStem];
  const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }, KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
  if (elem === de) return '비겁';
  if (SHENG[de] === elem) return '식상';
  if (KE[de] === elem) return '재성';
  if (KE[elem] === de) return '관성';
  if (SHENG[elem] === de) return '인성';
  return '';
}

// 점수 — 성립 전액, 조건부 절반, 나머지 0
export function scoreOf(list, base) {
  return list.reduce((s, j) => s + (j.status === '성립' ? j.delta : j.status === '조건부' ? j.delta / 2 : 0), base);
}
