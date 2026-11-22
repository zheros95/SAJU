// 관상·수상 엔진 검증 — 정면화 보정, 평균 대비 판정, 품질 게이트, 판단 보류
import { frontalize, measureFace, NORMS, scoreOf } from '../face_measure.mjs';
import { interpretFace } from '../physiognomy.mjs';
import { FEATURES, SURVEY_READ, FACE_QUESTIONS } from '../physiognomy_text.mjs';
import { readPalmistry, classifyHand, measureHand, palmGuide, HAND_NORMS } from '../palmistry.mjs';
import { PALM_QUESTIONS, RULES } from '../palmistry_text.mjs';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

// ── 1) 정면화: 같은 점 구름을 3D로 돌려도 측정 비율이 같아야 한다 ──
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cloud = Array.from({ length: 478 }, () => ({ x: rnd() * 0.4 + 0.3, y: rnd() * 0.5 + 0.2, z: (rnd() - 0.5) * 0.2 }));
// 축을 정하는 점은 얼굴답게 배치(좌우 대칭쌍, 이마 꼭대기·턱끝)
const put = (i, x, y, z = 0) => { cloud[i] = { x, y, z }; };
put(33, 0.40, 0.40); put(263, 0.60, 0.40); put(133, 0.46, 0.40); put(362, 0.54, 0.40);
put(61, 0.44, 0.60); put(291, 0.56, 0.60); put(234, 0.32, 0.45, 0.08); put(454, 0.68, 0.45, 0.08);
put(10, 0.50, 0.20, 0.02); put(152, 0.50, 0.72, 0.02);
const rot = (pts, yaw, pitch, roll) => pts.map(p => {
  let [x, y, z] = [p.x - 0.5, p.y - 0.5, p.z];
  let c = Math.cos(yaw), s = Math.sin(yaw); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(pitch); s = Math.sin(pitch); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(roll); s = Math.sin(roll); [x, y] = [x * c - y * s, x * s + y * c];
  return { x: x + 0.5, y: y + 0.5, z };
});
const m0 = measureFace(cloud, 1000, 1000);
const m1 = measureFace(rot(cloud, 0.2, -0.15, 0.3), 1000, 1000);
const keys = Object.keys(NORMS);
const maxDiff = Math.max(...keys.map(k => Math.abs(m0[k] - m1[k]) / (Math.abs(m0[k]) || 1)));
ok(maxDiff < 1e-6, `3D 회전(좌우 11°·상하 9°·기울임 17°) 뒤에도 비율 동일 (최대 상대오차 ${maxDiff.toExponential(1)})`);
const f0 = frontalize(cloud, 1000, 1000), f1 = frontalize(rot(cloud, 0.2, 0, 0), 1000, 1000);
ok(Math.abs(Math.abs(f1.yawDeg - f0.yawDeg) - 11.46) < 0.5, `좌우 회전각 복원 ${(f1.yawDeg - f0.yawDeg).toFixed(1)}°`);

// ── 2) 평균 얼굴 → 눈에 띄는 항목 없음, 고른 형 ──
const base = { yawDeg: 1, pitchDeg: -4, rollDeg: 0, mouthOpen: 0.01, symDev: 0.015 };
keys.forEach(k => { base[k] = NORMS[k][0]; });
let r = interpretFace(base);
ok(r.ok && r.highlights.length === 0 && r.shape.even, '평균값 → 두드러진 특징 0개, 고른 형(계란형)');
ok(r.groups.every(g => g.feats.length === 0), '평균값 → 부위별 특징 풀이 없음(평균 범위로만 표시)');
ok(Object.values(r.shape.pct).reduce((a, b) => a + b, 0) >= 99, '오형 비율 합 ≈ 100');

// ── 3) 한 항목씩 벗어나면 그 방향의 풀이가 나온다 ──
let dirOk = true;
FEATURES.forEach(f => {
  const [c, sd, band] = NORMS[f.key];
  for (const sign of [-1, 1]) {
    const res = interpretFace({ ...base, [f.key]: c + sign * sd * band * 1.3 });
    const feat = res.groups.flatMap(g => g.feats).find(x => x.key === f.key);
    const want = sign < 0 ? f.lo.head : f.hi.head;
    if (!feat || feat.head !== want || Math.abs(feat.level) !== 1) { dirOk = false; console.log('   ✗', f.key, sign, feat && feat.head); }
  }
});
ok(dirOk, `측정 ${FEATURES.length}개 항목 × 양방향 = ${FEATURES.length * 2}건 모두 해당 풀이로 연결`);
ok(scoreOf('eyeTilt', NORMS.eyeTilt[0] + NORMS.eyeTilt[1] * NORMS.eyeTilt[2] * 2).level === 2, '많이 벗어나면 ‘뚜렷이’ 단계');
ok(FEATURES.every(f => NORMS[f.key] && f.lo.text && f.hi.text && f.mid && f.lo.brief && f.hi.brief), '모든 항목에 기준값·양방향 풀이·요약 존재');

