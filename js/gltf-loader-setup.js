'use strict';

const BENINI_DRACO_DECODER_PATH =
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/';

function createBeniniGLTFLoader() {
  const loader = new THREE.GLTFLoader();

  if (typeof THREE.DRACOLoader !== 'undefined') {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath(BENINI_DRACO_DECODER_PATH);
    loader.setDRACOLoader(dracoLoader);
  }

  return loader;
}

window.createBeniniGLTFLoader = createBeniniGLTFLoader;
