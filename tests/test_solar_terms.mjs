// 절입시각 검증 — KASI 달력자료(2023~2028, KST 분 단위) + 국립천문대 2026 역요항 대조
import { termUTC, TERMS } from '../solar_terms.mjs';
import fs from 'fs';
const kasi = JSON.parse(fs.readFileSync(new URL('./kasi_terms.json', import.meta.url), 'utf8'));
const NAO2026 = { 소한:[1,5,17,23], 입춘:[2,4,5,2], 경칩:[3,5,22,59], 청명:[4,5,3,40], 입하:[5,5,20,49], 망종:[6,6,0,48],
  소서:[7,7,10,57], 입추:[8,7,20,43], 백로:[9,7,23,41], 한로:[10,8,15,29], 입동:[11,7,18,52], 대설:[12,7,11,53] };
let worst = 0, n = 0, fails = [];
function check(year, name, ref, src) {
  const k = TERMS.findIndex(t => t.name === name); if (k < 0) return;
  const ms = termUTC(year, k);
  const refMs = Date.UTC(year, ref[0] - 1, ref[1], ref[2] - 9, ref[3]);
  const diffMin = (ms - refMs) / 60000; // 기준값은 분 단위 절사/반올림이므로 |diff| ≤ 1분이면 일치
  n++; worst = Math.max(worst, Math.abs(diffMin));
  if (Math.abs(diffMin) > 1) fails.push(`${src} ${year} ${name}: 계산 ${new Date(ms).toISOString()} vs 기준 ${ref.join('/')} (${diffMin.toFixed(2)}분)`);
}
for (const y of Object.keys(kasi)) for (const [name, ref] of Object.entries(kasi[y])) check(+y, name, ref, 'KASI');
for (const [name, ref] of Object.entries(NAO2026)) check(2026, name, ref, 'NAO');
console.log(`절입시각 대조 ${n}건, 최대 오차 ${worst.toFixed(2)}분, 1분 초과 ${fails.length}건`);
fails.forEach(f => console.log('  FAIL', f));
process.exit(fails.length ? 1 : 0);
