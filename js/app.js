'use strict';

const isTouchDevice = () =>
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const shouldNormalizeScroll = () =>
  isTouchDevice() || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function showHeroContentImmediate() {
  gsap.set(['#hero-eyebrow', '#hero-h1', '#hero-ctas', '#scroll-indicator'], {
    opacity: 1,
    y: 0,
  });
}

/* ─────────────────────────────────────────────
   1. LENIS — Smooth Scroll (mobile + desktop)
   ───────────────────────────────────────────── */
let lenis;

function initLenis() {
  if (typeof Lenis === 'undefined') return;
  if (prefersReducedMotion()) return;

  lenis = new Lenis({
    duration: isTouchDevice() ? 0.9 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 1.15,
  });

  lenis.on('scroll', () => {
    window.__beniniIsScrolling = true;
    clearTimeout(window.__beniniScrollIdleTimer);
    window.__beniniScrollIdleTimer = setTimeout(() => {
      window.__beniniIsScrolling = false;
      if (typeof window.__beniniWomanModelsOnScrollIdle === 'function') {
        window.__beniniWomanModelsOnScrollIdle();
      }
    }, 220);
  });

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    ScrollTrigger.update();
  });
  gsap.ticker.lagSmoothing(0);

  const scrollRoot = document.body;

  ScrollTrigger.scrollerProxy(scrollRoot, {
    scrollTop(value) {
      if (arguments.length) {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    pinType: 'fixed',
  });

  ScrollTrigger.addEventListener('refresh', () => lenis.resize());

  ScrollTrigger.defaults({
    scroller: scrollRoot,
  });

  window.beniniUsesLenisScroller = true;
  window.beniniLenis = lenis;
}

function scrollTriggerConfig(overrides = {}) {
  const config = {
    invalidateOnRefresh: true,
    ...overrides,
  };
  if (lenis) {
    config.scroller = document.body;
  }
  return config;
}

const REVEAL_SHOW = {
  duration: 0.9,
  ease: 'power3.out',
};

const REVEAL_HIDE = {
  duration: 0.75,
  ease: 'power2.inOut',
};

const SPLIT_TEXT_HIDDEN = { yPercent: 110, opacity: 0 };
const SPLIT_TEXT_REVEAL_DELAY = 0.08;
const MANIFESTO_VIEWPORT_REVEAL_START = 'top 85%';
const MANIFESTO_OVERLAP_TEXT_START = 0.3;
const MANIFESTO_SPLIT_TEXT_DELAY = 0.13;
const MANIFESTO_SPLIT_TEXT_STAGGER = 0.13;
const MANIFESTO_ENTER_BACK_DELAY = 0.32;

const SPLIT_TEXT_SHOW = {
  yPercent: 0,
  opacity: 1,
  duration: 0.55,
  ease: 'power4.out',
  stagger: { each: 0.022, from: 'start' },
};

const SPLIT_TEXT_HIDE = {
  ...SPLIT_TEXT_HIDDEN,
  duration: 0.55,
  ease: 'power3.inOut',
  stagger: { each: 0.022, from: 'end' },
};

/** Split text em reveal no scroll — atraso para o efeito ser visível ao entrar na seção */
function splitTextShowOnScroll(extra = {}) {
  return {
    ...SPLIT_TEXT_SHOW,
    delay: SPLIT_TEXT_REVEAL_DELAY,
    ...extra,
  };
}

/** Split text ao sair da seção no scroll up — stagger do fim (backward) */
function splitTextHideOnScroll(extra = {}) {
  return {
    ...SPLIT_TEXT_HIDE,
    ...extra,
  };
}

function getManifestoSplitStagger(direction, mode) {
  const forward = direction >= 0;

  if (mode === 'show') {
    return {
      each: MANIFESTO_SPLIT_TEXT_STAGGER,
      from: forward ? 'start' : 'end',
    };
  }

  return {
    each: MANIFESTO_SPLIT_TEXT_STAGGER,
    from: forward ? 'end' : 'start',
  };
}

const scrollRevealRegistry = [];
const REVEAL_IO_THRESHOLD = 0.14;
let lastScrollY = 0;
let scrollDirection = 1;
let scrollDeltaPending = 0;
let scrollSettleTimer = null;
let scrollSettleMaxTimer = null;
let scrollRevealEngineReady = false;

function getScrollY() {
  return lenis ? lenis.scroll : window.scrollY;
}

function getSectionVisibility(trigger) {
  const rect = trigger.getBoundingClientRect();
  const vh = window.innerHeight;
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, vh);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const viewportCoverage = visibleHeight / vh;
  const elementCoverage = visibleHeight / Math.max(rect.height, 1);

  const inView =
    rect.top < vh * (isTouchDevice() ? 0.88 : 0.85) &&
    rect.bottom > vh * (isTouchDevice() ? 0.1 : 0.08);

  return {
    viewportCoverage,
    elementCoverage,
    settledInView:
      inView && (viewportCoverage > 0.14 || elementCoverage > 0.08),
    leavingUp: rect.bottom < vh * (isTouchDevice() ? 0.2 : 0.16),
  };
}

