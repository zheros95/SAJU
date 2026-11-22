// camera.mjs — 사진 입력 공통 처리(카메라 촬영·앨범 선택·크기 정리)
// 모든 처리는 브라우저 안에서만 하고 서버로 보내지 않는다.

// 폰·태블릿은 기본 카메라 앱(<input capture>)이 화질·초점·플래시 면에서 낫다. PC는 웹캠 창을 띄운다.
export const isMobileDevice = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1); // iPadOS

function loadImage(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => reject(new Error('이미지 로드 시간 초과')), timeoutMs);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); reject(new Error('이미지를 읽지 못했습니다')); };
    img.src = url;
  });
}

// 긴 변을 maxSide 이하로 줄이고 촬영 방향(EXIF)을 픽셀에 반영한다.
// 폰 카메라 원본(1,200만 화소 이상)을 그대로 쓰면 분석 모델이 메모리 부족으로 죽는 기기가 있다.
export async function normalizeImage(file, maxSide = 2000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return file;
    const s = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * s);
    canvas.height = Math.round(h * s);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    return blob || file;
  } catch (e) {
    console.warn('사진 크기 정리 실패 — 원본 사용', e);
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 촬영 안내선 — 얼굴은 타원, 손은 둥근 사각형
const GUIDE = {
  face: '<ellipse cx="50" cy="48" rx="27" ry="37"/><line x1="50" y1="11" x2="50" y2="85" stroke-dasharray="2 3"/><line x1="23" y1="44" x2="77" y2="44" stroke-dasharray="2 3"/>',
  palm: '<rect x="20" y="8" width="60" height="84" rx="16"/>',
};
const TIP = {
  face: '얼굴을 타원에 맞추고 정면을 보세요. 세로선에 코, 가로선에 눈이 오면 좋습니다.',
  palm: '손바닥을 활짝 펴서 사각형 안에 손목까지 들어오게 해 주세요.',
};

// PC용 웹캠 촬영 창. 촬영하면 Blob, 취소하면 null. 카메라를 못 열면 예외를 던진다(호출 쪽에서 파일 선택으로 넘김).
export async function openCameraModal(kind) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('이 브라우저는 카메라를 지원하지 않습니다');
  let facing = kind === 'face' ? 'user' : 'environment';
  const start = () => navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
  let stream = await start();

  const modal = document.createElement('div');
  modal.className = 'cam-modal';
  modal.innerHTML = `
    <div class="cam-top"><span>${TIP[kind] || ''}</span><button type="button" class="cam-x" aria-label="닫기"><i class="fas fa-xmark"></i></button></div>
    <div class="cam-stage">
      <video playsinline autoplay muted></video>
      <svg class="cam-guide" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${GUIDE[kind] || ''}</svg>
    </div>
    <div class="cam-bar">
      <button type="button" class="cam-flip" aria-label="카메라 전환"><i class="fas fa-rotate"></i></button>
      <button type="button" class="cam-shot" aria-label="촬영"></button>
      <span class="cam-spacer"></span>
    </div>`;
  const video = modal.querySelector('video');
  const attach = () => {
    video.srcObject = stream;
    // 셀카 방향은 거울처럼 보여 주되, 저장은 뒤집지 않는다(왼손·오른손 판별이 뒤바뀌지 않게)
    const s = stream.getVideoTracks()[0].getSettings();
    video.classList.toggle('mirror', (s.facingMode || facing) === 'user');
  };
  attach();
  document.body.appendChild(modal);
  document.body.classList.add('no-scroll');

  const stop = () => stream.getTracks().forEach(t => t.stop());
  return new Promise(resolve => {
    const close = (blob) => {
      stop();
      modal.remove();
      document.body.classList.remove('no-scroll');
      resolve(blob);
    };
    modal.querySelector('.cam-x').addEventListener('click', () => close(null));
    modal.querySelector('.cam-flip').addEventListener('click', async () => {
      facing = facing === 'user' ? 'environment' : 'user';
      stop();
      try { stream = await start(); attach(); } catch (e) { console.error(e); close(null); }
    });
    modal.querySelector('.cam-shot').addEventListener('click', () => {
      const w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      canvas.toBlob(b => close(b), 'image/jpeg', 0.92);
    });
  });
}
