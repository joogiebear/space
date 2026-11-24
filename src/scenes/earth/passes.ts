import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { D2R, RE_KM, jdToDate } from '@/lib';
import type { InfoRows } from '@/types';
import type { Loc } from './location';

export interface Pass {
  rise: number; set: number; azRise: number; azSet: number; azMax: number;
  maxEl: number; ongoing: boolean;
  /** Dark sky for the observer, satellite above 10 deg and in sunlight. */
  visible: boolean;
}

const COMP = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = (a: number) => COMP[Math.round(a / 22.5) % 16];
const upV = new THREE.Vector3();

/** Next pass above the horizon within 7 days, stepping 20 s. `sunDir` is the unit Sun direction in scene axes. */
export function findPass(rec: satellite.SatRec, jd0: number, loc: Loc, sunDir: THREE.Vector3): Pass | null {
  const lat = loc.lat * D2R, lon = loc.lon * D2R, obs = { latitude: lat, longitude: lon, height: 0 }, cl = Math.cos(lat), base = (jd0 - 2440587.5) * 864e5;
  let p: Pass | null = null;
  for (let k = 0; k < 7 * 4320; k++) {
    const date = new Date(base + k * 20000), pv = satellite.propagate(rec, date);
    if (!pv) continue; // propagation failed (decayed or bad elements): satellite.js 7 returns null
    const gm = satellite.gstime(date), la = satellite.ecfToLookAngles(obs, satellite.eciToEcf(pv.position, gm));
    const el = la.elevation / D2R, az = la.azimuth / D2R, jd = jd0 + k * 20 / 86400;
    if (el > 0) {
      if (!p) p = { rise: jd, set: jd, azRise: az, azSet: az, azMax: az, maxEl: el, ongoing: k === 0, visible: false };
      if (el > p.maxEl) { p.maxEl = el; p.azMax = az; }
      p.set = jd; p.azSet = az;
      if (el > 10 && !p.visible) {
        const th = gm + lon; upV.set(cl * Math.cos(th), Math.sin(lat), -cl * Math.sin(th));
        if (Math.asin(upV.dot(sunDir)) / D2R < -6) { // observer in darkness (sun below -6 deg)
          const x = pv.position.x, y = pv.position.z, z = -pv.position.y, d = x * sunDir.x + y * sunDir.y + z * sunDir.z;
          const shadowed = d < 0 && Math.hypot(x - d * sunDir.x, y - d * sunDir.y, z - d * sunDir.z) < RE_KM;
          if (!shadowed) p.visible = true;
        }
      }
    } else if (p) return p;
  }
  return p;
}

const fmtWhen = (jd: number) => jdToDate(jd).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtIn = (d: number) => {
  const m = Math.max(0, Math.round(d * 1440));
  return m >= 1440 ? Math.floor(m / 1440) + 'd ' + Math.floor(m % 1440 / 60) + 'h' : m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm';
};

/** Info-panel rows for a finished search. */
function describe(r: Pass | null, jdNow: number): InfoRows {
  if (!r) return [['Next pass over you', 'none in the next 7 days']];
  const now = r.rise <= jdNow, dur = Math.max(1, Math.round((r.set - r.rise) * 1440));
  return [
    ['Next pass over you', now ? 'overhead now, sets ' + fmtWhen(r.set) : fmtWhen(r.rise) + ' (in ' + fmtIn(r.rise - jdNow) + ')'],
    ['Pass', `max ${r.maxEl.toFixed(0)}° ${compass(r.azMax)} · ${compass(r.azRise)} → ${compass(r.azSet)} · ${dur} min`],
    ['Sky', r.visible ? 'dark sky, satellite sunlit: visible' : r.maxEl < 10 ? 'stays too low to see' : 'daylight or Earth\'s shadow: not visible'],
  ];
}

interface Cached { key: string; from: number; res?: Pass | null; pending: boolean }

/** Runs the search off the render path and caches it until the pass ends, the clock rewinds, or the location changes. */
export class PassPredictor {
  private cache: Cached | null = null;

  reset() { this.cache = null; }

  rows(idx: number, rec: satellite.SatRec | null, loc: Loc | null, jdNow: number, sunDir: THREE.Vector3): InfoRows {
    if (!rec) return [];
    if (!loc) return [['Next pass over you', 'set your location below']];
    const key = idx + '|' + loc.lat + '|' + loc.lon, c = this.cache;
    if (!c || c.key !== key || jdNow < c.from - 1 / 1440 || jdNow > (c.res ? c.res.set : c.from + 7)) {
      const entry: Cached = this.cache = { key, from: jdNow, res: undefined, pending: true };
      setTimeout(() => { if (this.cache === entry) { entry.res = findPass(rec, jdNow, loc, sunDir); entry.pending = false; } }, 0);
    }
    const q = this.cache!;
    return q.pending ? [['Next pass over you', 'calculating…']] : describe(q.res ?? null, jdNow);
  }
}
