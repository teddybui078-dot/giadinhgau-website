import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createVideoScrubber, createCanvasScrubber } from './scrubVideo.js';

gsap.registerPlugin(ScrollTrigger);

/* The cinematic clip plays across the WHOLE page: it's a fixed full-viewport
   backdrop, and scroll progress (top → bottom of the document) is mapped to the
   clip's currentTime, so the camera pushes through the forest, to the cabin,
   and reveals the bears right as you reach the footer. Content floats over it.

   currentTime is eased in scrubVideo.js's own rAF loop (one seek per presented
   frame) for smoothness; ScrollTrigger only writes the target progress. */

export async function initHeroVideo() {
  const backdrop = document.querySelector('.scrub-backdrop');
  const overlay = document.querySelector('.hero-overlay');
  const heroSection = document.querySelector('.hero');
  const video = document.getElementById('scrub-video');
  const canvas = document.getElementById('scrub-canvas');
  if (!backdrop || !video) return;

  // `?renderer=canvas` forces the canvas path (manual fallback / debugging)
  const useCanvas = new URLSearchParams(location.search).get('renderer') === 'canvas';
  let scrubber;
  if (useCanvas) {
    canvas.hidden = false;
    video.hidden = true;
    scrubber = createCanvasScrubber(canvas);
  } else {
    scrubber = createVideoScrubber(video);
  }

  // the collapsing mobile URL bar changes vh; don't refresh (and jump) on it
  ScrollTrigger.config({ ignoreMobileResize: true });

  // whole-page scrub: progress 0→1 across the entire document scroll
  const st = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => scrubber.setProgress(self.progress),
  });

  // hero wordmark fades out over the first viewport of scroll
  if (overlay && heroSection) {
    ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const f = 1 - Math.min(1, self.progress / 0.7);
        overlay.style.opacity = String(f);
        overlay.style.pointerEvents = f < 0.05 ? 'none' : '';
      },
    });
  }

  try {
    await scrubber.ready;
  } catch (err) {
    // video unavailable → degrade to the static-poster (reduced-motion) layout
    console.error(err);
    scrubber.destroy();
    st.kill();
    document.documentElement.classList.replace('motion-ok', 'reduced-motion');
    return;
  }

  // wake the decoder and paint frame 0 — iOS won't seek/paint a cold <video>
  if (!useCanvas) {
    try {
      await video.play();
      video.pause();
    } catch {
      /* muted autoplay kick not needed/allowed — fine */
    }
    video.currentTime = 0.0001;
  }

  scrubber.start();
  // paint the correct frame for wherever we loaded/landed (mid-page reload)
  scrubber.setProgress(st.progress);
  ScrollTrigger.refresh();
}
