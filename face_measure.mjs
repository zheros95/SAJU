// face_measure.mjs — 얼굴 메시(MediaPipe Face Landmarker, 478점·3D) → 정규화 비율 측정
// 순수 계산 모듈(DOM·모델 의존 없음). 입력 lm은 {x,y,z} 정규화 좌표 배열, W·H는 이미지 크기.
// ① 메시의 3D 좌표로 얼굴 고유 좌표축을 세워 정면으로 돌려놓고(고개 돌림·숙임·기울임 보정)
// ② 부위 간 '비율'만 잰다 — 사진 크기·촬영 거리와 무관.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const n = Math.hypot(...a) || 1; return a.map(v => v / n); };
const deg = r => r * 180 / Math.PI;

// 얼굴 윤곽(이마 꼭대기 10에서 시계 방향)
export const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const BROW_R = { up: [70, 63, 105, 66, 107], lo: [46, 53, 52, 65, 55] };   // 바깥 → 안쪽 (사진 왼쪽 눈썹)
const BROW_L = { up: [300, 293, 334, 296, 336], lo: [276, 283, 282, 295, 285] };
const ALAR = [48, 64, 98, 129, 102, 49, 278, 294, 327, 358, 331, 279];     // 콧방울 둘레
const SYM_PAIRS = [[33, 263], [133, 362], [61, 291], [129, 358], [172, 397], [234, 454], [105, 334], [159, 386]];

// 정면화: 얼굴 고유축(ex=좌우, ey=상하, ez=앞뒤)으로 투영. 고개 각도도 함께 돌려준다.
export function frontalize(lm, W, H) {
  const P = lm.map(q => [q.x * W, q.y * H, (q.z || 0) * W]);
  let ex = [0, 0, 0];
  [[33, 263], [133, 362], [61, 291], [234, 454]].forEach(([r, l]) => { const d = unit(sub(P[l], P[r])); ex = ex.map((v, i) => v + d[i]); });
  ex = unit(ex);
  const down = sub(P[152], P[10]);
  const ey = unit(sub(down, ex.map(v => v * dot(down, ex))));
  const ez = cross(ex, ey);
  const o = [0, 1, 2].map(i => (P[33][i] + P[263][i]) / 2);
  const p = P.map(q => { const d = sub(q, o); return { x: dot(d, ex), y: dot(d, ey), z: dot(d, ez) }; });
  return {
    p,
    yawDeg: deg(Math.atan2(ez[0], ez[2])),    // 좌우로 돌린 각
    pitchDeg: deg(Math.atan2(ez[1], ez[2])),  // 위아래로 숙인 각
    rollDeg: deg(Math.atan2(ex[1], ex[0])),   // 옆으로 기울인 각
  };
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const avg = (...ps) => ({ x: ps.reduce((s, q) => s + q.x, 0) / ps.length, y: ps.reduce((s, q) => s + q.y, 0) / ps.length });
const ang = (a, b, c) => {
  const v1 = [a.x - b.x, a.y - b.y], v2 = [c.x - b.x, c.y - b.y];
  const cs = (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1);
  return deg(Math.acos(Math.max(-1, Math.min(1, cs))));
};

// 윤곽선이 높이 y에서 갖는 좌우 폭
function widthAt(p, y) {
  const xs = [];
  for (let i = 0; i < OVAL.length; i++) {
    const a = p[OVAL[i]], b = p[OVAL[(i + 1) % OVAL.length]];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y));
  }
  return xs.length >= 2 ? Math.max(...xs) - Math.min(...xs) : 0;
}

