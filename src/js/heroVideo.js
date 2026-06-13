import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createVideoScrubber, createCanvasScrubber } from './scrubVideo.js';

gsap.registerPlugin(ScrollTrigger);

/* Apple-style scroll-scrubbed hero. A tall .hero-track drives the scrub while
   .hero-stage is pinned full-viewport. Scroll progress maps to the clip's
   currentTime (forest → door → bears) via the scrubVideo renderer, which eases
   currentTime in its own rAF loop for smoothness. The wordmark overlay fades out
   in the first slice of the scrub; the bears are held for the last HOLD of the
   track before the pin releases and content scrolls up on cream. */

const HOLD = 0.12; // last 12% holds on the bears before unpinning
const FADE_OUT = 0.12; // wordmark gone by 12% of the (remapped) scrub
const SCRUB_VH = 4; // viewport-heights of scroll for the full clip (the pin's own
                    // spacer provides this distance — no separate tall track)

export async function initHeroVideo() {
  const track = document.querySelector('.hero-track');
  const stage = document.querySelector('.hero-stage');
  const overlay = document.querySelector('.hero-overlay');
  const video = document.getElementById('scrub-video');
  const canvas = document.getElementById('scrub-canvas');
  if (!track || !stage || !video) return;

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

  // Pin + scrub immediately so the hero pins and holds the poster while the
  // video downloads; setProgress is a cheap target write (harmless before start).
  // The pin's spacer (pinSpacing) provides the scroll distance — SCRUB_VH
  // viewport-heights — so .hero-track stays normal height (no double-counting).
  const st = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * SCRUB_VH),
    pin: stage,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = Math.min(1, self.progress / (1 - HOLD));
      scrubber.setProgress(p);
      if (overlay) {
        const fade = 1 - Math.min(1, p / FADE_OUT);
        overlay.style.opacity = String(fade);
        overlay.style.pointerEvents = fade < 0.05 ? 'none' : '';
      }
    },
  });

  try {
    await scrubber.ready;
  } catch (err) {
    // video unavailable → degrade to the static-poster (reduced-motion) layout
    console.error(err);
    scrubber.destroy();
    st.kill(true); // revert the pin spacing
    document.documentElement.classList.replace('motion-ok', 'reduced-motion');
    return;
  }

  // wake the decoder and paint frame 0 — iOS won't seek/paint a cold <video>
  if (!useCanvas) {
    try {
      await video.play();
      video.pause();
    } catch {
      /* autoplay kick not allowed/needed — fine, it's muted */
    }
    video.currentTime = 0.0001;
  }

  scrubber.start();
  // paint the correct frame for wherever we loaded/landed (mid-page reload)
  scrubber.setProgress(Math.min(1, st.progress / (1 - HOLD)));
  ScrollTrigger.refresh();
}