function getHeroRevealVisibility() {
  const main = document.querySelector('.hero-main');
  const el = main || document.getElementById('hero');
  if (!el) {
    return { settledInView: false, leavingUp: true };
  }

  const vis = getSectionVisibility(el);
  const nearTop = getScrollY() <= window.innerHeight * 0.35;

  return {
    settledInView: vis.settledInView || nearTop,
    leavingUp: vis.leavingUp && !nearTop,
  };
}

function isHeroRevealItem(item) {
  const trigger = item.trigger;
  return trigger instanceof HTMLElement && trigger.id === 'hero';
}

/**
 * Reveal no fim do scroll down (seção em visualização).
 * Fade out só no fim do scroll up (ao sair da seção para cima).
 */
function registerScrollReveal(trigger, { setHidden, animateShow, animateHide }, options = {}) {
  const item = {
    trigger,
    setHidden,
    animateShow,
    animateHide,
    revealed: false,
    observeReveal: options.observeReveal === true,
  };

  setHidden();
  scrollRevealRegistry.push(item);

  if (item.observeReveal) {
    attachRevealIntersectionObserver(item);
  }

  return item;
}

function attachRevealIntersectionObserver(item) {
  const { trigger } = item;
  if (!(trigger instanceof Element)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (prefersReducedMotion()) return;

        if (entry.isIntersecting && entry.intersectionRatio >= REVEAL_IO_THRESHOLD) {
          if (!item.revealed) {
            item.revealed = true;
            item.animateShow();
          }
          return;
        }

        const rect = entry.boundingClientRect;
        if (item.revealed && rect.bottom < window.innerHeight * 0.14 && rect.top < 0) {
          item.revealed = false;
          item.animateHide();
        }
      });
    },
    { threshold: [0, 0.08, 0.14, 0.22, 0.32] }
  );

  observer.observe(trigger);
  item._revealObserver = observer;
}

function evaluateScrollReveals(settleDirection = scrollDirection) {
  if (prefersReducedMotion()) return;

  scrollRevealRegistry.forEach((item) => {
    if (isHeroRevealItem(item)) {
      const vis = getHeroRevealVisibility();

      if (!item.revealed && vis.settledInView) {
        item.revealed = true;
        item.animateShow();
      } else if (settleDirection < 0 && item.revealed && vis.leavingUp) {
        item.revealed = false;
        item.animateHide();
      }
      return;
    }

    const vis = getSectionVisibility(item.trigger);

    if (!item.observeReveal && !item.revealed && vis.settledInView && settleDirection >= 0) {
      item.revealed = true;
      item.animateShow();
      return;
    }

    if (item.observeReveal && !item.revealed && vis.settledInView) {
      item.revealed = true;
      item.animateShow();
      return;
    }

    if (settleDirection < 0 && item.revealed && vis.leavingUp) {
      item.revealed = false;
      item.animateHide();
    }
  });
}

function runScrollRevealEvaluate() {
  clearTimeout(scrollSettleMaxTimer);
  scrollSettleMaxTimer = null;
  const settleDirection =
    scrollDeltaPending > 4 ? 1 : scrollDeltaPending < -4 ? -1 : scrollDirection;
  scrollDeltaPending = 0;
  evaluateScrollReveals(settleDirection);
}

function onScrollRevealTick() {
  const y = getScrollY();
  const delta = y - lastScrollY;
  scrollDeltaPending += delta;

  if (delta > 1.5) scrollDirection = 1;
  else if (delta < -1.5) scrollDirection = -1;
  lastScrollY = y;

  clearTimeout(scrollSettleTimer);
  const settleMs = isTouchDevice() ? 90 : 60;
  scrollSettleTimer = setTimeout(runScrollRevealEvaluate, settleMs);

  if (!scrollSettleMaxTimer) {
    scrollSettleMaxTimer = setTimeout(runScrollRevealEvaluate, 280);
  }
}

function initScrollRevealEngine() {
  if (prefersReducedMotion() || scrollRevealEngineReady) return;
  scrollRevealEngineReady = true;
  lastScrollY = getScrollY();

  if (lenis) {
    lenis.on('scroll', onScrollRevealTick);
  } else {
    window.addEventListener('scroll', onScrollRevealTick, { passive: true });
  }

  ScrollTrigger.addEventListener('refresh', () => {
    requestAnimationFrame(evaluateScrollReveals);
  });

  requestAnimationFrame(() => evaluateScrollReveals(1));
}

function triggerScrollRevealCheck() {
  evaluateScrollReveals(1);
}

window.triggerScrollRevealCheck = triggerScrollRevealCheck;

/* ─────────────────────────────────────────────
   2. CUSTOM CURSOR (pointer fino apenas)
   ───────────────────────────────────────────── */
function initCursor() {
  if (isTouchDevice()) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0;
  let my = 0;
  let rx = 0;
  let ry = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    gsap.to(dot, { x: mx, y: my, duration: 0.08, ease: 'none' });
  });

  function animRing() {
    const dx = mx - rx;
    const dy = my - ry;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      rx += dx * 0.12;
      ry += dy * 0.12;
      gsap.set(ring, { x: rx, y: ry });
    }
    requestAnimationFrame(animRing);
  }
  animRing();

  document.querySelectorAll('a, button, .metodo-card, .pricing-card, .transform-item').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
}

