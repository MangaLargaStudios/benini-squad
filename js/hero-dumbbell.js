'use strict';

const HERO_HOLD_PHASE_SPLIT = { dumbbell: 0.52, blur: 0.48, text: 0 };
const HERO_BLUEPRINT_DEFAULTS = {
  strength: 1,
  lineA: 0.2,
  lineB: 0.13,
  layerB: 0.92,
};
const HERO_BLUEPRINT_DUMBBELL = {
  strength: 1.65,
  lineA: 0.3,
  lineB: 0.19,
  layerB: 1,
};

function mapBlueprintVars({ strength, lineA, lineB, layerB }) {
  return {
    '--blueprint-strength': strength,
    '--blueprint-line-a': lineA,
    '--blueprint-line-b': lineB,
    '--blueprint-layer-b': layerB,
  };
}

const HERO_ASIDE_LINE_HIDDEN = { yPercent: 110, opacity: 0 };
const HERO_ASIDE_TEXT_REVEAL_DELAY_MS = 100;
const HERO_ASIDE_LINE_STAGGER = 0.05;
const HERO_PHASE_SCROLL_IDS = [
  'hero-phase-blueprint',
  'hero-phase-blur',
  'hero-manifesto-overlap',
  'manifesto-overlap-text',
];

function getHeroBeniniTextAsides() {
  return [
    document.getElementById('benini-text-aside-left'),
    document.getElementById('benini-text-aside-right'),
  ].filter(Boolean);
}

function getHeroBeniniAsideLines() {
  return document.querySelectorAll('#hero-visual .hero-benini-text-aside .aside-line');
}

function resetHeroBeniniTextAsides() {
  const band = document.querySelector('.hero-benini-text-band');
  const beniniNameplate = document.getElementById('hero-visual-benini-nameplate');
  const asides = getHeroBeniniTextAsides();
  const lines = heroBeniniTextState?.lines?.length
    ? heroBeniniTextState.lines
    : [...getHeroBeniniAsideLines()];

  gsap.killTweensOf([...asides, ...lines, beniniNameplate].filter(Boolean));

  if (band) {
    band.setAttribute('aria-hidden', 'true');
  }

  asides.forEach((aside) => {
    aside.dataset.asideScrollReady = 'false';
    gsap.set(aside, { opacity: 0, visibility: 'hidden' });
    gsap.set(aside.querySelectorAll('.aside-line'), HERO_ASIDE_LINE_HIDDEN);
  });

  if (beniniNameplate) {
    gsap.set(beniniNameplate, { opacity: 0, visibility: 'hidden' });
  }

  if (heroBeniniTextState) {
    clearTimeout(heroBeniniTextState.timer);
    heroBeniniTextState.played = false;
    heroBeniniTextState.pending = false;
  }
}

let heroBeniniTextState = null;

function setHeroBeniniTextState(nextState) {
  if (heroBeniniTextState?.timer) {
    clearTimeout(heroBeniniTextState.timer);
  }
  heroBeniniTextState = nextState;
}

