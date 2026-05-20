'use strict';

const DUMBBELL_MODEL_URL = 'models/3d/domyos_dumbbell.glb';
const DUMBBELL_FIT_SIZE = 2.975;
const DUMBBELL_SCALE_START_MULT = 0.918;
const DUMBBELL_SCALE_END_MULT = 1.122;

function configureGltfMaterial(material) {
  if (!material) return;

  material.side = THREE.DoubleSide;

  if (material.map) {
    material.map.encoding = THREE.sRGBEncoding;
  }
  if (material.emissiveMap) {
    material.emissiveMap.encoding = THREE.sRGBEncoding;
  }
  if (material.metalnessMap) {
    material.metalnessMap.encoding = THREE.LinearEncoding;
  }
  if (material.roughnessMap) {
    material.roughnessMap.encoding = THREE.LinearEncoding;
  }
  if (material.normalMap) {
    material.normalMap.encoding = THREE.LinearEncoding;
  }

  material.needsUpdate = true;
}

function fitModelToScene(model, targetSize = DUMBBELL_FIT_SIZE) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetSize / maxDim;

  model.position.sub(center);
  model.scale.setScalar(scale);
  model.rotation.set(0.15, Math.PI * 0.28, 0.05);

  return scale;
}

function addDumbbellLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const keyLight = new THREE.DirectionalLight(0xd99f66, 2.2);
  keyLight.position.set(2.5, 4, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xeeebdd, 1.1);
  rimLight.position.set(-4, 1, -3);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0xd99f66, 0.7, 12);
  fillLight.position.set(0, -1.5, 3);
  scene.add(fillLight);
}

const HERO_HOLD_PHASE_SPLIT = { dumbbell: 0.44, blur: 0.26, text: 0.3 };
const HERO_RESULTS_SHAPE_BLUR_DELAY_RATIO = 0.14;
const HERO_BLUEPRINT_DEFAULTS = {
  strength: 1,
  lineA: 0.2,
  lineB: 0.13,
  layerB: 0.92,
};
const HERO_BLUEPRINT_DUMBBELL = {
  strength: 1.65,
  lineA: 0.3,
  lineB: 0.19,
  layerB: 1,
};

function mapBlueprintVars({ strength, lineA, lineB, layerB }) {
  return {
    '--blueprint-strength': strength,
    '--blueprint-line-a': lineA,
    '--blueprint-line-b': lineB,
    '--blueprint-layer-b': layerB,
  };
}

const HERO_ASIDE_LINE_HIDDEN = { yPercent: 110, opacity: 0 };
const HERO_ASIDE_LINE_DELAY = 0.08;
const HERO_PHASE_SCROLL_IDS = [
  'hero-phase-benini-x',
  'hero-phase-dumbbell-pos',
  'hero-phase-dumbbell-rot',
  'hero-phase-dumbbell-scale',
  'hero-phase-blueprint',
  'hero-phase-blur',
  'hero-phase-results-shape',
  'hero-phase-text',
  'hero-manifesto-overlap',
  'manifesto-overlap-text',
];

function dumbbellScrollTriggerConfig(overrides = {}) {
  const config = {
    invalidateOnRefresh: true,
    ...overrides,
  };

  if (window.beniniUsesLenisScroller) {
    config.scroller = document.body;
  }

  return config;
}

function getHeroBlurLayers() {
  return [
    document.getElementById('hero-visual-blur-panel-left'),
    document.getElementById('hero-visual-blur-panel'),
    document.getElementById('hero-visual-blur-blueprint-grid'),
  ].filter(Boolean);
}

function killHeroPhaseScrolls() {
  if (typeof ScrollTrigger === 'undefined') return;

  HERO_PHASE_SCROLL_IDS.forEach((id) => ScrollTrigger.getById(id)?.kill());

  const aside = document.getElementById('benini-text-aside');
  if (aside) {
    aside.dataset.asideScrollReady = 'false';
    gsap.set(aside, { opacity: 0, visibility: 'hidden' });
    gsap.set(aside.querySelectorAll('.aside-line'), HERO_ASIDE_LINE_HIDDEN);
  }

  const blurLayers = getHeroBlurLayers();
  if (blurLayers.length) {
    gsap.set(blurLayers, { opacity: 0 });
  }

  const resultsShape = document.getElementById('hero-visual-results-shape');
  if (resultsShape) {
    gsap.set(resultsShape, { x: '100%', force3D: true });
  }

  const blueprintGrid = document.querySelector('.hero-visual-blueprint-grid');
  if (blueprintGrid) {
    gsap.set(blueprintGrid, mapBlueprintVars(HERO_BLUEPRINT_DEFAULTS));
  }

  resetHeroManifestoOverlapLayout();

  if (typeof window.killManifestoRevealScrolls === 'function') {
    window.killManifestoRevealScrolls();
  }
}