/* ─────────────────────────────────────────────
   3. NAV — scroll behavior + split text entrance
   ───────────────────────────────────────────── */
function splitNavText(element) {
  if (!element || element.dataset.navSplit === 'true') {
    return [...element.querySelectorAll('.nav-split-char')];
  }

  const text = element.textContent.trim();
  if (!text) return [];

  element.dataset.navSplit = 'true';
  if (!element.getAttribute('aria-label')) {
    element.setAttribute('aria-label', text);
  }

  element.textContent = '';
  const chars = [];

  [...text].forEach((char) => {
    const wrap = document.createElement('span');
    wrap.className = 'nav-split-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = 'nav-split-char';
    inner.textContent = char === ' ' ? '\u00a0' : char;

    wrap.appendChild(inner);
    element.appendChild(wrap);
    chars.push(inner);
  });

  return chars;
}

function getSplitTextRevealDuration(charCount) {
  const stagger = SPLIT_TEXT_SHOW.stagger.each;
  return SPLIT_TEXT_SHOW.duration + Math.max(0, charCount - 1) * stagger;
}

function collectNavBarTextElements(nav) {
  const elements = [
    ...nav.querySelectorAll('.nav-brand-main, .nav-brand-sub'),
  ];

  if (window.matchMedia('(min-width: 1025px)').matches) {
    const langSep = nav.querySelector('.nav-lang-sep');
    elements.push(...nav.querySelectorAll('.nav-links a'), ...nav.querySelectorAll('.nav-lang-btn'));
    if (langSep) elements.push(langSep);
  }

  return elements;
}

function initNavEntrance(nav) {
  const navBarGlass = nav.querySelector('.nav-bar-glass');
  const navBarPop = nav.querySelector('.nav-bar-pop');
  const menuToggle = nav.querySelector('.nav-menu-toggle');
  const navAction = nav.querySelector('.nav-action');
  const navActionLabel = nav.querySelector('.nav-action-label');
  const navActionIcon = nav.querySelector('.nav-action .btn-primary__icon');
  if (!navBarPop) return;

  const barChars = collectNavBarTextElements(nav).flatMap((el) => splitNavText(el));
  const actionChars = navActionLabel ? splitNavText(navActionLabel) : [];

  nav.querySelectorAll('.nav-mobile-bubble').forEach((bubble) => {
    bubble._navChars = splitNavText(bubble);
  });

  if (prefersReducedMotion()) {
    gsap.set([navBarGlass, navBarPop, menuToggle, navAction, navActionIcon, barChars, actionChars].filter(Boolean), {
      clearProps: 'all',
    });
    nav.querySelectorAll('.nav-mobile-bubble').forEach((bubble) => {
      if (bubble._navChars) gsap.set(bubble._navChars, { clearProps: 'all' });
    });
    return;
  }

  if (navBarGlass) navBarGlass.classList.add('is-entering');

  if (navBarGlass) {
    gsap.set(navBarGlass, {
      scale: 0.82,
      y: -32,
      transformOrigin: 'center top',
    });
  }

  if (menuToggle) gsap.set(menuToggle, { opacity: 0 });
  if (barChars.length) gsap.set(barChars, { yPercent: 110, opacity: 0 });
  if (actionChars.length) gsap.set(actionChars, { yPercent: 110, opacity: 0 });

  if (navAction) {
    navAction.classList.add('is-entering');
    gsap.set(navAction, {
      scale: 0.82,
      opacity: 0,
      transformOrigin: 'center center',
    });
  }

  if (navActionIcon) gsap.set(navActionIcon, { opacity: 0 });

  const mobileMenu = nav.querySelector('.nav-mobile-menu');
  if (mobileMenu) resetMobileNavBubbles(mobileMenu);

  const tl = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: () => {
      if (navBarGlass) {
        navBarGlass.classList.remove('is-entering');
        gsap.set(navBarGlass, { clearProps: 'transform' });
      }
      if (navAction) {
        navAction.classList.remove('is-entering');
        gsap.set(navAction, { clearProps: 'transform,opacity' });
      }
    },
  });

  const textRevealAt = 0.42;

  /* 1 — pop-up do shape glass (transform só na camada visual; clearProps restaura blur) */
  if (navBarGlass) {
    tl.to(
      navBarGlass,
      {
        scale: 1,
        y: 0,
        duration: 0.72,
        ease: 'back.out(1.7)',
      },
      0
    );
  }

  /* 2 — split text (logo, links, idioma) */
  if (barChars.length) {
    tl.to(barChars, splitTextShowOnScroll(), textRevealAt);
  }

  /* 3 — Começar: popup do shape + letras no mesmo timing */
  if (navAction) {
    tl.to(
      navAction,
      {
        scale: 1,
        opacity: 1,
        duration: 0.72,
        ease: 'back.out(1.7)',
      },
      textRevealAt
    );
  }

  if (actionChars.length) {
    tl.to(actionChars, splitTextShowOnScroll(), textRevealAt);
  }

  if (navActionIcon && actionChars.length) {
    tl.to(
      navActionIcon,
      {
        opacity: 1,
        duration: getSplitTextRevealDuration(actionChars.length) * 0.85,
        ease: 'power2.out',
      },
      textRevealAt + 0.06
    );
  }

  if (menuToggle) {
    tl.to(menuToggle, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.48);
  }
}

