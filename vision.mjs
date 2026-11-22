// vision.mjs — MediaPipe Tasks Vision 공통 로더 (얼굴 메시·손 관절 인식)
// 모델은 처음 쓸 때 한 번만 내려받고, 추론은 전부 브라우저 안에서 한다(사진은 서버로 가지 않는다).
const LIB = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODELS = {
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};

let _lib = null;
const _tasks = {};

async function lib() {
  if (!_lib) {
    _lib = (async () => {
      const m = await import(LIB);
      return { m, resolver: await m.FilesetResolver.forVisionTasks(WASM) };
    })();
    _lib.catch(() => { _lib = null; }); // 실패하면 다음 시도에서 다시 받는다
  }
  return _lib;
}

const OPTIONS = {
  face: { numFaces: 1, outputFaceBlendshapes: true },
  hand: { numHands: 1 },
};

// GPU로 먼저 만들고, 안 되면 CPU로 한 번 더 시도
async function create(kind, forceCpu = false) {
  const { m, resolver } = await lib();
  const Task = kind === 'face' ? m.FaceLandmarker : m.HandLandmarker;
  const make = delegate => Task.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: MODELS[kind], delegate }, runningMode: 'IMAGE', ...OPTIONS[kind],
  });
  if (forceCpu) return make('CPU');
  try { return await make('GPU'); }
  catch (e) { console.warn(`${kind} 모델 GPU 초기화 실패 — CPU로 재시도`, e); return make('CPU'); }
}

function task(kind) {
  if (!_tasks[kind]) {
    _tasks[kind] = create(kind);
    _tasks[kind].catch(() => { delete _tasks[kind]; });
  }
  return _tasks[kind];
}

// 추론 도중 GPU 쪽에서 오류가 나는 기기가 있어, 실패하면 CPU 모델로 바꿔 한 번 더 돌린다
async function detect(kind, imgEl) {
  const t = await task(kind);
  try { return t.detect(imgEl); }
  catch (e) {
    console.warn(`${kind} 추론 실패 — CPU 모델로 재시도`, e);
    _tasks[kind] = create(kind, true);
    _tasks[kind].catch(() => { delete _tasks[kind]; });
    return (await _tasks[kind]).detect(imgEl);
  }
}

export const loadFaceModel = () => task('face');
export const loadHandModel = () => task('hand');
export const detectFaceMesh = imgEl => detect('face', imgEl);
export const detectHandJoints = imgEl => detect('hand', imgEl);
