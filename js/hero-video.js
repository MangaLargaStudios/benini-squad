'use strict';

const BENINI_REVEAL_LEAD_SEC = 2;
const BENINI_HOLD_SCROLL_VH = { mobile: 0.85, desktop: 1.15 };
const HERO_ASIDE_TEXT_HOLD_VH = { mobile: 0.55, desktop: 0.72 };
const HERO_OVERLAP_SCROLL_VH = { mobile: 1, desktop: 1 };
const KEYHOLE_PIN_DELAY_RATIO = 0.22;
const KEYHOLE_SCALE_RATIO = 0.58;
const KEYHOLE_FADE_RATIO = 0.2;
const KEYHOLE_SILHOUETTE_ASPECT = 304 / 166;
const KEYHOLE_MASK_END_BLEED = 1.12;
const KEYHOLE_SCROLL_RATIO = { mobile: 0.2, desktop: 0.24 };
const BENINI_BLUR_MAX = { mobile: 5, desktop: 9 };

const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;

function heroVideoReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function heroScrollTriggerConfig(overrides = {}) {
  const config = {
    invalidateOnRefresh: true,
    ...overrides,
  };

  if (window.beniniUsesLenisScroller) {
    config.scroller = document.body;
  }

  return config;
}

function updateVideoCoverScale(video) {
  if (!video) return;

  video.style.removeProperty('width');
  video.style.removeProperty('height');
  video.style.removeProperty('--hero-video-scale');
}

function getBeniniHoldScroll() {
  const vh = window.innerHeight;
  const mult = isMobileViewport() ? BENINI_HOLD_SCROLL_VH.mobile : BENINI_HOLD_SCROLL_VH.desktop;
  return Math.round(vh * mult);
}

function getHeroAsideTextHoldScroll() {
  const vh = window.innerHeight;
  const mult = isMobileViewport() ? HERO_ASIDE_TEXT_HOLD_VH.mobile : HERO_ASIDE_TEXT_HOLD_VH.desktop;
  return Math.round(vh * mult);
}

function getHeroAnimationHoldScroll() {
  return getBeniniHoldScroll() + getHeroAsideTextHoldScroll();
}

function getHeroOverlapScroll() {
  const vh = window.innerHeight;
  const mult = isMobileViewport() ? HERO_OVERLAP_SCROLL_VH.mobile : HERO_OVERLAP_SCROLL_VH.desktop;
  return Math.round(vh * mult);
}

function getVideoScrollDistance(duration) {
  const vh = window.innerHeight;
  const animationHold = getHeroAnimationHoldScroll();
  const overlapScroll = getHeroOverlapScroll();

  if (isMobileViewport()) {
    return Math.max(vh * 1.75, Math.round(vh * (1 + duration * 0.32))) + animationHold + overlapScroll;
  }

  return Math.max(vh * 2, Math.round(vh * (1.25 + duration * 0.4))) + animationHold + overlapScroll;
}

function getMainScrollRatio(scrollDistance, animationHold, overlapScroll) {
  const pinnedTail = animationHold + overlapScroll;
  return Math.max(0.01, (scrollDistance - pinnedTail) / scrollDistance);
}

/** Vídeo percorre 0 → fim na parte principal do scroll; hold mantém último frame */
function mapScrollProgressToTime(progress, duration, mainRatio) {
  const endTime = Math.max(0.001, duration - 0.05);

  if (progress <= mainRatio) {
    return (progress / mainRatio) * endTime;
  }

  return endTime;
}