const MOBILE_BUBBLE_POP_STAGGER = 0.08;

function resetMobileNavBubbles(menu) {
  const bubbles = [...menu.querySelectorAll('.nav-mobile-bubble')];

  gsap.set(bubbles, {
    scale: 0.82,
    opacity: 0,
    transformOrigin: 'center center',
  });

  bubbles.forEach((bubble) => {
    if (bubble._navChars?.length) {
      gsap.set(bubble._navChars, { yPercent: 110, opacity: 0 });
    }
  });
}

function animateMobileNavBubbleChars(menu) {
  const bubbles = [...menu.querySelectorAll('.nav-mobile-bubble')];
  if (!bubbles.length) return;

  gsap.fromTo(
    bubbles,
    { scale: 0.82, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: 'back.out(1.75)',
      stagger: MOBILE_BUBBLE_POP_STAGGER,
    }
  );

  bubbles.forEach((bubble, index) => {
    const chars = bubble._navChars;
    if (!chars?.length) return;

    gsap.fromTo(
      chars,
      { yPercent: 110, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: SPLIT_TEXT_SHOW.duration,
        stagger: SPLIT_TEXT_SHOW.stagger,
        delay: index * MOBILE_BUBBLE_POP_STAGGER + 0.04 + SPLIT_TEXT_REVEAL_DELAY,
        ease: SPLIT_TEXT_SHOW.ease,
      }
    );
  });
}

function resetMobileNavBubbleChars(menu) {
  resetMobileNavBubbles(menu);
}

function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  ScrollTrigger.create(
    scrollTriggerConfig({
      start: 'top -40px',
      onEnter: () => nav.classList.add('scrolled'),
      onLeaveBack: () => nav.classList.remove('scrolled'),
    })
  );

  nav.querySelectorAll('.nav-lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.nav-lang-btn').forEach((b) => {
        b.classList.remove('is-active');
        b.removeAttribute('aria-current');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-current', 'true');
    });
  });

  initNavEntrance(nav);
  initMobileNavMenu(nav);
}

const MOBILE_MENU_FADE_MS = 480;

function finishMobileMenuClose(menu, backdrop, toggle) {
  menu.setAttribute('hidden', '');
  backdrop?.setAttribute('hidden', '');
  backdrop?.setAttribute('aria-hidden', 'true');
  menu.classList.remove('is-closing');
  backdrop?.classList.remove('is-closing');
}

function initMobileNavMenu(nav) {
  const toggle = document.getElementById('nav-menu-toggle');
  const menu = document.getElementById('nav-mobile-menu');
  const backdrop = document.getElementById('nav-mobile-backdrop');
  if (!toggle || !menu) return;

  const desktopMq = window.matchMedia('(min-width: 1025px)');
  let closeTimer;

  const closeMenu = () => {
    if (!menu.classList.contains('is-open')) return;

    clearTimeout(closeTimer);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu de navegacao');
    menu.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.documentElement.classList.remove('nav-menu-open');

    if (!prefersReducedMotion()) {
      resetMobileNavBubbleChars(menu);
    }

    if (prefersReducedMotion()) {
      finishMobileMenuClose(menu, backdrop, toggle);
      return;
    }

    menu.classList.add('is-closing');
    backdrop?.classList.add('is-closing');

    closeTimer = setTimeout(() => {
      finishMobileMenuClose(menu, backdrop, toggle);
    }, MOBILE_MENU_FADE_MS);
  };

  const openMenu = () => {
    clearTimeout(closeTimer);
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fechar menu de navegacao');
    menu.classList.remove('is-closing');
    backdrop?.classList.remove('is-closing');
    menu.removeAttribute('hidden');
    backdrop?.removeAttribute('hidden');
    backdrop?.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('nav-menu-open');

    if (prefersReducedMotion()) {
      menu.classList.add('is-open');
      backdrop?.classList.add('is-open');
      return;
    }

    resetMobileNavBubbles(menu);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        menu.classList.add('is-open');
        backdrop?.classList.add('is-open');
        animateMobileNavBubbleChars(menu);
      });
    });
  };

  const isDesktop = () => desktopMq.matches;

  toggle.addEventListener('click', () => {
    if (isDesktop()) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeMenu();
    else openMenu();
  });

  menu.querySelectorAll('.nav-mobile-bubble').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  backdrop?.addEventListener('click', () => {
    if (!isDesktop() && menu.classList.contains('is-open')) closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (isDesktop() || !menu.classList.contains('is-open')) return;
    if (nav.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });

  desktopMq.addEventListener('change', () => {
    if (isDesktop()) closeMenu();
  });
}

/* ─────────────────────────────────────────────
   4. GSAP HERO ENTRANCE
   ───────────────────────────────────────────── */
const HERO_ENTRANCE_TARGETS = [
  '#hero-eyebrow',
  '#hero-h1',
  '#hero-ctas',
  '#scroll-indicator',
];

