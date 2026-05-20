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
const WOMAN_MODEL_MOBILE_SCALE = 0.76;
const WOMAN_MODEL_MOBILE_SPACING_X = 1.42;
const WOMAN_MODEL_MOBILE_ROW_GAP =
  WOMAN_MODEL_TARGET_HEIGHT * 1.2;
/** Wireframe — bege escuro (linhas) + preenchimento bege suave */
const WOMAN_WIREFRAME_FILL = 0xe2d9ca;
const WOMAN_WIREFRAME_LINE = 0x8a7d6b;
const WOMAN_LIGHTING_LERP = 0.11;
const WOMAN_LIGHTING_PRESETS = {
  wireframe: {
    exposure: 0.92,
    hemisphere: { sky: 0xf0ebe3, ground: 0x7a7068, intensity: 0.34 },
    ambient: 0.2,
    key: 0.68,
    fill: 0.24,
    rim: 0.14,
    portrait: 0,
  },
  textured: {
    exposure: 0.98,
    hemisphere: { sky: 0xfff6ec, ground: 0x5c524c, intensity: 0.4 },
    ambient: 0.14,
    key: 0.98,
    fill: 0.34,
    rim: 0.52,
    portrait: 0.38,
  },
};
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

  if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
    material.metalness = Math.min(material.metalness ?? 0, 0.12);
    material.roughness = Math.max(material.roughness ?? 0.58, 0.52);
    if (material.emissive) {
      material.emissive.setHex(0x000000);
    }
    material.emissiveIntensity = 0;
    if (typeof material.envMapIntensity === 'number') {
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.32);
    }
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
    transparent: true,
    opacity: 0,
    depthWrite: false,
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
  model.userData.nativeScale = scale;

  return scale;
}

function createWomanModelsLightingRig(scene) {
  const hemisphere = new THREE.HemisphereLight(0xf0ebe3, 0x7a7068, 0.34);
  const ambient = new THREE.AmbientLight(0xfff8f2, 0.2);
  const key = new THREE.DirectionalLight(0xfff0e4, 0.68);
  const fill = new THREE.DirectionalLight(0xc4b5a6, 0.24);
  const rim = new THREE.DirectionalLight(0xffe6c8, 0.14);
  const portrait = new THREE.PointLight(0xfff2e6, 0, 10, 22);

  key.position.set(2.4, 5.2, 5.8);
  fill.position.set(-3.8, 2.4, 4.2);
  rim.position.set(-0.8, 3.6, -5.2);
  portrait.position.set(0.6, 2.2, 4.5);

  scene.add(hemisphere, ambient, key, fill, rim, portrait);

  const rig = {
    hemisphere,
    ambient,
    key,
    fill,
    rim,
    portrait,
    targetMode: 'wireframe',
    current: { ...WOMAN_LIGHTING_PRESETS.wireframe, exposure: 0.92 },
    portraitTarget: null,
  };

  applyWomanModelsLightingSnapshot(rig, WOMAN_LIGHTING_PRESETS.wireframe, 0.92);
  return rig;
}

function applyWomanModelsLightingSnapshot(rig, preset, exposure) {
  rig.hemisphere.color.setHex(preset.hemisphere.sky);
  rig.hemisphere.groundColor.setHex(preset.hemisphere.ground);
  rig.hemisphere.intensity = preset.hemisphere.intensity;
  rig.ambient.intensity = preset.ambient;
  rig.key.intensity = preset.key;
  rig.fill.intensity = preset.fill;
  rig.rim.intensity = preset.rim;
  rig.portrait.intensity = preset.portrait;
  rig.current = { ...preset, exposure };
}

function setWomanModelsLightingMode(rig, renderer, mode, instant = false) {
  if (!rig || !WOMAN_LIGHTING_PRESETS[mode]) return;

  const preset = WOMAN_LIGHTING_PRESETS[mode];
  rig.targetMode = mode;
  rig.hemisphere.color.setHex(preset.hemisphere.sky);
  rig.hemisphere.groundColor.setHex(preset.hemisphere.ground);

  if (instant) {
    applyWomanModelsLightingSnapshot(rig, preset, preset.exposure);
    if (renderer) {
      renderer.toneMappingExposure = preset.exposure;
    }
  }
}

