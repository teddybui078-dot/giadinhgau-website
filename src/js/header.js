/* Shared site chrome used by every page: the year stamp in the footer and the
   floating-nav scroll state (the pill tightens + solidifies once you leave the
   very top). Runs regardless of motion preference. */
export function initSiteChrome() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const header = document.querySelector('.site-header');
  if (header) {
    const setScrolled = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });
  }
}