function setHeroHidden() {
  gsap.set(HERO_ENTRANCE_TARGETS, { opacity: 0, y: 32 });
}

function hideHeroEntrance() {
  if (prefersReducedMotion()) {
    setHeroHidden();
    return;
  }

  gsap.killTweensOf(HERO_ENTRANCE_TARGETS);
  gsap.to(HERO_ENTRANCE_TARGETS, {
    opacity: 0,
    y: 28,
    duration: REVEAL_HIDE.duration,
    ease: REVEAL_HIDE.ease,
    stagger: { each: 0.07, from: 'end' },
    overwrite: 'auto',
  });
}

function restoreHeroEntrance() {
  if (prefersReducedMotion()) {
    showHeroContentImmediate();
    return;
  }

  gsap.killTweensOf(HERO_ENTRANCE_TARGETS);
  gsap.to(HERO_ENTRANCE_TARGETS, {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: 'power3.out',
    stagger: { each: 0.06, from: 'start' },
    overwrite: 'auto',
    onComplete: showHeroContentImmediate,
  });
}

let heroEntranceHasPlayed = false;

function playHeroEntrance() {
  if (prefersReducedMotion()) {
    showHeroContentImmediate();
    return;
  }

  if (heroEntranceHasPlayed) {
    restoreHeroEntrance();
    return;
  }

  heroEntranceHasPlayed = true;
  gsap.killTweensOf(HERO_ENTRANCE_TARGETS);
  setHeroHidden();

  const tl = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: showHeroContentImmediate,
  });

  tl.to('#hero-eyebrow', { opacity: 1, y: 0, duration: 1, delay: 0.3 }, 0)
    .to('#hero-h1', { opacity: 1, y: 0, duration: 1.2 }, 0.5)
    .to('#hero-ctas', { opacity: 1, y: 0, duration: 0.9 }, 0.9)
    .to('#scroll-indicator', { opacity: 1, y: 0, duration: 0.8 }, 1.3);
}

function initHeroEntrance() {
  if (prefersReducedMotion()) {
    showHeroContentImmediate();
    return;
  }

  const hero = document.getElementById('hero');
  if (!hero) return;

  const heroReveal = registerScrollReveal(hero, {
    setHidden: setHeroHidden,
    animateShow: playHeroEntrance,
    animateHide: hideHeroEntrance,
  });

  playHeroEntrance();
  heroReveal.revealed = true;
}

/* ─────────────────────────────────────────────
   5. GSAP SCROLL REVEALS
   ───────────────────────────────────────────── */
const REVEAL_FADE_HIDDEN = { opacity: 0, y: 12 };
const REVEAL_UP_HIDDEN = { opacity: 0, y: 36 };
const REVEAL_LEFT_HIDDEN = { opacity: 0, x: -36 };
const REVEAL_RIGHT_HIDDEN = { opacity: 0, x: 36 };
const MANIFESTO_WORD_HIDDEN = SPLIT_TEXT_HIDDEN;

function showAllScrollRevealsImmediate() {
  gsap.set('.reveal-up, .reveal-fade, .reveal-left, .reveal-right', {
    opacity: 1,
    x: 0,
    y: 0,
    clearProps: 'transform',
  });
  gsap.set('.word-wrap .word', {
    yPercent: 0,
    opacity: 1,
    clearProps: 'transform',
  });
  gsap.set('.app-feature-card', {
    opacity: 1,
    y: 0,
    clearProps: 'transform',
  });
}

function registerSectionScrollReveal(section, { setHidden, animateShow, animateHide }) {
  if (!section) return;
  registerScrollReveal(
    section,
    { setHidden, animateShow, animateHide },
    { observeReveal: true }
  );
}

