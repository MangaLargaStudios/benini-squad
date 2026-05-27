'use strict';

/**
 * CircularText — port do componente React Bits (motion/react → CSS + JS).
 * API compatível: text, spinDuration, onHover, className.
 */
function createCircularText(options = {}) {
  const {
    text = '',
    spinDuration = 20,
    onHover = 'speedUp',
    className = '',
  } = options;

  const letters = Array.from(text);
  const count = Math.max(letters.length, 1);
  const el = document.createElement('div');
  el.className = ['circular-text', className].filter(Boolean).join(' ');
  el.style.setProperty('--spin-duration', `${spinDuration}s`);
  el.dataset.spinDuration = String(spinDuration);
  el.dataset.onHover = onHover || '';

  const label = text.replace(/\*/g, ' ').trim();
  if (label) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
  }

  letters.forEach((letter, i) => {
    const span = document.createElement('span');
    span.textContent = letter;
    const rotationDeg = (360 / count) * i;
    const factor = Math.PI / count;
    const x = factor * i;
    const y = factor * i;
    const transform = `rotateZ(${rotationDeg}deg) translate3d(${x}px, ${y}px, 0)`;
    span.style.transform = transform;
    span.style.webkitTransform = transform;
    el.appendChild(span);
  });

  if (
    onHover &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    el.addEventListener('mouseenter', () => applyCircularTextHover(el, true));
    el.addEventListener('mouseleave', () => applyCircularTextHover(el, false));
    el.addEventListener('focus', () => applyCircularTextHover(el, true));
    el.addEventListener('blur', () => applyCircularTextHover(el, false));
    el.tabIndex = 0;
  }

  return el;
}

function applyCircularTextHover(el, isHover) {
  const base = parseFloat(el.dataset.spinDuration) || 20;
  const variant = el.dataset.onHover;

  el.classList.remove('is-paused', 'is-bonkers');

  if (!isHover) {
    el.style.setProperty('--spin-duration', `${base}s`);
    el.style.transform = '';
    return;
  }

  if (!variant) return;

  switch (variant) {
    case 'slowDown':
      el.style.setProperty('--spin-duration', `${base * 2}s`);
      break;
    case 'speedUp':
      el.style.setProperty('--spin-duration', `${base / 4}s`);
      break;
    case 'pause':
      el.classList.add('is-paused');
      break;
    case 'goBonkers':
      el.style.setProperty('--spin-duration', `${base / 20}s`);
      el.classList.add('is-bonkers');
      break;
    default:
      el.style.setProperty('--spin-duration', `${base}s`);
  }
}

function mountCircularText(container, options) {
  if (!container) return null;
  container.replaceChildren();
  const node = createCircularText(options);
  container.appendChild(node);
  return node;
}

const TRANSFORM_CIRCULAR_TEXT_LEFT_OFFSET = 200;
const TRANSFORM_CIRCULAR_TEXT_TOP_OFFSET = 65;

function positionTransformCircularText() {
  const mount = document.getElementById('transform-circular-text');
  const wrap = mount?.closest('.transform-grid-wrap');
  const section = wrap?.closest('.section-transformacao');
  const title = section?.querySelector('.section-title');
  const lastCard = wrap?.querySelector('.transform-item:last-child');
  if (!mount || !wrap || !lastCard || !title) return;

  const wrapRect = wrap.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();
  const cardRect = lastCard.getBoundingClientRect();
  const size = Math.min(
    Math.max(cardRect.width * 1.4, 260),
    Math.min(520, wrapRect.width * 0.92)
  );

  const left =
    cardRect.right - wrapRect.left - size * 0.58 - TRANSFORM_CIRCULAR_TEXT_LEFT_OFFSET;
  const top =
    titleRect.top +
    titleRect.height / 2 -
    wrapRect.top -
    size / 2 +
    TRANSFORM_CIRCULAR_TEXT_TOP_OFFSET;

  mount.style.width = `${size}px`;
  mount.style.height = `${size}px`;
  mount.style.left = `${left}px`;
  mount.style.top = `${top}px`;
}

function initTransformacaoCircularText() {
  const mount = document.getElementById('transform-circular-text');
  if (!mount) return;

  mountCircularText(mount, {
    text: 'BENINI*SQUAD*',
    spinDuration: 38,
    onHover: undefined,
    className: 'transform-circular-text',
  });

  const reposition = () => requestAnimationFrame(positionTransformCircularText);
  reposition();

  window.addEventListener('resize', reposition, { passive: true });

  const wrap = mount.closest('.transform-grid-wrap');
  const title = wrap?.closest('.section-transformacao')?.querySelector('.section-title');
  if (wrap && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(reposition);
    observer.observe(wrap);
    if (title) observer.observe(title);
    wrap.querySelectorAll('.transform-item').forEach((item) => observer.observe(item));
  }
}

window.createCircularText = createCircularText;
window.mountCircularText = mountCircularText;
window.initTransformacaoCircularText = initTransformacaoCircularText;
window.positionTransformCircularText = positionTransformCircularText;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTransformacaoCircularText);
} else {
  initTransformacaoCircularText();
}