function resetHeroManifestoOverlapLayout() {
  const manifesto = document.getElementById('manifesto');
  document.body.classList.remove('is-hero-manifesto-overlap');

  if (!manifesto) {
    return;
  }

  gsap.set(manifesto, { clearProps: 'transform' });
  manifesto.classList.remove('section-manifesto--overlap-ready');
  manifesto.style.removeProperty('--hero-overlap-distance');
}

function getHeroHoldPhases(metrics) {
  const animationHoldPx = Math.max(1, metrics.animationHoldPx || 1);
  const dumbbellPx = Math.round(animationHoldPx * HERO_HOLD_PHASE_SPLIT.dumbbell);
  const blurPx = Math.round(animationHoldPx * HERO_HOLD_PHASE_SPLIT.blur);
  const textPx = Math.max(1, animationHoldPx - dumbbellPx - blurPx);
  const holdStartPx = Math.round(metrics.scrollDistance * metrics.mainRatio);

  return {
    holdStartPx,
    dumbbell: { startPx: holdStartPx, lengthPx: dumbbellPx },
    blur: { startPx: holdStartPx + dumbbellPx, lengthPx: blurPx },
    text: { startPx: holdStartPx + dumbbellPx + blurPx, lengthPx: textPx },
    overlap: {
      startPx: holdStartPx + dumbbellPx + blurPx + textPx,
      lengthPx: Math.max(1, metrics.overlapScroll || 0),
    },
  };
}

function initHeroManifestoOverlapScroll(trigger, phases, scrub) {
  const manifesto = document.getElementById('manifesto');
  const overlapPx = phases.overlap.lengthPx;

  if (!manifesto || !overlapPx) {
    return;
  }

  manifesto.style.setProperty('--hero-overlap-distance', `${overlapPx}px`);
  manifesto.classList.add('section-manifesto--overlap-ready');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(manifesto, { y: 0, clearProps: 'transform' });
    return;
  }

  gsap.set(manifesto, { y: overlapPx, force3D: true });
  gsap.to(manifesto, {
    y: 0,
    ease: 'none',
    immediateRender: false,
    scrollTrigger: dumbbellScrollTriggerConfig({
      id: 'hero-manifesto-overlap',
      trigger,
      ...phaseScrollRange(phases.overlap),
      scrub,
      onEnter: () => document.body.classList.add('is-hero-manifesto-overlap'),
      onEnterBack: () => document.body.classList.add('is-hero-manifesto-overlap'),
      onLeave: () => document.body.classList.remove('is-hero-manifesto-overlap'),
      onLeaveBack: () => document.body.classList.remove('is-hero-manifesto-overlap'),
    }),
  });
}

function phaseScrollRange(phase) {
  return {
    start: `top+=${phase.startPx} top`,
    end: `+=${phase.lengthPx}`,
  };
}

function getResultsShapePhase(blurPhase) {
  const delayPx = Math.round(blurPhase.lengthPx * HERO_RESULTS_SHAPE_BLUR_DELAY_RATIO);

  return {
    startPx: blurPhase.startPx + delayPx,
    lengthPx: Math.max(1, blurPhase.lengthPx - delayPx),
  };
}

function prepareDumbbellForScroll() {
  const dumbbell = window._dumbbell;
  if (!dumbbell) return null;

  const baseScale = window._dumbbellFittedScale || dumbbell.scale.x;
  const scaleStart = baseScale * DUMBBELL_SCALE_START_MULT;
  const scaleEnd = baseScale * DUMBBELL_SCALE_END_MULT;

  dumbbell.position.set(5, 0.35, 0);
  dumbbell.scale.setScalar(scaleStart);
  dumbbell.rotation.z = 0;
  dumbbell.visible = true;
  dumbbell.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material.transparent = false;
    child.material.opacity = 1;
    child.material.needsUpdate = true;
  });

  return { dumbbell, scaleStart, scaleEnd };
}

