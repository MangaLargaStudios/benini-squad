'use strict';

const METODOLOGIA_WAVE_HIDDEN = {
  yPercent: 115,
  opacity: 0,
  rotate: 8,
};

const METODOLOGIA_WAVE_SHOW = {
  yPercent: 0,
  opacity: 1,
  rotate: 0,
  duration: 0.68,
  ease: 'power4.out',
};

const METODOLOGIA_WAVE_HIDE = {
  ...METODOLOGIA_WAVE_HIDDEN,
  rotate: -6,
  duration: 0.52,
  ease: 'power3.in',
};

function createWaveLineElement(text) {
  const line = document.createElement('span');
  line.className = 'wave-split-line';
  line.setAttribute('aria-hidden', 'true');

  const inner = document.createElement('span');
  inner.className = 'wave-split-line-inner';
  inner.textContent = text;
  line.appendChild(inner);

  return { line, inner };
}

function splitBlockIntoLines(element) {
  if (!element) return [];

  if (element.dataset.waveSplit === 'true') {
    return [...element.querySelectorAll('.wave-split-line-inner')];
  }

  const segments = element.innerHTML
    .split(/<br\s*\/?>/i)
    .map((part) => part.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);

  element.textContent = '';
  element.dataset.waveSplit = 'true';

  const lines = [];
  segments.forEach((text) => {
    const { line, inner } = createWaveLineElement(text);
    element.appendChild(line);
    lines.push(inner);
  });

  return lines;
}

function splitParagraphIntoLines(element) {
  if (!element) return [];

  if (element.dataset.waveSplit === 'true') {
    return [...element.querySelectorAll('.wave-split-line-inner')];
  }

  const words = element.textContent.trim().split(/\s+/).filter(Boolean);
  element.textContent = '';
  element.dataset.waveSplit = 'true';

  if (!words.length) return [];

  const lines = [];
  let { line, inner } = createWaveLineElement('');
  element.appendChild(line);

  let lastTop = null;

  words.forEach((word, index) => {
    const wordNode = document.createTextNode(`${word}${index < words.length - 1 ? ' ' : ''}`);
    inner.appendChild(wordNode);

    const top = inner.offsetTop;
    if (lastTop !== null && top > lastTop) {
      wordNode.remove();
      lines.push(inner);

      ({ line, inner } = createWaveLineElement(''));
      element.appendChild(line);
      inner.appendChild(wordNode);
      lastTop = inner.offsetTop;
      return;
    }

    lastTop = top;
  });

  lines.push(inner);
  lines.forEach((lineInner) => {
    lineInner.textContent = lineInner.textContent.trim();
  });

  return lines;
}

function getMetodologiaSlideLines(slide) {
  if (slide._waveLines) return slide._waveLines;

  const title = slide.querySelector('.metodologia-copy-title');
  const desc = slide.querySelector('.metodologia-copy-desc');
  slide._waveLines = [...splitBlockIntoLines(title), ...splitParagraphIntoLines(desc)];

  return slide._waveLines;
}

function initMetodologiaWaveSplit(slides, slidesRoot) {
  if (!slides.length) return;

  slidesRoot?.classList.add('is-wave-measuring');
  slides.forEach((slide) => getMetodologiaSlideLines(slide));
  lockMetodologiaCopyHeight(slidesRoot, slides);
  slidesRoot?.classList.remove('is-wave-measuring');
  slidesRoot?.classList.add('is-wave-ready');
}

function lockMetodologiaCopyHeight(slidesRoot, slides) {
  if (!slidesRoot || !slides.length) return;

  const width = slidesRoot.clientWidth || slidesRoot.offsetWidth;
  let maxHeight = 0;

  slides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'width:100%',
      'height:auto',
      'visibility:hidden',
      'pointer-events:none',
      'opacity:0',
    ].join(';');

    if (width > 0) clone.style.width = `${width}px`;

    slidesRoot.appendChild(clone);
    maxHeight = Math.max(maxHeight, clone.offsetHeight);
    clone.remove();
  });

  if (maxHeight > 0) {
    slidesRoot.style.setProperty('--metodologia-copy-height', `${maxHeight}px`);
  }
}

function metodologiaLinesAreVisible(lines) {
  if (!lines?.length || typeof gsap === 'undefined') return false;
  return lines.every(
    (line) => gsap.getProperty(line, 'opacity') === 1 && gsap.getProperty(line, 'yPercent') === 0
  );
}

function getWaveStagger(direction, mode) {
  const forward = direction >= 0;

  if (mode === 'show') {
    return {
      each: 0.1,
      from: forward ? 'start' : 'end',
      ease: 'power2.out',
    };
  }

  return {
    each: 0.085,
    from: forward ? 'end' : 'start',
    ease: 'power2.in',
  };
}

function setMetodologiaWaveLinesHidden(lines) {
  if (!lines?.length || typeof gsap === 'undefined') return;
  gsap.set(lines, {
    ...METODOLOGIA_WAVE_HIDDEN,
    transformOrigin: '50% 100%',
    overwrite: 'auto',
  });
}

function animateMetodologiaWaveLines(lines, mode, direction) {
  if (!lines?.length || typeof gsap === 'undefined') return null;

  if (mode === 'show') {
    return gsap.to(lines, {
      ...METODOLOGIA_WAVE_SHOW,
      transformOrigin: '50% 100%',
      stagger: getWaveStagger(direction, 'show'),
      overwrite: 'auto',
    });
  }

  return gsap.to(lines, {
    ...METODOLOGIA_WAVE_HIDE,
    transformOrigin: '50% 100%',
    stagger: getWaveStagger(direction, 'hide'),
    overwrite: 'auto',
  });
}

function resetMetodologiaWaveSlides(slides, activeIndex = 0) {
  slides.forEach((slide, index) => {
    const lines = getMetodologiaSlideLines(slide);
    const active = index === activeIndex;

    slide.classList.toggle('is-active', active);
    slide.classList.remove('is-leaving');
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');

    if (typeof gsap === 'undefined') return;

    gsap.killTweensOf(lines);
    if (active) {
      gsap.set(lines, {
        yPercent: 0,
        opacity: 1,
        rotate: 0,
        transformOrigin: '50% 100%',
      });
    } else {
      setMetodologiaWaveLinesHidden(lines);
    }
  });
}

window.MetodologiaWaveText = {
  initMetodologiaWaveSplit,
  getMetodologiaSlideLines,
  setMetodologiaWaveLinesHidden,
  animateMetodologiaWaveLines,
  resetMetodologiaWaveSlides,
  metodologiaLinesAreVisible,
  lockMetodologiaCopyHeight,
};
