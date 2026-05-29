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
  const cards = root ? [...root.querySelectorAll('.scroll-stack-card.metodo-card')] : [];
  const slides = section ? [...section.querySelectorAll('.metodologia-copy-slide')] : [];

  if (!section || !root || !cards.length) return;

  killMetodologiaPinScroll();

  // Reduced motion: exibe todos os cards estaticamente
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cards.forEach((card) => {
      gsap.set(card, { opacity: 1, y: 0, clearProps: 'will-change' });
      card.classList.add('is-card-active');
      card.style.position = 'relative';
    });
    setMetodologiaCopySlide(slides, 0);
    return;
  }

  if (typeof ScrollTrigger === 'undefined') {
    setMetodologiaCopySlide(slides, 0);
    return;
  }

  const totalCards = cards.length;
  const vh = window.innerHeight;
  // Cada card ocupa ~80vh de scroll; mais uma entrada e saída
  const scrollPerCard = Math.round(vh * 0.8);
  const totalScroll = Math.round(vh * 0.3) + scrollPerCard * (totalCards - 1) + Math.round(vh * 0.4);

  let currentCardIndex = -1;

  const showCard = (index) => {
    const safeIndex = Math.max(0, Math.min(index, totalCards - 1));
    if (safeIndex === currentCardIndex) return;

    const prevIndex = currentCardIndex;
    currentCardIndex = safeIndex;

    cards.forEach((card, i) => {
      gsap.killTweensOf(card);

      if (i === safeIndex) {
        // Card entrando: vem de baixo
        gsap.to(card, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
        });
        card.classList.add('is-card-active');
        card.style.pointerEvents = 'auto';
      } else if (i === prevIndex && prevIndex !== -1) {
        // Card saindo: vai para cima ou baixo
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
        // Outros cards: garantir ocultos na posição correta
        const yOffset = i < safeIndex ? -30 : 40;
        gsap.set(card, { opacity: 0, y: yOffset });
        card.classList.remove('is-card-active');
        card.style.pointerEvents = 'none';
      }
    });

    setMetodologiaCopySlide(slides, safeIndex);
  };

  // Estado inicial: todos ocultos abaixo
  cards.forEach((card) => {
    gsap.set(card, { opacity: 0, y: 40 });
    card.classList.remove('is-card-active');
    card.style.pointerEvents = 'none';
  });
  setMetodologiaCopySlide(slides, 0);

  ScrollTrigger.create(
    metodologiaScrollTriggerConfig({
      id: 'metodologia-pin',
      trigger: section,
      start: 'top top',
      end: () => `+=${totalScroll}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      onEnter: () => {
        section.classList.add('is-metodologia-pinned');
        showCard(0);
      },
      onEnterBack: () => {
        section.classList.add('is-metodologia-pinned');
      },
      onLeave: () => {
        section.classList.remove('is-metodologia-pinned');
      },
      onLeaveBack: () => {
        section.classList.remove('is-metodologia-pinned');
        // Reset ao primeiro card ao scrollar de volta antes da seção
        currentCardIndex = -1;
        cards.forEach((card) => {
          gsap.set(card, { opacity: 0, y: 40 });
          card.classList.remove('is-card-active');
          card.style.pointerEvents = 'none';
        });
        setMetodologiaCopySlide(slides, 0);
      },
      onUpdate: (self) => {
        // Distribui os 4 cards igualmente pelo progresso total
        const index = Math.min(
          Math.floor(self.progress * totalCards),
          totalCards - 1
        );
        showCard(index);
      },
    })
  );

  ScrollTrigger.refresh();
}

window.initMetodologiaScrollStack = initMetodologiaScrollStack;
window.killMetodologiaPinScroll = killMetodologiaPinScroll;