function initHeroVideoPhaseScroll() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  const metrics = window.__heroVideoScrollMetrics;
  const wrap = document.getElementById('hero-visual-scroll-wrap');
  if (!metrics || !wrap) {
    requestAnimationFrame(initHeroVideoPhaseScroll);
    return;
  }

  killHeroPhaseScrolls();

  const phases = getHeroHoldPhases(metrics);
  const trigger = wrap;
  const scrub = 1.5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroVisual = document.getElementById('hero-visual');
  if (heroVisual) {
    gsap.set(heroVisual, { x: 0 });
  }

  const foto = document.getElementById('hero-visual-benini');
  const dumbbellState = prepareDumbbellForScroll();

  if (!reducedMotion && foto) {
    gsap.set(foto, { x: 0 });
    gsap.to(foto, {
      x: '-30vw',
      ease: 'none',
      scrollTrigger: dumbbellScrollTriggerConfig({
        id: 'hero-phase-benini-x',
        trigger,
        ...phaseScrollRange(phases.dumbbell),
        scrub,
      }),
    });
  }

  if (!reducedMotion && dumbbellState) {
    const { dumbbell, scaleStart, scaleEnd } = dumbbellState;
    const range = phaseScrollRange(phases.dumbbell);

    gsap.to(dumbbell.position, {
      x: 0,
      y: 0.35,
      ease: 'none',
      scrollTrigger: dumbbellScrollTriggerConfig({
        id: 'hero-phase-dumbbell-pos',
        trigger,
        ...range,
        scrub,
      }),
    });

    gsap.to(dumbbell.rotation, {
      z: Math.PI * 4,
      ease: 'none',
      scrollTrigger: dumbbellScrollTriggerConfig({
        id: 'hero-phase-dumbbell-rot',
        trigger,
        ...range,
        scrub,
      }),
    });

    gsap.fromTo(
      dumbbell.scale,
      { x: scaleStart, y: scaleStart, z: scaleStart },
      {
        x: scaleEnd,
        y: scaleEnd,
        z: scaleEnd,
        ease: 'none',
        scrollTrigger: dumbbellScrollTriggerConfig({
          id: 'hero-phase-dumbbell-scale',
          trigger,
          ...range,
          scrub,
        }),
      }
    );
  }

  const blueprintGrid = document.querySelector('.hero-visual-blueprint-grid');
  if (!reducedMotion && blueprintGrid && dumbbellState) {
    gsap.set(blueprintGrid, mapBlueprintVars(HERO_BLUEPRINT_DEFAULTS));
    gsap.fromTo(
      blueprintGrid,
      mapBlueprintVars(HERO_BLUEPRINT_DEFAULTS),
      {
        ...mapBlueprintVars(HERO_BLUEPRINT_DUMBBELL),
        ease: 'none',
        scrollTrigger: dumbbellScrollTriggerConfig({
          id: 'hero-phase-blueprint',
          trigger,
          ...phaseScrollRange(phases.dumbbell),
          scrub,
        }),
      }
    );
  }

  const blurLayers = getHeroBlurLayers();
  if (blurLayers.length) {
    gsap.set(blurLayers, { opacity: 0 });
    if (!reducedMotion) {
      gsap.fromTo(
        blurLayers,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: dumbbellScrollTriggerConfig({
            id: 'hero-phase-blur',
            trigger,
            ...phaseScrollRange(phases.blur),
            scrub,
          }),
        }
      );
    }
  }

  const resultsShape = document.getElementById('hero-visual-results-shape');
  if (resultsShape) {
    gsap.set(resultsShape, { x: '100%', force3D: true });
    if (!reducedMotion) {
      gsap.fromTo(
        resultsShape,
        { x: '100%' },
        {
          x: '0%',
          ease: 'none',
          force3D: true,
          scrollTrigger: dumbbellScrollTriggerConfig({
            id: 'hero-phase-results-shape',
            trigger,
            ...phaseScrollRange(getResultsShapePhase(phases.blur)),
            scrub,
          }),
        }
      );
    } else {
      gsap.set(resultsShape, { x: '0%' });
    }
  }

  const aside = document.getElementById('benini-text-aside');
  const lines = aside?.querySelectorAll('.aside-line');

  if (aside && lines?.length) {
    if (reducedMotion) {
      gsap.set(aside, { opacity: 1, visibility: 'visible' });
      gsap.set(lines, { opacity: 1, yPercent: 0 });
      aside.dataset.asideScrollReady = 'true';
    } else {
      aside.dataset.asideScrollReady = 'true';
      gsap.set(aside, { opacity: 0, visibility: 'hidden' });
      gsap.set(lines, HERO_ASIDE_LINE_HIDDEN);

      const tl = gsap.timeline({
        scrollTrigger: dumbbellScrollTriggerConfig({
          id: 'hero-phase-text',
          trigger,
          ...phaseScrollRange(phases.text),
          scrub,
        }),
      });

      tl.set(aside, { visibility: 'visible' }, 0);
      tl.to(aside, { opacity: 1, ease: 'none', duration: 0.05 }, 0);
      tl.fromTo(
        lines,
        HERO_ASIDE_LINE_HIDDEN,
        {
          yPercent: 0,
          opacity: 1,
          ease: 'none',
          duration: 0.48,
          stagger: { each: HERO_ASIDE_LINE_DELAY, from: 'start' },
        },
        HERO_ASIDE_LINE_DELAY
      );
    }
  }

  if (!reducedMotion) {
    initHeroManifestoOverlapScroll(trigger, phases, scrub);

    if (typeof window.initManifestoOverlapRevealScroll === 'function') {
      window.initManifestoOverlapRevealScroll(trigger, phases, scrub);
    }
  } else if (typeof window.registerManifestoViewportReveal === 'function') {
    window.registerManifestoViewportReveal();
  }
}

