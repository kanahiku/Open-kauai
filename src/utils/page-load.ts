/**
 * Runs `init` now and again after every client-side navigation. ClientRouter swaps the page without a
 * reload, and a bundled page script only runs once per document, so without this a page reached by
 * a link would have dead controls (filters, search, the map, forms). `init` must skip elements it has
 * already set up, because it can run more than once on the same page.
 */
export function onPageLoad(init: () => void): void {
  init();
  document.addEventListener('astro:page-load', init);
}
