'use strict';

const WOMAN_MODEL_URLS = [
  'models/3d/Woman-Models/athlete_in_black_and_red_activewear.glb',
  'models/3d/Woman-Models/stretching_in_a_gray_workout_set.glb',
  'models/3d/Woman-Models/stretching_in_lilac_workout_set.glb',
  'models/3d/Woman-Models/stretching_pose_in_black_workout_set.glb',
];

const WOMAN_MODEL_TARGET_HEIGHT = 2.482;
const WOMAN_MODEL_SPACING = 1.88;
const WOMAN_MODEL_CAMERA_PADDING = 1.14;
const WOMAN_WIREFRAME_FILL = 0xeeebdd;
const WOMAN_WIREFRAME_LINE = 0x1a1618;
const WOMAN_MOUSE_YAW_MAX = 0.2;
const WOMAN_MOUSE_INTERACTION_SMOOTH = 0.09;
const WOMAN_HOVER_SCALE_MULT = 1.055;
const WOMAN_GLITCH_TO_TEXTURED = [
  { w: 1, t: 0, ms: 48, j: 0.014 },
  { w: 0, t: 1, ms: 38, j: -0.02 },
  { w: 1, t: 0, ms: 32, j: 0.018 },
  { w: 0, t: 1, ms: 42, j: -0.012 },
  { w: 1, t: 1, ms: 28, j: 0 },
  { w: 0, t: 1, ms: 52, j: 0 },
];
const WOMAN_GLITCH_TO_WIREFRAME = [
  { w: 0, t: 1, ms: 44, j: -0.016 },
  { w: 1, t: 0, ms: 36, j: 0.02 },
  { w: 0, t: 1, ms: 34, j: -0.014 },
  { w: 1, t: 0, ms: 40, j: 0.012 },
  { w: 1, t: 0, ms: 30, j: 0 },
  { w: 1, t: 0, ms: 48, j: 0 },
];

const WOMAN_PERSONA_COPY = [
  { title: 'Persona 01', subtitle: 'Adicione um subtítulo para esta persona.' },
  { title: 'Persona 02', subtitle: 'Adicione um subtítulo para esta persona.' },
  { title: 'Persona 03', subtitle: 'Adicione um subtítulo para esta persona.' },
  { title: 'Persona 04', subtitle: 'Adicione um subtítulo para esta persona.' },
];

const WOMAN_FOCUS_SCALE_MULT = 1.08;

const WOMAN_MODEL_ROTATION_Y = {
  'athlete_in_black_and_red_activewear.glb': Math.PI / 2,
};

function getWomanModelRotationY(url) {
  const filename = url.split('/').pop();
  return WOMAN_MODEL_ROTATION_Y[filename] ?? 0;
}

function configureWomanModelMaterial(material) {
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

function cloneWomanModelMaterial(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    return material.map(cloneWomanModelMaterial);
  }
  const cloned = material.clone();
  configureWomanModelMaterial(cloned);
  return cloned;
}

function createWomanWireframeMesh(mesh) {
  const geometry = mesh.geometry;
  const skinned = mesh.isSkinnedMesh;
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: WOMAN_WIREFRAME_FILL,
    side: THREE.DoubleSide,
    skinning: skinned,
  });
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: WOMAN_WIREFRAME_LINE,
    wireframe: true,
    side: THREE.DoubleSide,
    skinning: skinned,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const shell = new THREE.Group();
  shell.name = mesh.name ? `${mesh.name}-wireframe` : 'wireframe-shell';

  const fillMesh = skinned
    ? new THREE.SkinnedMesh(geometry, fillMaterial)
    : new THREE.Mesh(geometry, fillMaterial);
  const lineMesh = skinned
    ? new THREE.SkinnedMesh(geometry, lineMaterial)
    : new THREE.Mesh(geometry, lineMaterial);

  if (skinned) {
    fillMesh.bind(mesh.skeleton, mesh.bindMatrix);
    lineMesh.bind(mesh.skeleton, mesh.bindMatrix);
    fillMesh.frustumCulled = mesh.frustumCulled;
    lineMesh.frustumCulled = mesh.frustumCulled;
  }

  shell.add(fillMesh);
  shell.add(lineMesh);
  shell.position.copy(mesh.position);
  shell.rotation.copy(mesh.rotation);
  shell.scale.copy(mesh.scale);

  return shell;
}