export function measureFace(lm, W, H) {
  const f = frontalize(lm, W, H);
  const p = f.p;
  const ovalX = OVAL.map(i => p[i].x);
  const faceW = (Math.max(...ovalX) - Math.min(...ovalX)) || 1;        // 얼굴 최대 폭(광대 높이)
  const browPts = [...BROW_R.up, ...BROW_R.lo, ...BROW_L.up, ...BROW_L.lo].map(i => p[i]);
  const browY = browPts.reduce((s, q) => s + q.y, 0) / browPts.length;   // 눈썹선
  const subY = p[2].y, chinY = p[152].y, mouthY = (p[13].y + p[14].y) / 2;
  const faceH = (chinY - browY) || 1;                                   // 눈썹~턱끝
  const midH = (subY - browY) || 1;                                     // 중정: 눈썹~코밑
  const lowH = (chinY - subY) || 1;                                     // 하정: 코밑~턱끝
  const wMouth = widthAt(p, mouthY) || 1;                               // 입 높이의 얼굴 폭(하관)
  const wChin = widthAt(p, p[17].y + (chinY - p[17].y) * 0.5);          // 아랫입술~턱끝 중간 높이의 폭

  const eyeW = ((d2(p[33], p[133]) + d2(p[362], p[263])) / 2) || 1;
  const eyeH = (d2(p[159], p[145]) + d2(p[386], p[374])) / 2;
  const mouthW = d2(p[61], p[291]) || 1;

  // 눈썹: 위·아래 윤곽의 중심선 5점(바깥→안쪽)
  const brow = b => b.up.map((u, i) => avg(p[u], p[b.lo[i]]));
  const bR = brow(BROW_R), bL = brow(BROW_L);
  const browLenOf = c => d2(c[0], c[4]) || 1;
  const browLen = (browLenOf(bR) + browLenOf(bL)) / 2;
  const archOf = c => Math.max(...[1, 2, 3].map(i => {
    const t = (c[i].x - c[0].x) / ((c[4].x - c[0].x) || 1);
    return (c[0].y + (c[4].y - c[0].y) * t) - c[i].y;
  })) / browLenOf(c);
  const thickOf = b => [1, 2, 3].reduce((s, i) => s + d2(p[b.up[i]], p[b.lo[i]]), 0) / 3;
  const upperLip = p[13].y - p[0].y, lowerLip = p[17].y - p[14].y;
  const alarX = ALAR.map(i => p[i].x);

  // 좌우 대칭: 정중선 기준 대칭쌍의 좌우·상하 어긋남 평균(0=완전 대칭)
  const x0 = [168, 1, 2, 0, 17, 152].reduce((s, i) => s + p[i].x, 0) / 6;
  let sx = 0, sy = 0;
  SYM_PAIRS.forEach(([r, l]) => { sx += Math.abs((x0 - p[r].x) - (p[l].x - x0)); sy += Math.abs(p[r].y - p[l].y); });
  const symDev = (sx + sy) / (2 * SYM_PAIRS.length) / faceW;

  return {
    yawDeg: f.yawDeg, pitchDeg: f.pitchDeg, rollDeg: f.rollDeg,
    faceAspect: faceW / faceH,                        // 얼굴 가로/세로 (↑넓음 ↓길쭉)
    jawTaper: wMouth / faceW,                         // 하관폭/광대폭 (↑넓은 하관 ↓갸름)
    chinTaper: wChin / wMouth,                        // 턱끝폭/하관폭 (↑넓적 ↓뾰족)
    jawAngle: (ang(p[93], p[172], p[176]) + ang(p[323], p[397], p[400])) / 2, // 턱 모서리 각 (↓각짐 ↑둥글)
    midLow: midH / lowH,                              // 중정/하정
    browLen: browLen / eyeW,                          // 눈썹 길이(눈 폭 대비)
    browTilt: ((bR[4].y - bR[0].y) + (bL[4].y - bL[0].y)) / 2 / browLen,  // +꼬리 올라감 −처짐
    browArch: (archOf(bR) + archOf(bL)) / 2,          // 눈썹 굴곡 (↑아치 ↓일자)
    browThick: (thickOf(BROW_R) + thickOf(BROW_L)) / 2 / eyeW,            // 눈썹 두께
    browGap: d2(bR[4], bL[4]) / faceW,                // 미간(인당): 두 눈썹 사이
    browEye: ((p[159].y - p[52].y) + (p[386].y - p[282].y)) / 2 / eyeW,   // 전택궁: 눈썹 아래~눈꺼풀
    eyeSize: eyeW / faceW,                            // 눈 가로 크기
    eyeOpen: eyeH / eyeW,                             // 눈 세로/가로 (↑둥근 눈 ↓가는 눈)
    eyeTilt: ((p[133].y - p[33].y) + (p[362].y - p[263].y)) / 2 / eyeW,   // +눈꼬리 올라감 −처짐
    eyeGap: d2(p[133], p[362]) / eyeW,                // 눈 사이 거리(눈 폭 대비)
    noseLen: (subY - p[168].y) / faceH,               // 코 길이(산근~코밑)
    noseW: (Math.max(...alarX) - Math.min(...alarX)) / faceW,             // 콧방울 폭
    noseHigh: ((p[133].z + p[362].z) / 2 - p[1].z) / faceW,              // 코끝 돌출(눈 안쪽 기준, 3D)
    philtrum: (p[0].y - subY) / lowH,                 // 인중 길이(하정 대비)
    mouthW: mouthW / faceW,                           // 입 크기
    lipThick: (upperLip + lowerLip) / mouthW,         // 입술 두께(위+아래)
    lipBalance: upperLip / (lowerLip || 1),           // 윗입술/아랫입술
    mouthOpen: (p[14].y - p[13].y) / mouthW,          // 입 벌어짐(품질 확인용)
    mouthTilt: (p[13].y - (p[61].y + p[291].y) / 2) / mouthW,             // +입꼬리 올라감 −처짐
    chinLen: (chinY - p[17].y) / lowH,                // 턱 길이(아랫입술~턱끝)
    symDev,
  };
}

