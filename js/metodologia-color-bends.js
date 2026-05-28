/**
 * ColorBends background for #metodologia.
 */
(function initMetodologiaColorBends() {
  const section = document.getElementById('metodologia');
  const container = document.getElementById('metodologia-color-bends');
  if (!section || !container || typeof window.initBeniniColorBends !== 'function') return;

  window.__beniniMetodologiaColorBendsDispose = window.initBeniniColorBends(section, container);
})();
