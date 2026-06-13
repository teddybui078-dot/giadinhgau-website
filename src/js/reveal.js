import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* Soft fade-ins as content scrolls into view. Transform + opacity only (no
   blur) so it never competes with the bear's scrubbing for frames. Items are
   grouped per section so they stagger together. */
export function initReveals({ reduced }) {
  if (reduced) {
    // base.css only hides [data-r] under .motion-ok, so reduced-motion users
    // already see everything. Nothing to animate.
    return;
  }

  const groups = document.querySelectorAll('[data-panel]');
  groups.forEach((group) => {
    const items = group.querySelectorAll('[data-r]');
    if (!items.length) return;

    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 42 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: 'back.out(1.5)', // a little bounce as things land
        stagger: 0.09,
        // clear the inline transform on finish so CSS hovers/tilts take over
        clearProps: 'transform',
        scrollTrigger: {
          trigger: group,
          start: 'top 82%',
          once: true,
        },
      }
    );
  });
}