function registerStandardSectionReveal(section) {
  if (!section) return;

  const fades = section.querySelectorAll('.reveal-fade');
  const ups = section.querySelectorAll('.reveal-up');
  const lefts = section.querySelectorAll('.reveal-left');
  const rights = section.querySelectorAll('.reveal-right');

  registerSectionScrollReveal(section, {
    setHidden: () => {
      if (fades.length) gsap.set(fades, REVEAL_FADE_HIDDEN);
      if (ups.length) gsap.set(ups, REVEAL_UP_HIDDEN);
      if (lefts.length) gsap.set(lefts, REVEAL_LEFT_HIDDEN);
      if (rights.length) gsap.set(rights, REVEAL_RIGHT_HIDDEN);
    },
    animateShow: () => {
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
      let at = 0;

      if (fades.length) {
        tl.to(
          fades,
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.05,
          },
          at
        );
        at += 0.08;
      }

      if (ups.length) {
        tl.to(
          ups,
          {
            opacity: 1,
            y: 0,
            ...REVEAL_SHOW,
            stagger: 0.1,
          },
          at
        );
      }

      if (lefts.length) {
        tl.to(lefts, { opacity: 1, x: 0, ...REVEAL_SHOW, stagger: 0.1 }, at);
      }

      if (rights.length) {
        tl.to(rights, { opacity: 1, x: 0, ...REVEAL_SHOW, stagger: 0.1 }, at);
      }
    },
    animateHide: () => {
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      if (ups.length) {
        tl.to(ups, { ...REVEAL_UP_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0);
      }
      if (lefts.length) {
        tl.to(lefts, { ...REVEAL_LEFT_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0);
      }
      if (rights.length) {
        tl.to(rights, { ...REVEAL_RIGHT_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0);
      }
      if (fades.length) {
        tl.to(fades, { ...REVEAL_FADE_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0.08);
      }
    },
  });
}

function getManifestoRevealTargets() {
  const section = document.getElementById('manifesto');
  if (!section) {
    return null;
  }

  const fades = section.querySelectorAll('.reveal-fade');
  const words = section.querySelectorAll('.manifesto-headline .word');

  if (!fades.length && !words.length) {
    return null;
  }

  return { section, fades, words };
}

function setManifestoRevealHidden() {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  const { fades, words } = targets;
  if (fades.length) gsap.set(fades, REVEAL_FADE_HIDDEN);
  if (words.length) gsap.set(words, MANIFESTO_WORD_HIDDEN);
}

function showManifestoRevealImmediate() {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  const { fades, words } = targets;
  gsap.set(fades, { opacity: 1, y: 0, clearProps: 'transform' });
  gsap.set(words, { yPercent: 0, opacity: 1, clearProps: 'transform' });
}

let manifestoTextRevealed = false;
let manifestoShowTimer = null;
let manifestoRevealHandlers = null;

function isManifestoSectionInView(section) {
  if (!section) return false;

  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;

  return rect.top < vh * 0.85 && rect.bottom > vh * 0.1;
}

function evaluateManifestoViewportReveal() {
  if (manifestoTextRevealed || !manifestoRevealHandlers || prefersReducedMotion()) return;

  const targets = getManifestoRevealTargets();
  if (!targets || !isManifestoSectionInView(targets.section)) return;

  const trigger = ScrollTrigger.getById('manifesto-section-reveal');
  if (trigger?.isActive || isManifestoSectionInView(targets.section)) {
    manifestoRevealHandlers.cancelScheduledShow();
    manifestoRevealHandlers.animateShow(1);
  }
}

function createManifestoRevealAnimations(targets) {
  const { section, fades, words } = targets;

  const killTweens = () => {
    if (fades.length || words.length) {
      gsap.killTweensOf([...fades, ...words]);
    }
  };

  const cancelScheduledShow = () => {
    if (manifestoShowTimer) {
      clearTimeout(manifestoShowTimer);
      manifestoShowTimer = null;
    }
  };

  const resetForReentry = () => {
    cancelScheduledShow();
    manifestoTextRevealed = false;
    killTweens();
    setManifestoRevealHidden();
  };

  const animateShow = (direction = 1) => {
    if (manifestoTextRevealed) return;
    manifestoTextRevealed = true;
    cancelScheduledShow();
    killTweens();

    if (fades.length) gsap.set(fades, REVEAL_FADE_HIDDEN);
    if (words.length) gsap.set(words, MANIFESTO_WORD_HIDDEN);

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

    if (fades.length) {
      tl.to(
        fades,
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'power2.out',
          stagger: 0.05,
        },
        0
      );
    }

    if (words.length) {
      tl.to(
        words,
        splitTextShowOnScroll({
          delay: MANIFESTO_SPLIT_TEXT_DELAY,
          stagger: getManifestoSplitStagger(direction, 'show'),
        }),
        fades.length ? MANIFESTO_SPLIT_TEXT_DELAY : 0
      );
    }
  };

  const scheduleShow = (direction = 1, delaySec = MANIFESTO_ENTER_BACK_DELAY) => {
    cancelScheduledShow();

    const tryShow = (attempt = 0) => {
      manifestoShowTimer = null;
      if (manifestoTextRevealed) return;

      if (!isManifestoSectionInView(section) && attempt < 10) {
        manifestoShowTimer = setTimeout(() => tryShow(attempt + 1), 120);
        return;
      }

      killTweens();
      setManifestoRevealHidden();
      manifestoTextRevealed = false;
      animateShow(direction);
    };

    manifestoShowTimer = setTimeout(() => tryShow(0), Math.max(0, delaySec * 1000));
  };

  const animateHide = (direction = -1) => {
    if (!manifestoTextRevealed) return;
    manifestoTextRevealed = false;
    cancelScheduledShow();
    killTweens();

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => setManifestoRevealHidden(),
    });

    if (words.length) {
      tl.to(
        words,
        splitTextHideOnScroll({
          stagger: getManifestoSplitStagger(direction, 'hide'),
        }),
        0
      );
    }

    if (fades.length) {
      tl.to(fades, { ...REVEAL_FADE_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0.08);
    }
  };

  return { animateShow, animateHide, scheduleShow, resetForReentry, cancelScheduledShow, killTweens };
}

function registerManifestoSectionScrollReveal(handlers, { viewportReveal = true } = {}) {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  const config = {
    id: 'manifesto-section-reveal',
    trigger: targets.section,
    start: MANIFESTO_VIEWPORT_REVEAL_START,
    end: 'bottom top',
    onLeaveBack: (self) => handlers.animateHide(self.direction),
  };

  if (viewportReveal) {
    config.onEnter = (self) => {
      handlers.cancelScheduledShow();
      handlers.animateShow(self.direction);
    };
    config.onEnterBack = (self) => {
      handlers.cancelScheduledShow();
      if (manifestoTextRevealed) return;
      handlers.scheduleShow(self.direction, MANIFESTO_ENTER_BACK_DELAY);
    };
  }

  ScrollTrigger.create(scrollTriggerConfig(config));
}

function killManifestoRevealScrolls() {
  if (typeof ScrollTrigger === 'undefined') return;

  if (manifestoShowTimer) {
    clearTimeout(manifestoShowTimer);
    manifestoShowTimer = null;
  }

  ScrollTrigger.getById('manifesto-section-reveal')?.kill();
  ScrollTrigger.getById('manifesto-overlap-text')?.kill();
  manifestoTextRevealed = false;
  manifestoRevealHandlers = null;
  setManifestoRevealHidden();
}

function manifestoOverlapPhaseRange(phase) {
  return {
    start: `top+=${phase.startPx} top`,
    end: `+=${phase.lengthPx}`,
  };
}

/** @deprecated Manifesto usa reveal por viewport; mantido por compatibilidade. */
function initManifestoOverlapRevealScroll() {
  registerManifestoViewportReveal();
}

function registerManifestoViewportReveal() {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  killManifestoRevealScrolls();
  setManifestoRevealHidden();

  manifestoRevealHandlers = createManifestoRevealAnimations(targets);
  registerManifestoSectionScrollReveal(manifestoRevealHandlers, { viewportReveal: true });

  if (!window.__manifestoRevealRefreshBound) {
    window.__manifestoRevealRefreshBound = true;
    ScrollTrigger.addEventListener('refresh', () => {
      requestAnimationFrame(evaluateManifestoViewportReveal);
    });
  }

  ScrollTrigger.refresh();

  requestAnimationFrame(() => {
    evaluateManifestoViewportReveal();
  });
}

function registerManifestoSectionReveal() {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  if (prefersReducedMotion()) {
    showManifestoRevealImmediate();
    return;
  }

  registerManifestoViewportReveal();
}

window.initManifestoOverlapRevealScroll = initManifestoOverlapRevealScroll;
window.killManifestoRevealScrolls = killManifestoRevealScrolls;
window.setManifestoRevealHidden = setManifestoRevealHidden;
window.registerManifestoViewportReveal = registerManifestoViewportReveal;

function registerAppSectionReveal(section) {
  if (!section) return;

  const eyebrow = section.querySelector('.section-eyebrow');
  const title = section.querySelector('.app-section-title');
  const sub = section.querySelector('.app-section-sub');
  const cta = section.querySelector('.app-text-col .btn-primary');
  const cards = section.querySelectorAll('.app-feature-card');
  const words = section.querySelectorAll('.app-feature-card .word');

  registerSectionScrollReveal(section, {
    setHidden: () => {
      if (eyebrow) gsap.set(eyebrow, REVEAL_FADE_HIDDEN);
      if (title) gsap.set(title, REVEAL_UP_HIDDEN);
      if (sub) gsap.set(sub, REVEAL_FADE_HIDDEN);
      if (cta) gsap.set(cta, REVEAL_FADE_HIDDEN);
      if (cards.length) gsap.set(cards, { opacity: 0, y: 18 });
      if (words.length) gsap.set(words, SPLIT_TEXT_HIDDEN);
    },
    animateShow: () => {
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      if (eyebrow) {
        tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
      }

      if (title) {
        tl.to(title, { opacity: 1, y: 0, ...REVEAL_SHOW }, 0.08);
      }

      if (sub) {
        tl.to(sub, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.16);
      }

      if (cards.length) {
        tl.to(
          cards,
          {
            opacity: 1,
            y: 0,
            duration: 0.48,
            ease: 'power2.out',
            stagger: { each: 0.05, from: 'start' },
          },
          0.22
        );
      }

      if (words.length) {
        tl.to(
          words,
          splitTextShowOnScroll({
            stagger: { each: SPLIT_TEXT_SHOW.stagger.each, from: 'start' },
          }),
          0.3
        );
      }

      if (cta) {
        tl.to(cta, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.52);
      }
    },
    animateHide: () => {
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      if (words.length) {
        tl.to(
          words,
          splitTextHideOnScroll({ stagger: { each: SPLIT_TEXT_SHOW.stagger.each, from: 'end' } }),
          0
        );
      }

      if (cards.length) {
        tl.to(cards, { opacity: 0, y: 18, duration: 0.35, ease: 'power2.inOut', stagger: 0.03 }, 0.04);
      }

      if (cta) {
        tl.to(cta, { ...REVEAL_FADE_HIDDEN, duration: 0.35, ease: 'power2.inOut' }, 0.06);
      }

      if (sub) {
        tl.to(sub, { ...REVEAL_FADE_HIDDEN, duration: 0.35, ease: 'power2.inOut' }, 0.08);
      }

      if (title) {
        tl.to(title, { ...REVEAL_UP_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0.1);
      }

      if (eyebrow) {
        tl.to(eyebrow, { ...REVEAL_FADE_HIDDEN, duration: 0.35, ease: 'power2.inOut' }, 0.12);
      }
    },
  });
}

function registerFeedbacksSectionReveal(section) {
  if (!section) return;

  const eyebrow = section.querySelector('.section-eyebrow');
  const words = section.querySelectorAll('.word-wrap .word');
  const sub = section.querySelector('.feedbacks-sub');
  const swapWrap = section.querySelector('.feedbacks-swap-wrap');

  registerSectionScrollReveal(section, {
    setHidden: () => {
      if (eyebrow) gsap.set(eyebrow, REVEAL_FADE_HIDDEN);
      if (words.length) gsap.set(words, SPLIT_TEXT_HIDDEN);
      if (sub) gsap.set(sub, REVEAL_FADE_HIDDEN);
      if (swapWrap) gsap.set(swapWrap, { opacity: 0 });
    },
    animateShow: () => {
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      if (eyebrow) {
        tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
      }

      if (words.length) {
        tl.to(
          words,
          splitTextShowOnScroll({ stagger: { each: SPLIT_TEXT_SHOW.stagger.each, from: 'start' } }),
          0.1
        );
      }

      if (sub) {
        tl.to(sub, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.4);
      }

      if (swapWrap) {
        tl.to(swapWrap, { opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.28);
      }
    },
    animateHide: () => {
      /* Instant hide — animateHide dispara enquanto hero-video já está scrubando;
         qualquer tween GSAP aqui concorre com a leitura de video.currentTime. */
      gsap.killTweensOf([eyebrow, ...words, sub, swapWrap].filter(Boolean));
      if (eyebrow) gsap.set(eyebrow, REVEAL_FADE_HIDDEN);
      if (words.length) gsap.set(words, SPLIT_TEXT_HIDDEN);
      if (sub) gsap.set(sub, REVEAL_FADE_HIDDEN);
      if (swapWrap) gsap.set(swapWrap, { opacity: 0 });
    },
  });
}

function initScrollReveals() {
  if (prefersReducedMotion()) {
    showAllScrollRevealsImmediate();
    return;
  }

  registerStandardSectionReveal(document.getElementById('transformacao'));
  registerAppSectionReveal(document.getElementById('app'));
  registerFeedbacksSectionReveal(document.getElementById('feedbacks'));
  registerStandardSectionReveal(document.getElementById('cta'));
}

/* ─────────────────────────────────────────────
   6. 3D CARD TILT — desktop only
   ───────────────────────────────────────────── */
function init3DCards() {
  if (isTouchDevice() || prefersReducedMotion()) return;

  document.querySelectorAll('[data-3d]').forEach((card) => {
    const max = parseFloat(card.dataset.tiltMax) || 8;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotX = -dy * max;
      const rotY = dx * max;

      gsap.to(card, {
        rotateX: rotX,
        rotateY: rotY,
        transformPerspective: 900,
        duration: 0.4,
        ease: 'power2.out',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.4)',
      });
    });
  });
}