function setWomanModelsPortraitLightTarget(rig, model) {
  rig.portraitTarget = model || null;
}

function tickWomanModelsLighting(rig, renderer) {
  if (!rig) return;

  const preset = WOMAN_LIGHTING_PRESETS[rig.targetMode];
  const t = WOMAN_LIGHTING_LERP;
  const current = rig.current;

  current.hemisphere.intensity += (preset.hemisphere.intensity - current.hemisphere.intensity) * t;
  current.ambient += (preset.ambient - current.ambient) * t;
  current.key += (preset.key - current.key) * t;
  current.fill += (preset.fill - current.fill) * t;
  current.rim += (preset.rim - current.rim) * t;
  current.portrait += (preset.portrait - current.portrait) * t;
  current.exposure += (preset.exposure - current.exposure) * t;

  rig.hemisphere.intensity = current.hemisphere.intensity;
  rig.ambient.intensity = current.ambient;
  rig.key.intensity = current.key;
  rig.fill.intensity = current.fill;
  rig.rim.intensity = current.rim;
  rig.portrait.intensity = current.portrait;

  if (renderer) {
    renderer.toneMappingExposure = current.exposure;
  }

  if (rig.portraitTarget) {
    const box = new THREE.Box3().setFromObject(rig.portraitTarget);
    const center = box.getCenter(new THREE.Vector3());
    rig.portrait.position.set(center.x + 0.55, center.y + 1.65, center.z + 2.4);
  }
}

