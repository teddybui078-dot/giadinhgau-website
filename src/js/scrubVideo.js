/* Scroll-scrub renderers. Both share one interface:
   { ready: Promise, setProgress(0..1), start(), destroy() }
   so main.js can swap the <video> renderer for the <canvas> one. */

const LERP = 0.12;
const HALF_FRAME = 1 / 48; // source is 24fps; skip seeks smaller than half a frame
const STALL_MS = 250; // force-clear a pending seek that never presents (bg tab / decode stall)

const HAS_RVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

function pickSource() {
  // relative paths because vite.config.js uses base:'./' (subpath-host safe)
  return window.matchMedia('(max-width: 768px)').matches
    ? './video/bear-house-mobile.mp4'
    : './video/bear-house-desktop.mp4';
}

/* Fetch the whole file into a blob URL so seeking never touches the
   network. Range-request seeking is flaky in Safari/iOS; a fully
   buffered blob sidesteps it, and the reader lets us report progress. */
async function loadFully(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`video fetch failed: ${res.status}`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(received / total);
  }
  return URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
}

function metadataLoaded(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1) return resolve();
    video.addEventListener('loadedmetadata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('video failed to load')), {
      once: true,
    });
  });
}

/* Paces seeks so we never request a new frame before the previous one is
   actually on screen. requestVideoFrameCallback fires when a seeked frame
   is presented to the compositor — even on a paused, muted video — which
   gives even, ordered seek pacing and is what makes slow scroll smooth.
   The old `video.seeking` boolean is coarse (Safari toggles it before
   paint), so it's only the fallback. onPresented lets the canvas renderer
   draw exactly when the frame lands. */
function createSeeker(video, onPresented) {
  let pending = false;
  let pendingSince = 0;

  return function update(t) {
    if (HAS_RVFC) {
      // a seek that never presents (stalled decode, backgrounded tab) would
      // latch `pending` forever and freeze the scrub — release it after a beat
      if (pending && performance.now() - pendingSince > STALL_MS) pending = false;
      if (!pending && Math.abs(video.currentTime - t) > HALF_FRAME) {
        pending = true;
        pendingSince = performance.now();
        video.currentTime = t;
        video.requestVideoFrameCallback(() => {
          pending = false;
          if (onPresented) onPresented();
        });
      }
    } else if (!video.seeking && Math.abs(video.currentTime - t) > HALF_FRAME) {
      video.currentTime = t;
    }
  };
}

export function createVideoScrubber(video, { onProgress = () => {} } = {}) {
  let target = 0;
  let current = 0;
  let rafId = null;

  const ready = (async () => {
    const url = pickSource();
    try {
      video.src = await loadFully(url, onProgress);
    } catch {
      video.src = url; // let the browser stream it instead
    }
    await metadataLoaded(video);
  })();

  const seek = createSeeker(video);

  function tick() {
    current += (target - current) * LERP;
    if (Math.abs(target - current) < 0.0004) current = target;
    seek(current * video.duration);
    rafId = requestAnimationFrame(tick);
  }

  return {
    ready,
    setProgress(p) {
      target = Math.min(1, Math.max(0, p));
    },
    start() {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      if (video.src.startsWith('blob:')) URL.revokeObjectURL(video.src);
    },
  };
}

export function createCanvasScrubber(canvas, { onProgress = () => {} } = {}) {
  const ctx = canvas.getContext('2d');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  let target = 0;
  let current = 0;
  let rafId = null;

  function size() {
    const px = Math.min(
      Math.min(window.innerWidth, window.innerHeight) * window.devicePixelRatio,
      1080
    );
    canvas.width = px;
    canvas.height = px;
  }

  function draw() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  const ready = (async () => {
    const url = pickSource();
    try {
      video.src = await loadFully(url, onProgress);
    } catch {
      video.src = url;
    }
    await metadataLoaded(video);
    size();
    window.addEventListener('resize', size);
    // rVFC draws exactly on presentation (no stale-frame race); without it,
    // the `seeked` event is the only signal that a frame is ready to sample
    if (HAS_RVFC) {
      video.requestVideoFrameCallback(draw); // first paint
    } else {
      video.addEventListener('seeked', draw);
    }
    video.currentTime = 0.001; // paint the first frame
  })();

  const seek = createSeeker(video, draw);

  function tick() {
    current += (target - current) * LERP;
    if (Math.abs(target - current) < 0.0004) current = target;
    seek(current * video.duration);
    rafId = requestAnimationFrame(tick);
  }

  return {
    ready,
    setProgress(p) {
      target = Math.min(1, Math.max(0, p));
    },
    start() {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      window.removeEventListener('resize', size);
      if (video.src.startsWith('blob:')) URL.revokeObjectURL(video.src);
    },
  };
}