// ── 4) 얼굴형 ──
r = interpretFace({ ...base, faceAspect: NORMS.faceAspect[0] - 3 * NORMS.faceAspect[1] });
ok(r.element === '목' && !r.shape.even, `세로로 긴 얼굴 → 목형 (${JSON.stringify(r.shape.pct)})`);
r = interpretFace({ ...base, jawAngle: NORMS.jawAngle[0] - 2.5 * NORMS.jawAngle[1], jawTaper: NORMS.jawTaper[0] + 2 * NORMS.jawTaper[1] });
ok(r.element === '금', `턱이 각지고 하관이 넓음 → 금형 (${r.element})`);
r = interpretFace({ ...base, faceAspect: NORMS.faceAspect[0] + 2 * NORMS.faceAspect[1], jawAngle: NORMS.jawAngle[0] + 2.5 * NORMS.jawAngle[1] });
ok(r.element === '수', `넓고 턱선이 둥긂 → 수형 (${r.element})`);
r = interpretFace({ ...base, chinTaper: NORMS.chinTaper[0] - 3 * NORMS.chinTaper[1], jawTaper: NORMS.jawTaper[0] - 2 * NORMS.jawTaper[1] });
ok(r.element === '화', `하관이 좁고 턱끝이 뾰족 → 화형 (${r.element})`);
r = interpretFace(base, { answers: { shape: '토' } });
ok(r.element === '토' && r.shape.byUser && r.topType === '토형', '얼굴형을 직접 고르면 그 값을 따름');

// ── 5) 품질 게이트·판정 보류 ──
ok(interpretFace({ ...base, yawDeg: 25 }).ok === false, '옆으로 25° 돌아간 사진 → 다시 찍기');
ok(interpretFace({ ...base, pitchDeg: -4 + 26 }).ok === false, '고개를 26° 숙인 사진 → 다시 찍기');
r = interpretFace({ ...base, mouthW: NORMS.mouthW[0] + 5 * NORMS.mouthW[1] }, { expr: { smile: 0.8 } });
ok(r.ok && r.warns.length === 1 && !r.groups.flatMap(g => g.feats).some(f => f.key === 'mouthW'), '웃는 사진 → 입 크기 판정 보류 + 주의 문구');
ok(r.groups.find(g => g.id === 'mouth').held.includes('입 크기'), '보류 항목은 묶음에 따로 표시');

// ── 6) 설문·유년 ──
r = interpretFace(base, { answers: { forehead: 'wide', earlobe: 'unknown', noseTip: 'sharp' }, age: 43 });
const sv = r.groups.flatMap(g => g.survey).map(s => s.head);
ok(sv.includes('넓고 둥근 이마') && sv.includes('뾰족하고 얇은 코끝') && sv.length === 2, `설문: 고른 것만 풀이, '모르겠다'는 제외 (${sv.join(', ')})`);
ok(r.yun && r.yun.area === '산근과 콧대' && r.yun.group === '코', `세는나이 43세 → ${r.yun.area}`);
ok(interpretFace(base).yun === null, '나이를 모르면 유년 안내 없음');
ok(FACE_QUESTIONS.filter(q => q.id !== 'shape').every(q => q.options.filter(o => o.value !== 'unknown').every(o => SURVEY_READ[q.id][o.value])), '얼굴 설문의 모든 선택지에 풀이 존재');
const allFaceText = [...FEATURES.flatMap(f => [f.lo.text, f.hi.text]), ...Object.values(SURVEY_READ).flatMap(d => Object.values(d).filter(v => v && v.text).map(v => v.text))].join(' ');
ok(!/단명|요절|과부|홀아비|극부|극처|음란|천하다/.test(allFaceText), '수명·형극·성차별 표현 없음');

// ── 7) 수상: 손 유형 ──
const [sq0, sqSd] = HAND_NORMS.squareness, [fr0, frSd] = HAND_NORMS.fingerRatio;
ok(classifyHand(sq0 + 2 * sqSd, fr0 - 2 * frSd).type === 'earth' && classifyHand(sq0 - 2 * sqSd, fr0 - 2 * frSd).type === 'fire'
  && classifyHand(sq0 + 2 * sqSd, fr0 + 2 * frSd).type === 'air' && classifyHand(sq0 - 2 * sqSd, fr0 + 2 * frSd).type === 'water', '손바닥 모양 × 손가락 길이 → 흙·불·공기·물');