function loadWomanModel(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

const WOMAN_MODEL_MOBILE_MQ = '(max-width: 768px)';

function isWomanModelsMobileLayout() {
  return window.matchMedia(WOMAN_MODEL_MOBILE_MQ).matches;
}

function applyWomanModelLayoutScale(model) {
  const nativeScale = model.userData.nativeScale ?? model.scale.x;
  const layoutScale = isWomanModelsMobileLayout()
    ? nativeScale * WOMAN_MODEL_MOBILE_SCALE
    : nativeScale;

  model.scale.setScalar(layoutScale);
  model.userData.baseScale = layoutScale;
  model.userData.currentScale = layoutScale;
  model.userData.targetScale = layoutScale;
}

function getWomanModelsViewportWidth(camera, targetZ = 0) {
  const distance = Math.max(Math.abs(camera.position.z - targetZ), 0.001);
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  return 2 * Math.tan(hFov / 2) * distance;
}

function layoutWomanModelsFromSlots(group, camera, section) {
  const slots = section?.querySelectorAll('.woman-models-slot');
  const stage = section?.querySelector('.woman-models-stage');
  const stageRect = stage?.getBoundingClientRect();
  const viewWidth = getWomanModelsViewportWidth(camera);

  if (!slots?.length || !stageRect?.width) {
    const count = group.children.length;
    const spacing = isWomanModelsMobileLayout()
      ? WOMAN_MODEL_MOBILE_SPACING_X
      : WOMAN_MODEL_SPACING;
    const startX = -((count - 1) * spacing) / 2;

    group.children.forEach((model, index) => {
      model.position.x = startX + index * spacing;
      model.position.y = 0;
      applyWomanModelLayoutScale(model);
    });
    return;
  }

  group.children.forEach((model, index) => {
    const slot = slots[index];
    if (!slot) return;

    const rect = slot.getBoundingClientRect();
    const centerNorm =
      (rect.left + rect.width / 2 - stageRect.left) / stageRect.width - 0.5;

    model.position.x = centerNorm * viewWidth;

    if (isWomanModelsMobileLayout()) {
      const row = Math.floor(index / 2);
      model.position.y = (0.5 - row) * WOMAN_MODEL_MOBILE_ROW_GAP;
    } else {
      model.position.y = 0;
    }

    applyWomanModelLayoutScale(model);
  });
}

function centerWomanModelsGroupVertical(group) {
  const box = new THREE.Box3().setFromObject(group);
  group.position.x = 0;
  group.position.y = -box.min.y;
}

function repositionWomanModelsGroup(group, camera, section) {
  group.position.set(0, 0, 0);
  layoutWomanModelsFromSlots(group, camera, section);
  centerWomanModelsGroupVertical(group);
}

function fitAndLayoutWomanModels(group, camera, section) {
  repositionWomanModelsGroup(group, camera, section);
  fitWomanModelsCamera(camera, group, camera.aspect, section);
  repositionWomanModelsGroup(group, camera, section);
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

function initWomanModelsCursorParallax(section, models, lightingRig, renderer) {
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

  const syncHoverLighting = (index) => {
    if (!lightingRig) return;

    if (index >= 0) {
      setWomanModelsLightingMode(lightingRig, renderer, 'textured', reducedMotion);
      setWomanModelsPortraitLightTarget(lightingRig, models[index]);
      return;
    }

    setWomanModelsLightingMode(lightingRig, renderer, 'wireframe', reducedMotion);
    setWomanModelsPortraitLightTarget(lightingRig, null);
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

    syncHoverLighting(index);
    activeHoverIndex = index;
  };

  const updateFromPointer = (event) => {
    if (section.classList.contains('section-woman-models--focused')) {
      return;
    }

    const clientX = event.clientX;
    const clientY = event.clientY;
    const slots = section.querySelectorAll('.woman-models-slot');
    let index = -1;
    let slotRect = null;

    slots.forEach((slot, slotIndex) => {
      const bounds = slot.getBoundingClientRect();
      if (
        clientX >= bounds.left &&
        clientX <= bounds.right &&
        clientY >= bounds.top &&
        clientY <= bounds.bottom
      ) {
        index = slotIndex;
        slotRect = bounds;
      }
    });

    if (index < 0 || !slotRect) {
      updateHoverIndex(-1);
      resetTargets();
      return;
    }

    const normalized = (clientX - slotRect.left) / slotRect.width - 0.5;

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

  const onMove = (event) => updateFromPointer(event);
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
    syncHoverLighting(-1);
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

function initWomanModelsCards(section, count) {
  if (!section || section.querySelector('.woman-models-slots')) {
    return;
  }

  const slotsEl = document.createElement('div');
  slotsEl.className = 'woman-models-slots';
  slotsEl.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < count; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'woman-models-slot';
    slot.dataset.index = String(index);

    const card = document.createElement('div');
    card.className = 'woman-models-card';
    slot.appendChild(card);
    slotsEl.appendChild(slot);
  }

  section.insertBefore(slotsEl, section.firstChild);
}

function initWomanModelsUI(section, models, lightingRig, renderer, refitLayout) {
  if (!section || !models.length || section.querySelector('.woman-models-ui')) {
    return null;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const syncFocusLighting = (index) => {
    if (!lightingRig) return;

    if (index >= 0) {
      setWomanModelsLightingMode(lightingRig, renderer, 'textured', reducedMotion);
      setWomanModelsPortraitLightTarget(lightingRig, models[index]);
      return;
    }

    setWomanModelsLightingMode(lightingRig, renderer, 'wireframe', reducedMotion);
    setWomanModelsPortraitLightTarget(lightingRig, null);
  };
  const ui = document.createElement('div');
  ui.className = 'woman-models-ui';
  ui.id = 'woman-models-ui';

  const columnsEl = document.createElement('div');
  columnsEl.className = 'woman-models-columns';

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

  const stage = section.querySelector('.woman-models-stage');
  if (stage) {
    section.insertBefore(focusOverlay, stage);
  } else {
    section.appendChild(focusOverlay);
  }

  ui.append(columnsEl, panel);
  section.appendChild(ui);

  let focusedIndex = -1;

  const setModelDisplay = (model, mode) => {
    runWomanGlitchTransition(model, mode, reducedMotion);
  };

  const setModelsFocusVisibility = (activeIndex) => {
    models.forEach((model, modelIndex) => {
      model.visible = activeIndex < 0 || modelIndex === activeIndex;
    });
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

    section.querySelectorAll('.woman-models-slot').forEach((slot) => {
      const isActive = index >= 0 && Number(slot.dataset.index) === index;
      slot.dataset.active = isActive ? 'true' : 'false';
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
    setModelsFocusVisibility(-1);

    models.forEach((model) => {
      setModelDisplay(model, 'wireframe');
    });
    models.forEach((model) => {
      model.scale.setScalar(model.userData.baseScale);
      model.userData.currentScale = model.userData.baseScale;
    });
    resetFocusTargets();
    syncFocusLighting(-1);
    refitLayout?.();
  };

  const snapFocusScalesForFit = (index) => {
    models.forEach((model, modelIndex) => {
      const target =
        modelIndex === index
          ? model.userData.baseScale * WOMAN_FOCUS_SCALE_MULT
          : model.userData.baseScale;
      model.scale.setScalar(target);
      model.userData.currentScale = target;
    });
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

    setActiveColumn(index);
    setModelsFocusVisibility(index);

    const copy = WOMAN_PERSONA_COPY[index] || WOMAN_PERSONA_COPY[0];
    titleEl.textContent = copy.title;
    subtitleEl.textContent = copy.subtitle;

    positionWomanModelsFocusPanel(section, panel, index);

    requestAnimationFrame(() => {
      if (focusedIndex !== index) return;
      positionWomanModelsFocusPanel(section, panel, index);
    });

    models.forEach((model, modelIndex) => {
      if (modelIndex === index) {
        setModelDisplay(model, 'textured');
      }
    });
    applyFocusTargets(index);
    snapFocusScalesForFit(index);
    syncFocusLighting(index);
    refitLayout?.();
    requestAnimationFrame(() => {
      if (focusedIndex !== index) return;
      snapFocusScalesForFit(index);
      refitLayout?.();
    });
  };

  columnsEl.addEventListener('click', (event) => {
    const column = event.target.closest('.woman-models-column');
    if (!column) return;

    enterFocus(Number(column.dataset.index));
  });

  const dismissFocusIfOutside = (event) => {
    if (focusedIndex < 0) return;
    if (event.target.closest('.woman-models-focus-panel')) return;
    if (event.target.closest('.woman-models-column')) return;

    const slot = section.querySelectorAll('.woman-models-slot')[focusedIndex];
    if (slot) {
      const slotRect = slot.getBoundingClientRect();
      if (
        event.clientX >= slotRect.left &&
        event.clientX <= slotRect.right &&
        event.clientY >= slotRect.top &&
        event.clientY <= slotRect.bottom
      ) {
        return;
      }
    }

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

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    section.removeEventListener('click', dismissFocusIfOutside);
    exitFocus();
    focusOverlay.remove();
    ui.remove();
  };
}

function fitWomanModelsCamera(camera, group, aspect, section) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const pad = isWomanModelsMobileLayout() ? 1.26 : WOMAN_MODEL_CAMERA_PADDING;
  const focused = section?.classList.contains('section-woman-models--focused');
  const heightPad = focused ? pad * 1.14 : pad;

  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  const distForHeight = (size.y * 0.5 * heightPad) / Math.tan(vFov / 2);
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
  scene.background = null;
  const group = new THREE.Group();
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = WOMAN_LIGHTING_PRESETS.wireframe.exposure;
  renderer.setClearColor(0x000000, 0);
  renderer.setClearAlpha(0);
  renderer.alpha = true;

  stage.appendChild(renderer.domElement);
  renderer.domElement.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;background:transparent;';

  const lightingRig = createWomanModelsLightingRig(scene);
  initWomanModelsCards(section, WOMAN_MODEL_URLS.length);

  const resize = () => {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    if (group.children.length) {
      fitAndLayoutWomanModels(group, camera, section);
    }

    if (section.classList.contains('section-woman-models--focused')) {
      const panelEl = section.querySelector('.woman-models-focus-panel');
      const focusedRaw = section.dataset.focusedIndex;
      if (panelEl && focusedRaw !== undefined) {
        positionWomanModelsFocusPanel(section, panelEl, Number(focusedRaw));
      }
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

      fitAndLayoutWomanModels(group, camera, section);
      initWomanModelsCursorParallax(section, models, lightingRig, renderer);
      const refitLayout = () => {
        if (group.children.length) {
          fitAndLayoutWomanModels(group, camera, section);
        }
      };

      initWomanModelsUI(section, models, lightingRig, renderer, refitLayout);
    })
    .catch((err) => {
      console.error('[Benini Squad] Falha ao carregar modelos femininos:', err);
    });

  const render = () => {
    requestAnimationFrame(render);
    tickWomanModelsLighting(lightingRig, renderer);
    if (loadedModels.length) {
      tickWomanModelsInteraction(loadedModels);
    }
    renderer.render(scene, camera);
  };

  render();
}

window.initWomanModelsStage = initWomanModelsStage;