function playHeroBeniniTextReveal() {
  const state = heroBeniniTextState;
  if (!state || state.played || state.pending) return;

  state.pending = true;
  state.timer = setTimeout(() => {
    state.pending = false;
    if (state.played) return;
    state.played = true;

    const { asides, lines, band, beniniNameplate } = state;
    gsap.killTweensOf([...asides, ...lines, beniniNameplate].filter(Boolean));

    asides.forEach((aside) => {
      gsap.set(aside, { visibility: 'visible', opacity: 1 });
    });
    band?.setAttribute('aria-hidden', 'false');

    if (beniniNameplate) {
      gsap.set(beniniNameplate, { visibility: 'visible' });
      gsap.to(beniniNameplate, {
        opacity: 1,
        duration: 0.32,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    gsap.to(lines, {
      yPercent: 0,
      opacity: 1,
      duration: 0.34,
      ease: 'power2.out',
      stagger: { each: HERO_ASIDE_LINE_STAGGER, from: 'start' },
      overwrite: 'auto',
    });
  }, HERO_ASIDE_TEXT_REVEAL_DELAY_MS);
}

function updateHeroDumbbell(beniniEased) {
  if (typeof beniniEased !== 'number' || !heroBeniniTextState) return;

  if (beniniEased >= 0.06) {
    playHeroBeniniTextReveal();
    return;
  }

  if (beniniEased < 0.02 && (heroBeniniTextState.played || heroBeniniTextState.pending)) {
    resetHeroBeniniTextAsides();
  }
}

function dumbbellScrollTriggerConfig(overrides = {}) {
  const config = {
    invalidateOnRefresh: true,
    ...overrides,
  };

  if (window.beniniUsesLenisScroller) {
    config.scroller = document.body;
  }

  return config;
}

/** Apenas o painel direito (fase do haltere). Esquerdo e blueprint--blur ficam acima do GridScan. */
function getHeroBlurLayers() {
  return [document.getElementById('hero-visual-blur-panel')].filter(Boolean);
}

function killHeroPhaseScrolls() {
  if (typeof ScrollTrigger === 'undefined') return;

  HERO_PHASE_SCROLL_IDS.forEach((id) => ScrollTrigger.getById(id)?.kill());

  resetHeroBeniniTextAsides();

  const blurLayers = getHeroBlurLayers();
  if (blurLayers.length) {
    gsap.set(blurLayers, { opacity: 0 });
  }

  const blueprintGrid = document.querySelector('.hero-visual-blueprint-grid');
  if (blueprintGrid) {
    gsap.set(blueprintGrid, mapBlueprintVars(HERO_BLUEPRINT_DEFAULTS));
  }

  resetHeroManifestoOverlapLayout();
}

function setHeroOverlapCoverMode(active) {
  const heroVisual = document.getElementById('hero-visual');
  if (heroVisual) {
    heroVisual.classList.toggle('is-overlap-cover-active', active);
  }
}

function isOverlapScrollProgress(progress) {
  const start = window.__heroOverlapProgressStart;
  const end = window.__heroOverlapProgressEnd;
  if (typeof start !== 'number' || typeof end !== 'number') return false;
  return progress >= start - 0.02 && progress <= end + 0.02;
}

function isHeroOverlapActive() {
  if (document.body.classList.contains('is-hero-manifesto-overlap')) return true;
  if (typeof ScrollTrigger === 'undefined') return false;
  const progress = ScrollTrigger.getById('hero-video-scrub')?.progress;
  return typeof progress === 'number' && isOverlapScrollProgress(progress);
}

window.__beniniIsOverlapScrollProgress = isOverlapScrollProgress;
window.__beniniIsHeroOverlapActive = isHeroOverlapActive;

function resetHeroManifestoOverlapLayout() {
  const manifesto = document.getElementById('manifesto');
  document.body.classList.remove('is-hero-manifesto-overlap');
  setHeroOverlapCoverMode(false);

  if (!manifesto) {
    return;
  }

  gsap.set(manifesto, { clearProps: 'transform' });
  manifesto.classList.remove('section-manifesto--overlap-ready');
  manifesto.style.removeProperty('--hero-overlap-distance');
}

function getHeroHoldPhases(metrics) {
  const animationHoldPx = Math.max(1, metrics.animationHoldPx || 1);
  const dumbbellPx = Math.round(animationHoldPx * HERO_HOLD_PHASE_SPLIT.dumbbell);
  const blurPx = Math.round(animationHoldPx * HERO_HOLD_PHASE_SPLIT.blur);
  const textPx = Math.max(1, animationHoldPx - dumbbellPx - blurPx);
  const holdStartPx = Math.round(metrics.scrollDistance * metrics.mainRatio);

  return {
    holdStartPx,
    dumbbell: { startPx: holdStartPx, lengthPx: dumbbellPx },
    blur: { startPx: holdStartPx + dumbbellPx, lengthPx: blurPx },
    text: { startPx: holdStartPx + dumbbellPx + blurPx, lengthPx: textPx },
    overlap: {
      startPx: holdStartPx + dumbbellPx + blurPx + textPx,
      lengthPx: Math.max(1, metrics.overlapScroll || 0),
    },
  };
}

function initHeroManifestoOverlapScroll(trigger, phases, scrub) {
  const manifesto = document.getElementById('manifesto');
  const overlapPx = phases.overlap.lengthPx;

  if (!manifesto || !overlapPx) {
    return;
  }

  manifesto.style.setProperty('--hero-overlap-distance', `${overlapPx}px`);
  manifesto.classList.add('section-manifesto--overlap-ready');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(manifesto, { y: 0, clearProps: 'transform' });
    return;
  }

  const setManifestoY = gsap.quickSetter(manifesto, 'y', 'px');

  gsap.set(manifesto, { y: overlapPx, force3D: true });

  ScrollTrigger.create(
    dumbbellScrollTriggerConfig({
      id: 'hero-manifesto-overlap',
      trigger,
      ...phaseScrollRange(phases.overlap),
      scrub,
      invalidateOnRefresh: false,
      onUpdate(self) {
        const y = overlapPx * (1 - self.progress);
        setManifestoY(y);

        if (self.progress > 0.01) {
          document.body.classList.add('is-hero-manifesto-overlap');
        } else if (self.direction < 0 && self.progress < 0.01) {
          document.body.classList.remove('is-hero-manifesto-overlap');
          setHeroOverlapCoverMode(false);
        }

        // Só esconde elementos 3D quando manifesto já cobre ~50% do hero
        if (self.progress >= 0.5) {
          setHeroOverlapCoverMode(true);
        } else if (self.direction < 0 && self.progress < 0.35) {
          setHeroOverlapCoverMode(false);
        }
      },
      onEnter: () => {
        document.body.classList.add('is-hero-manifesto-overlap');
      },
      onEnterBack: () => {
        document.body.classList.add('is-hero-manifesto-overlap');
        setHeroOverlapCoverMode(true);
      },
      onLeave: () => {
        document.body.classList.remove('is-hero-manifesto-overlap');
        setManifestoY(0);
      },
      onLeaveBack: () => {
        document.body.classList.remove('is-hero-manifesto-overlap');
      },
    })
  );
}

function phaseScrollRange(phase) {
  return {
    start: `top+=${phase.startPx} top`,
    end: `+=${phase.lengthPx}`,
  };
}

function initHeroVideoPhaseScroll() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  const metrics = window.__heroVideoScrollMetrics;
  const wrap = document.getElementById('hero-visual-scroll-wrap');
  if (!metrics || !wrap) {
    scheduleHeroPhaseScrollInit();
    return;
  }

  killHeroPhaseScrolls();

  const phases = getHeroHoldPhases(metrics);
  const trigger = wrap;
  const scrub = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroVisual = document.getElementById('hero-visual');
  if (heroVisual) {
    gsap.set(heroVisual, { x: 0 });
  }

  const foto = document.getElementById('hero-visual-benini');

  if (foto) {
    gsap.set(foto, { x: 0 });
  }

  const blueprintGrid = document.querySelector('.hero-visual-blueprint-grid');
  if (!reducedMotion && blueprintGrid) {
    gsap.set(blueprintGrid, mapBlueprintVars(HERO_BLUEPRINT_DEFAULTS));
    gsap.fromTo(
      blueprintGrid,
      mapBlueprintVars(HERO_BLUEPRINT_DEFAULTS),
      {
        ...mapBlueprintVars(HERO_BLUEPRINT_DUMBBELL),
        ease: 'none',
        scrollTrigger: dumbbellScrollTriggerConfig({
          id: 'hero-phase-blueprint',
          trigger,
          ...phaseScrollRange(phases.dumbbell),
          scrub,
        }),
      }
    );
  }

  const blurLayers = getHeroBlurLayers();
  if (blurLayers.length) {
    gsap.set(blurLayers, { opacity: 0 });
    if (!reducedMotion) {
      gsap.fromTo(
        blurLayers,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: dumbbellScrollTriggerConfig({
            id: 'hero-phase-blur',
            trigger,
            ...phaseScrollRange(phases.blur),
            scrub,
          }),
        }
      );
    }
  }

  const asides = getHeroBeniniTextAsides();
  const lines = getHeroBeniniAsideLines();
  const beniniNameplate = document.getElementById('hero-visual-benini-nameplate');

  if (asides.length && lines.length) {
    const band = document.querySelector('.hero-benini-text-band');

    if (reducedMotion) {
      if (band) band.setAttribute('aria-hidden', 'false');
      asides.forEach((aside) => {
        aside.dataset.asideScrollReady = 'true';
        gsap.set(aside, { opacity: 1, visibility: 'visible' });
      });
      gsap.set(lines, { opacity: 1, yPercent: 0 });
      if (beniniNameplate) {
        gsap.set(beniniNameplate, { opacity: 1, visibility: 'visible' });
      }
      setHeroBeniniTextState(null);
    } else {
      if (band) band.setAttribute('aria-hidden', 'true');
      asides.forEach((aside) => {
        aside.dataset.asideScrollReady = 'true';
        gsap.set(aside, { opacity: 0, visibility: 'hidden' });
      });
      gsap.set(lines, HERO_ASIDE_LINE_HIDDEN);
      if (beniniNameplate) {
        gsap.set(beniniNameplate, { opacity: 0, visibility: 'hidden' });
      }

      setHeroBeniniTextState({
        asides,
        lines: [...lines],
        band,
        beniniNameplate,
        played: false,
        pending: false,
        timer: null,
      });
    }
  } else {
    setHeroBeniniTextState(null);
  }

  if (!reducedMotion) {
    const scrollDistance = metrics.scrollDistance || 1;
    window.__heroOverlapProgressStart = phases.overlap.startPx / scrollDistance;
    window.__heroOverlapProgressEnd =
      (phases.overlap.startPx + phases.overlap.lengthPx) / scrollDistance;
  }

  ScrollTrigger.refresh();
}

