'use strict';

const WOMAN_FAQ_COUNT = 4;

const WOMAN_PERSONA_COPY = [
  { title: 'Persona 01', subtitle: 'Adicione um subtitulo para esta persona.' },
  { title: 'Persona 02', subtitle: 'Adicione um subtitulo para esta persona.' },
  { title: 'Persona 03', subtitle: 'Adicione um subtitulo para esta persona.' },
  { title: 'Persona 04', subtitle: 'Adicione um subtitulo para esta persona.' },
];

function positionWomanModelsFocusPanel(section, panel, index) {
  const slot = section?.querySelectorAll('.woman-models-slot')[index];
  const sectionRect = section?.getBoundingClientRect();

  if (!slot || !sectionRect?.width) {
    return;
  }

  const slotRect = slot.getBoundingClientRect();
  const slotCenterX = slotRect.left + slotRect.width / 2;
  const sectionCenterX = sectionRect.left + sectionRect.width / 2;
  const placeOnRight = slotCenterX < sectionCenterX;

  const slotLeftPct = ((slotRect.left - sectionRect.left) / sectionRect.width) * 100;
  const slotRightPct = ((slotRect.right - sectionRect.left) / sectionRect.width) * 100;

  panel.classList.toggle('is-left', !placeOnRight);
  panel.style.left = placeOnRight ? `calc(${slotRightPct}% + 14px)` : 'auto';
  panel.style.right = placeOnRight ? 'auto' : `calc(${100 - slotLeftPct}% + 14px)`;
}

function initWomanModelsShapes(section) {
  if (!section || section.querySelector('.woman-models-slots')) {
    return;
  }

  const slotsEl = document.createElement('div');
  slotsEl.className = 'woman-models-slots';

  for (let index = 0; index < WOMAN_FAQ_COUNT; index += 1) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'woman-models-slot';
    slot.dataset.index = String(index);
    slot.setAttribute('aria-label', `Abrir duvida ${index + 1}`);

    const card = document.createElement('span');
    card.className = 'woman-models-card';
    card.setAttribute('aria-hidden', 'true');

    const hint = document.createElement('span');
    hint.className = 'woman-models-click-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Click';

    card.appendChild(hint);
    slot.appendChild(card);
    slotsEl.appendChild(slot);
  }

  section.appendChild(slotsEl);
}

function initWomanModelsUI(section) {
  if (!section || section.querySelector('.woman-models-ui')) {
    return null;
  }

  const focusOverlay = document.createElement('div');
  focusOverlay.className = 'woman-models-focus-overlay';
  focusOverlay.setAttribute('aria-hidden', 'true');

  const ui = document.createElement('div');
  ui.className = 'woman-models-ui';
  ui.id = 'woman-models-ui';

  const panel = document.createElement('aside');
  panel.className = 'woman-models-focus-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <button type="button" class="woman-models-focus-close" aria-label="Fechar detalhe">×</button>
    <h3 class="woman-models-focus-title"></h3>
    <p class="woman-models-focus-subtitle"></p>
  `;

  const titleEl = panel.querySelector('.woman-models-focus-title');
  const subtitleEl = panel.querySelector('.woman-models-focus-subtitle');
  const closeBtn = panel.querySelector('.woman-models-focus-close');

  section.insertBefore(focusOverlay, section.querySelector('.woman-models-slots'));
  ui.appendChild(panel);
  section.appendChild(ui);

  let focusedIndex = -1;

  const setActiveSlot = (index) => {
    section.querySelectorAll('.woman-models-slot').forEach((slot) => {
      const isActive = index >= 0 && Number(slot.dataset.index) === index;
      slot.dataset.active = isActive ? 'true' : 'false';
    });
  };

  const exitFocus = () => {
    if (focusedIndex < 0) return;

    focusedIndex = -1;
    section.classList.remove('section-woman-models--focused');
    delete section.dataset.focusedIndex;
    panel.setAttribute('aria-hidden', 'true');
    setActiveSlot(-1);
  };

  const enterFocus = (index) => {
    if (focusedIndex === index) {
      exitFocus();
      return;
    }

    focusedIndex = index;
    section.classList.add('section-woman-models--focused');
    section.dataset.focusedIndex = String(index);
    panel.setAttribute('aria-hidden', 'false');

    setActiveSlot(index);

    const copy = WOMAN_PERSONA_COPY[index] || WOMAN_PERSONA_COPY[0];
    titleEl.textContent = copy.title;
    subtitleEl.textContent = copy.subtitle;

    positionWomanModelsFocusPanel(section, panel, index);

    requestAnimationFrame(() => {
      if (focusedIndex !== index) return;
      positionWomanModelsFocusPanel(section, panel, index);
    });
  };

  section.querySelector('.woman-models-slots')?.addEventListener('click', (event) => {
    const slot = event.target.closest('.woman-models-slot');
    if (!slot) return;

    enterFocus(Number(slot.dataset.index));
  });

  const dismissFocusIfOutside = (event) => {
    if (focusedIndex < 0) return;
    if (event.target.closest('.woman-models-focus-panel')) return;
    if (event.target.closest('.woman-models-slot')) return;

    exitFocus();
  };

  section.addEventListener('click', dismissFocusIfOutside);

  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    exitFocus();
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && focusedIndex >= 0) {
      exitFocus();
    }
  };

  document.addEventListener('keydown', onKeyDown);

  const onResize = () => {
    if (focusedIndex < 0) return;
    positionWomanModelsFocusPanel(section, panel, focusedIndex);
  };

  window.addEventListener('resize', onResize);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    section.removeEventListener('click', dismissFocusIfOutside);
    exitFocus();
    focusOverlay.remove();
    ui.remove();
  };
}

function initWomanModelsStage() {
  const section = document.getElementById('woman-models');
  if (!section) {
    return;
  }

  initWomanModelsShapes(section);
  initWomanModelsUI(section);
}

window.initWomanModelsStage = initWomanModelsStage;
