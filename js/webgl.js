'use strict';

const DUMBBELL_MODEL_URL = 'models/3d/domyos_dumbbell.glb';

/* ─────────────────────────────────────────────
   7. OGL — WebGL background (particle field)
   ───────────────────────────────────────────── */
function initOGLBackground() {
  const canvas = document.getElementById('hero-visual-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const vert = `
    attribute vec2 a_pos;
    attribute float a_size;
    attribute float a_alpha;
    varying float v_alpha;
    uniform float u_time;
    void main() {
      vec2 p = a_pos;
      p.y += sin(u_time * 0.4 + a_pos.x * 3.14) * 0.015;
      p.x += cos(u_time * 0.3 + a_pos.y * 3.14) * 0.01;
      gl_Position = vec4(p, 0.0, 1.0);
      gl_PointSize = a_size;
      v_alpha = a_alpha;
    }
  `;

  const frag = `
    precision mediump float;
    varying float v_alpha;
    uniform vec3 u_color;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      float circle = 1.0 - smoothstep(0.3, 0.5, d);
      float glow   = 1.0 - smoothstep(0.0, 0.5, d);
      gl_FragColor = vec4(u_color, (circle * 0.9 + glow * 0.3) * v_alpha);
    }
  `;

  function mkShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const N = 220;
  const pos   = new Float32Array(N * 2);
  const sizes = new Float32Array(N);
  const alpha = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    pos[i * 2]     = Math.random() * 2 - 1;
    pos[i * 2 + 1] = Math.random() * 2 - 1;
    sizes[i]       = Math.random() * 3 + 1.2;
    alpha[i]       = Math.random() * 0.4 + 0.08;
  }

  const posBuf  = gl.createBuffer();
  const sizeBuf = gl.createBuffer();
  const alpBuf  = gl.createBuffer();

  const aPos   = gl.getAttribLocation(prog, 'a_pos');
  const aSize  = gl.getAttribLocation(prog, 'a_size');
  const aAlpha = gl.getAttribLocation(prog, 'a_alpha');
  const uTime  = gl.getUniformLocation(prog, 'u_time');
  const uColor = gl.getUniformLocation(prog, 'u_color');

  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aSize);
  gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, alpBuf);
  gl.bufferData(gl.ARRAY_BUFFER, alpha, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aAlpha);
  gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  const t0 = performance.now();

  function render() {
    const time = (performance.now() - t0) / 1000;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, time);
    gl.uniform3f(uColor, 0.85, 0.62, 0.40);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, N);
    requestAnimationFrame(render);
  }
  render();
}

/* ─────────────────────────────────────────────
   8. THREE.JS — Domyos dumbbell GLB
   Meshes: Bar, Gears, Plates (1kg/2kg) · M_Dumbbel PBR
   ───────────────────────────────────────────── */
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

function fitModelToScene(model, targetSize = 2.4) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetSize / maxDim;

  model.position.sub(center);
  model.scale.setScalar(scale);
  model.rotation.set(0.15, Math.PI * 0.28, 0.05);

  return { scale, maxDim, size };
}

function initThreeScene() {
  if (typeof THREE === 'undefined') return;
  if (typeof THREE.GLTFLoader === 'undefined') {
    console.error('[Benini Squad] GLTFLoader não carregado.');
    return;
  }

  const slot = document.getElementById('hero-visual-gltf-slot');
  if (!slot) return;

  const W = slot.offsetWidth || window.innerWidth;
  const H = slot.offsetHeight || 480;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0.15, 4.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.physicallyCorrectLights = true;
  slot.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

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

  const modelPivot = new THREE.Group();
  scene.add(modelPivot);

  let targetRX = 0;
  let targetRY = 0;
  let currentRX = 0;
  let currentRY = 0;
  let modelReady = false;

  const loader = new THREE.GLTFLoader();
  loader.load(
    DUMBBELL_MODEL_URL,
    (gltf) => {
      const model = gltf.scene;

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = false;
        configureGltfMaterial(child.material);
      });

      fitModelToScene(model);
      modelPivot.add(model);
      modelReady = true;
      window.gltfModel = modelPivot;

      console.log('[Benini Squad] Dumbbell GLB carregado:', DUMBBELL_MODEL_URL);
    },
    undefined,
    (err) => console.error('[Benini Squad] Erro ao carregar GLB:', err)
  );

  document.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetRY = nx * 0.25;
    targetRX = -ny * 0.12;
  });

  window.addEventListener('resize', () => {
    const nW = slot.offsetWidth || window.innerWidth;
    const nH = slot.offsetHeight || 480;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  });

  function animate() {
    requestAnimationFrame(animate);

    if (modelReady) {
      currentRX += (targetRX - currentRX) * 0.05;
      currentRY += (targetRY - currentRY) * 0.05;

      modelPivot.rotation.x += 0.0025;
      modelPivot.rotation.y += 0.004;

      modelPivot.rotation.x += (currentRX - modelPivot.rotation.x) * 0.018;
      modelPivot.rotation.y += (currentRY - modelPivot.rotation.y) * 0.018;
    }

    renderer.render(scene, camera);
  }
  animate();

  window.beniniScene = scene;
  window.beniniCamera = camera;
  window.beniniRenderer = renderer;
}

window.initOGLBackground = initOGLBackground;
window.initThreeScene = initThreeScene;
