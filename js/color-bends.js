/**
 * ColorBends background (vanilla port of React Bits ColorBends).
 */
(function registerBeniniColorBends(global) {
  const MAX_COLORS = 8;

  const DEFAULT_CONFIG = {
    colors: ['#b07f48', '#d99f66', '#e8be96'],
    rotation: 90,
    autoRotate: 0,
    speed: 0.08,
    scale: 1,
    frequency: 1.1,
    warpStrength: 1,
    mouseInfluence: 1,
    noise: 0,
    parallax: 0.5,
    iterations: 1,
    intensity: 0.9,
    bandWidth: 4,
    transparent: true,
  };

  const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  for (int j = 0; j < 5; j++) {
    if (j >= uIterations - 1) break;
    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q += (rr - q) * 0.15;
  }

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  col *= uIntensity;

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

  const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

  function hexToVec3(hex) {
    const h = hex.replace('#', '').trim();
    const v =
      h.length === 3
        ? [
            parseInt(h[0] + h[0], 16),
            parseInt(h[1] + h[1], 16),
            parseInt(h[2] + h[2], 16),
          ]
        : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
  }

  function initBeniniColorBends(section, container, configOverrides) {
    if (!section || !container || typeof THREE === 'undefined') return null;

    const CONFIG = { ...DEFAULT_CONFIG, ...configOverrides };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uColorsArray = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: CONFIG.speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: 0 },
        uColors: { value: uColorsArray },
        uTransparent: { value: CONFIG.transparent ? 1 : 0 },
        uScale: { value: CONFIG.scale },
        uFrequency: { value: CONFIG.frequency },
        uWarpStrength: { value: CONFIG.warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: CONFIG.mouseInfluence },
        uParallax: { value: CONFIG.parallax },
        uNoise: { value: CONFIG.noise },
        uIterations: { value: CONFIG.iterations },
        uIntensity: { value: CONFIG.intensity },
        uBandWidth: { value: CONFIG.bandWidth },
      },
      premultipliedAlpha: true,
      transparent: true,
    });

    const colorVecs = (CONFIG.colors || []).filter(Boolean).slice(0, MAX_COLORS).map(hexToVec3);
    for (let i = 0; i < MAX_COLORS; i++) {
      const vec = material.uniforms.uColors.value[i];
      if (i < colorVecs.length) vec.copy(colorVecs[i]);
      else vec.set(0, 0, 0);
    }
    material.uniforms.uColorCount.value = colorVecs.length;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true,
    });
    if ('outputEncoding' in renderer) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, CONFIG.transparent ? 0 : 1);
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    const pointerTarget = new THREE.Vector2(0, 0);
    const pointerCurrent = new THREE.Vector2(0, 0);
    const pointerSmooth = 8;
    const rotationDeg = CONFIG.rotation;
    let rafId = null;
    let isVisible = true;
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function handleResize() {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      material.uniforms.uCanvas.value.set(w, h);
    }

    handleResize();
    let resizeObserver = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    function handlePointerMove(e) {
      const rect = section.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((e.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      pointerTarget.set(x, y);
    }

    section.addEventListener('pointermove', handlePointerMove);

    function loop() {
      rafId = requestAnimationFrame(loop);
      if (!isVisible || reducedMotion) return;

      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;

      const deg = (rotationDeg % 360) + CONFIG.autoRotate * elapsed;
      const rad = (deg * Math.PI) / 180;
      material.uniforms.uRot.value.set(Math.cos(rad), Math.sin(rad));

      const amt = Math.min(1, dt * pointerSmooth);
      pointerCurrent.lerp(pointerTarget, amt);
      material.uniforms.uPointer.value.copy(pointerCurrent);

      renderer.render(scene, camera);
    }

    let intersectionObserver = null;
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          isVisible = entries.some((e) => e.isIntersecting);
        },
        { root: null, threshold: 0.05 }
      );
      intersectionObserver.observe(section);
    }

    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (e) => {
      reducedMotion = e.matches;
    };
    if (motionMq.addEventListener) {
      motionMq.addEventListener('change', onMotionChange);
    }

    loop();

    return function disposeBeniniColorBends() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      section.removeEventListener('pointermove', handlePointerMove);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', handleResize);
      if (intersectionObserver) intersectionObserver.disconnect();
      if (motionMq.removeEventListener) {
        motionMq.removeEventListener('change', onMotionChange);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }

  global.BENINI_COLOR_BENDS_CONFIG = DEFAULT_CONFIG;
  global.initBeniniColorBends = initBeniniColorBends;
})(window);
