import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createVideoScrubber, createCanvasScrubber } from './scrubVideo.js';

gsap.registerPlugin(ScrollTrigger);

/* The cinematic clip plays out entirely within the HERO: the hero is pinned
   while you scroll ~1.2 viewports, and that pinned scroll is mapped to the
   clip's currentTime, so the camera pushes through the forest, to the cabin,
   and reveals the bears — all before the pin releases. Once it does, the
   .page-body scrolls up over the (now-static) fixed backdrop on solid cream.

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

  // hero-only scrub: pin the hero and map ~1.2 viewports of pinned scroll to the
  // clip's progress 0→1. The wordmark fades out over the first third of that.
  const st = ScrollTrigger.create({
    trigger: heroSection,
    start: 'top top',
    end: '+=120%',
    pin: true,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      scrubber.setProgress(self.progress);
      if (overlay) {
        const f = 1 - Math.min(1, self.progress / 0.34);
        overlay.style.opacity = String(f);
        overlay.style.pointerEvents = f < 0.05 ? 'none' : '';
      }
    },
  });

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
