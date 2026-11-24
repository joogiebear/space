import { nowJD } from '@/lib';
import type { ActiveScene, Scene } from '@/types';
import { $ } from '@/ui/dom';
import { hideToast, toast } from '@/ui/toast';
import { setRate } from './clock';
import { emitter } from './events';
import { skyPts, world } from './gl';
import { App, cam, sim, scene } from './state';

interface Registration { title: string; factory: () => Scene }
const REG: Record<string, Registration> = {};
const cache: Record<string, Scene> = {};

/** Fires after a scene is on screen; the UI rebuilds its panels. */
export const sceneEntered = emitter<[Scene]>();

/** Scenes call this once at import time. */
export function register(id: string, title: string, factory: () => Scene) { REG[id] = { title, factory }; }
export const sceneTitle = (id: string) => REG[id].title;

/** Navigation tree: each scene's parent, so "up" and the breadcrumb work. */
const PARENT = (id: string): string | null =>
  id === 'cosmos' ? null : id.startsWith('gal:') ? 'cosmos' : id === 'starmap' ? 'gal:milkyway' : id === 'solar' ? 'starmap' : id === 'earth' ? 'solar' : null;
export const parentOf = PARENT;
export const chain = (id: string) => { const c: string[] = []; for (let x: string | null = id; x; x = PARENT(x)) c.unshift(x); return c; };

/** Direct-jump tabs along the top. */
export const TABS: [string, string][] = [['cosmos', 'Galaxies'], ['gal:milkyway', 'Milky Way'], ['starmap', 'Star Map'], ['solar', 'Solar System'], ['earth', 'Earth Orbit']];
export const isSceneId = (id: string) => id in REG;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let busy = false;
export const isBusy = () => busy;

export const openScene = (id: string) => goScene(id, { deeper: true });
export const goUp = () => { const p = PARENT(scene().id); if (p) goScene(p, { deeper: false }); };

export async function goScene(id: string, { deeper = true, instant = false } = {}) {
  if (busy || !REG[id]) return;
  busy = true;
  const fade = $('#fade');
  if (!instant) { fade.style.opacity = '1'; await sleep(360); }
  const prev = App.scene;
  if (prev) { prev.leave?.(); world.remove(prev.group); }
  const sc = cache[id] || (cache[id] = REG[id].factory());
  sc.id = id;
  App.scene = sc as ActiveScene; App.sel = null; App.hover = null; App.path = chain(id);
  $('#tip').style.display = 'none';
  if (sc.load && !sc.loaded) {
    toast('Loading ' + sc.title + '…', 'first visit downloads live data');
    try { await sc.load(msg => toast('Loading ' + sc.title + '…', msg)); }
    catch (e) { console.error(e); toast('Some data failed to load', String(e).slice(0, 120), 4000); }
    sc.loaded = true;
    if (!$('#toast').innerHTML.includes('failed')) hideToast();
  }
  world.add(sc.group); sc.enter?.();
  sc.center(cam.t); cam.off.set(0, 0, 0); cam.want = sc.initD; cam.dist = instant ? sc.initD : sc.initD * (deeper ? 2.4 : .45); cam.pitch = .5;
  skyPts.visible = sc.sky !== false;
  if (sc.rate != null) { setRate(sc.rate); sim.live = !!sc.live; if (sc.live) sim.jd = nowJD(); }
  sceneEntered.emit(sc);
  try { history.replaceState(null, '', '#' + id); } catch { /* sandboxed frames */ }
  fade.style.opacity = '0';
  busy = false;
}
