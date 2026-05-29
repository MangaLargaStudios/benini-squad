(function initLinksPage() {
  'use strict';

  const split = window.LinksSplitText;

  const phone = String(window.BENINI_WHATSAPP_PHONE || '').replace(/\D/g, '');
  const whatsappLink = document.getElementById('links-whatsapp');
  if (whatsappLink && phone) {
    const message = encodeURIComponent('Oi, vim pelo link da Benini Squad.');
    whatsappLink.href = `https://wa.me/${phone}?text=${message}`;
  }

  function showLinksContentImmediate() {
    document.querySelectorAll('.links-page__main [hidden]').forEach((el) => {
      el.hidden = false;
    });

    if (typeof gsap === 'undefined') return;

    gsap.set(
      '.links-split-char, .links-split-word, .links-page__btn, .btn-primary__icon, .links-page__btn-arrow',
      { opacity: 1, yPercent: 0, clearProps: 'transform' }
    );
  }

  function finishButtonEntrance(button) {
    if (!button) return;
    button.classList.remove('is-entering');
    if (typeof gsap !== 'undefined') {
      gsap.set(button, { clearProps: 'transform,opacity' });
    }
  }

  function prepareButtonEntrance(button) {
    if (!button || typeof gsap === 'undefined') return;
    button.classList.add('is-entering');
    gsap.set(button, {
      scale: 0.82,
      opacity: 0,
      transformOrigin: 'center center',
    });
  }

  function playLinksPageEntrance() {
    if (!split || typeof gsap === 'undefined' || split.prefersReducedMotion()) {
      showLinksContentImmediate();
      return;
    }

    const eyebrow = document.querySelector('.links-page__eyebrow');
    const title = document.querySelector('.links-page__title');
    const lead = document.querySelector('.links-page__lead');
    const whatsappBtn = document.getElementById('links-whatsapp');
    const siteBtn = document.getElementById('links-site');
    const whatsappLabel = whatsappBtn?.querySelector('.btn-primary__label');
    const siteLabel = siteBtn?.querySelector('.links-page__btn-label');
    const whatsappIcon = whatsappBtn?.querySelector('.btn-primary__icon');
    const siteArrow = siteBtn?.querySelector('.links-page__btn-arrow');

    const eyebrowChars = split.splitIntoChars(eyebrow);
    const titleWords = split.splitIntoWords(title);
    const leadWords = split.splitIntoWords(lead);
    const whatsappChars = split.splitIntoChars(whatsappLabel);
    const siteChars = split.splitIntoChars(siteLabel);

    split.setSplitHidden([
      ...eyebrowChars,
      ...titleWords,
      ...leadWords,
      ...whatsappChars,
      ...siteChars,
    ]);

    prepareButtonEntrance(whatsappBtn);
    prepareButtonEntrance(siteBtn);
    if (whatsappIcon) gsap.set(whatsappIcon, { opacity: 0 });
    if (siteArrow) gsap.set(siteArrow, { opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        finishButtonEntrance(whatsappBtn);
        finishButtonEntrance(siteBtn);
      },
    });

    if (eyebrowChars.length) {
      tl.add(split.animateCharsShow(eyebrowChars), 0.25);
    }

    if (titleWords.length) {
      tl.add(split.animateWordsShow(titleWords, { stagger: { each: 0.1, from: 'start' } }), 0.38);
    }

    if (leadWords.length) {
      tl.add(split.animateWordsShow(leadWords, { stagger: { each: 0.06, from: 'start' } }), 0.52);
    }

    const whatsappAt = 0.72;
    if (whatsappBtn) {
      tl.to(
        whatsappBtn,
        { scale: 1, opacity: 1, duration: 0.72, ease: 'back.out(1.7)' },
        whatsappAt
      );
    }
    if (whatsappChars.length) {
      tl.add(split.animateCharsShow(whatsappChars), whatsappAt);
    }
    if (whatsappIcon) {
      tl.to(whatsappIcon, { opacity: 1, duration: 0.45, ease: 'power2.out' }, whatsappAt + 0.06);
    }

    const siteAt = 0.84;
    if (siteBtn) {
      tl.to(siteBtn, { scale: 1, opacity: 1, duration: 0.72, ease: 'back.out(1.7)' }, siteAt);
    }
    if (siteChars.length) {
      tl.add(split.animateCharsShow(siteChars), siteAt);
    }
    if (siteArrow) {
      tl.to(siteArrow, { opacity: 0.85, duration: 0.45, ease: 'power2.out' }, siteAt + 0.06);
    }
  }

  function playRebrandNoticeEntrance() {
    const notice = document.getElementById('links-rebrand-notice');
    const msg = notice?.querySelector('.links-page__rebrand-msg');
    const sub = notice?.querySelector('.links-page__rebrand-sub');
    if (!notice || !msg || !sub) return;

    notice.hidden = false;

    if (!split || typeof gsap === 'undefined' || split.prefersReducedMotion()) {
      return;
    }

    const msgLines = [...msg.querySelectorAll('.links-page__rebrand-line')];
    const msgWords = msgLines.length
      ? msgLines.flatMap((line) => split.splitIntoWords(line))
      : split.splitIntoWords(msg);
    const subWords = split.splitIntoWords(sub);
    const targets = [...msgWords, ...subWords];

    gsap.killTweensOf(targets);
    split.setSplitHidden(targets);

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    if (msgWords.length) {
      tl.add(split.animateWordsShow(msgWords, { stagger: { each: 0.1, from: 'start' } }), 0);
    }

    if (subWords.length) {
      tl.add(split.animateWordsShow(subWords, { stagger: { each: 0.06, from: 'start' } }), 0.16);
    }
  }

  const siteBtn = document.getElementById('links-site');
  if (siteBtn) {
    siteBtn.addEventListener('click', () => {
      siteBtn.setAttribute('aria-expanded', 'true');
      playRebrandNoticeEntrance();
    });
  }

  const section = document.body;
  const container = document.getElementById('links-color-bends');
  if (section && container && typeof window.initBeniniColorBends === 'function') {
    window.initBeniniColorBends(section, container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playLinksPageEntrance, { once: true });
  } else {
    playLinksPageEntrance();
  }
})();
