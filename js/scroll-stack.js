'use strict';

/**
 * ScrollStack — vanilla port of React Bits ScrollStack (window scroll).
 * Uses site Lenis when available; does not create a second Lenis instance.
 */
function createScrollStack(root, options = {}) {
  if (!root) return null;

  const config = {
    itemDistance: 100,
    itemScale: 0.03,
    itemStackDistance: 30,
    stackPosition: '20%',
    scaleEndPosition: '10%',
    baseScale: 0.85,
    rotationAmount: 0,
    blurAmount: 0,
    getScrollTop: () =>
      typeof window.beniniLenis !== 'undefined' && window.beniniLenis
        ? window.beniniLenis.scroll
        : window.scrollY,
    onStackComplete: undefined,
    onActiveCardChange: undefined,
    ...options,
  };

  const cards = Array.from(root.querySelectorAll('.scroll-stack-card'));
  const endElement = root.querySelector('.scroll-stack-end');

  if (!cards.length) return null;

  const lastTransforms = new Map();
  let stackCompleted = false;
  let lastActiveIndex = -1;
  let isUpdating = false;
  let rafId = 0;

  const parsePercentage = (value, containerHeight) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  };

  const calculateProgress = (scrollTop, start, end) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  };

  const getElementOffset = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + config.getScrollTop();
  };

  const updateCardTransforms = () => {
    if (!cards.length || isUpdating) return;

    isUpdating = true;

    const scrollTop = config.getScrollTop();
    const containerHeight = window.innerHeight;
    const stackPositionPx = parsePercentage(config.stackPosition, containerHeight);
    const scaleEndPositionPx = parsePercentage(config.scaleEndPosition, containerHeight);
    const endElementTop = endElement ? getElementOffset(endElement) : 0;

    let topCardIndex = 0;
    for (let j = 0; j < cards.length; j += 1) {
      const jCardTop = getElementOffset(cards[j]);
      const jTriggerStart = jCardTop - stackPositionPx - config.itemStackDistance * j;
      if (scrollTop >= jTriggerStart) {
        topCardIndex = j;
      }
    }

    if (topCardIndex !== lastActiveIndex) {
      lastActiveIndex = topCardIndex;
      config.onActiveCardChange?.(topCardIndex);
    }

    cards.forEach((card, i) => {
      const cardTop = getElementOffset(card);
      const triggerStart = cardTop - stackPositionPx - config.itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - config.itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = config.baseScale + i * config.itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = config.rotationAmount
        ? i * config.rotationAmount * scaleProgress
        : 0;

      let blur = 0;
      if (config.blurAmount && i < topCardIndex) {
        blur = Math.max(0, (topCardIndex - i) * config.blurAmount);
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + config.itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + config.itemStackDistance * i;
      }

      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100,
      };

      const lastTransform = lastTransforms.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';

        card.style.transform = transform;
        card.style.filter = filter;
        lastTransforms.set(i, newTransform);
      }

      if (i === cards.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompleted) {
          stackCompleted = true;
          config.onStackComplete?.();
        } else if (!isInView && stackCompleted) {
          stackCompleted = false;
        }
      }
    });

    isUpdating = false;
  };

  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateCardTransforms();
    });
  };

  cards.forEach((card, i) => {
    if (i < cards.length - 1) {
      card.style.marginBottom = `${config.itemDistance}px`;
    }
    card.style.willChange = 'transform, filter';
    card.style.transformOrigin = 'top center';
    card.style.backfaceVisibility = 'hidden';
  });

  if (window.beniniLenis) {
    window.beniniLenis.on('scroll', onScroll);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  updateCardTransforms();

  return {
    refresh: updateCardTransforms,
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      if (window.beniniLenis && typeof window.beniniLenis.off === 'function') {
        window.beniniLenis.off('scroll', onScroll);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cards.forEach((card) => {
        card.style.transform = '';
        card.style.filter = '';
        card.style.marginBottom = '';
        card.style.willChange = '';
      });
      lastTransforms.clear();
      stackCompleted = false;
      lastActiveIndex = -1;
    },
  };
}

window.createScrollStack = createScrollStack;