ok(classifyHand(sq0 + 0.1 * sqSd, fr0 + 2 * frSd).border === true && classifyHand(sq0 + 2 * sqSd, fr0 + 2 * frSd).border === false, '경계 근처는 경계형으로 표시');
// 합성 손: 손목 (0,0), 손가락은 위로 곧게
const hand = Array.from({ length: 21 }, () => [0, 0]);
const finger = (base, x, y0, segs) => { let y = y0; hand[base] = [x, y]; segs.forEach((s, i) => { y += s; hand[base + 1 + i] = [x, y]; }); };
hand[0] = [0, 0]; hand[1] = [-30, 20]; hand[2] = [-50, 45]; hand[3] = [-62, 75]; hand[4] = [-70, 100];
finger(5, -33, 95, [40, 25, 22]); finger(9, 0, 100, [45, 28, 23]); finger(13, 25, 95, [42, 26, 22]); finger(17, 36, 82, [32, 20, 19]);
const hm = measureHand(hand);
ok(Math.abs(hm.squareness - Math.hypot(69, 13) / 100) < 1e-9 && Math.abs(hm.fingerRatio - 0.96) < 1e-9, `손 비율 계산 (네모도 ${hm.squareness.toFixed(3)}, 손가락 ${hm.fingerRatio.toFixed(3)})`);
ok(hm.open && hm.straight > 0.999 && Math.abs(hm.idxRing - 87 / 90) < 1e-9, '편 손 판정·검지/약지 비');
const g = palmGuide(hand.map(([x, y]) => ({ x, y })));
ok(g.curves.length === 6 && g.mounts.length === 6 && g.curves.every(c => c.pts.length === 3 && c.pts.flat().every(Number.isFinite)), '손금 위치 안내선 6개·언덕 6개 좌표 생성');

// ── 8) 수상: 풀이·판단 보류 ──
let p = readPalmistry({ side: 'right', dominant: 'right', handType: 'air', life: 'long_deep', lifeHead: 'apart', head: 'steep', heartEnd: 'index', fate: 'none', fateStart: 'wrist', sun: 'yes', marriage: 'clear', simian: 'no', mount: 'moon', thumbFlex: 'supple' });
const areas = p.items.map(i => i.area);
ok(['생명선', '생명선·두뇌선의 시작', '두뇌선의 방향', '감정선의 끝', '운명선', '태양선', '결혼선', '가장 도톰한 언덕', '엄지의 유연성'].every(a => areas.includes(a)), '답한 문항은 모두 풀이');
ok(!areas.includes('운명선의 출발점'), '운명선이 없다고 답하면 출발점은 풀이하지 않음');
ok(p.unread.length === 0, `선마다 하나라도 답하면 판단 보류 아님 (${p.unread.join('·') || '없음'})`);
p = readPalmistry({ simian: 'yes', head: 'straight', heart: 'curved', heartEnd: 'index' });
ok(!p.items.some(i => /두뇌선|감정선/.test(i.area)) && !p.unread.includes('두뇌선'), '막쥔손금이면 두뇌선·감정선 개별 풀이 생략');
p = readPalmistry({ handType: 'earth' }, { reliable: true, border: false, type: 'earth', measures: { squareness: 0.75, fingerRatio: 0.8, idxRing: 1.06, pinky: -0.09, thumb: 0.68 } });
const autoItems = p.items.filter(i => i.auto).map(i => i.cls);
ok(autoItems.includes('짧은 손가락') && autoItems.includes('검지가 긴 편') && autoItems.length === 2, `사진 측정: 평균을 벗어난 손가락 항목만 풀이 (${autoItems.join(', ')})`);
ok(p.items.find(i => i.cls === '검지가 긴 편').note.includes('2D:4D'), '검지·약지 풀이에 재현성 주의 문구');
p = readPalmistry({ handType: 'earth' }, { reliable: false, measures: { fingerRatio: 0.5 } });
ok(!p.items.some(i => i.auto) && p.lines.some(l => l.includes('손가락 길이 비율은 풀이에서 뺐습니다')), '손가락이 굽은 사진 → 길이 풀이 제외');
ok(PALM_QUESTIONS.filter(q => RULES[q.id]).every(q => q.options.filter(o => o.value !== 'unknown').some(o => RULES[q.id][o.value])), '손금 설문 문항마다 풀이 존재');
const allPalmText = Object.values(RULES).flatMap(d => Object.values(d).filter(v => v && v.text).map(v => v.text)).join(' ');
ok(!/수명이 짧|일찍 죽|이혼|사별|자녀 수|살인자/.test(allPalmText), '수명·이혼·자녀 수 예언 표현 없음');
ok(/길이가 수명을 뜻하지 않습니다/.test(allPalmText) && /결혼 여부·횟수를 뜻하지는 않습니다/.test(allPalmText), '흔한 오해(생명선=수명, 결혼선=횟수) 정정 문구 유지');

console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과');
process.exit(fails ? 1 : 0);
