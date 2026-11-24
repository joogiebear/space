import * as THREE from 'three';
import { $ } from '@/ui/dom';
import { emitter } from './events';
import { App } from './state';
import { createViewportSync } from './viewport';

// Raw colours should show exactly as written (no sRGB conversion).
THREE.ColorManagement.enabled = false;

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
renderer.setClearColor(0x010208, 1);
$('#gl').appendChild(renderer.domElement);

/** The GPU context was taken away / given back. preventDefault() on "lost" is what allows a restore. */
export const contextLost = emitter();
export const contextRestored = emitter();
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  contextLost.emit();
});
renderer.domElement.addEventListener('webglcontextrestored', () => contextRestored.emit());

export const camera = new THREE.PerspectiveCamera(50, 1, 0.0001, 1e5);
/** The active scene's group is added to / removed from `world`. */
export const world = new THREE.Scene();
export const skyScene = new THREE.Scene();
export const skyCam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

/** Uniforms shared by every custom shader: device pixel ratio and focal length in px. */
export const U = { uPx: { value: 1 }, uF: { value: 800 }, uRef: 20 };

/**
 * Keep the drawing buffer the same size as the on-screen canvas. CSS (position: fixed; inset: 0) decides how big the
 * canvas is, so setSize() must not write pixel sizes onto it (that pinned it at a stale size and left a hard black edge
 * on phones). When to resize is decided in viewport.ts; events are only extra triggers, the render loop calls syncSize().
 */
const host = $('#gl');
const viewport = createViewportSync(
  () => ({
    innerW: innerWidth,
    innerH: innerHeight,
    rawDpr: devicePixelRatio,
    hostW: host.clientWidth,
    hostH: host.clientHeight,
  }),
  ({ w, h, dpr }) => {
    App.W = w;
    App.H = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false); // false: leave the canvas's CSS size alone
    camera.aspect = skyCam.aspect = w / h;
    U.uPx.value = dpr;
    U.uF.value = (h * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
    camera.updateProjectionMatrix();
    skyCam.updateProjectionMatrix();
  },
);
/** Called every frame by the render loop. */
export const syncSize = viewport.sync;
new ResizeObserver(viewport.resize).observe(host);
addEventListener('resize', viewport.resize);
visualViewport?.addEventListener('resize', viewport.resize);
addEventListener('orientationchange', () => setTimeout(viewport.resize, 250));
viewport.resize();

/* ---- background star sky ---- */
const SKY_N = 2500,
  sp = new Float32Array(SKY_N * 3),
  sc = new Float32Array(SKY_N * 3);
for (let i = 0; i < SKY_N; i++) {
  const u = Math.random() * 2 - 1,
    t = Math.random() * 6.2832,
    s = Math.sqrt(1 - u * u),
    k = 0.25 + Math.random() * 0.6;
  sp.set([s * Math.cos(t) * 50, u * 50, s * Math.sin(t) * 50], i * 3);
  const w = Math.random();
  sc.set([k * (0.8 + 0.2 * w), k * (0.85 + 0.1 * w), k], i * 3);
}
const skyGeo = new THREE.BufferGeometry();
skyGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
skyGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
export const skyPts = new THREE.Points(
  skyGeo,
  new THREE.PointsMaterial({
    size: 1.6 * Math.min(devicePixelRatio || 1, 2),
    sizeAttenuation: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
  }),
);
skyScene.add(skyPts);

/** Change the camera's field of view (degrees) and keep the point-size scale in step with it. */
export function setFov(deg: number) {
  if (camera.fov === deg) return;
  camera.fov = deg;
  U.uF.value = (App.H * 0.5) / Math.tan((deg * Math.PI) / 360);
}

/* ---- glow sprites ---- */
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 128;
{
  const g = glowCanvas.getContext('2d')!,
    r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
}
export const glowTex = new THREE.CanvasTexture(glowCanvas);

/** A soft additive glow, `size` scene units across. */
export function glowSprite(color: THREE.ColorRepresentation, size: number) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  s.scale.set(size, size, 1);
  return s;
}
