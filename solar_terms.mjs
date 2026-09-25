// solar_terms.mjs — 12절기(節) 절입시각 계산 (1900~2050, KST 분 단위)
// 사주 년주(입춘)·월주(12절) 경계는 절입 '시각' 기준이어야 한다.
// VSOP87D(절단판) 태양 시황경 + Espenak-Meeus ΔT로
// 태양 황경이 315°+30°k 에 도달하는 순간을 이분 탐색한다.
// 정확도: KASI 달력자료(분 단위)와 대조해 tests/test_solar_terms.mjs 로 검증 — 주장은 그 결과까지만.

import { L0, L1, L2, L3, L4, R0, R1, R2, R3 } from './vsop87d_earth.mjs';

const RAD = Math.PI / 180;

// ΔT(TT-UT, 초) — Espenak & Meeus 다항식 (1900~2050 구간)
function deltaT(y) {
  let t;
  if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; // 2005~2050
}

// UT(ms epoch) → 태양 시황경(도, 0~360)
// VSOP87D 지구 일심 황경(절단판, vsop87d_earth.mjs) + 180° → 지심 기하황경,
// 여기에 장동(Δψ, Meeus 22장 간략식 ±0.5″)과 광행차(-20.4898″/R)를 더한 시황경.
// FK5 보정(-0.09″)은 생략. 검증: tests/test_solar_terms.mjs (KASI 달력자료 2023~2028, 분 단위)
function sumSeries(series, tau) {
  let r = 0, p = 1;
  for (let i = 0; i < series.length; i++) {
    let s = 0;
    const S = series[i];
    for (let j = 0; j < S.length; j++) s += S[j][0] * Math.cos(S[j][1] + S[j][2] * tau);
    r += s * p; p *= tau;
  }
  return r;
}
function sunLongitude(msUT) {
  const year = new Date(msUT).getUTCFullYear();
  const jde = msUT / 86400000 + 2440587.5 + deltaT(year) / 86400; // TT
  const tau = (jde - 2451545.0) / 365250;                            // 율리우스 천년
  const T = tau * 10;
  const L = sumSeries([L0, L1, L2, L3, L4], tau);                     // 지구 일심 황경(rad)
  const R = sumSeries([R0, R1, R2, R3], tau);                          // 거리(AU)
  let lam = L / RAD + 180;                                             // 지심 기하황경(도)
  // 장동 Δψ (Meeus 22장 간략식)
  const omega = (125.04452 - 1934.136261 * T) * RAD;
  const Ls = (280.4665 + 36000.7698 * T) * RAD, Lm = (218.3165 + 481267.8813 * T) * RAD;
  const dpsi = (-17.20 * Math.sin(omega) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * omega)) / 3600;
  const aberr = -20.4898 / 3600 / R;
  lam += dpsi + aberr;
  return ((lam % 360) + 360) % 360;
}

// 두 각의 차를 (-180, 180]로 정규화
const angDiff = (a, b) => ((a - b + 540) % 360) - 180;

// 12절(節) 정의 — 월지 경계. branchIdx: 子=0 … 亥=11
export const TERMS = [
  { name: '소한', lon: 285, month: 1, branchIdx: 1 },  // 丑월 시작
  { name: '입춘', lon: 315, month: 2, branchIdx: 2 },  // 寅월 시작 = 년주 경계
  { name: '경칩', lon: 345, month: 3, branchIdx: 3 },
  { name: '청명', lon: 15, month: 4, branchIdx: 4 },
  { name: '입하', lon: 45, month: 5, branchIdx: 5 },
  { name: '망종', lon: 75, month: 6, branchIdx: 6 },
  { name: '소서', lon: 105, month: 7, branchIdx: 7 },
  { name: '입추', lon: 135, month: 8, branchIdx: 8 },
  { name: '백로', lon: 165, month: 9, branchIdx: 9 },
  { name: '한로', lon: 195, month: 10, branchIdx: 10 },
  { name: '입동', lon: 225, month: 11, branchIdx: 11 },
  { name: '대설', lon: 255, month: 12, branchIdx: 0 }, // 子월 시작
];

const _cache = new Map();

// year년 k번째 절(TERMS[k])의 절입시각 — UTC ms (KST = +9h 표시용)
export function termUTC(year, k) {
  const key = year * 16 + k;
  if (_cache.has(key)) return _cache.get(key);
  const t = TERMS[k];
  // 절입은 해당 월 1~20일 사이 — 그 구간에서 이분 탐색 (황경은 단조 증가)
  let lo = Date.UTC(year, t.month - 1, 1) - 86400000 * 2;
  let hi = Date.UTC(year, t.month - 1, 21);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (angDiff(sunLongitude(mid), t.lon) < 0) lo = mid; else hi = mid;
  }
  const r = Math.round((lo + hi) / 2);
  _cache.set(key, r);
  return r;
}

// KST 입력(연월일시분) → UTC ms
export const kstToUTC = (y, m, d, hh = 0, mi = 0) => Date.UTC(y, m - 1, d, hh - 9, mi);

// 출생시각(KST) 기준 사주 연도·월지 결정
// 반환: { sajuYear, monthBranchIdx(子=0), termName }
export function sajuYearMonth(y, m, d, hh, mi) {
  const t = kstToUTC(y, m, d, hh, mi);
  // 년주: 입춘(k=1) 시각 기준
  const sajuYear = t >= termUTC(y, 1) ? y : y - 1;
  // 월주: 출생 '직전'의 절 — 전년·당년 24개 절 중 시각이 가장 늦으면서 t 이하인 것
  let bestTime = -Infinity, branchIdx = 0, termName = '대설';
  for (const yy of [y - 1, y]) {
    for (let k = 0; k < TERMS.length; k++) {
      const tt = termUTC(yy, k);
      if (tt <= t && tt > bestTime) { bestTime = tt; branchIdx = TERMS[k].branchIdx; termName = TERMS[k].name; }
    }
  }
  return { sajuYear, monthBranchIdx: branchIdx, termName };
}

// 대운수용: 출생시각 기준 다음(forward)/직전 절까지의 실제 일수(실수)
export function daysToNearestTerm(y, m, d, hh, mi, forward) {
  const t = kstToUTC(y, m, d, hh, mi);
  const cands = [];
  for (const yy of [y - 1, y, y + 1]) for (let k = 0; k < 12; k++) cands.push(termUTC(yy, k));
  cands.sort((a, b) => a - b);
  if (forward) {
    const next = cands.find(c => c > t);
    return (next - t) / 86400000;
  }
  const prev = [...cands].reverse().find(c => c <= t);
  return (t - prev) / 86400000;
}
