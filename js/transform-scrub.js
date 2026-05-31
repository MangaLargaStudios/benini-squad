'use strict';

function clampScrub(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function setTransformScrub(unit, percent) {
  const value = clampScrub(percent);
  unit.style.setProperty('--transform-scrub', String(value));
  unit.dataset.scrub = String(Math.round(value));

  const bar = unit.querySelector('.transform-scrub-bar');
  const thumb = unit.querySelector('.transform-scrub-bar__thumb');
  if (bar && thumb) {
    thumb.setAttribute('aria-valuenow', String(Math.round(value)));
  }
}

function buildTransformScrubBar() {
  const bar = document.createElement('div');
  bar.className = 'transform-scrub-bar';
  bar.innerHTML = `
    <div class="transform-scrub-bar__track" aria-hidden="true"></div>
    <div class="transform-scrub-bar__fill" aria-hidden="true"></div>
    <button
      type="button"
      class="transform-scrub-bar__thumb"
      aria-label="Comparar resultado antes e depois"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="100"
    ></button>
  `;
  return bar;
}

function ensureTransformMediaPlaceholder(item) {
  if (item.querySelector('.transform-media-placeholder')) return;

  const placeholder = document.createElement('p');
  placeholder.className = 'transform-media-placeholder';
  placeholder.textContent = 'Aqui vai uma imagem.';

  const overlay = item.querySelector('.transform-overlay');
  if (overlay) {
    item.insertBefore(placeholder, overlay);
  } else {
    item.appendChild(placeholder);
  }
}

function prepareTransformCardUnit(item) {
  if (item.closest('.transform-card-unit')) {
    ensureTransformMediaPlaceholder(item);
    return item.closest('.transform-card-unit');
  }

  const unit = document.createElement('div');
  unit.className = 'transform-card-unit';
  item.parentNode.insertBefore(unit, item);
  unit.appendChild(item);

  const existingMedia = item.querySelector('.parallax-img, .transform-photo, img');
  const media = document.createElement('div');
  media.className = 'transform-media';

  if (existingMedia) {
    existingMedia.classList.add('transform-media__layer', 'transform-media__before');
    media.appendChild(existingMedia);
  } else {
    const before = document.createElement('div');
    before.className = 'transform-media__layer transform-media__before parallax-img';
    before.style.cssText =
      'background-image:linear-gradient(135deg,#5a4a3a,#3a2a2a); position:absolute; inset:0; width:100%; height:100%;';
    media.appendChild(before);
  }

  const after = document.createElement('div');
  after.className = 'transform-media__layer transform-media__after parallax-img';
  after.setAttribute('aria-hidden', 'true');
  if (existingMedia?.style?.backgroundImage) {
    after.style.cssText = existingMedia.style.cssText;
    after.style.filter = 'saturate(1.15) contrast(1.08) brightness(1.05)';
  } else if (existingMedia?.src) {
    const img = document.createElement('img');
    img.className = 'transform-photo';
    img.src = existingMedia.src;
    img.alt = '';
    img.loading = 'lazy';
    img.style.filter = 'saturate(1.15) contrast(1.08) brightness(1.05)';
    after.appendChild(img);
  } else {
    after.style.cssText =
      'background-image:linear-gradient(135deg,#3a3334,#1a1516); position:absolute; inset:0; width:100%; height:100%;';
  }
  media.appendChild(after);

  item.insertBefore(media, item.firstChild);

  ensureTransformMediaPlaceholder(item);

  const scrubLine = document.createElement('div');
  scrubLine.className = 'transform-scrub-line';
  scrubLine.setAttribute('aria-hidden', 'true');
  scrubLine.innerHTML = '<span class="transform-scrub-line__handle"></span>';

  item.appendChild(scrubLine);

  unit.appendChild(buildTransformScrubBar());
  setTransformScrub(unit, 100);

  return unit;
}

function bindTransformScrubUnit(unit) {
  const bar = unit.querySelector('.transform-scrub-bar');
  const thumb = unit.querySelector('.transform-scrub-bar__thumb');
  const card = unit.querySelector('.transform-item');
  if (!bar || !thumb || bar.dataset.bound === 'true') return;

  bar.dataset.bound = 'true';
  let dragging = false;

  const updateFromClientX = (clientX) => {
    const rect = bar.getBoundingClientRect();
    const inset =
      parseFloat(getComputedStyle(unit).getPropertyValue('--scrub-thumb-inset')) || 10;
    const trackWidth = rect.width - inset * 2;
    if (!trackWidth) return;
    const percent = ((clientX - rect.left - inset) / trackWidth) * 100;
    setTransformScrub(unit, percent);
  };

  const updateFromCardX = (clientX) => {
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const inset =
      parseFloat(getComputedStyle(unit).getPropertyValue('--scrub-thumb-inset')) || 10;
    const trackWidth = rect.width - inset * 2;
    if (!trackWidth) return;
    const percent = ((clientX - rect.left - inset) / trackWidth) * 100;
    setTransformScrub(unit, percent);
  };

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    thumb.setPointerCapture?.(event.pointerId);
    unit.classList.add('is-scrubbing');
    updateFromClientX(event.clientX);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    updateFromClientX(event.clientX);
  };

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    unit.classList.remove('is-scrubbing');
    if (event?.pointerId !== undefined) {
      thumb.releasePointerCapture?.(event.pointerId);
    }
  };

  thumb.addEventListener('pointerdown', onPointerDown);
  bar.addEventListener('pointerdown', (event) => {
    if (event.target === thumb) return;
    onPointerDown(event);
  });

  thumb.addEventListener('pointermove', onPointerMove);
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  if (card) {
    card.addEventListener('mousemove', (event) => {
      if (dragging) return;
      unit.classList.add('is-scrubbing');
      updateFromCardX(event.clientX);
    });

    card.addEventListener('mouseleave', () => {
      if (!dragging) unit.classList.remove('is-scrubbing');
    });
  }
}

function initTransformCardScrubs(root = document) {
  const items = [...root.querySelectorAll('.transform-item')];
  items.forEach((item) => {
    const unit = prepareTransformCardUnit(item);
    bindTransformScrubUnit(unit);
  });
}

window.initTransformCardScrubs = initTransformCardScrubs;
window.setTransformScrub = setTransformScrub;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initTransformCardScrubs(), { once: true });
} else {
  initTransformCardScrubs();
}
