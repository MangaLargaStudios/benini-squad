'use strict';

function metodologiaScrollTriggerConfig(overrides = {}) {
  const config = {
    invalidateOnRefresh: true,
    ...overrides,
  };
  if (window.beniniUsesLenisScroller) {
    config.scroller = document.body;
  }
  return config;
}

function setMetodologiaCopySlide(slides, index) {
  if (!slides.length) return;
  const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, i) => {
    const active = i === safeIndex;
    slide.classList.toggle('is-active', active);
    slide.classList.remove('is-leaving');
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
}

function killMetodologiaPinScroll() {
  if (typeof ScrollTrigger === 'undefined') return;
  ScrollTrigger.getById('metodologia-pin')?.kill();
}

function initMetodologiaScrollStack() {
  const section = document.getElementById('metodologia');
  const root = document.getElementById('metodologia-scroll-stack');
  const slidesRoot = section?.querySelector('.metodologia-copy-slides');
  const glassBlur = section?.querySelector('.metodologia-glass-blur');
  const cards = root ? [...root.querySelectorAll('.scroll-stack-card.metodo-card')] : [];
  const slides = section ? [...section.querySelectorAll('.metodologia-copy-slide')] : [];
  const wave = window.MetodologiaWaveText;

  if (!section || !root || !cards.length) return;

  killMetodologiaPinScroll();

  // Reduced motion: exibe todos os cards estaticamente
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cards.forEach((card) => {
      gsap.set(card, { opacity: 1, y: 0, clearProps: 'will-change' });
      card.classList.add('is-card-active');
      card.style.position = 'relative';
    });
    wave?.initMetodologiaWaveSplit(slides, slidesRoot);
    wave?.resetMetodologiaWaveSlides(slides, 0);
    return;
  }

  if (typeof ScrollTrigger === 'undefined') {
    setMetodologiaCopySlide(slides, 0);
    return;
  }

  wave?.initMetodologiaWaveSplit(slides, slidesRoot);
  slides.forEach((slide) => wave?.setMetodologiaWaveLinesHidden(getMetodologiaSlideLines(slide)));

  const totalCards = cards.length;

  function getMetodologiaScrollMetrics() {
    const vh = window.innerHeight;
    const leadIn = Math.round(vh * 0.12);
    const scrollPerCard = Math.round(vh * 0.88);
    const holdAfterLastCard = Math.round(vh * 0.95);
    const totalScroll = leadIn + scrollPerCard * totalCards + holdAfterLastCard;

    return {
      totalScroll,
      holdProgressRatio: holdAfterLastCard / totalScroll,
    };
  }

  function getCardIndexFromProgress(progress, holdProgressRatio) {
    if (progress >= 1 - holdProgressRatio) {
      return totalCards - 1;
    }

    const normalized = progress / (1 - holdProgressRatio);
    return Math.min(Math.floor(normalized * totalCards), totalCards - 1);
  }

  let currentCardIndex = -1;
  let copyTween = null;
  let copyHiddenUntilEnter = false;

  const fadeInMetodologiaGlass = () => {
    section.classList.add('is-metodologia-pinned');
    if (!glassBlur || typeof gsap === 'undefined') return;
    gsap.killTweensOf(glassBlur);
    gsap.to(glassBlur, {
      opacity: 1,
      duration: 0.85,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const fadeOutMetodologiaGlass = () => {
    section.classList.remove('is-metodologia-pinned');
    if (!glassBlur || typeof gsap === 'undefined') return;
    gsap.killTweensOf(glassBlur);
    gsap.to(glassBlur, {
      opacity: 0,
      duration: 0.55,
      ease: 'power2.in',
      overwrite: 'auto',
    });
  };

  if (glassBlur && typeof gsap !== 'undefined') {
    gsap.set(glassBlur, { opacity: 0 });
  }

  function getMetodologiaSlideLines(slide) {
    return wave?.getMetodologiaSlideLines(slide) || [];
  }

  function finalizeCopySlides(activeIndex) {
    slides.forEach((slide, i) => {
      const lines = getMetodologiaSlideLines(slide);
      const active = i === activeIndex;

      slide.classList.toggle('is-active', active);
      slide.classList.remove('is-leaving');
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');

      if (!active) {
        gsap.killTweensOf(lines);
        wave?.setMetodologiaWaveLinesHidden(lines);
      }
    });
  }

  function resetMetodologiaCopyHidden(activeIndex = 0) {
    slides.forEach((slide, index) => {
      const lines = getMetodologiaSlideLines(slide);
      const active = index === activeIndex;

      slide.classList.toggle('is-active', active);
      slide.classList.remove('is-leaving');
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      gsap.killTweensOf(lines);
      wave?.setMetodologiaWaveLinesHidden(lines);
    });
  }

  function hideMetodologiaCopyOnLeaveBack(activeIndex) {
    if (!wave) {
      resetMetodologiaCopyHidden(0);
      return;
    }

    const safeIndex = activeIndex >= 0 ? activeIndex : 0;
    const activeSlide = slides[safeIndex];
    const activeLines = getMetodologiaSlideLines(activeSlide);

    copyTween?.kill();
    slides.forEach((slide) => gsap.killTweensOf(getMetodologiaSlideLines(slide)));

    activeSlide.classList.add('is-active');
    activeSlide.classList.remove('is-leaving');
    activeSlide.setAttribute('aria-hidden', 'false');

    if (!wave.metodologiaLinesAreVisible(activeLines)) {
      resetMetodologiaCopyHidden(0);
      return;
    }

    copyTween = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => resetMetodologiaCopyHidden(0),
    });
    copyTween.add(wave.animateMetodologiaWaveLines(activeLines, 'hide', -1));
  }

  function animateCopySlide(prevIndex, nextIndex) {
    if (copyHiddenUntilEnter) return;

    if (!wave) {
      setMetodologiaCopySlide(slides, nextIndex);
      return;
    }

    const scrollDirection = nextIndex > prevIndex ? 1 : -1;
    const prevSlide = prevIndex >= 0 ? slides[prevIndex] : null;
    const nextSlide = slides[nextIndex];
    const prevLines = prevSlide ? getMetodologiaSlideLines(prevSlide) : [];
    const nextLines = getMetodologiaSlideLines(nextSlide);

    if (prevIndex === nextIndex) return;

    copyTween?.kill();
    slides.forEach((slide) => gsap.killTweensOf(getMetodologiaSlideLines(slide)));

    nextSlide.classList.add('is-active');
    nextSlide.classList.remove('is-leaving');
    nextSlide.setAttribute('aria-hidden', 'false');
    wave?.setMetodologiaWaveLinesHidden(nextLines);

    if (prevSlide && prevIndex !== nextIndex) {
      prevSlide.classList.remove('is-active');
      prevSlide.classList.add('is-leaving');
      prevSlide.setAttribute('aria-hidden', 'true');

      copyTween = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => finalizeCopySlides(nextIndex),
      });

      copyTween.add(wave.animateMetodologiaWaveLines(prevLines, 'hide', scrollDirection));
      copyTween.add(
        wave.animateMetodologiaWaveLines(nextLines, 'show', scrollDirection),
        '-=0.16'
      );
      return;
    }

    copyTween = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => finalizeCopySlides(nextIndex),
    });
    copyTween.add(wave.animateMetodologiaWaveLines(nextLines, 'show', scrollDirection));
  }

  const showCard = (index) => {
    const safeIndex = Math.max(0, Math.min(index, totalCards - 1));
    if (safeIndex === currentCardIndex) return;

    const prevIndex = currentCardIndex;
    currentCardIndex = safeIndex;

    cards.forEach((card, i) => {
      gsap.killTweensOf(card);

      if (i === safeIndex) {
        gsap.to(card, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
        });
        card.classList.add('is-card-active');
        card.style.pointerEvents = 'auto';
      } else if (i === prevIndex && prevIndex !== -1) {
        const direction = i < safeIndex ? -1 : 1;
        gsap.to(card, {
          opacity: 0,
          y: direction * -30,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => card.classList.remove('is-card-active'),
        });
        card.style.pointerEvents = 'none';
      } else {
        const yOffset = i < safeIndex ? -30 : 40;
        gsap.set(card, { opacity: 0, y: yOffset });
        card.classList.remove('is-card-active');
        card.style.pointerEvents = 'none';
      }
    });

    animateCopySlide(prevIndex, safeIndex);
  };

  cards.forEach((card) => {
    gsap.set(card, { opacity: 0, y: 40 });
    card.classList.remove('is-card-active');
    card.style.pointerEvents = 'none';
  });

  slides.forEach((slide, index) => {
    slide.classList.toggle('is-active', index === 0);
    slide.classList.remove('is-leaving');
    slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
    wave?.setMetodologiaWaveLinesHidden(getMetodologiaSlideLines(slide));
  });

  ScrollTrigger.create(
    metodologiaScrollTriggerConfig({
      id: 'metodologia-pin',
      trigger: section,
      start: 'top top',
      end: () => `+=${getMetodologiaScrollMetrics().totalScroll}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      onEnter: () => {
        copyHiddenUntilEnter = false;
        fadeInMetodologiaGlass();
        showCard(0);
      },
      onEnterBack: () => {
        fadeInMetodologiaGlass();
      },
      onLeave: () => {
        fadeOutMetodologiaGlass();
      },
      onLeaveBack: () => {
        fadeOutMetodologiaGlass();
        copyHiddenUntilEnter = true;

        const leavingCardIndex = currentCardIndex;
        currentCardIndex = -1;

        cards.forEach((card) => {
          gsap.set(card, { opacity: 0, y: 40 });
          card.classList.remove('is-card-active');
          card.style.pointerEvents = 'none';
        });

        hideMetodologiaCopyOnLeaveBack(leavingCardIndex);
      },
      onUpdate: (self) => {
        const { holdProgressRatio } = getMetodologiaScrollMetrics();
        const index = getCardIndexFromProgress(self.progress, holdProgressRatio);
        showCard(index);
      },
    })
  );

  ScrollTrigger.refresh();
}

window.initMetodologiaScrollStack = initMetodologiaScrollStack;
window.killMetodologiaPinScroll = killMetodologiaPinScroll;