function createWomanTexturedMesh(mesh) {
  const geometry = mesh.geometry;
  const skinned = mesh.isSkinnedMesh;
  const material = cloneWomanModelMaterial(mesh.material);
  const texturedMesh = skinned
    ? new THREE.SkinnedMesh(geometry, material)
    : new THREE.Mesh(geometry, material);

  if (skinned) {
    texturedMesh.bind(mesh.skeleton, mesh.bindMatrix);
    texturedMesh.frustumCulled = mesh.frustumCulled;
  }

  texturedMesh.position.copy(mesh.position);
  texturedMesh.rotation.copy(mesh.rotation);
  texturedMesh.scale.copy(mesh.scale);

  return texturedMesh;
}

function setupWomanModelLayers(model) {
  const wireframeLayer = new THREE.Group();
  wireframeLayer.name = 'wireframe-layer';
  const texturedLayer = new THREE.Group();
  texturedLayer.name = 'textured-layer';
  texturedLayer.visible = false;

  const meshes = [];
  model.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });

  meshes.forEach((mesh) => {
    const parent = mesh.parent;
    if (!parent) return;

    texturedLayer.add(createWomanTexturedMesh(mesh));
    wireframeLayer.add(createWomanWireframeMesh(mesh));
    parent.remove(mesh);
  });

  model.add(texturedLayer);
  model.add(wireframeLayer);

  model.userData.wireframeLayer = wireframeLayer;
  model.userData.texturedLayer = texturedLayer;
  model.userData.displayMode = 'wireframe';
  model.userData.glitchRunning = false;
  model.userData.glitchTimer = null;
}

function cancelWomanGlitch(model) {
  if (model.userData.glitchTimer) {
    clearTimeout(model.userData.glitchTimer);
    model.userData.glitchTimer = null;
  }
  model.userData.glitchRunning = false;
}

function applyWomanGlitchStep(model, step) {
  const { wireframeLayer, texturedLayer } = model.userData;
  wireframeLayer.visible = Boolean(step.w);
  texturedLayer.visible = Boolean(step.t);
  const jitter = step.j || 0;
  wireframeLayer.position.x = jitter;
  texturedLayer.position.x = -jitter * 0.65;
}

function runWomanGlitchTransition(model, mode, instant = false) {
  const { wireframeLayer, texturedLayer } = model.userData;
  if (!wireframeLayer || !texturedLayer) return;

  if (model.userData.displayMode === mode && !model.userData.glitchRunning) {
    return;
  }

  cancelWomanGlitch(model);

  if (instant) {
    wireframeLayer.visible = mode === 'wireframe';
    texturedLayer.visible = mode === 'textured';
    wireframeLayer.position.x = 0;
    texturedLayer.position.x = 0;
    model.userData.displayMode = mode;
    return;
  }

  const steps = mode === 'textured' ? WOMAN_GLITCH_TO_TEXTURED : WOMAN_GLITCH_TO_WIREFRAME;
  let stepIndex = 0;
  model.userData.glitchRunning = true;

  const runStep = () => {
    if (stepIndex >= steps.length) {
      wireframeLayer.visible = mode === 'wireframe';
      texturedLayer.visible = mode === 'textured';
      wireframeLayer.position.x = 0;
      texturedLayer.position.x = 0;
      model.userData.displayMode = mode;
      model.userData.glitchRunning = false;
      model.userData.glitchTimer = null;
      return;
    }

    const step = steps[stepIndex];
    stepIndex += 1;
    applyWomanGlitchStep(model, step);
    model.userData.glitchTimer = setTimeout(runStep, step.ms);
  };

  runStep();
}

function prepareWomanModel(model) {
  setupWomanModelLayers(model);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = WOMAN_MODEL_TARGET_HEIGHT / Math.max(size.y, 0.001);

  model.position.sub(center);
  model.scale.setScalar(scale);

  box.setFromObject(model);
  model.position.y -= box.min.y;

  return scale;
}

function addWomanModelsLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.62));

  const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.55);
  keyLight.position.set(2, 5, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd99f66, 0.85);
  fillLight.position.set(-4, 2, 4);
  scene.add(fillLight);
}

function loadWomanModel(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

function layoutWomanModelsRow(group) {
  const count = group.children.length;
  const startX = -((count - 1) * WOMAN_MODEL_SPACING) / 2;

  group.children.forEach((model, index) => {
    model.position.x = startX + index * WOMAN_MODEL_SPACING;
  });
}

function centerWomanModelsGroup(group) {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());

  group.position.x -= center.x;
  group.position.y -= box.min.y;
}

function bindWomanModelInteractionState(model, baseRotationY) {
  const baseScale = model.scale.x;

  model.userData.baseRotationY = baseRotationY;
  model.userData.targetRotationY = baseRotationY;
  model.userData.currentRotationY = baseRotationY;
  model.rotation.y = baseRotationY;

  model.userData.baseScale = baseScale;
  model.userData.targetScale = baseScale;
  model.userData.currentScale = baseScale;
  model.scale.setScalar(baseScale);
}

function initWomanModelsCursorParallax(section, models) {
  if (
    !section ||
    !models.length ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  ) {
    return null;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeHoverIndex = -1;

  const setModelDisplay = (model, mode) => {
    runWomanGlitchTransition(model, mode, reducedMotion);
  };

  const resetTargets = () => {
    models.forEach((model) => {
      model.userData.targetRotationY = model.userData.baseRotationY;
      model.userData.targetScale = model.userData.baseScale;
    });
  };

  const updateHoverIndex = (index) => {
    if (index === activeHoverIndex) return;

    if (activeHoverIndex >= 0) {
      setModelDisplay(models[activeHoverIndex], 'wireframe');
    }

    if (index >= 0) {
      setModelDisplay(models[index], 'textured');
    }

    activeHoverIndex = index;
  };

  const updateFromPointer = (clientX) => {
    if (section.classList.contains('section-woman-models--focused')) {
      return;
    }

    const rect = section.getBoundingClientRect();
    if (!rect.width) return;

    const localX = clientX - rect.left;
    if (localX < 0 || localX > rect.width) {
      updateHoverIndex(-1);
      resetTargets();
      return;
    }

    const columnWidth = rect.width / models.length;
    const index = Math.min(models.length - 1, Math.max(0, Math.floor(localX / columnWidth)));
    const columnStart = index * columnWidth;
    const normalized = (localX - columnStart) / columnWidth - 0.5;

    updateHoverIndex(index);

    models.forEach((model, modelIndex) => {
      if (modelIndex === index) {
        model.userData.targetRotationY =
          model.userData.baseRotationY + normalized * 2 * WOMAN_MOUSE_YAW_MAX;
        model.userData.targetScale = model.userData.baseScale * WOMAN_HOVER_SCALE_MULT;
      } else {
        model.userData.targetRotationY = model.userData.baseRotationY;
        model.userData.targetScale = model.userData.baseScale;
      }
    });
  };

  const onMove = (event) => updateFromPointer(event.clientX);
  const onLeave = () => {
    if (section.classList.contains('section-woman-models--focused')) {
      return;
    }

    updateHoverIndex(-1);
    resetTargets();
  };

  section.addEventListener('mousemove', onMove, { passive: true });
  section.addEventListener('mouseleave', onLeave);

  return () => {
    section.removeEventListener('mousemove', onMove);
    section.removeEventListener('mouseleave', onLeave);
    updateHoverIndex(-1);
    resetTargets();
    models.forEach(cancelWomanGlitch);
  };
}

function tickWomanModelsInteraction(models) {
  models.forEach((model) => {
    const currentRot = model.userData.currentRotationY ?? model.rotation.y;
    const targetRot = model.userData.targetRotationY ?? model.userData.baseRotationY ?? model.rotation.y;
    const nextRot = currentRot + (targetRot - currentRot) * WOMAN_MOUSE_INTERACTION_SMOOTH;

    if (Math.abs(nextRot - targetRot) < 0.0004) {
      model.userData.currentRotationY = targetRot;
      model.rotation.y = targetRot;
    } else {
      model.userData.currentRotationY = nextRot;
      model.rotation.y = nextRot;
    }

    const currentScale = model.userData.currentScale ?? model.scale.x;
    const targetScale = model.userData.targetScale ?? model.userData.baseScale ?? model.scale.x;
    const nextScale = currentScale + (targetScale - currentScale) * WOMAN_MOUSE_INTERACTION_SMOOTH;

    if (Math.abs(nextScale - targetScale) < 0.0002) {
      model.userData.currentScale = targetScale;
      model.scale.setScalar(targetScale);
    } else {
      model.userData.currentScale = nextScale;
      model.scale.setScalar(nextScale);
    }
  });
}

function updateWomanModelsFocusCutout(section, index, count) {
  const colWidth = 100 / count;
  const pad = colWidth * 0.04;
  const cutLeft = Math.max(0, index * colWidth - pad);
  const cutRight = Math.min(100, (index + 1) * colWidth + pad);
  const feather = Math.max(2, colWidth * 0.11);

  section.style.setProperty('--focus-cut-left', `${cutLeft}%`);
  section.style.setProperty('--focus-cut-right', `${cutRight}%`);
  section.style.setProperty('--focus-feather', `${feather}%`);
}

function positionWomanModelsFocusPanel(section, panel, index, count) {
  const colWidth = 100 / count;
  const colLeft = index * colWidth;
  const colRight = (index + 1) * colWidth;
  const placeOnRight = index < count / 2;

  panel.classList.toggle('is-left', !placeOnRight);
  panel.style.left = placeOnRight ? `calc(${colRight}% + 16px)` : 'auto';
  panel.style.right = placeOnRight ? 'auto' : `calc(${100 - colLeft}% + 16px)`;
}

function initWomanModelsUI(section, models) {
  if (!section || !models.length || section.querySelector('.woman-models-ui')) {
    return null;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ui = document.createElement('div');
  ui.className = 'woman-models-ui';
  ui.id = 'woman-models-ui';

  const columnsEl = document.createElement('div');
  columnsEl.className = 'woman-models-columns';
  columnsEl.style.gridTemplateColumns = `repeat(${models.length}, 1fr)`;

  const focusOverlay = document.createElement('div');
  focusOverlay.className = 'woman-models-focus-overlay';
  focusOverlay.setAttribute('aria-hidden', 'true');

  const count = models.length;

  models.forEach((_, index) => {
    const column = document.createElement('button');
    column.type = 'button';
    column.className = 'woman-models-column';
    column.dataset.index = String(index);
    column.setAttribute('aria-label', `Selecionar persona ${index + 1}`);

    const hint = document.createElement('span');
    hint.className = 'woman-models-click-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Click';
    column.appendChild(hint);
    columnsEl.appendChild(column);
  });

  const panel = document.createElement('aside');
  panel.className = 'woman-models-focus-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <button type="button" class="woman-models-focus-close" aria-label="Fechar detalhe da persona">×</button>
    <h3 class="woman-models-focus-title"></h3>
    <p class="woman-models-focus-subtitle"></p>
  `;

  const titleEl = panel.querySelector('.woman-models-focus-title');
  const subtitleEl = panel.querySelector('.woman-models-focus-subtitle');
  const closeBtn = panel.querySelector('.woman-models-focus-close');

  ui.append(focusOverlay, columnsEl, panel);
  section.appendChild(ui);

  let focusedIndex = -1;

  const setModelDisplay = (model, mode) => {
    runWomanGlitchTransition(model, mode, reducedMotion);
  };

  const applyFocusTargets = (index) => {
    models.forEach((model, modelIndex) => {
      if (modelIndex === index) {
        model.userData.targetRotationY = model.userData.baseRotationY;
        model.userData.targetScale = model.userData.baseScale * WOMAN_FOCUS_SCALE_MULT;
        return;
      }

      model.userData.targetRotationY = model.userData.baseRotationY;
      model.userData.targetScale = model.userData.baseScale;
    });
  };

  const resetFocusTargets = () => {
    models.forEach((model) => {
      model.userData.targetRotationY = model.userData.baseRotationY;
      model.userData.targetScale = model.userData.baseScale;
    });
  };

  const setActiveColumn = (index) => {
    columnsEl.querySelectorAll('.woman-models-column').forEach((column) => {
      const isActive = index >= 0 && Number(column.dataset.index) === index;
      column.dataset.active = isActive ? 'true' : 'false';
    });
  };

  const exitFocus = () => {
    if (focusedIndex < 0) return;

    const previousIndex = focusedIndex;
    focusedIndex = -1;

    section.classList.remove('section-woman-models--focused');
    delete section.dataset.focusedIndex;
    panel.setAttribute('aria-hidden', 'true');
    setActiveColumn(-1);

    section.style.removeProperty('--focus-cut-left');
    section.style.removeProperty('--focus-cut-right');
    section.style.removeProperty('--focus-feather');

    setModelDisplay(models[previousIndex], 'wireframe');
    resetFocusTargets();
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

    updateWomanModelsFocusCutout(section, index, count);
    setActiveColumn(index);

    const copy = WOMAN_PERSONA_COPY[index] || WOMAN_PERSONA_COPY[0];
    titleEl.textContent = copy.title;
    subtitleEl.textContent = copy.subtitle;

    positionWomanModelsFocusPanel(section, panel, index, count);

    models.forEach((model, modelIndex) => {
      setModelDisplay(model, modelIndex === index ? 'textured' : 'wireframe');
    });
    applyFocusTargets(index);
  };

  columnsEl.addEventListener('click', (event) => {
    const column = event.target.closest('.woman-models-column');
    if (!column) return;

    enterFocus(Number(column.dataset.index));
  });

  focusOverlay.addEventListener('click', () => {
    exitFocus();
  });

  closeBtn.addEventListener('click', exitFocus);

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && focusedIndex >= 0) {
      exitFocus();
    }
  };

  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    exitFocus();
    ui.remove();
  };
}

function fitWomanModelsCamera(camera, group, aspect) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const pad = WOMAN_MODEL_CAMERA_PADDING;

  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distForHeight = (size.y * 0.5 * pad) / Math.tan(vFov / 2);
  const distForWidth = (size.x * 0.5 * pad) / Math.tan(hFov / 2);
  const distance = Math.max(distForHeight, distForWidth, 4.2);

  camera.position.set(center.x, center.y, center.z + distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

function initWomanModelsStage() {
  const section = document.getElementById('woman-models');
  const stage = document.getElementById('woman-models-stage');
  if (
    !section ||
    !stage ||
    typeof THREE === 'undefined' ||
    typeof THREE.GLTFLoader === 'undefined'
  ) {
    return;
  }

  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  stage.appendChild(renderer.domElement);
  renderer.domElement.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';

  addWomanModelsLights(scene);

  const resize = () => {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    if (group.children.length) {
      fitWomanModelsCamera(camera, group, camera.aspect);
    }
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);

  const loader = new THREE.GLTFLoader();

  let loadedModels = [];

  Promise.all(WOMAN_MODEL_URLS.map((url) => loadWomanModel(loader, url)))
    .then((models) => {
      loadedModels = models;

      models.forEach((model, index) => {
        prepareWomanModel(model);
        bindWomanModelInteractionState(model, getWomanModelRotationY(WOMAN_MODEL_URLS[index]));
        group.add(model);
      });

      layoutWomanModelsRow(group);
      centerWomanModelsGroup(group);
      fitWomanModelsCamera(camera, group, camera.aspect);
      initWomanModelsCursorParallax(section, models);
      initWomanModelsUI(section, models);
    })
    .catch((err) => {
      console.error('[Benini Squad] Falha ao carregar modelos femininos:', err);
    });

  const render = () => {
    requestAnimationFrame(render);
    if (loadedModels.length) {
      tickWomanModelsInteraction(loadedModels);
    }
    renderer.render(scene, camera);
  };

  render();
}

window.initWomanModelsStage = initWomanModelsStage;