/** Fade da Benini começa 2s antes do fim do vídeo */
function getBeniniRevealFromTime(time, duration) {
  const lead = BENINI_REVEAL_LEAD_SEC;
  const start = Math.max(0, duration - lead);

  if (time <= start) return 0;

  return smoothstep(Math.min(1, (time - start) / lead));
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function setVideoBackdropFx(pin, eased) {
  if (!pin) return;

  const blurMax = isMobileViewport() ? BENINI_BLUR_MAX.mobile : BENINI_BLUR_MAX.desktop;

  const video = pin.querySelector('.hero-visual-video');
  if (video) {
    video.style.willChange = eased > 0.02 ? 'filter' : 'auto';
  }

  pin.style.setProperty('--hero-video-blur', String(eased * blurMax));
  pin.style.setProperty('--hero-video-brightness', String(1 - eased * 0.1));
  pin.style.setProperty('--hero-video-saturate', String(1 - eased * 0.04));
}

let lastBeniniRevealEased = -1;

function updateBeniniReveal(videoTime, duration, pin, beniniWrap, beniniImg) {
  if (!beniniWrap || !beniniImg) return;

  const eased = getBeniniRevealFromTime(videoTime, duration);

  if (
    lastBeniniRevealEased >= 0 &&
    Math.abs(eased - lastBeniniRevealEased) < 0.012 &&
    eased > 0.01 &&
    eased < 0.99
  ) {
    return;
  }
  lastBeniniRevealEased = eased;

  if (heroVideoReducedMotion()) {
    const on = eased > 0.5;
    beniniWrap.style.opacity = on ? '1' : '0';
    beniniImg.style.opacity = on ? '1' : '0';
    beniniImg.style.transform = 'scale(1) translateY(0)';
    pin.classList.toggle('is-benini-reveal', on);
    setVideoBackdropFx(pin, on ? 1 : 0);
    if (typeof window.updateHeroDumbbell === 'function') {
      window.updateHeroDumbbell(on ? 1 : 0);
    }
    return;
  }

  pin.classList.toggle('is-benini-reveal', eased > 0.02);
  setVideoBackdropFx(pin, eased);

  gsap.set(beniniWrap, { opacity: eased });

  const scale = 0.78 + eased * 0.22;
  const y = (1 - eased) * (isMobileViewport() ? 56 : 72);

  gsap.set(beniniImg, {
    opacity: eased,
    scale,
    y,
    transformOrigin: 'center bottom',
  });
}

function killHeroKeyholeReveal() {
  if (typeof ScrollTrigger === 'undefined') return;

  ScrollTrigger.getById('hero-keyhole-reveal')?.kill();

  const keyhole = document.getElementById('hero-visual-keyhole');
  if (keyhole && typeof gsap !== 'undefined') {
    gsap.killTweensOf(keyhole);
  }
}

function getKeyholeScrollDistance(scrollDistance) {
  const vh = window.innerHeight;
  const mobile = isMobileViewport();
  const ratio = mobile ? KEYHOLE_SCROLL_RATIO.mobile : KEYHOLE_SCROLL_RATIO.desktop;
  const vhCap = Math.round(vh * (mobile ? 0.52 : 0.62));

  if (scrollDistance) {
    return Math.max(Math.round(vh * 0.28), Math.min(Math.round(scrollDistance * ratio), vhCap));
  }

  return vhCap;
}

function parseKeyholeMaskVmin(vminValue) {
  const match = /^([\d.]+)vmin$/.exec(String(vminValue).trim());
  if (!match) return 0;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return (parseFloat(match[1]) / 100) * minDim;
}

/** Altura da silhueta (px) para cobrir 100% do container. */
function getKeyholeMaskEndPx(pin) {
  const el = pin || document.getElementById('hero-visual');
  const w = el?.clientWidth || window.innerWidth;
  const h = el?.clientHeight || window.innerHeight;
  const heightForWidth = w / KEYHOLE_SILHOUETTE_ASPECT;

  return Math.ceil(Math.max(h, heightForWidth) * KEYHOLE_MASK_END_BLEED);
}

function getKeyholeMaskMetrics(pin) {
  const mobile = isMobileViewport();
  const maskStartPx = parseKeyholeMaskVmin(mobile ? '40vmin' : '48vmin');
  const maskEndPx = getKeyholeMaskEndPx(pin);

  return {
    maskStartPx,
    maskEndPx: Math.max(maskEndPx, maskStartPx + 1),
  };
}

function applyHeroKeyholeScrollState(keyhole, progress, metrics) {
  const { maskStartPx, maskEndPx } = metrics;
  const activeSpan = 1 - KEYHOLE_PIN_DELAY_RATIO;

  if (progress <= KEYHOLE_PIN_DELAY_RATIO) {
    keyhole.classList.add('is-keyhole-scaling');
    keyhole.style.setProperty('--keyhole-mask-size', `${maskStartPx}px`);
    keyhole.style.opacity = '1';
    return;
  }

  const activeProgress = (progress - KEYHOLE_PIN_DELAY_RATIO) / activeSpan;
  const scaleSpan = KEYHOLE_SCALE_RATIO / (KEYHOLE_SCALE_RATIO + KEYHOLE_FADE_RATIO);

  if (activeProgress <= scaleSpan) {
    keyhole.classList.add('is-keyhole-scaling');
    const scaleT = activeProgress / scaleSpan;
    const maskPx = maskStartPx + (maskEndPx - maskStartPx) * scaleT;
    keyhole.style.setProperty('--keyhole-mask-size', `${maskPx}px`);
    keyhole.style.opacity = '1';
    return;
  }

  keyhole.classList.remove('is-keyhole-scaling');
  keyhole.style.setProperty('--keyhole-mask-size', `${maskEndPx}px`);
  const fadeT = Math.min(1, (activeProgress - scaleSpan) / (1 - scaleSpan));
  keyhole.style.opacity = String(1 - fadeT);
}

function initHeroKeyholeReveal(wrap, scrollDistance) {
  const keyhole = document.getElementById('hero-visual-keyhole');
  const pin = document.getElementById('hero-visual');
  if (!keyhole || !wrap || !pin || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  killHeroKeyholeReveal();

  if (heroVideoReducedMotion()) {
    gsap.set(keyhole, { opacity: 0 });
    keyhole.style.setProperty('--keyhole-mask-size', '52vmin');
    return;
  }

  const mobile = isMobileViewport();
  const keyholeScrollPx = getKeyholeScrollDistance(scrollDistance);
  let metrics = getKeyholeMaskMetrics(pin);

  gsap.set(keyhole, { opacity: 1 });
  applyHeroKeyholeScrollState(keyhole, 0, metrics);

  ScrollTrigger.create(
    heroScrollTriggerConfig({
      id: 'hero-keyhole-reveal',
      trigger: wrap,
      start: 'top top',
      end: `+=${keyholeScrollPx}`,
      scrub: mobile ? 1 : 1.25,
      invalidateOnRefresh: true,
      onRefresh() {
        metrics = getKeyholeMaskMetrics(pin);
      },
      onUpdate(self) {
        applyHeroKeyholeScrollState(keyhole, self.progress, metrics);
      },
    })
  );
}

function initHeroScrollVideo() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.error('[Benini Squad] GSAP / ScrollTrigger não carregados.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const wrap = document.getElementById('hero-visual-scroll-wrap');
  const pin = document.getElementById('hero-visual');
  const media = document.getElementById('hero-visual-media');
  const video = document.getElementById('hero-scroll-video');
  const beniniWrap = document.getElementById('hero-visual-benini');
  const beniniImg = document.getElementById('hero-visual-benini-img');

  if (!wrap || !pin || !media || !video) return;

  video.pause();
  video.muted = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');

  let resizeTimer;
  let scrubTrigger;
  let scrubBuiltDuration = 0;

  const applyAspectRatio = () => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    const ratio = `${vw} / ${vh}`;
    wrap.style.setProperty('--hero-video-aspect', ratio);
    pin.style.setProperty('--hero-video-aspect', ratio);
    updateVideoCoverScale(video);
  };

  const buildScrub = () => {
    if (heroVideoReducedMotion()) {
      if (scrubTrigger) scrubTrigger.kill();
      if (typeof window.disposeHeroGridScan === 'function') {
        window.disposeHeroGridScan();
      }
      wrap.style.removeProperty('--hero-scroll-distance');
      video.currentTime = 0;
      const keyhole = document.getElementById('hero-visual-keyhole');
      if (keyhole) gsap.set(keyhole, { opacity: 0 });
      return;
    }

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) {
      return;
    }

    if (scrubBuiltDuration === duration && scrubTrigger) {
      return;
    }
    scrubBuiltDuration = duration;
    lastBeniniRevealEased = -1;

    if (scrubTrigger) scrubTrigger.kill();

    if (typeof window.disposeHeroGridScan === 'function') {
      window.disposeHeroGridScan();
    }

    if (typeof window.killHeroPhaseScrolls === 'function') {
      window.killHeroPhaseScrolls();
    }

    const animationHoldPx = getHeroAnimationHoldScroll();
    const overlapScroll = getHeroOverlapScroll();
    const scrollDistance = getVideoScrollDistance(duration);
    const mainRatio = getMainScrollRatio(scrollDistance, animationHoldPx, overlapScroll);
    const scrubSmooth = isMobileViewport() ? 0.55 : 0.75;

    wrap.style.setProperty('--hero-scroll-distance', `${scrollDistance}px`);

    window.__heroVideoScrollMetrics = {
      scrollDistance,
      mainRatio,
      animationHoldPx,
      overlapScroll,
    };

    const manifesto = document.getElementById('manifesto');
    if (manifesto) {
      manifesto.style.setProperty('--hero-overlap-distance', `${overlapScroll}px`);
      manifesto.classList.add('section-manifesto--overlap-ready');
    }

    pin.style.setProperty('--hero-video-blur', '0');
    pin.style.setProperty('--hero-video-brightness', '1');
    pin.style.setProperty('--hero-video-saturate', '1');
    pin.classList.remove('is-benini-reveal');

    gsap.set(pin, { x: 0, zIndex: 2 });

    if (beniniWrap && beniniImg) {
      gsap.set(beniniWrap, { opacity: 0, x: 0 });
      gsap.set(beniniImg, {
        opacity: 0,
        scale: 0.78,
        y: isMobileViewport() ? 56 : 72,
        transformOrigin: 'center bottom',
      });
    }

    if (typeof window.updateHeroDumbbell === 'function') {
      window.updateHeroDumbbell(0);
    }

    scrubTrigger = ScrollTrigger.create(
      heroScrollTriggerConfig({
        id: 'hero-video-scrub',
        trigger: wrap,
        start: 'top top',
        end: `+=${scrollDistance}`,
        pin,
        pinSpacing: true,
        pinReparent: false,
        scrub: scrubSmooth,
        anticipatePin: 0,
        fastScrollEnd: isMobileViewport(),
        onLeave: () => {
          if (typeof window.setHeroOverlapCoverMode === 'function') {
            window.setHeroOverlapCoverMode(false);
          }
        },
        onEnterBack: () => {
          if (typeof window.setHeroOverlapCoverMode === 'function') {
            window.setHeroOverlapCoverMode(false);
          }
        },
        onUpdate: (self) => {
          if (video.readyState < 2) return;

          const inOverlap =
            typeof window.__beniniIsOverlapScrollProgress === 'function' &&
            window.__beniniIsOverlapScrollProgress(self.progress);

          if (inOverlap) {
            if (typeof window.updateHeroGridScanVisibility === 'function') {
              window.updateHeroGridScanVisibility(self.progress, video.currentTime, duration);
            }
            return;
          }

          const target = mapScrollProgressToTime(self.progress, duration, mainRatio);
          let videoSeeked = false;

          if (Math.abs(video.currentTime - target) > 0.035) {
            video.currentTime = target;
            videoSeeked = true;
          }

          const beniniEased = getBeniniRevealFromTime(target, duration);
          updateBeniniReveal(target, duration, pin, beniniWrap, beniniImg);

          if (typeof window.updateHeroDumbbell === 'function') {
            window.updateHeroDumbbell(beniniEased);
          }

          if (typeof window.updateHeroGridScanVisibility === 'function') {
            window.updateHeroGridScanVisibility(self.progress, target, duration);
          }
        },
      })
    );

    // Evita :has() no CSS (causa stutter perto do overlap).
    // Marca o pin-spacer pra regras de largura/z-index.
    if (scrubTrigger?.spacer) {
      scrubTrigger.spacer.classList.add('hero-video-pin-spacer');
    } else {
      const maybeSpacer = pin.parentElement;
      if (maybeSpacer?.classList?.contains('pin-spacer')) {
        maybeSpacer.classList.add('hero-video-pin-spacer');
      }
    }

    initHeroKeyholeReveal(wrap, scrollDistance);

    if (typeof window.initHeroGridScan === 'function') {
      window.initHeroGridScan();
    }

    ScrollTrigger.refresh();

    if (typeof window.scheduleHeroPhaseScrollInit === 'function') {
      window.scheduleHeroPhaseScrollInit();
    } else if (typeof window.initHeroVideoPhaseScroll === 'function') {
      requestAnimationFrame(() => window.initHeroVideoPhaseScroll());
    }

    if (typeof window._orbit?.bindGsapOrbitScroll === 'function') {
      requestAnimationFrame(() => window._orbit.bindGsapOrbitScroll());
    }
  };

  const onReady = () => {
    applyAspectRatio();
    buildScrub();
    if (typeof window.triggerScrollRevealCheck === 'function') {
      requestAnimationFrame(() => window.triggerScrollRevealCheck());
    }
  };

  video.addEventListener('loadedmetadata', onReady);

  if (video.readyState >= 1) onReady();

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyAspectRatio();
      buildScrub();
      ScrollTrigger.refresh();
    }, 200);
  });
}

function isHeroVideoScrubActive() {
  if (typeof ScrollTrigger === 'undefined') return false;
  return Boolean(ScrollTrigger.getById('hero-video-scrub')?.isActive);
}

window.initHeroScrollVideo = initHeroScrollVideo;
window.initHeroKeyholeReveal = initHeroKeyholeReveal;
window.killHeroKeyholeReveal = killHeroKeyholeReveal;
window.isHeroVideoScrubActive = isHeroVideoScrubActive;
