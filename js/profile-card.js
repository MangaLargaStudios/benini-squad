'use strict';

(function initProfileCardModule(global) {
  const DEFAULT_INNER_GRADIENT =
    'linear-gradient(145deg, rgba(217, 159, 102, 0.38) 0%, rgba(58, 51, 52, 0.72) 100%)';

  const ANIMATION_CONFIG = {
    INITIAL_DURATION: 1200,
    INITIAL_X_OFFSET: 70,
    INITIAL_Y_OFFSET: 60,
    DEVICE_BETA_OFFSET: 20,
    ENTER_TRANSITION_MS: 180,
  };

  const clamp = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);
  const round = (v, precision = 3) => parseFloat(Number(v).toFixed(precision));
  const adjust = (v, fMin, fMax, tMin, tMax) =>
    round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

  function createTiltEngine(wrap, shell, enabled) {
    if (!enabled) return null;

    let rafId = null;
    let running = false;
    let lastTs = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x, y) => {
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;
      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);
      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`,
      };

      Object.entries(properties).forEach(([key, value]) => {
        wrap.style.setProperty(key, value);
      });
    };

    const step = (ts) => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);
      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;
      setVarsFromXY(currentX, currentY);

      const stillFar =
        Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x, y) {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x, y) {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs) {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      },
    };
  }

  function getOffsets(event, el) {
    const rect = el.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function buildProfileCardMarkup(options) {
    const {
      avatarUrl,
      miniAvatarUrl,
      name,
      title,
      handle,
      status,
      contactText,
      showUserInfo,
      behindGlowEnabled,
    } = options;

    const miniSrc = miniAvatarUrl || avatarUrl;
    const behindMarkup = behindGlowEnabled !== false
      ? '<div class="pc-behind" aria-hidden="true"></div>'
      : '';
    const userInfoMarkup = showUserInfo
      ? `
        <div class="pc-user-info">
          <div class="pc-user-details">
            <div class="pc-mini-avatar">
              <img src="${miniSrc}" alt="" loading="lazy" />
            </div>
            <div class="pc-user-text">
              <div class="pc-handle">@${handle}</div>
              <div class="pc-status">${status}</div>
            </div>
          </div>
          <button type="button" class="pc-contact-btn" aria-label="Contato ${name}">
            ${contactText}
          </button>
        </div>
      `
      : '';

    return `
      ${behindMarkup}
      <div class="pc-card-shell">
        <section class="pc-card" aria-label="Perfil ${name}">
          <div class="pc-inside">
            <div class="pc-shine" aria-hidden="true"></div>
            <div class="pc-glare" aria-hidden="true"></div>
            <div class="pc-content pc-avatar-content">
              <img
                class="avatar"
                src="${avatarUrl}"
                alt="${name}"
                loading="lazy"
                decoding="async"
              />
              ${userInfoMarkup}
            </div>
            <div class="pc-content">
              <div class="pc-details">
                <h3>${name}</h3>
                <p>${title}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function mountProfileCard(container, options = {}) {
    if (!container) return null;

    const config = {
      avatarUrl: '../images/Benini-Alpha.webp',
      iconUrl: '',
      grainUrl: '',
      innerGradient: DEFAULT_INNER_GRADIENT,
      behindGlowEnabled: true,
      behindGlowColor: 'rgba(217, 159, 102, 0.55)',
      behindGlowSize: '50%',
      className: '',
      enableTilt: true,
      enableMobileTilt: false,
      mobileTiltSensitivity: 5,
      miniAvatarUrl: '',
      name: 'Lucas Benini',
      title: 'Treinador · Benini Squad',
      handle: 'lucasbenini.treinador',
      status: 'Online',
      contactText: 'WhatsApp',
      showUserInfo: true,
      onContactClick: null,
      ...options,
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      config.enableTilt = false;
      config.enableMobileTilt = false;
    }

    container.innerHTML = '';
    container.className = `pc-card-wrapper ${config.className}`.trim();
    container.style.setProperty('--icon', config.iconUrl ? `url(${config.iconUrl})` : 'none');
    container.style.setProperty('--grain', config.grainUrl ? `url(${config.grainUrl})` : 'none');
    container.style.setProperty('--inner-gradient', config.innerGradient);
    container.style.setProperty('--behind-glow-color', config.behindGlowColor);
    container.style.setProperty('--behind-glow-size', config.behindGlowSize);

    container.insertAdjacentHTML('beforeend', buildProfileCardMarkup(config));

    const shell = container.querySelector('.pc-card-shell');
    const contactBtn = container.querySelector('.pc-contact-btn');
    const tiltEngine = createTiltEngine(container, shell, config.enableTilt);

    let enterTimer = null;
    let leaveRaf = null;
    const cleanupFns = [];

    if (contactBtn && typeof config.onContactClick === 'function') {
      const onContact = (event) => {
        event.preventDefault();
        config.onContactClick(event);
      };
      contactBtn.addEventListener('click', onContact);
      cleanupFns.push(() => contactBtn.removeEventListener('click', onContact));
    }

    if (tiltEngine && shell) {
      const onPointerMove = (event) => {
        const { x, y } = getOffsets(event, shell);
        tiltEngine.setTarget(x, y);
      };

      const onPointerEnter = (event) => {
        shell.classList.add('active');
        shell.classList.add('entering');
        if (enterTimer) window.clearTimeout(enterTimer);
        enterTimer = window.setTimeout(() => {
          shell.classList.remove('entering');
        }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);
        const { x, y } = getOffsets(event, shell);
        tiltEngine.setTarget(x, y);
      };

      const onPointerLeave = () => {
        tiltEngine.toCenter();
        const checkSettle = () => {
          const { x, y, tx, ty } = tiltEngine.getCurrent();
          const settled = Math.hypot(tx - x, ty - y) < 0.6;
          if (settled) {
            shell.classList.remove('active');
            leaveRaf = null;
          } else {
            leaveRaf = requestAnimationFrame(checkSettle);
          }
        };
        if (leaveRaf) cancelAnimationFrame(leaveRaf);
        leaveRaf = requestAnimationFrame(checkSettle);
      };

      shell.addEventListener('pointerenter', onPointerEnter);
      shell.addEventListener('pointermove', onPointerMove);
      shell.addEventListener('pointerleave', onPointerLeave);
      cleanupFns.push(() => {
        shell.removeEventListener('pointerenter', onPointerEnter);
        shell.removeEventListener('pointermove', onPointerMove);
        shell.removeEventListener('pointerleave', onPointerLeave);
      });

      const onDeviceOrientation = (event) => {
        const { beta, gamma } = event;
        if (beta == null || gamma == null) return;
        const centerX = shell.clientWidth / 2;
        const centerY = shell.clientHeight / 2;
        const x = clamp(
          centerX + gamma * config.mobileTiltSensitivity,
          0,
          shell.clientWidth
        );
        const y = clamp(
          centerY + (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * config.mobileTiltSensitivity,
          0,
          shell.clientHeight
        );
        tiltEngine.setTarget(x, y);
      };

      const onClick = () => {
        if (!config.enableMobileTilt || location.protocol !== 'https:') return;
        const motion = window.DeviceMotionEvent;
        if (motion && typeof motion.requestPermission === 'function') {
          motion
            .requestPermission()
            .then((state) => {
              if (state === 'granted') {
                window.addEventListener('deviceorientation', onDeviceOrientation);
              }
            })
            .catch(console.error);
        } else {
          window.addEventListener('deviceorientation', onDeviceOrientation);
        }
      };

      shell.addEventListener('click', onClick);
      cleanupFns.push(() => {
        shell.removeEventListener('click', onClick);
        window.removeEventListener('deviceorientation', onDeviceOrientation);
      });

      const initialX = (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
      const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
      tiltEngine.setImmediate(initialX, initialY);
      tiltEngine.toCenter();
      tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);
    }

    return {
      destroy() {
        if (enterTimer) window.clearTimeout(enterTimer);
        if (leaveRaf) cancelAnimationFrame(leaveRaf);
        tiltEngine?.cancel();
        cleanupFns.forEach((fn) => fn());
        container.innerHTML = '';
      },
    };
  }

  global.mountProfileCard = mountProfileCard;
})(window);