/* ─────────────────────────────────────────────
   7. Scroll / resize sync (mobile + Lenis + ST)
   ───────────────────────────────────────────── */
function initScrollSync() {
  let resizeTimer;

  const refreshAll = () => {
    if (lenis) lenis.resize();
    ScrollTrigger.refresh();
  };

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshAll, 200);
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(refreshAll, 350);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refreshAll, 150);
    });
  }
}

function initMarqueeStrip() {
  const strip = document.querySelector('.marquee-strip--divider');
  const track = strip?.querySelector('.marquee-track');
  if (!strip || !track) return;

  const compute = () => {
    const total = track.scrollWidth;
    if (!total || !Number.isFinite(total)) return;
    const shift = Math.floor(total / 2);
    strip.style.setProperty('--marquee-shift', `${shift}px`);
  };

  compute();
  window.addEventListener('resize', () => requestAnimationFrame(compute));
}

/* ─────────────────────────────────────────────
   8. INIT
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.config({
    ignoreMobileResize: true,
  });

  initLenis();

  if (!lenis && shouldNormalizeScroll() && typeof ScrollTrigger.normalizeScroll === 'function') {
    ScrollTrigger.normalizeScroll(true);
  }
  initScrollSync();
  initMarqueeStrip();
  initCursor();
  initNav();

  if (typeof window.initHeaderGradualBlur === 'function') {
    window.initHeaderGradualBlur();
  }

  initHeroEntrance();
  init3DCards();

  if (typeof window.initHeroScrollVideo === 'function') {
    window.initHeroScrollVideo();
  }

  if (typeof window.initHeroBlueprintGridParallax === 'function') {
    window.initHeroBlueprintGridParallax();
  }

  if (typeof window.initWomanModelsStage === 'function') {
    try {
      window.initWomanModelsStage();
    } catch (err) {
      console.error('[Benini Squad] Falha ao iniciar modelos femininos 3D:', err);
    }
  }

  initScrollReveals();
  initScrollRevealEngine();

  if (typeof window.initMetodologiaScrollStack === 'function') {
    window.initMetodologiaScrollStack();
  }

  registerManifestoSectionReveal();
  ScrollTrigger.refresh();
  requestAnimationFrame(evaluateManifestoViewportReveal);
});

