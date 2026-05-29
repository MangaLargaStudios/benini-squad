'use strict';

const LINKS_SPLIT_HIDDEN = { yPercent: 110, opacity: 0 };

const LINKS_SPLIT_SHOW = {
  yPercent: 0,
  opacity: 1,
  duration: 0.55,
  ease: 'power4.out',
};

const LINKS_CHAR_STAGGER = { each: 0.022, from: 'start' };
const LINKS_WORD_STAGGER = { each: 0.08, from: 'start' };

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function splitIntoChars(element) {
  if (!element) return [];

  if (element.dataset.linksSplit === 'chars') {
    return [...element.querySelectorAll('.links-split-char')];
  }

  const text = element.textContent.trim();
  if (!text) return [];

  element.dataset.linksSplit = 'chars';
  if (!element.getAttribute('aria-label')) {
    element.setAttribute('aria-label', text);
  }

  element.textContent = '';
  const chars = [];

  [...text].forEach((char) => {
    const wrap = document.createElement('span');
    wrap.className = 'links-split-char-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = 'links-split-char';
    inner.textContent = char === ' ' ? '\u00a0' : char;

    wrap.appendChild(inner);
    element.appendChild(wrap);
    chars.push(inner);
  });

  return chars;
}

function splitIntoWords(root) {
  if (!root) return [];

  if (root.dataset.linksSplit === 'words') {
    return [...root.querySelectorAll('.links-split-word')];
  }

  root.dataset.linksSplit = 'words';
  const words = [];

  function wrapWord(text) {
    const wrap = document.createElement('span');
    wrap.className = 'links-split-word-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = 'links-split-word';
    inner.textContent = text;
    wrap.appendChild(inner);
    words.push(inner);
    return wrap;
  }

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();

      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        frag.appendChild(wrapWord(part));
      });

      node.replaceWith(frag);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'BR') return;

    [...node.childNodes].forEach(processNode);
  }

  [...root.childNodes].forEach(processNode);
  return words;
}

function setSplitHidden(targets) {
  if (!targets?.length || typeof gsap === 'undefined') return;
  gsap.set(targets, LINKS_SPLIT_HIDDEN);
}

function animateCharsShow(targets, extra = {}) {
  if (!targets?.length || typeof gsap === 'undefined') return null;

  return gsap.to(targets, {
    ...LINKS_SPLIT_SHOW,
    stagger: LINKS_CHAR_STAGGER,
    overwrite: 'auto',
    ...extra,
  });
}

function animateWordsShow(targets, extra = {}) {
  if (!targets?.length || typeof gsap === 'undefined') return null;

  return gsap.to(targets, {
    ...LINKS_SPLIT_SHOW,
    stagger: LINKS_WORD_STAGGER,
    overwrite: 'auto',
    ...extra,
  });
}

window.LinksSplitText = {
  LINKS_SPLIT_HIDDEN,
  prefersReducedMotion,
  splitIntoChars,
  splitIntoWords,
  setSplitHidden,
  animateCharsShow,
  animateWordsShow,
};
