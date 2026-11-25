import * as THREE from 'three';
import { nowJD, prefersReducedMotion } from '@/lib';
import type { ActiveScene, Scene } from '@/types';
import { $ } from '@/ui/dom';
import { ui } from '@/ui/store';
import { hideToast, toast, toastIsError } from '@/ui/toast';
import { setRate } from './clock';
import { emitter } from './events';
import { skyPts, world } from './gl';
import { App, cam, sim, scene } from './state';

interface Registration {
  title: string;
  factory: () => Scene;
}
const REG: Record<string, Registration> = {};
const cache: Record<string, Scene> = {};

/** Fires after a scene is on screen; the UI rebuilds its panels. */
export const sceneEntered = emitter<[ActiveScene]>();

/** Scenes call this once at import time. */
export function register(id: string, title: string, factory: () => Scene) {
  REG[id] = { title, factory };
}
export const sceneTitle = (id: string) => REG[id].title;

/** Navigation tree: each scene's parent, so "up" and the breadcrumb work. */
const PARENT = (id: string): string | null =>
  id === 'cosmos'
    ? null
    : id.startsWith('gal:') || id === 'blackholes'
      ? 'cosmos'
      : id === 'starmap'
        ? 'gal:milkyway'
        : id === 'solar'
          ? 'starmap'
          : id === 'earth'
            ? 'solar'
            : id === 'sky'
              ? 'earth'
              : null;
export const parentOf = PARENT;
export const chain = (id: string) => {
  const c: string[] = [];
  for (let x: string | null = id; x; x = PARENT(x)) c.unshift(x);
  return c;
};

/** Direct-jump tabs along the top. */
export const TABS: [string, string][] = [
  ['cosmos', 'Galaxies'],
  ['gal:milkyway', 'Milky Way'],
  ['blackholes', 'Black Holes'],
  ['starmap', 'Star Map'],
  ['solar', 'Solar System'],
  ['earth', 'Earth Orbit'],
  ['sky', 'Sky Tonight'],
];
export const isSceneId = (id: string) => id in REG;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let busy = false;
export const isBusy = () => busy;

export const openScene = (id: string) => goScene(id, { deeper: true });
export const goUp = () => {
  const p = PARENT(scene().id);
  if (p) goScene(p, { deeper: false });
};

/* ---- the dive: the camera keeps travelling while the screen washes into the body's colour, then the new scene
 *      starts right beside the camera and settles back to its overview (or, going up, from the child outward) ---- */
const DIVE_MS = 480,
  SETTLE_MS = 900,
  DARK = '#02030a',
  DEFAULT_DIVE = '#cfd8ff';
let easeToken = 0;

function wash(opacity: number, ms: number, color?: string) {
  const f = $('#fade');
  if (color)
    f.style.background =
      color === DARK ? DARK : `radial-gradient(circle at 50% 50%, ${color} 0%, ${color} 18%, ${DARK} 88%)`;
  f.style.transition = `opacity ${ms}ms ${opacity ? 'ease-in' : 'ease-out'}`;
  f.style.opacity = String(opacity);
}

export async function goScene(id: string, { deeper = true, instant = false } = {}) {
  if (busy || !REG[id]) return;
  busy = true;
  const prev = App.scene,
    from = prev?.id;
  const diveInto = deeper && App.sel && App.sel.enter === id ? App.sel : null;
  // First load, or a user who asked for less motion: swap scenes with no plunge and no wash
  const calm = instant || prefersReducedMotion();
  if (!calm) {
    // phase 1: keep moving in the direction of travel, washing the screen out
    cam.free = true;
    cam.ease = 6;
    cam.want = deeper ? cam.dist * 0.05 : cam.dist * 8;
    wash(1, DIVE_MS, deeper ? (diveInto?.diveColor ?? DEFAULT_DIVE) : DARK);
    await sleep(DIVE_MS);
  }
  if (prev) {
    prev.leave?.();
    world.remove(prev.group);
  }
  const sc = cache[id] || (cache[id] = REG[id].factory());
  sc.id = id;
  App.scene = sc as ActiveScene;
  App.sel = null;
  App.hover = null;
  App.path = chain(id);
  ui.tip.visible = false;
  if (sc.load && !sc.loaded) {
    toast('Loading ' + sc.title + '…', 'first visit downloads live data');
    try {
      await sc.load(msg => toast('Loading ' + sc.title + '…', msg));
    } catch (e) {
      console.error(e);
      toast('Some data failed to load', String(e).slice(0, 120), 4000);
    }
    sc.loaded = true;
    if (!toastIsError()) hideToast();
  }
  world.add(sc.group);
  sc.enter?.();
  cam.free = false;
  cam.pitch = sc.startPitch ?? 0.5;
  if (sc.startYaw !== undefined) cam.yaw = sc.startYaw;
  cam.want = sc.initD;
  sc.center(cam.t);
  cam.off.set(0, 0, 0);
  if (calm) {
    cam.dist = sc.initD;
    cam.ease = 4.5;
  } else {
    cam.ease = 2.4; // phase 2: settle slowly so the arrival reads as a continuation of the dive
    if (deeper)
      cam.dist = sc.initD * 0.04; // emerge from inside the thing we dived into
    else {
      const child = sc.bodies?.find(b => b.enter === from); // going up: start on the view we came from
      if (child) {
        const c = sc.center(new THREE.Vector3());
        child.getPos(cam.t);
        cam.off.copy(cam.t).sub(c);
        cam.dist = Math.max((child.focusD ?? sc.initD * 0.1) * 0.6, sc.minD * 2);
      } else cam.dist = sc.initD * 0.3;
    }
    const token = ++easeToken;
    setTimeout(() => {
      if (token === easeToken) cam.ease = 4.5;
    }, 2200);
  }
  skyPts.visible = sc.sky !== false;
  if (sc.rate != null) {
    setRate(sc.rate);
    sim.live = !!sc.live;
    if (sc.live) sim.jd = nowJD();
  }
  sceneEntered.emit(sc as ActiveScene);
  try {
    history.replaceState(null, '', '#' + id);
  } catch {
    /* sandboxed frames */
  }
  if (!calm) wash(0, SETTLE_MS);
  busy = false;
}
