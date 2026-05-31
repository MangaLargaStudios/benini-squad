'use strict';

const TRANSFORM_SPLIT_HIDDEN = { yPercent: 110, opacity: 0 };

const TRANSFORM_SPLIT_SHOW = {
  yPercent: 0,
  opacity: 1,
  duration: 0.52,
  ease: 'power4.out',
};

const TRANSFORM_SPLIT_HIDE = {
  yPercent: -90,
  opacity: 0,
  duration: 0.38,
  ease: 'power3.in',
};

function splitTransformLine(element) {
  if (!element) return [];

  if (element.dataset.transformSplit === 'true') {
    return [...element.querySelectorAll('.transform-split-word')];
  }

  const text = element.textContent.trim();
  if (!text) return [];

  element.dataset.transformSplit = 'true';
  element.textContent = '';

  const words = [];
  text.split(/\s+/).filter(Boolean).forEach((word, index, arr) => {
    const wrap = document.createElement('span');
    wrap.className = 'transform-split-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = 'transform-split-word';
    inner.textContent = word;

    wrap.appendChild(inner);
    element.appendChild(wrap);
    words.push(inner);

    if (index < arr.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  return words;
}

function getSlideElements(slide) {
  const cards = [...slide.querySelectorAll('.transform-card-unit')];
  const media = cards
    .flatMap((unit) => [
      ...unit.querySelectorAll('.transform-media__before, .transform-media__after, .transform-photo'),
    ])
    .filter(Boolean);
  const words = [
    ...slide.querySelectorAll('.transform-name'),
    ...slide.querySelectorAll('.transform-result'),
  ].flatMap(splitTransformLine);

  return { cards, media, words };
}

function setSlideHidden({ cards, media, words }) {
  if (typeof gsap === 'undefined') return;

  gsap.set(cards, {
    opacity: 0,
    scale: 0.9,
    y: 28,
    rotateY: -6,
    transformPerspective: 900,
  });
  if (media.length) {
    gsap.set(media, { scale: 1.12, opacity: 0.4 });
  }
  if (words.length) {
    gsap.set(words, TRANSFORM_SPLIT_HIDDEN);
  }
}

function setSlideVisible({ cards, media, words }) {
  if (typeof gsap === 'undefined') return;

  gsap.set(cards, {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateY: 0,
    clearProps: 'transform',
  });
  if (media.length) {
    gsap.set(media, { scale: 1, opacity: 1, clearProps: 'transform,opacity' });
  }
  if (words.length) {
    gsap.set(words, { yPercent: 0, opacity: 1, clearProps: 'transform' });
  }
}

function initTransformCarousel() {
  if (typeof window.initTransformCardScrubs === 'function') {
    window.initTransformCardScrubs();
  }

  const carousel = document.getElementById('transform-carousel');
  if (!carousel) return;

  const viewport = carousel.querySelector('.transform-carousel__viewport');
  const track = carousel.querySelector('.transform-carousel__track');
  const prevBtn = carousel.querySelector('.transform-carousel__nav--prev');
  const nextBtn = carousel.querySelector('.transform-carousel__nav--next');
  const slides = [...carousel.querySelectorAll('.transform-carousel__slide')];
  if (!viewport || !track || !prevBtn || !nextBtn || !slides.length) return;

  const slideData = slides.map(getSlideElements);
  const totalPages = slides.length;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && !reducedMotion;

  let page = 0;
  let isAnimating = false;

  track.style.transition = 'none';

  slideData.forEach((data, index) => {
    if (index === 0) {
      setSlideVisible(data);
    } else {
      setSlideHidden(data);
    }
  });

  function updateNav() {
    prevBtn.disabled = page === 0 || isAnimating;
    nextBtn.disabled = page === totalPages - 1 || isAnimating;
  }

  function syncAria() {
    slides.forEach((slide, index) => {
      slide.setAttribute('aria-hidden', index === page ? 'false' : 'true');
    });
    carousel.dataset.page = String(page);
  }

  function setTrackPosition(targetPage, immediate = false) {
    const x = -targetPage * viewport.offsetWidth;

    if (!hasGsap) {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      return null;
    }

    if (immediate) {
      gsap.set(track, { x });
      return null;
    }

    return gsap.to(track, {
      x,
      duration: 0.72,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
  }

  function repositionCircularText() {
    if (typeof window.positionTransformCircularText === 'function') {
      requestAnimationFrame(window.positionTransformCircularText);
    }
  }

  function goTo(nextPage, direction) {
    const targetPage = Math.max(0, Math.min(totalPages - 1, nextPage));
    if (targetPage === page || isAnimating) return;

    const dir = direction ?? (targetPage > page ? 1 : -1);
    const outgoing = slideData[page];
    const incoming = slideData[targetPage];

    if (!hasGsap) {
      setSlideHidden(outgoing);
      page = targetPage;
      setTrackPosition(page, true);
      setSlideVisible(incoming);
      syncAria();
      updateNav();
      repositionCircularText();
      return;
    }

    isAnimating = true;
    carousel.classList.add('is-animating');
    updateNav();

    const exitX = dir * -36;
    const enterX = dir * 42;

    setSlideHidden(incoming);
    gsap.set(incoming.cards, { x: enterX, rotateY: dir * 10 });

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        setSlideHidden(outgoing);
        gsap.set(outgoing.cards, { clearProps: 'all' });
        gsap.set(incoming.cards, { clearProps: 'all' });
        page = targetPage;
        isAnimating = false;
        carousel.classList.remove('is-animating');
        syncAria();
        updateNav();
        repositionCircularText();
      },
    });

    tl.to(
      outgoing.cards,
      {
        opacity: 0,
        scale: 0.88,
        y: -22,
        x: exitX,
        rotateY: dir * -12,
        duration: 0.42,
        stagger: { each: 0.07, from: dir > 0 ? 'start' : 'end' },
        ease: 'power3.in',
      },
      0
    );

    if (outgoing.media.length) {
      tl.to(
        outgoing.media,
        { scale: 1.08, opacity: 0, duration: 0.38, stagger: 0.06, ease: 'power2.in' },
        0
      );
    }

    if (outgoing.words.length) {
      tl.to(
        outgoing.words,
        {
          ...TRANSFORM_SPLIT_HIDE,
          stagger: { each: 0.035, from: dir > 0 ? 'end' : 'start' },
        },
        0.02
      );
    }

    tl.add(setTrackPosition(targetPage), 0.18);

    tl.to(
      incoming.cards,
      {
        opacity: 1,
        scale: 1,
        y: 0,
        x: 0,
        rotateY: 0,
        duration: 0.62,
        stagger: { each: 0.09, from: dir > 0 ? 'start' : 'end' },
        ease: 'power4.out',
      },
      0.32
    );

    if (incoming.media.length) {
      tl.fromTo(
        incoming.media,
        { scale: 1.14, opacity: 0.35 },
        { scale: 1, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out' },
        0.38
      );
    }

    if (incoming.words.length) {
      tl.to(
        incoming.words,
        {
          ...TRANSFORM_SPLIT_SHOW,
          stagger: { each: 0.04, from: dir > 0 ? 'start' : 'end' },
        },
        0.42
      );
    }
  }

  prevBtn.addEventListener('click', () => goTo(page - 1, -1));
  nextBtn.addEventListener('click', () => goTo(page + 1, 1));

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(page - 1, -1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(page + 1, 1);
    }
  });

  window.addEventListener(
    'resize',
    () => {
      setTrackPosition(page, true);
      repositionCircularText();
    },
    { passive: true }
  );

  setTrackPosition(0, true);
  syncAria();
  updateNav();
}

window.initTransformCarousel = initTransformCarousel;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTransformCarousel);
} else {
  initTransformCarousel();
}
