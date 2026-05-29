'use strict';

/**
 * Vanilla port do CardSwap (React Bits).
 * Usa GSAP (já carregado no projeto) para as animações 3D.
 */
(function () {
  const makeSlot = (i, distX, distY, total) => ({
    x: i * distX,
    y: -i * distY,
    z: -i * distX * 1.5,
    zIndex: total - i,
  });

  const placeNow = (el, slot, skew) =>
    gsap.set(el, {
      x: slot.x,
      y: slot.y,
      z: slot.z,
      xPercent: -50,
      yPercent: -50,
      skewY: skew,
      scale: 1,
      transformOrigin: 'center center',
      zIndex: slot.zIndex,
      force3D: true,
    });

  function initCardSwap(container, opts) {
    const o = Object.assign(
      {
        cardDistance: 40,
        verticalDistance: 65,
        delay: 3000,
        pauseOnHover: true,
        hoverScale: 1.05,
        hoverDuration: 0.38,
        hoverEase: 'power2.out',
        skewAmount: 6,
        easing: 'elastic',
      },
      opts || {}
    );

    const cards = Array.from(container.querySelectorAll(':scope > .card'));
    if (!cards.length || typeof gsap === 'undefined') return null;

    const n = cards.length;
    const cfg =
      o.easing === 'elastic'
        ? { ease: 'elastic.out(0.6,0.9)', durDrop: 2, durMove: 2, durReturn: 2 }
        : { ease: 'power1.inOut', durDrop: 0.5, durMove: 0.5, durReturn: 0.5 };

    const slots = Array.from({ length: n }, (_, i) =>
      makeSlot(i, o.cardDistance, o.verticalDistance, n)
    );

    let order = cards.map((_, i) => i);
    let paused = false;

    // Posiciona todos os cards nos slots iniciais
    cards.forEach((card, i) => placeNow(card, slots[i], o.skewAmount));

    const swap = () => {
      if (paused) return;

      const [front, ...rest] = order;
      const last = n - 1;
      const tl = gsap.timeline();

      // 1. Card da frente: overshoot para fora do stack
      tl.to(cards[front], {
        x: slots[last].x + o.cardDistance,
        y: slots[last].y - o.verticalDistance,
        z: slots[last].z - o.cardDistance * 1.5,
        skewY: o.skewAmount,
        duration: cfg.durDrop,
        ease: cfg.ease,
      });

      // 2. Demais cards: avançam um slot (simultâneos)
      rest.forEach((ci, i) => {
        tl.to(
          cards[ci],
          {
            x: slots[i].x,
            y: slots[i].y,
            z: slots[i].z,
            zIndex: slots[i].zIndex,
            skewY: o.skewAmount,
            duration: cfg.durMove,
            ease: cfg.ease,
          },
          '<'
        );
      });

      // 3. Card da frente: assenta no último slot (com overlap)
      tl.to(
        cards[front],
        {
          x: slots[last].x,
          y: slots[last].y,
          z: slots[last].z,
          zIndex: slots[last].zIndex,
          skewY: o.skewAmount,
          duration: cfg.durReturn,
          ease: cfg.ease,
        },
        `>-${cfg.durReturn * 0.5}`
      );

      order = [...rest, front];
    };

    const timerId = setInterval(swap, o.delay);

    const resetCardScale = () => {
      gsap.to(cards, {
        scale: 1,
        duration: o.hoverDuration,
        ease: o.hoverEase,
        overwrite: 'auto',
      });
    };

    const zoomCard = (card) => {
      gsap.to(card, {
        scale: o.hoverScale,
        duration: o.hoverDuration,
        ease: o.hoverEase,
        overwrite: 'auto',
      });
    };

    if (o.pauseOnHover) {
      container.addEventListener('mouseenter', () => {
        paused = true;
      });
      container.addEventListener('mouseleave', () => {
        paused = false;
        resetCardScale();
      });

      cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
          zoomCard(card);
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            duration: o.hoverDuration,
            ease: o.hoverEase,
            overwrite: 'auto',
          });
        });
      });
    }

    return {
      destroy: () => clearInterval(timerId),
      swap,
    };
  }

  window.initCardSwap = initCardSwap;

  // Auto-init da seção feedbacks
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('feedbacks-card-swap');
    if (!el) return;

    window.__feedbacksCardSwap = initCardSwap(el, {
      cardDistance: 28,
      verticalDistance: 42,
      delay: 2800,
      pauseOnHover: true,
      skewAmount: 6,
      easing: 'elastic',
    });
  });
})();