function initDumbbellScroll() {
  prepareDumbbellForScroll();
  initHeroVideoPhaseScroll();
}

function startOrbit() {
  if (!window._dumbbell || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  const wrap = document.getElementById('hero-visual-scroll-wrap');
  const videoST = ScrollTrigger.getById('hero-video-scrub');

  if (!wrap || !videoST) {
    requestAnimationFrame(startOrbit);
    return;
  }

  const proxy = { angle: 0 };

  const scrollConfig = {
    trigger: wrap,
    start: videoST.start,
    end: videoST.end,
    scrub: 1.5,
    invalidateOnRefresh: true,
  };

  if (window.beniniUsesLenisScroller) {
    scrollConfig.scroller = document.body;
  }

  gsap.to(proxy, {
    angle: Math.PI * 2,
    ease: 'none',
    scrollTrigger: scrollConfig,
    onUpdate() {
      const x = Math.cos(proxy.angle) * 1.4;
      const y = Math.sin(proxy.angle) * 0.9;
      const z = Math.sin(proxy.angle) * 1.0;

      window._dumbbell.position.set(x, y, z);
      window._dumbbell.scale.setScalar(0.7 + ((z + 1) / 2) * 0.5);
    },
  });
}

function initDumbbellOrbit() {
  if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
    return;
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const slot = document.getElementById('hero-visual-gltf-slot');
  if (!slot) return;

  const W = Math.max(slot.offsetWidth, 1);
  const H = Math.max(slot.offsetHeight, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  window.beniniCamera = camera;
  camera.position.set(0, 0.08, 4.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.physicallyCorrectLights = true;
  slot.appendChild(renderer.domElement);
  renderer.domElement.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

  addDumbbellLights(scene);

  const loader = new THREE.GLTFLoader();
  loader.load(DUMBBELL_MODEL_URL, (gltf) => {
    const model = gltf.scene;

    model.traverse((child) => {
      if (!child.isMesh) return;
      configureGltfMaterial(child.material);
    });

    const fittedScale = fitModelToScene(model);
    scene.add(model);
    window._dumbbell = model;
    window._dumbbellFittedScale = fittedScale;
    initDumbbellScroll();
  });

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }
  render();

  window.beniniScene = scene;
  window.beniniRenderer = renderer;
}

function initHeroBlueprintGridParallax() {
  const section = document.getElementById('hero-visual');
  const grids = [
    document.querySelector('.hero-visual-blueprint-grid:not(.hero-visual-blueprint-grid--blur)'),
    document.getElementById('hero-visual-blur-blueprint-grid'),
  ].filter(Boolean);

  if (
    !section ||
    !grids.length ||
    typeof gsap === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  ) {
    return;
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const maxShift = window.matchMedia('(max-width: 768px)').matches ? 10 : 18;
  const smooth = 0.11;

  gsap.set(grids, { x: 0, y: 0, force3D: true });

  const resetTarget = () => {
    targetX = 0;
    targetY = 0;
  };

  const updateTarget = (clientX, clientY) => {
    const rect = section.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = (clientX - rect.left) / rect.width - 0.5;
    const ny = (clientY - rect.top) / rect.height - 0.5;

    targetX = -nx * maxShift;
    targetY = -ny * maxShift;
  };

  const onDocumentMove = (event) => {
    const rect = section.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      if (targetX !== 0 || targetY !== 0) resetTarget();
      return;
    }

    updateTarget(event.clientX, event.clientY);
  };

  document.addEventListener('mousemove', onDocumentMove, { passive: true });
  section.addEventListener('mouseleave', resetTarget);

  gsap.ticker.add(() => {
    currentX += (targetX - currentX) * smooth;
    currentY += (targetY - currentY) * smooth;

    if (Math.abs(currentX) < 0.02 && Math.abs(targetX) < 0.02) currentX = 0;
    if (Math.abs(currentY) < 0.02 && Math.abs(targetY) < 0.02) currentY = 0;

    gsap.set(grids, { x: currentX, y: currentY, force3D: true });
  });
}

window.initDumbbellOrbit = initDumbbellOrbit;
window.initHeroDumbbell = initDumbbellOrbit;
window.initDumbbellScroll = initDumbbellScroll;
window.initHeroVideoPhaseScroll = initHeroVideoPhaseScroll;
window.initHeroBlueprintGridParallax = initHeroBlueprintGridParallax;
window.killHeroPhaseScrolls = killHeroPhaseScrolls;
window.startOrbit = startOrbit;
window.updateHeroDumbbell = () => {};
