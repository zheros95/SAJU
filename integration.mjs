// integration.mjs — 통합 교차통변 (종합판)
// 전통 사주(命)의 일간·오행·용신 + 관상 유형 프로필 + 수상 손유형 프로필을
// '성격/강점/주의점/적성/대인/조언' 주제별로 엮어 하나의 종합 인물평을 만든다.
// AI 호출 없음. 규칙 기반.

const HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // 상생
const KE = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };     // 상극

function dominantElement(c) {
  const ec = c.elementCount || {};
  const keys = Object.keys(ec);
  if (!keys.length) return null;
  return keys.sort((a, b) => ec[b] - ec[a])[0];
}

// 긴 설명에서 첫 문장만 추출(통합은 요약이 목적)
function firstSent(s) {
  if (!s) return '';
  const t = String(s).trim();
  const seg = t.split(/(?<=[.!?。…])\s/)[0];
  return seg || t;
}

// 한글 받침에 따라 조사 선택 (오행명 화/토/수=받침없음, 목/금=받침있음)
function hasJong(w) {
  const s = String(w); const c = s.charCodeAt(s.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}
const josaGwa = w => hasJong(w) ? '과' : '와';
const josaIga = w => hasJong(w) ? '이' : '가';
const josaRo = w => hasJong(w) ? '으로' : '로';
const josaEul = w => hasJong(w) ? '을' : '를';

// 입력: { saju(차트|null), face(관상|null), palm(수상|null), sajuProfile(일간 설명|null) }
export function readIntegration({ saju, face, palm, sajuProfile }) {
  const els = {};
  let sajuEl = null, yong = null;
  if (saju) { sajuEl = dominantElement(saju); yong = saju.yongsin?.primary || null; if (sajuEl) els['사주'] = sajuEl; }
  if (face && face.element) els['관상'] = face.element;
  if (palm && palm.element) els['수상'] = palm.element; // 손모양 미판별 시 오행 교차 생략

  // ── 오행 관계 요약 (lines) ──
  const lines = [];
  const parts = Object.entries(els).map(([k, v]) => `${k} <b>${v}(${HANJA[v]})</b>`).join(' · ');
  if (parts) lines.push(`기운을 오행으로 모으면 — ${parts} — 입니다.`);
  if (face && face.element && palm && palm.element) {
    const f = face.element, p = palm.element;
    if (f === p) lines.push(`겉모습(관상)과 손(수상)이 모두 <b>${f}</b>${josaRo(f)} 일치해, 기질이 한 방향으로 또렷합니다.`);
    else if (SHENG[f] === p || SHENG[p] === f) lines.push(`관상 <b>${f}</b>${josaGwa(f)} 수상 <b>${p}</b>${josaIga(p)} <b>상생(相生)</b>이라 안팎이 자연스럽게 이어집니다.`);
    else if (KE[f] === p || KE[p] === f) lines.push(`관상 <b>${f}</b>${josaGwa(f)} 수상 <b>${p}</b>${josaIga(p)} <b>상극(相剋)</b>이라 겉과 속에 약간의 긴장이 있는 <b>다면적</b> 유형입니다.`);
    else lines.push(`관상 <b>${f}</b>${josaGwa(f)} 수상 <b>${p}</b>${josaIga(p)} 달라 여러 얼굴을 쓰는 <b>다면적</b> 성향입니다.`);
  }
  if (saju && yong) {
    const ext = [];
    if (face && (face.element === yong || SHENG[face.element] === yong)) ext.push('관상');
    if (palm && (palm.element === yong || SHENG[palm.element] === yong)) ext.push('수상');
    if (ext.length) lines.push(`사주에 필요한 용신 <b>${yong}(${HANJA[yong]})</b>${josaEul(yong)} ${ext.join('·')}의 기운이 보강하는 <b>후천 개운(開運)형</b>입니다.`);
  }

  // ── 종합 프로필 (sections) ──
  // 1) 성격·기질
  const charBits = [];
  if (sajuProfile?.basic) charBits.push(`사주로는 ${firstSent(sajuProfile.basic)}`);
  if (face?.profile) charBits.push(`관상은 <b>${face.profile.character}</b> 인상`);
  if (palm?.profile) charBits.push(`손은 <b>${palm.profile.character}</b> 기질`);
  const characterText = charBits.length ? charBits.join(', ') + '입니다. 이 세 결이 모여 지금의 당신을 이룹니다.' : '';

  // 2) 강점
  const strengths = [];
  if (face?.profile) strengths.push(face.profile.strength);
  if (palm?.profile) strengths.push(palm.profile.strength);
  if (sajuEl) strengths.push(`사주의 ${sajuEl}(${HANJA[sajuEl]}) 기운`);
  const strengthText = strengths.length ? `<b>${strengths.join(' · ')}</b> 등이 강점입니다. 진로와 일상에서 이 무기를 적극 활용하세요.` : '';

  // 3) 주의할 점
  const cautions = [];
  if (face?.profile) cautions.push(face.profile.caution);
  if (palm?.profile) cautions.push(palm.profile.caution);
  const cautionText = cautions.length ? `${cautions.join('. ')}. 이런 면을 미리 의식하면 실수를 줄이고 관계가 한결 부드러워집니다.` : '';

  // 4) 일·적성
  const apts = [];
  if (face?.profile) apts.push(face.profile.aptitude);
  if (palm?.profile) apts.push(palm.profile.aptitude);
  let aptText = '';
  if (sajuProfile?.aptitude) aptText = firstSent(sajuProfile.aptitude) + (apts.length ? ` 관상·수상도 <b>${apts.join(', ')}</b> 방면을 가리킵니다.` : '');
  else if (apts.length) aptText = `<b>${apts.join(', ')}</b> 방면이 잘 맞습니다.`;

  // 5) 대인·관계
  const rels = [];
  if (sajuProfile?.relationship) rels.push(firstSent(sajuProfile.relationship));
  if (face?.profile) rels.push(face.profile.relation);
  let relationText = rels.join(' ');

  // 5.5) 손금 답변을 해당 주제에 반영 (손모양만 쓰던 것을 보완)
  const pa = palm?.answers || {};
  let strengthExtra = '', cautionExtra = '', aptExtra = '';
  if (pa.fate === 'clear') aptExtra = ' 손금의 운명선도 뚜렷해, 한 방향으로 꾸준히 가면 성취가 분명한 편입니다.';
  else if (pa.fate === 'none' || pa.fate === 'weak') aptExtra = ' 손금의 운명선은 흐릿한데, 전통 해석으로는 정해진 길보다 스스로 만들어 가는 쪽이 어울린다고 봅니다.';
  if (pa.heart === 'curved') relationText += ' 손금의 감정선도 길게 휘어, 정이 많고 표현이 풍부한 결로 봅니다.';
  else if (pa.heart === 'straight') relationText += ' 손금의 감정선은 곧아, 감정 표현을 절제하는 결로 봅니다.';
  if (pa.sun === 'yes') strengthExtra = ' 약지 아래 태양선(명예·인기)이 있어 성취의 기운을 보탭니다.';
  if (pa.simian === 'yes') cautionExtra = ' 막쥔손금의 강한 집중력은 큰 무기지만 극단으로 흐를 수 있으니 독주를 경계하세요.';

  // 6) 개운 조언
  const advices = [];
  if (yong) advices.push(`사주에 부족한 <b>${yong}(${HANJA[yong]})</b> 기운을 채우는 방향·색·취미·사람을 가까이하면 좋다고 봅니다.`);
  else if (sajuEl) advices.push(`이미 강한 <b>${sajuEl}(${HANJA[sajuEl]})</b> 기운이 치우치지 않도록 <b>${SHENG[sajuEl]}(${HANJA[SHENG[sajuEl]]})</b> 활동으로 흘려보내 균형을 잡으세요.`);
  if (sajuProfile?.advice) advices.push(firstSent(sajuProfile.advice));
  advices.push('사주·관상·수상 모두 과학적으로 검증된 예측이 아닙니다. 결과는 자기 성찰의 재료로만 쓰고, 삶의 방향은 스스로 정하세요.');
  const adviceText = advices.join(' ');

  const sections = [
    { title: '타고난 성격·기질', icon: 'fa-fingerprint', body: characterText },
    { title: '강점', icon: 'fa-star', body: strengthText + strengthExtra },
    { title: '주의할 점', icon: 'fa-triangle-exclamation', body: cautionText + cautionExtra },
    { title: '일·적성', icon: 'fa-briefcase', body: aptText + aptExtra },
    { title: '대인·관계', icon: 'fa-people-group', body: relationText },
    { title: '개운 조언', icon: 'fa-lightbulb', body: adviceText },
  ].filter(s => s.body && s.body.trim());

  return { ok: true, lines, els, sections };
}
