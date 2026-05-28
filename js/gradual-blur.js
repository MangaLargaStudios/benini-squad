/**
 * GradualBlur (vanilla port of React Bits GradualBlur).
 */
(function registerBeniniGradualBlur(global) {
  const DEFAULT_CONFIG = {
    position: 'bottom',
    strength: 2,
    height: '6rem',
    divCount: 5,
    exponential: false,
    zIndex: 1000,
    animated: false,
    duration: '0.3s',
    easing: 'ease-out',
    opacity: 1,
    curve: 'linear',
    responsive: false,
    target: 'parent',
    className: '',
    style: {},
  };

  const PRESETS = {
    top: { position: 'top', height: '6rem' },
    bottom: { position: 'bottom', height: '6rem' },
    left: { position: 'left', height: '6rem' },
    right: { position: 'right', height: '6rem' },
    subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
    intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
    smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
    sharp: { height: '5rem', curve: 'linear', divCount: 4 },
    header: { position: 'top', height: '8rem', curve: 'ease-out' },
    footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
    sidebar: { position: 'left', height: '6rem', strength: 2.5 },
    'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
    'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
  };

  const CURVE_FUNCTIONS = {
    linear: (p) => p,
    bezier: (p) => p * p * (3 - 2 * p),
    'ease-in': (p) => p * p,
    'ease-out': (p) => 1 - Math.pow(1 - p, 2),
    'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  };

  function mergeConfigs(...configs) {
    return configs.reduce((acc, c) => ({ ...acc, ...c }), {});
  }

  function getGradientDirection(position) {
    return (
      {
        top: 'to top',
        bottom: 'to bottom',
        left: 'to left',
        right: 'to right',
      }[position] || 'to bottom'
    );
  }

  function buildBlurDivs(config, isHovered) {
    const divs = [];
    const increment = 100 / config.divCount;
    const currentStrength =
      isHovered && config.hoverIntensity
        ? config.strength * config.hoverIntensity
        : config.strength;
    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear;
    const direction = getGradientDirection(config.position);

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFunc(progress);

      let blurValue;
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * config.divCount + 1) * currentStrength;
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.maskImage = `linear-gradient(${direction}, ${gradient})`;
      el.style.webkitMaskImage = `linear-gradient(${direction}, ${gradient})`;
      el.style.backdropFilter = `blur(${blurValue.toFixed(3)}rem)`;
      el.style.webkitBackdropFilter = `blur(${blurValue.toFixed(3)}rem)`;
      el.style.opacity = String(config.opacity);

      if (config.animated && config.animated !== 'scroll') {
        el.style.transition = `backdrop-filter ${config.duration} ${config.easing}`;
      }

      divs.push(el);
    }

    return divs;
  }

  function applyContainerStyle(root, config, responsiveHeight, responsiveWidth, isVisible) {
    const isVertical = ['top', 'bottom'].includes(config.position);
    const isHorizontal = ['left', 'right'].includes(config.position);
    const isPageTarget = config.target === 'page';

    root.style.position = isPageTarget ? 'fixed' : 'absolute';
    root.style.pointerEvents = config.hoverIntensity ? 'auto' : 'none';
    root.style.opacity = isVisible === false ? '0' : '1';
    root.style.zIndex = String(isPageTarget ? config.zIndex + 100 : config.zIndex);

    if (config.animated) {
      root.style.transition = `opacity ${config.duration} ${config.easing}`;
    }

    Object.assign(root.style, config.style);

    if (isVertical) {
      root.style.height = responsiveHeight || config.height;
      root.style.width = responsiveWidth || config.width || '100%';
      root.style[config.position] = '0';
      root.style.left = '0';
      root.style.right = '0';
    } else if (isHorizontal) {
      root.style.width = responsiveWidth || config.width || responsiveHeight || config.height;
      root.style.height = '100%';
      root.style[config.position] = '0';
      root.style.top = '0';
      root.style.bottom = '0';
    }
  }

  function unmount(container) {
    if (!container) return;
    container.querySelectorAll('.gradual-blur').forEach((el) => el.remove());
  }

  /**
   * @param {HTMLElement} container
   * @param {object} props
   * @returns {{ root: HTMLElement, dispose: () => void } | null}
   */
  function mount(container, props = {}) {
    if (!container) return null;

    unmount(container);

    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset] : {};
    const config = mergeConfigs(DEFAULT_CONFIG, presetConfig, props);

    const root = document.createElement('div');
    root.className = `gradual-blur gradual-blur-${config.target === 'page' ? 'page' : 'parent'}${
      config.className ? ` ${config.className}` : ''
    }`;

    const inner = document.createElement('div');
    inner.className = 'gradual-blur-inner';

    applyContainerStyle(root, config, config.height, config.width, true);

    buildBlurDivs(config, false).forEach((div) => inner.appendChild(div));
    root.appendChild(inner);
    container.appendChild(root);

    return {
      root,
      dispose() {
        root.remove();
      },
    };
  }

  global.BeniniGradualBlur = {
    mount,
    unmount,
    PRESETS,
    CURVE_FUNCTIONS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
