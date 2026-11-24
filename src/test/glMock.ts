import * as THREE from 'three';

/** Stand-in for engine/gl.ts: no WebGL context in jsdom. Use with
 *  vi.mock('@/engine/gl', async () => (await import('@/test/glMock')).glMock()) */
export function glMock() {
  return {
    renderer: {
      domElement: document.createElement('canvas'),
      clear() {},
      clearDepth() {},
      render() {},
      setPixelRatio() {},
      setSize() {},
    },
    camera: new THREE.PerspectiveCamera(50, 1, 0.1, 1e5),
    world: new THREE.Scene(),
    skyScene: new THREE.Scene(),
    skyCam: new THREE.PerspectiveCamera(50, 1, 0.1, 100),
    skyPts: { visible: true },
    U: { uPx: { value: 1 }, uF: { value: 800 }, uRef: 20 },
    glowTex: {},
    glowSprite: () => new THREE.Object3D(),
  };
}
