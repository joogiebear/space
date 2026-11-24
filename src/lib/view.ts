/**
 * Share links. A view is written into the URL hash as `#scene?key=value&key=value`, for example
 * `#solar?sel=mars&t=1969-07-20T20:17Z&r=1&y=0.6&p=0.5&z=0.8`. A bare `#solar` (the old format) still works.
 * Pure functions only, so the format can be tested without a browser.
 */
export interface ViewState {
  scene: string;
  /** Body id from the scene's list. */
  sel?: string;
  /** Label to search for when the selected body is not in the scene's list (a satellite, a catalogue star). */
  q?: string;
  /** Simulated moment as UTC ISO; absent means "live". */
  t?: string;
  /** Simulation speed. */
  r?: number;
  paused?: boolean;
  /** Camera yaw and pitch (radians) and distance as a fraction of the scene's overview distance. */
  y?: number;
  p?: number;
  z?: number;
}

const num = (v: string | null) => {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
/** Keep links short: four significant figures is plenty for a camera. */
const short = (n: number) => String(Number(n.toPrecision(4)));

export function encodeView(v: ViewState): string {
  const p = new URLSearchParams();
  if (v.sel) p.set('sel', v.sel);
  else if (v.q) p.set('q', v.q);
  if (v.t) p.set('t', v.t);
  if (v.r !== undefined && v.t) p.set('r', short(v.r));
  if (v.paused && v.t) p.set('pz', '1');
  if (v.y !== undefined) p.set('y', short(v.y));
  if (v.p !== undefined) p.set('p', short(v.p));
  if (v.z !== undefined) p.set('z', short(v.z));
  const rest = p.toString().replace(/%3A/gi, ':'); // colons are legal in a hash and far easier to read
  return rest ? `${v.scene}?${rest}` : v.scene;
}

/** Returns null when the hash holds no scene id at all. Unknown or malformed values are dropped, never thrown on. */
export function decodeView(hash: string): ViewState | null {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  // split first, decode second: an encoded "&" or "=" inside a value must not be read as a separator
  let scene = (cut < 0 ? raw : raw.slice(0, cut)).trim();
  try {
    scene = decodeURIComponent(scene);
  } catch {
    /* keep the raw text */
  }
  if (!scene) return null;
  const view: ViewState = { scene };
  if (cut < 0) return view;
  const p = new URLSearchParams(raw.slice(cut + 1));
  const sel = p.get('sel'),
    q = p.get('q'),
    t = p.get('t');
  if (sel) view.sel = sel.slice(0, 120);
  else if (q) view.q = q.slice(0, 120);
  if (t && Number.isFinite(Date.parse(t))) view.t = t;
  const r = num(p.get('r'));
  if (r !== undefined && r > 0 && r <= 1e9) view.r = r;
  if (p.get('pz') === '1') view.paused = true;
  const y = num(p.get('y')),
    pitch = num(p.get('p')),
    z = num(p.get('z'));
  if (y !== undefined) view.y = y;
  if (pitch !== undefined) view.p = Math.max(-1.5, Math.min(1.5, pitch));
  if (z !== undefined && z > 0 && z < 1000) view.z = z;
  return view;
}
