// integration.mjs — 통합 화면
// 사주·관상·수상을 하나의 오행으로 합치지 않는다. 각 체계의 결론과 근거를 나란히 놓고,
// 비교 가능한 항목에만 일치·상충·판단 불가를 표시한다.
// 상충을 '겉과 속의 차이'로 풀지 않는다 — 그렇게 하면 어떤 결과도 맞는 해석이 되기 때문.
// 관상·수상의 오행은 이 앱의 대응표(서양 4원소 손유형 → 오행, 관인팔법 유형 → 오행)에서 나온 값이라
// 사주와 같아도 독립된 세 체계의 교차검증이 아니다. 화면에도 그렇게 적는다.
// AI 호출 없음. 규칙 기반.

const HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
const SHENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // 상생 (개운 조언에서만 사용)

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

const el = v => (v ? `${v}(${HANJA[v]})` : null);

// 두 오행 값의 비교 판정 — 같으면 일치, 다르면 상충(상생·상극으로 완화하지 않음), 하나라도 없으면 판단 불가
function verdictOf(a, b) {
  if (!a || !b) return '판단 불가';
  return a === b ? '일치' : '상충';
}

// 입력: { saju(차트|null), face(관상|null), palm(수상|null), sajuProfile(일간 설명|null) }
export function readIntegration({ saju, face, palm, sajuProfile }) {
  const els = {};
  let sajuEl = null, yong = null;
  if (saju) { sajuEl = dominantElement(saju); yong = saju.yongsin?.primary || null; if (sajuEl) els['사주'] = sajuEl; }
  if (face && face.element) els['관상'] = face.element;
  if (palm && palm.element) els['수상'] = palm.element;

  // ── 1) 체계별 결론·근거·한계 ──
  const sources = [];
  if (saju) {
    const ys = saju.yongsin || {}, st = saju.strength || {};
    const hourNote = saju.input?.hourUnknown ? ' 시각 미상이라 시주를 뺀 3주 기준.' : '';
    const hs = saju.hourSensitivity;
    const varies = hs ? Object.entries(hs).filter(([, v]) => !v.stable).map(([k]) => ({ strength: '신강약', yongsin: '용신', gyeokguk: '격국' }[k])) : [];
    sources.push({
      name: '사주',
      conclusion: `일간 ${saju.dayStem} · 가장 많은 오행 ${el(sajuEl)} · 용신 ${el(yong)}${ys.helper ? ` · 희신 ${el(ys.helper)}` : ''}`,
      basis: `${st.level || ''}(비겁+인성 비율 ${st.ratio != null ? Math.round(st.ratio * 100) + '%' : '-'}) → ${ys.method || '억부'} 처방. ${ys.reason ? firstSent(ys.reason) : ''}`,
      limits: `오행 개수·비율 중심의 간이 판단이며 통근·투간·합화 성립은 아직 반영하지 않음.${hourNote}${varies.length ? ` 시각에 따라 바뀌는 결론: ${varies.join('·')}.` : ''}`,
    });
  }
  if (face) {
    sources.push({
      name: '관상',
      conclusion: face.topType ? `${face.topType} 유형 → 앱 대응표로 ${el(face.element)}` : '유형 미판정',
      basis: `얼굴 기준점 비율 측정 ${(face.items || []).length}개 항목`,
      limits: '측정 임계값은 검증되지 않은 초기 추정치. 각도·조명·표정에 따라 유형이 바뀔 수 있음. 형태 측정이 성격·능력 판단의 타당성을 뜻하지 않음.',
    });
  }
  if (palm) {
    const answered = Object.keys(palm.answers || {}).filter(k => !['side', 'dominant', 'handType'].includes(k) && palm.answers[k] !== 'unknown').length;
    sources.push({
      name: '수상',
      conclusion: palm.topType ? `${palm.topType} → 앱 대응표로 ${el(palm.element)}` : '손 유형 미판정',
      basis: `손 비율(자동 판별 또는 설문) + 손금 설문 ${answered}개 응답${palm.unread && palm.unread.length ? ` · 판단 보류 ${palm.unread.length}개` : ''}`,
      limits: '손금 자체를 판독하지 않고 사용자 설문에 의존. 서양 4원소 손유형을 오행에 대응시킨 것은 이 앱의 틀이며 전통 공식이 아님.',
    });
  }

  // ── 2) 비교표 — 오행 값이 있는 쌍만, 일치·상충·판단 불가 ──
  const compare = [];
  const pairs = [['관상', '수상'], ['사주', '관상'], ['사주', '수상']];
  const present = Object.keys(els);
  for (const [a, b] of pairs) {
    if (!present.includes(a) && !present.includes(b)) continue; // 둘 다 없으면 행 자체를 생략
    compare.push({ topic: `${a} 오행 vs ${b} 오행`, a: el(els[a]), b: el(els[b]), verdict: verdictOf(els[a], els[b]) });
  }

  // ── 3) 요약 문장 ──
  const lines = [];
  lines.push('세 체계를 한 오행으로 합치지 않고, 각 결론과 근거를 나란히 둡니다. 비교는 오행 값이 있는 쌍에만 하고 결과는 일치·상충·판단 불가 셋 중 하나입니다.');
  const agree = compare.filter(c => c.verdict === '일치').length, conflict = compare.filter(c => c.verdict === '상충').length, unknown = compare.filter(c => c.verdict === '판단 불가').length;
  if (compare.length) lines.push(`비교 ${compare.length}건 — 일치 ${agree} · 상충 ${conflict} · 판단 불가 ${unknown}.`);
  if (agree) lines.push('일치는 관상·수상의 오행이 이 앱의 대응표에서 나온 값이라 <b>독립된 교차검증이 아닙니다</b>. 같은 방향을 가리킨다는 정도로만 보세요.');
  if (conflict) lines.push('상충은 "겉과 속이 다르다"로 풀지 않고 <b>판단을 보류</b>합니다. 그렇게 풀면 어떤 결과도 맞는 해석이 되기 때문입니다.');

  // ── 4) 주제별 정리 — 출처를 문장마다 표시, 세 체계를 하나로 묶는 문장은 쓰지 않음 ──
  const charBits = [];
  if (sajuProfile?.basic) charBits.push(`[사주] ${firstSent(sajuProfile.basic)}`);
  if (face?.profile) charBits.push(`[관상] <b>${face.profile.character}</b> 인상으로 분류`);
  if (palm?.profile) charBits.push(`[수상] <b>${palm.profile.character}</b> 기질로 분류`);
  const characterText = charBits.join(' / ');

  const strengths = [];
  if (sajuEl) strengths.push(`[사주] 사주 글자 중 ${el(sajuEl)} 가장 많음(타고난 성향 표시이며, 채워야 할 오행인 용신과는 별개)`);
  if (face?.profile) strengths.push(`[관상] ${face.profile.strength}`);
  if (palm?.profile) strengths.push(`[수상] ${palm.profile.strength}`);
  const pa = palm?.answers || {};
  if (pa.sun === 'yes') strengths.push('[수상·설문] 태양선 있음 → 전통 해석은 명예·성취의 표지로 봄');
  const strengthText = strengths.join(' / ');

  const cautions = [];
  if (face?.profile) cautions.push(`[관상] ${face.profile.caution}`);
  if (palm?.profile) cautions.push(`[수상] ${palm.profile.caution}`);
  if (pa.simian === 'yes') cautions.push('[수상·설문] 막쥔손금 → 전통 해석은 집중력이 극단으로 흐를 수 있다고 봄');
  const cautionText = cautions.join(' / ');

  const apts = [];
  if (sajuProfile?.aptitude) apts.push(`[사주] ${firstSent(sajuProfile.aptitude)}`);
  if (face?.profile) apts.push(`[관상] ${face.profile.aptitude}`);
  if (palm?.profile) apts.push(`[수상] ${palm.profile.aptitude}`);
  if (pa.fate === 'clear') apts.push('[수상·설문] 운명선 뚜렷 → 전통 해석은 진로 방향이 분명하다고 봄');
  else if (pa.fate === 'none' || pa.fate === 'weak') apts.push('[수상·설문] 운명선 약함/없음 → 전통 해석은 정해진 길보다 스스로 만드는 쪽으로 봄');
  const aptText = apts.join(' / ');

  const rels = [];
  if (sajuProfile?.relationship) rels.push(`[사주] ${firstSent(sajuProfile.relationship)}`);
  if (face?.profile?.relation) rels.push(`[관상] ${face.profile.relation}`);
  if (pa.heart === 'curved') rels.push('[수상·설문] 감정선 길고 휨 → 전통 해석은 정이 많고 표현이 풍부하다고 봄');
  else if (pa.heart === 'straight') rels.push('[수상·설문] 감정선 곧음 → 전통 해석은 감정 표현을 절제한다고 봄');
  const relationText = rels.join(' / ');

  const advices = [];
  if (yong) advices.push(`[사주] 용신 ${el(yong)} 기운을 채우는 방향·활동을 가까이하라고 봅니다.`);
  else if (sajuEl) advices.push(`[사주] 가장 많은 ${el(sajuEl)} 기운이 치우치지 않도록 ${el(SHENG[sajuEl])} 활동으로 흘려보내라고 봅니다.`);
  if (sajuProfile?.advice) advices.push(`[사주] ${firstSent(sajuProfile.advice)}`);
  advices.push('사주·관상·수상 모두 과학적으로 검증된 예측이 아닙니다. 결과는 자기 성찰의 재료로만 쓰고, 삶의 방향은 스스로 정하세요.');
  const adviceText = advices.join(' ');

  const sections = [
    { title: '성격·기질 (체계별)', icon: 'fa-fingerprint', body: characterText },
    { title: '강점 (체계별)', icon: 'fa-star', body: strengthText },
    { title: '주의할 점 (체계별)', icon: 'fa-triangle-exclamation', body: cautionText },
    { title: '일·적성 (체계별)', icon: 'fa-briefcase', body: aptText },
    { title: '대인·관계 (체계별)', icon: 'fa-people-group', body: relationText },
    { title: '조언', icon: 'fa-lightbulb', body: adviceText },
  ].filter(s => s.body && s.body.trim());

  return { ok: true, lines, els, sources, compare, sections, hasSaju: !!saju, srcNames: [saju && '사주', face && '관상', palm && '수상'].filter(Boolean) };
}