// ───────── 기준값 ─────────
// 한국인 공개 인물 사진 중 정면·무표정 60장을 이 모듈로 재서 얻은 [중앙값, 표준편차(사분위 기반), 판정 폭].
// 판정 폭은 '보통'으로 치는 범위(표준편차 배수) — 같은 사람을 여러 장 찍었을 때 값이 흔들리는 항목일수록 넓게 잡았다.
// 표본이 작고 중장년 남성 비중이 커서 정밀한 통계는 아니다. 평균에서 얼마나 벗어났는지 보는 눈금으로만 쓴다.
export const NORMS = {
  faceAspect: [1.09, 0.040, 0.8],
  jawTaper: [0.909, 0.022, 1.0],
  chinTaper: [0.726, 0.045, 1.2],
  jawAngle: [142.1, 3.4, 1.0],
  midLow: [0.94, 0.10, 1.0],
  browLen: [1.63, 0.085, 0.8],
  browTilt: [-0.135, 0.042, 0.9],
  browArch: [0.168, 0.017, 0.8],
  browThick: [0.211, 0.019, 1.1],
  browGap: [0.194, 0.010, 1.1],
  browEye: [0.62, 0.12, 1.0],
  eyeSize: [0.180, 0.012, 0.9],
  eyeOpen: [0.32, 0.063, 0.8],
  eyeTilt: [0.054, 0.037, 0.8],
  eyeGap: [1.36, 0.127, 0.8],
  noseLen: [0.375, 0.018, 1.3],
  noseW: [0.287, 0.013, 1.2],
  noseHigh: [0.279, 0.010, 1.3],
  philtrum: [0.231, 0.033, 1.0],
  mouthW: [0.355, 0.019, 1.1],
  lipThick: [0.30, 0.072, 1.0],
  lipBalance: [0.70, 0.095, 0.9],
  mouthTilt: [-0.02, 0.040, 1.1],
  chinLen: [0.523, 0.044, 1.1],
};
export const PITCH_ZERO = -4; // 정면 사진에서 이 모듈이 내는 상하 각의 중앙값(메시 축의 고유 기울기)

// 측정값 → 평균 대비 위치. z=표준편차 배수, level=-2~+2(0은 보통), pos=눈금 위치(0~1)
export function scoreOf(key, value) {
  const n = NORMS[key];
  if (!n || !Number.isFinite(value)) return { z: 0, level: 0, pos: 0.5 };
  const z = (value - n[0]) / n[1];
  const a = Math.abs(z), s = Math.sign(z);
  const level = a >= n[2] * 1.8 ? 2 * s : a >= n[2] ? s : 0;
  return { z, level, pos: Math.max(0.03, Math.min(0.97, 0.5 + z / 6)) };
}