let heroPhaseScrollInitFrame = 0;
let heroPhaseScrollSignature = '';

function getHeroPhaseScrollSignature() {
  const metrics = window.__heroVideoScrollMetrics;
  return String(metrics?.scrollDistance || 0);
}

function scheduleHeroPhaseScrollInit() {
  if (typeof window.requestAnimationFrame !== 'function') {
    initDumbbellScroll();
    return;
  }

  if (heroPhaseScrollInitFrame) {
    return;
  }

  heroPhaseScrollInitFrame = requestAnimationFrame(() => {
    heroPhaseScrollInitFrame = 0;

    if (!window.__heroVideoScrollMetrics) {
      scheduleHeroPhaseScrollInit();
      return;
    }

    const signature = getHeroPhaseScrollSignature();
    if (signature === heroPhaseScrollSignature) {
      return;
    }
    heroPhaseScrollSignature = signature;

    initHeroVideoPhaseScroll();
  });
}

function initDumbbellScroll() {
  scheduleHeroPhaseScrollInit();
}

function initHeroBlueprintGridParallax() {
  const section = document.getElementById('hero-visual');
  const grids = [
    document.querySelector('.hero-visual-blueprint-grid:not(.hero-visual-blueprint-grid--blur)'),
  ].filter(Boolean);

  if (
    !section ||
    !grids.length ||
    typeof gsap === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  ) {
    return;
  }

  const gridStyle = window.getComputedStyle(grids[0]);
  if (gridStyle.display === 'none' || gridStyle.visibility === 'hidden') {
    return;
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const maxShift = window.matchMedia('(max-width: 768px)').matches ? 3 : 6;
  const smooth = 0.085;

  gsap.set(grids, { x: 0, y: 0, force3D: true });

  const resetTarget = () => {
    targetX = 0;
    targetY = 0;
  };

  const updateTarget = (clientX, clientY) => {
    const rect = section.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = (clientX - rect.left) / rect.width - 0.5;
    const ny = (clientY - rect.top) / rect.height - 0.5;

    targetX = -nx * maxShift;
    targetY = -ny * maxShift;
  };

  const onDocumentMove = (event) => {
    const rect = section.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      if (targetX !== 0 || targetY !== 0) resetTarget();
      return;
    }

    updateTarget(event.clientX, event.clientY);
  };

  document.addEventListener('mousemove', onDocumentMove, { passive: true });
  section.addEventListener('mouseleave', resetTarget);

  let blueprintSectionVisible = false;
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(
      (entries) => { blueprintSectionVisible = entries.some((e) => e.isIntersecting); },
      { threshold: 0 }
    ).observe(section);
  } else {
    blueprintSectionVisible = true;
  }

  gsap.ticker.add(() => {
    if (!blueprintSectionVisible) return;

    const prevX = currentX;
    const prevY = currentY;

    currentX += (targetX - currentX) * smooth;
    currentY += (targetY - currentY) * smooth;

    if (Math.abs(currentX) < 0.02 && Math.abs(targetX) < 0.02) currentX = 0;
    if (Math.abs(currentY) < 0.02 && Math.abs(targetY) < 0.02) currentY = 0;

    if (Math.abs(currentX - prevX) < 0.01 && Math.abs(currentY - prevY) < 0.01) return;

    gsap.set(grids, { x: currentX, y: currentY, force3D: true });
  });
}

window.initDumbbellScroll = initDumbbellScroll;
window.scheduleHeroPhaseScrollInit = scheduleHeroPhaseScrollInit;
window.initHeroVideoPhaseScroll = initHeroVideoPhaseScroll;
window.initHeroBlueprintGridParallax = initHeroBlueprintGridParallax;
window.setHeroOverlapCoverMode = setHeroOverlapCoverMode;
window.killHeroPhaseScrolls = killHeroPhaseScrolls;
window.updateHeroDumbbell = updateHeroDumbbell;
