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
    duration: isTouchDevice() ? 1.15 : 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: true,
    touchMultiplier: 1.15,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
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
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    gsap.set(ring, { x: rx, y: ry });
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
  const navActionLabel = nav.querySelector('.nav-action-label');
  const navActionRingPath = nav.querySelector('.nav-action-ring-path');
  if (!navBarPop) return;

  const barChars = collectNavBarTextElements(nav).flatMap((el) => splitNavText(el));
  const actionChars = navActionLabel ? splitNavText(navActionLabel) : [];

  nav.querySelectorAll('.nav-mobile-bubble').forEach((bubble) => {
    bubble._navChars = splitNavText(bubble);
  });

  if (prefersReducedMotion()) {
    gsap.set([navBarGlass, navBarPop, menuToggle, barChars, actionChars].filter(Boolean), {
      clearProps: 'all',
    });
    if (navActionRingPath) gsap.set(navActionRingPath, { clearProps: 'all' });
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

  if (navActionRingPath) {
    gsap.set(navActionRingPath, {
      strokeDasharray: 1,
      strokeDashoffset: 1,
    });
  }

  const mobileMenu = nav.querySelector('.nav-mobile-menu');
  if (mobileMenu) resetMobileNavBubbles(mobileMenu);

  const tl = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: () => {
      if (navBarGlass) {
        navBarGlass.classList.remove('is-entering');
        gsap.set(navBarGlass, { clearProps: 'transform' });
      }
      if (navActionRingPath) {
        gsap.set(navActionRingPath, { clearProps: 'strokeDasharray,strokeDashoffset' });
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

  /* 3 — Começar: letras + contorno desenhando no mesmo timing */
  if (actionChars.length) {
    tl.to(actionChars, splitTextShowOnScroll(), textRevealAt);
  }

  if (navActionRingPath && actionChars.length) {
    tl.to(
      navActionRingPath,
      {
        strokeDashoffset: 0,
        duration: getSplitTextRevealDuration(actionChars.length),
        ease: SPLIT_TEXT_SHOW.ease,
      },
      textRevealAt
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
    toggle.setAttribute('aria-label', 'Abrir menu de navegação');
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
    toggle.setAttribute('aria-label', 'Fechar menu de navegação');
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
  gsap.set('.manifesto-headline .word', {
    yPercent: 0,
    opacity: 1,
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

function killManifestoRevealScrolls() {
  if (typeof ScrollTrigger === 'undefined') return;

  ScrollTrigger.getById('manifesto-section-reveal')?.kill();
  ScrollTrigger.getById('manifesto-overlap-text')?.kill();
  setManifestoRevealHidden();
}

function manifestoOverlapPhaseRange(phase) {
  return {
    start: `top+=${phase.startPx} top`,
    end: `+=${phase.lengthPx}`,
  };
}

/** Split text e fades sincronizados ao scroll do overlap (manifesto sobe sobre o vídeo). */
function initManifestoOverlapRevealScroll(trigger, phases, scrub) {
  const targets = getManifestoRevealTargets();
  if (!targets || !phases?.overlap?.lengthPx) {
    return;
  }

  killManifestoRevealScrolls();

  if (prefersReducedMotion()) {
    showManifestoRevealImmediate();
    return;
  }

  const { fades, words } = targets;
  setManifestoRevealHidden();

  const tl = gsap.timeline({
    scrollTrigger: scrollTriggerConfig({
      id: 'manifesto-overlap-text',
      trigger,
      ...manifestoOverlapPhaseRange(phases.overlap),
      scrub: scrub ?? 1.5,
    }),
  });

  if (fades.length) {
    tl.fromTo(
      fades,
      REVEAL_FADE_HIDDEN,
      {
        opacity: 1,
        y: 0,
        ease: 'none',
        duration: 0.12,
        stagger: { each: 0.03, from: 'start' },
      },
      MANIFESTO_OVERLAP_TEXT_START
    );
  }

  if (words.length) {
    const wordsAt = MANIFESTO_OVERLAP_TEXT_START + MANIFESTO_SPLIT_TEXT_DELAY;

    tl.fromTo(
      words,
      MANIFESTO_WORD_HIDDEN,
      {
        yPercent: 0,
        opacity: 1,
        ease: 'none',
        duration: 0.48,
        stagger: { each: MANIFESTO_SPLIT_TEXT_STAGGER, from: 'start' },
      },
      wordsAt
    );
  }
}

function registerManifestoViewportReveal() {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  const { section, fades, words } = targets;

  const animateShow = () => {
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
        MANIFESTO_SPLIT_TEXT_DELAY
      );
    }

    if (words.length) {
      tl.to(
        words,
        splitTextShowOnScroll({
          delay: MANIFESTO_SPLIT_TEXT_DELAY,
          stagger: { each: MANIFESTO_SPLIT_TEXT_STAGGER, from: 'start' },
        }),
        fades.length ? MANIFESTO_SPLIT_TEXT_DELAY + 0.13 : MANIFESTO_SPLIT_TEXT_DELAY
      );
    }
  };

  const animateHide = () => {
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

    if (words.length) {
      tl.to(words, { ...SPLIT_TEXT_HIDE }, 0);
    }

    if (fades.length) {
      tl.to(fades, { ...REVEAL_FADE_HIDDEN, ...REVEAL_HIDE, stagger: 0.06 }, 0.08);
    }
  };

  let revealed = false;

  ScrollTrigger.create(
    scrollTriggerConfig({
      id: 'manifesto-section-reveal',
      trigger: section,
      start: MANIFESTO_VIEWPORT_REVEAL_START,
      end: 'bottom top',
      onEnter: () => {
        if (revealed) return;
        revealed = true;
        animateShow();
      },
      onLeaveBack: () => {
        if (!revealed) return;
        revealed = false;
        animateHide();
      },
    })
  );
}

function registerManifestoSectionReveal() {
  const targets = getManifestoRevealTargets();
  if (!targets) return;

  if (prefersReducedMotion()) {
    showManifestoRevealImmediate();
    return;
  }

  setManifestoRevealHidden();

  if (!window.__heroVideoScrollMetrics?.overlapScroll) {
    registerManifestoViewportReveal();
  }
}

window.initManifestoOverlapRevealScroll = initManifestoOverlapRevealScroll;
window.killManifestoRevealScrolls = killManifestoRevealScrolls;
window.setManifestoRevealHidden = setManifestoRevealHidden;
window.registerManifestoViewportReveal = registerManifestoViewportReveal;

function initScrollReveals() {
  if (prefersReducedMotion()) {
    showAllScrollRevealsImmediate();
    return;
  }

  registerManifestoSectionReveal();
  registerStandardSectionReveal(document.getElementById('metodologia'));
  registerStandardSectionReveal(document.getElementById('transformacao'));
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

/* ─────────────────────────────────────────────
   8. INIT
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.config({
    ignoreMobileResize: true,
  });

  if (shouldNormalizeScroll() && typeof ScrollTrigger.normalizeScroll === 'function') {
    ScrollTrigger.normalizeScroll(true);
  }

  initLenis();
  initScrollSync();
  initCursor();
  initNav();
  initHeroEntrance();
  init3DCards();

  if (typeof window.initHeroScrollVideo === 'function') {
    window.initHeroScrollVideo();
  }

  if (typeof window.initHeroBlueprintGridParallax === 'function') {
    window.initHeroBlueprintGridParallax();
  }

  if (typeof window.initDumbbellOrbit === 'function') {
    try {
      window.initDumbbellOrbit();
    } catch (err) {
      console.error('[Benini Squad] Falha ao iniciar dumbbell 3D:', err);
    }
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

  ScrollTrigger.refresh();

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });
});
