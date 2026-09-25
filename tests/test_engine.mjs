// 계산 정합성 검증 — 음력 검증·데이터 구멍·절입 경계·대운 교체일
import { buildChart } from '../saju_engine.mjs';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const chart = o => buildChart({ hour: 12, minute: 0, isLunar: false, isLeap: false, gender: 'male', hourUnknown: false, ...o });
const thrown = o => { try { chart(o); return null; } catch (e) { return e.message; } };

// 1) 없는 음력 날짜는 거부
let m = thrown({ year: 2024, month: 1, day: 30, isLunar: true });
ok(m && m.includes('존재하지 않는'), `음력 2024-1-30 거부: ${m}`);
m = thrown({ year: 2025, month: 6, day: 30, isLunar: true, isLeap: true });
ok(m && m.includes('존재하지 않는'), `음력 2025-윤6-30 거부: ${m}`);
// 2) 데이터 구멍(실제 존재하는 날짜)은 보정 통과
let c = chart({ year: 1956, month: 11, day: 30, isLunar: true });
ok(c.solar.year === 1956 && c.solar.month === 12 && c.solar.day === 31, `음력 1956-11-30 → 양력 ${c.solar.year}-${c.solar.month}-${c.solar.day} (기대 1956-12-31)`);
c = chart({ year: 2025, month: 6, day: 29, isLunar: true, isLeap: true });
ok(c.solar.month === 8 && c.solar.day === 22, `음력 2025-윤6-29 → 양력 ${c.solar.month}-${c.solar.day} (기대 8-22)`);
// 3) 입춘 경계 (KASI 2026 입춘 05:02 KST): 직전은 乙巳년·丑월, 직후는 丙午년·寅월
const before = chart({ year: 2026, month: 2, day: 4, hour: 5, minute: 1 });
const after = chart({ year: 2026, month: 2, day: 4, hour: 5, minute: 3 });
ok(before.pillars.year.join('') === '乙巳' && after.pillars.year.join('') === '丙午', `입춘 경계 년주: 05:01→${before.pillars.year.join('')}, 05:03→${after.pillars.year.join('')}`);
ok(before.pillars.month[1] === '丑' && after.pillars.month[1] === '寅', `입춘 경계 월지: ${before.pillars.month[1]}→${after.pillars.month[1]}`);
ok(before.termWarning != null && after.termWarning != null, `경계 근접 경고 표시: ${before.termWarning}분 / ${after.termWarning}분`);
// 4) 대운 — 표시(연월·나이)와 현재 대운 판정이 같은 교체일에서 나오는지
c = chart({ year: 1990, month: 3, day: 15, hour: 10, minute: 30 });
const d = c.daeun, now = Date.now();
const idxByDate = d.list.findIndex(x => now >= x.startMs && now < x.endMs);
ok(d.currentIdx === idxByDate, `현재 대운 인덱스 = 교체일 기준 (${d.currentIdx})`);
ok(d.list.every((x, i) => i === 0 || x.startMs === d.list[i - 1].endMs), '대운 구간이 빈틈·겹침 없이 이어짐');
ok(d.list.every(x => x.endAge === x.age + 9), '표시 나이 구간 10년');
const s0 = d.list[0];
ok(s0.startYM === d.startExact.ym && s0.age === d.startAge, `첫 대운 ${d.startAge}세 ${d.startExact.ym} (생후 ${d.startExact.years}년 ${d.startExact.months}개월)`);
// 표시 나이가 교체일의 만 나이와 같은지 (반올림 불일치 재발 방지)
const yrs = (s0.startMs - Date.UTC(1990, 2, 15, 1, 30)) / (365.2425 * 86400000);
ok(Math.floor(yrs) === s0.age, `첫 대운 나이 ${s0.age} = floor(${yrs.toFixed(2)})`);

console.log(fails ? `\n${fails}건 실패` : '\n모두 통과');
process.exit(fails ? 1 : 0);
