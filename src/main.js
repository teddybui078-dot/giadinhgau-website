import './css/tokens.css';
import './css/base.css';
import './css/components.css';
import './css/sections.css';
import './css/playful.css';
import './css/hero-video.css';

import { prefersReducedMotion } from './js/reducedMotion.js';
import { initSiteChrome } from './js/header.js';

async function boot() {
  initSiteChrome();

  const reduced = prefersReducedMotion();

  const { initReveals } = await import('./js/reveal.js');
  initReveals({ reduced });

  // Reduced motion: no video, no pin, no scrub. The hero-video.css branch shows
  // the bears poster as a still and everything scrolls normally.
  if (reduced) return;

  const { initHeroVideo } = await import('./js/heroVideo.js');
  await initHeroVideo();

  // Section heights settle after webfonts land; ScrollTrigger's pin/reveal
  // geometry depends on document height, so refresh once they're in.
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

boot();
