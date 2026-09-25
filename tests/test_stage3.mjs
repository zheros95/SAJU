// 3단계 검증 — 판단 기록: '있다'와 '작용한다' 구분
import { buildChart } from '../saju_engine.mjs';
import { godForce, buildJudgments } from '../judgments.mjs';
import { wealthLuck, careerLuck, loveLuck } from '../saju_text.mjs';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const mk = (pillars, extra = {}) => ({ pillars, input: { hourUnknown: false }, strength: { level: '중화', ratio: 0.5 }, yongsin: { primary: '토', method: '억부' }, gyeokguk: { name: '정관격', baseGod: '정관', monthBranch: pillars.month[1], mainGod: '정관', transparent: true }, daeun: { list: [], currentIdx: -1 }, sinsal: [], gender: 'male', dayStem: pillars.day[0], pillarInfo: { day: { branch: pillars.day[1], branchGod: '정재' } }, godCount: { 비견: 0 }, ...extra });

// 1) 세력 — 투간+통근 = 강, 투간만 = 중, 지장간만 = 약
// 甲 일간: 재성=토(戊己), 식상=화(丙丁)
let f = godForce({ year: ['戊', '辰'], month: ['丙', '寅'], day: ['甲', '子'], hour: ['乙', '亥'] });
ok(f.재성.level === 'strong' && f.재성.rooted.length === 1, `재성 戊 투간 + 辰 통근 → 강 (${f.재성.desc})`);
ok(f.식상.level === 'strong' && f.식상.rooted.length === 1, `식상 丙 투간 + 寅中丙 통근 → 강 (${f.식상.desc})`);
f = godForce({ year: ['戊', '子'], month: ['丙', '申'], day: ['甲', '子'], hour: ['乙', '丑'] });
ok(f.식상.level === 'mid' && f.식상.stems.length === 1 && f.식상.rooted.length === 0, `식상 丙 투간, 지지에 화 없음 → 중 (${f.식상.desc})`);
f = godForce({ year: ['壬', '子'], month: ['癸', '亥'], day: ['甲', '寅'], hour: ['乙', '卯'] });
ok(f.재성.level === 'weak', `재성 지장간(寅中戊)만 → 약 (${f.재성.desc})`);
ok(f.인성.monthLing && f.인성.level === 'strong', `인성 월령(亥) → 강`);

// 2) 식상생재 — 있음 ≠ 작용
// (a) 식상·재성 인접(월간 丙, 연간 戊), 일간 중화 → 성립
let c = mk({ year: ['戊', '辰'], month: ['丙', '寅'], day: ['甲', '子'], hour: ['乙', '卯'] });
let J = buildJudgments(c); let sj = J.wealth.find(j => j.id === 'siksang_saengjae');
ok(sj && sj.status === '성립', `식상·재성 인접 + 중화 + 인성 중 → 식상생재 ${sj && sj.status}`);
// 같은 구조에 인성만 강해지면(일지·시지 본기 수) 도식 반대 근거로 조건부
c = mk({ year: ['戊', '辰'], month: ['丙', '寅'], day: ['甲', '子'], hour: ['乙', '亥'] });
J = buildJudgments(c); sj = J.wealth.find(j => j.id === 'siksang_saengjae');
ok(sj && sj.status === '조건부' && sj.counter.some(x => x.includes('도식')), `인성 강 → ${sj && sj.status} (도식)`);
// (b) 같은 글자인데 일간 신약 → 조건부, 반대 근거에 재다신약 언급
c = mk({ year: ['戊', '辰'], month: ['丙', '寅'], day: ['甲', '子'], hour: ['乙', '亥'] }, { strength: { level: '신약', ratio: 0.35 } });
J = buildJudgments(c); sj = J.wealth.find(j => j.id === 'siksang_saengjae');
ok(sj && sj.status === '조건부' && sj.counter.some(x => x.includes('감당')), `같은 글자, 일간 신약 → ${sj && sj.status} (${sj && sj.counter[0]})`);
// (c) 식상(연간 丙)과 재성(시간 戊)이 떨어짐 → 조건부, 연결 약함
c = mk({ year: ['丙', '子'], month: ['壬', '亥'], day: ['甲', '寅'], hour: ['戊', '辰'] });
J = buildJudgments(c); sj = J.wealth.find(j => j.id === 'siksang_saengjae');
ok(sj && sj.status === '조건부' && sj.counter.some(x => x.includes('연결')), `식상·재성 떨어짐 → ${sj && sj.status} (${sj && sj.counter[0]})`);
// (d) 재성이 지장간에만 → 불성립
c = mk({ year: ['壬', '子'], month: ['丙', '寅'], day: ['甲', '子'], hour: ['乙', '亥'] });
J = buildJudgments(c); sj = J.wealth.find(j => j.id === 'siksang_saengjae');
ok(sj && sj.status === '불성립', `재성 지장간만 → 식상생재 ${sj && sj.status}`);

// 3) 관인상생 — 재극인 반대 근거
// 甲 일간: 관성=금(庚辛), 인성=수(壬癸), 재성=토
c = mk({ year: ['庚', '申'], month: ['壬', '子'], day: ['甲', '寅'], hour: ['乙', '亥'] });
J = buildJudgments(c); let gj = J.career.find(j => j.id === 'gwan_in');
ok(gj && gj.status === '성립', `관(연) 인(월) 인접, 재성 약 → 관인상생 ${gj && gj.status}`);
c = mk({ year: ['庚', '申'], month: ['壬', '辰'], day: ['甲', '戌'], hour: ['戊', '辰'] }); // 재성 토 강
J = buildJudgments(c); gj = J.career.find(j => j.id === 'gwan_in');
ok(gj && gj.status === '조건부' && gj.counter.some(x => x.includes('재극인')), `재성 강 → 관인상생 ${gj && gj.status} (재극인)`);

// 4) 실제 차트에서 문장 생성 — 결론·근거 구조, 시각 미상 유보
const real = buildChart({ year: 1990, month: 3, day: 15, hour: 12, minute: 0, isLunar: false, isLeap: false, gender: 'male', hourUnknown: true });
real.input = { hourUnknown: true };
const w = wealthLuck(real), ca = careerLuck(real), lo = loveLuck(real);
ok(w.judgments.length >= 2 && ca.judgments.length >= 2 && lo.judgments.length >= 2, `판단 기록 생성: 재물 ${w.judgments.length} · 직업 ${ca.judgments.length} · 연애 ${lo.judgments.length}`);
ok([...w.judgments, ...ca.judgments, ...lo.judgments].every(j => j.hold.some(h => h.includes('시각 미상'))), '시각 미상 → 모든 판단에 유보 표기');
ok(w.lines.every(l => /jstat-(ok|cond|hold|no)/.test(l) && l.includes('근거')), '문장에 상태 배지와 근거 포함');
ok(!w.lines.join(' ').includes('undefined') && !ca.lines.join(' ').includes('undefined') && !lo.lines.join(' ').includes('undefined'), 'undefined 없음');
ok(typeof w.score === 'number' && w.score >= 20 && w.score <= 98, `점수 범위 (재물 ${w.score})`);
console.log('   재물 판단:', w.judgments.map(j => `${j.id}=${j.status}`).join(', '));
console.log('   직업 판단:', ca.judgments.map(j => `${j.id}=${j.status}`).join(', '));

console.log(fails ? `\n${fails}건 실패` : '\n모두 통과');
process.exit(fails ? 1 : 0);
