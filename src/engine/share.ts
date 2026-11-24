import { clamp, isoToJD, jdToDate } from '@/lib';
import { decodeView, encodeView, type ViewState } from '@/lib/view';
import { jumpTo, setPaused } from './clock';
import { select, selectionChanged } from './selection';
import { App, cam, scene, sim } from './state';

/** What the user is looking at right now, in the shareable form. `full` adds the clock and the camera. */
export function currentView(full: boolean): ViewState {
  const sc = scene(),
    v: ViewState = { scene: sc.id };
  const s = App.sel;
  if (s) {
    if ((sc.bodies || []).some(b => b.id === s.id)) v.sel = s.id;
    else v.q = s.label;
  }
  if (full) {
    if (!sim.live) {
      v.t = jdToDate(sim.jd).toISOString();
      v.r = sim.rate;
      v.paused = sim.paused;
    }
    v.y = cam.yaw;
    v.p = cam.pitch;
    v.z = cam.dist / sc.initD;
  }
  return v;
}

/** Put the scene and selection in the address bar, so a copied URL or a reload comes back to the same place. */
export function syncUrl() {
  if (!App.scene) return;
  try {
    history.replaceState(null, '', '#' + encodeView(currentView(false)));
  } catch {
    /* sandboxed frames */
  }
}

/** A link to exactly this view: scene, selection, simulated moment and camera. */
export function shareUrl(): string {
  const base = location.href.replace(/#.*$/, '');
  return base + '#' + encodeView(currentView(true));
}

/** Apply the clock, selection and camera from a link to the scene that is now open. Unknown parts are skipped. */
export function applyView(v: ViewState) {
  const sc = scene();
  if (v.t) {
    jumpTo(isoToJD(v.t), v.r ?? sc.rate ?? 1);
    if (v.paused) setPaused(true);
  }
  let body = v.sel ? (sc.bodies || []).find(b => b.id === v.sel) : undefined;
  if (!body && v.q) {
    const hits = sc.search?.(v.q.toLowerCase()) ?? [];
    body = (hits.find(h => h.label === v.q) ?? hits[0])?.make() ?? undefined;
  }
  if (body) select(body);
  if (v.y !== undefined) cam.yaw = v.y;
  if (v.p !== undefined) cam.pitch = v.p;
  if (v.z !== undefined) {
    cam.want = clamp(v.z * sc.initD, sc.minD, sc.maxD);
    cam.dist = cam.want;
  }
}

/** Parse the current address-bar hash. */
export const viewFromHash = () => decodeView(location.hash);

export function initShare() {
  selectionChanged.on(() => syncUrl());
}
