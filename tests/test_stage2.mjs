// 2단계 검증 — 손금 판단 보류, 통합 비교 판정, 시각 미상 민감도
import { readPalmistry } from '../palmistry.mjs';
import { readIntegration } from '../integration.mjs';
import { buildChart, hourSensitivity } from '../saju_engine.mjs';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

// 1) '모르겠다'·미응답은 없다로 해석하지 않음
let p = readPalmistry({ side: 'right', dominant: 'right', handType: 'earth', fate: 'unknown', sun: 'unknown', marriage: 'none', life: 'medium' });
ok(!p.items.some(i => i.area === '운명선' || i.area === '태양선'), '운명선·태양선 unknown → 풀이 없음');
ok(p.items.some(i => i.area === '결혼선' && /안 보이는데/.test(i.text)), "결혼선 '없다'는 여전히 풀이");
ok(p.unread.includes('운명선') && p.unread.includes('태양선') && p.unread.includes('두뇌선'), `판단 보류 목록: ${p.unread.join('·')}`);
ok(p.lines.some(l => l.includes('판단 보류')), '판단 보류 안내 문장 출력');
ok(p.sideMeaning && p.sideMeaning.includes('후천'), `주로 쓰는 손 = 사진 손 → 후천 (${p.sideMeaning})`);
p = readPalmistry({ side: 'left', dominant: 'right', handType: 'earth' });
ok(p.sideMeaning && p.sideMeaning.includes('천성'), `반대 손 → 천성 (${p.sideMeaning})`);
p = readPalmistry({ side: 'left', handType: 'earth' });
ok(p.sideMeaning === null && p.lines.some(l => l.includes('정하지 않음')), '주로 쓰는 손 미응답 → 의미 미확정');

// 2) 통합 비교 — 일치/상충/판단 불가만, 후천 개운형·상생 완화 문장 없음
const saju = buildChart({ year: 1990, month: 3, day: 15, hour: 10, minute: 0, isLunar: false, isLeap: false, gender: 'male', hourUnknown: false });
const face = { topType: '청수', element: '금', items: [1, 2, 3], profile: { character: 'x', strength: 'y', caution: 'z', aptitude: 'w', relation: 'r' } };
const palm = readPalmistry({ side: 'right', dominant: 'right', handType: 'earth' }); // 토
let intg = readIntegration({ saju, face, palm, sajuProfile: null });
const fp = intg.compare.find(c => c.topic.startsWith('관상'));
ok(fp && fp.verdict === '상충', `관상 금 vs 수상 토 → ${fp && fp.verdict}`);
ok(intg.compare.every(c => ['일치', '상충', '판단 불가'].includes(c.verdict)), '판정은 세 값 중 하나');
const allText = [...intg.lines, ...intg.sections.map(s => s.body)].join(' ');
ok(!/개운\(開運\)형|상생\(相生\)이라|다면적|세 결이 모여/.test(allText), '근거 약한 통합 문장 제거');
ok(intg.sources.length === 3 && intg.sources.every(s => s.conclusion && s.basis && s.limits), '체계별 결론·근거·한계 3건');
intg = readIntegration({ saju, face, palm: null, sajuProfile: null });
ok(intg.compare.find(c => c.topic.startsWith('관상')).verdict === '판단 불가', '수상 없음 → 관상 vs 수상 판단 불가');
const palm2 = readPalmistry({ side: 'right', dominant: 'right', handType: 'air' }); // 목
intg = readIntegration({ saju: null, face: { ...face, element: '목' }, palm: palm2, sajuProfile: null });
ok(intg.compare[0].verdict === '일치' && intg.lines.some(l => l.includes('독립된 교차검증이 아닙니다')), '일치 시 교차검증 아님 고지');

// 3) 시각 미상 민감도
const hu = buildChart({ year: 1990, month: 3, day: 15, hour: 12, minute: 0, isLunar: false, isLeap: false, gender: 'male', hourUnknown: true });
ok(hu.hourSensitivity && ['strength', 'yongsin', 'gyeokguk'].every(k => hu.hourSensitivity[k]), '시각 미상 차트에 민감도 결과 존재');
ok(Object.values(hu.hourSensitivity).every(v => v.values.reduce((a, x) => a + x.count, 0) === 12), '12개 시주 모두 집계');
ok(saju.hourSensitivity === null, '시각 아는 차트는 민감도 생략');
console.log('   1990-03-15 시각 미상:', Object.entries(hu.hourSensitivity).map(([k, v]) => `${k}=${v.base}${v.stable ? '(유지)' : '(바뀜: ' + v.values.map(x => x.value + x.count).join('/') + ')'}`).join(' · '));
// 시각에 따라 실제로 바뀌는 사례가 잡히는지 — 여러 생일을 훑어 하나라도 '바뀜'이 나오면 통과
let found = null;
for (let d = 1; d <= 28 && !found; d++) { const c = buildChart({ year: 1985, month: 7, day: d, hour: 12, minute: 0, isLunar: false, isLeap: false, gender: 'female', hourUnknown: true }); if (Object.values(c.hourSensitivity).some(v => !v.stable)) found = { d, hs: c.hourSensitivity }; }
ok(!!found, found ? `1985-07-${found.d}: 시각에 따라 바뀌는 결론 감지 (${Object.entries(found.hs).filter(([, v]) => !v.stable).map(([k]) => k).join('·')})` : '바뀌는 사례 없음');

console.log(fails ? `\n${fails}건 실패` : '\n모두 통과');
process.exit(fails ? 1 : 0);
