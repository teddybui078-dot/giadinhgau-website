/* Entry for the deeper interior pages (Story, Family, Memories, Place).
   No scroll-scrubbed video here — just the shared chrome, the cream layout, and
   the same scroll reveals as the home page. */
import './css/tokens.css';
import './css/base.css';
import './css/components.css';
import './css/sections.css';
import './css/playful.css';
import './css/pages.css';

import { prefersReducedMotion } from './js/reducedMotion.js';
import { initSiteChrome } from './js/header.js';

async function boot() {
  initSiteChrome();

  const reduced = prefersReducedMotion();

  const { initReveals } = await import('./js/reveal.js');
  initReveals({ reduced });

  if (!reduced) {
    // section heights settle once webfonts land; refresh reveal geometry then
    const { ScrollTrigger } = await import('gsap/ScrollTrigger');
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }
}

boot();
