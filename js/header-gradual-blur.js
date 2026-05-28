'use strict';

/**
 * Gradual blur fixo no topo, atras do header flutuante.
 */
function initHeaderGradualBlur() {
  const container = document.getElementById('header-gradual-blur');
  if (!container || typeof window.BeniniGradualBlur === 'undefined') return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  window.BeniniGradualBlur.mount(container, {
    target: 'parent',
    position: 'top',
    height: '100%',
    strength: 4,
    divCount: 5,
    curve: 'bezier',
    exponential: true,
    opacity: 1,
    zIndex: 1,
  });
}

window.initHeaderGradualBlur = initHeaderGradualBlur;
