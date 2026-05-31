(function initLinksPage() {
  'use strict';

  const split = window.LinksSplitText;

  const phone = String(window.BENINI_WHATSAPP_PHONE || '').replace(/\D/g, '');
  const whatsappLink = document.getElementById('links-whatsapp');
  if (whatsappLink && phone) {
    const message = encodeURIComponent('Oi, vim pelo link da Benini Squad.');
    whatsappLink.href = `https://wa.me/${phone}?text=${message}`;
  }

  const youtubeLink = document.getElementById('links-youtube');
  const youtubeUrl = String(window.BENINI_YOUTUBE_URL || '').trim();
  if (youtubeLink && youtubeUrl && youtubeUrl !== '#') {
    youtubeLink.href = youtubeUrl;
  }

  const instagramLink = document.getElementById('links-instagram');
  const instagramUrl = String(window.BENINI_INSTAGRAM_URL || '').trim();
  if (instagramLink && instagramUrl && instagramUrl !== '#') {
    instagramLink.href = instagramUrl;
  }

  function showLinksContentImmediate() {
    document.querySelectorAll('.links-page__main [hidden]').forEach((el) => {
      el.hidden = false;
    });

    if (typeof gsap === 'undefined') return;

    gsap.set(
      '.links-split-char, .links-split-word, .links-page__btn, .btn-primary__icon, .links-page__btn-arrow, .btn-ghost__youtube-icon, .links-page__btn-instagram-icon',
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

  function addButtonEntrance(tl, { button, label, icon, at, onCompleteButtons }) {
    if (!button) return;

    const labelEl = label ? button.querySelector(label) : null;
    const iconEl = icon ? button.querySelector(icon) : null;
    const chars = labelEl ? [...labelEl.querySelectorAll('.links-split-char')] : [];

    prepareButtonEntrance(button);
    if (iconEl) gsap.set(iconEl, { opacity: 0 });

    onCompleteButtons.push(button);

    tl.to(button, { scale: 1, opacity: 1, duration: 0.72, ease: 'back.out(1.7)' }, at);

    if (chars.length) {
      tl.add(split.animateCharsShow(chars), at);
    }

    if (iconEl) {
      tl.to(iconEl, { opacity: 0.9, duration: 0.45, ease: 'power2.out' }, at + 0.06);
    }
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
    const youtubeBtn = document.getElementById('links-youtube');
    const instagramBtn = document.getElementById('links-instagram');

    const eyebrowChars = split.splitIntoChars(eyebrow);
    const titleWords = split.splitIntoWords(title);
    const leadWords = split.splitIntoWords(lead);

    const whatsappLabel = whatsappBtn?.querySelector('.btn-primary__label');
    const siteLabel = siteBtn?.querySelector('.links-page__btn-label');
    const youtubeLabel = youtubeBtn?.querySelector('.btn-ghost__label');
    const instagramLabel = instagramBtn?.querySelector('.links-page__btn-label');

    const whatsappChars = split.splitIntoChars(whatsappLabel);
    const siteChars = split.splitIntoChars(siteLabel);
    const youtubeChars = split.splitIntoChars(youtubeLabel);
    const instagramChars = split.splitIntoChars(instagramLabel);

    split.setSplitHidden([
      ...eyebrowChars,
      ...titleWords,
      ...leadWords,
      ...whatsappChars,
      ...siteChars,
      ...youtubeChars,
      ...instagramChars,
    ]);

    const entranceButtons = [];
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        entranceButtons.forEach(finishButtonEntrance);
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

    addButtonEntrance(tl, {
      button: whatsappBtn,
      label: '.btn-primary__label',
      icon: '.btn-primary__icon',
      at: 0.72,
      onCompleteButtons: entranceButtons,
    });
    addButtonEntrance(tl, {
      button: siteBtn,
      label: '.links-page__btn-label',
      icon: '.links-page__btn-arrow',
      at: 0.84,
      onCompleteButtons: entranceButtons,
    });
    addButtonEntrance(tl, {
      button: youtubeBtn,
      label: '.btn-ghost__label',
      icon: '.btn-ghost__youtube-icon',
      at: 0.96,
      onCompleteButtons: entranceButtons,
    });
    addButtonEntrance(tl, {
      button: instagramBtn,
      label: '.links-page__btn-label',
      icon: '.links-page__btn-instagram-icon',
      at: 1.08,
      onCompleteButtons: entranceButtons,
    });
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

  const profileMount = document.getElementById('links-profile-card');
  if (profileMount && typeof window.mountProfileCard === 'function') {
    window.mountProfileCard(profileMount, {
      avatarUrl: '../images/Benini-Alpha.webp',
      name: 'Lucas Benini',
      title: 'Treinador · Benini Squad',
      showUserInfo: false,
      className: 'pc-card-wrapper--links',
      enableTilt: true,
      enableMobileTilt: false,
      behindGlowEnabled: true,
      behindGlowColor: 'rgba(238, 235, 221, 0.22)',
      innerGradient:
        'linear-gradient(145deg, rgba(217, 159, 102, 0.38) 0%, rgba(58, 51, 52, 0.72) 100%)',
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playLinksPageEntrance, { once: true });
  } else {
    playLinksPageEntrance();
  }
})();
