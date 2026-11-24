import * as satellite from 'satellite.js';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { D2R } from '@/lib';
import { PassPredictor, findPass, type Pass } from './passes';

// A real ISS TLE (epoch 2020-07-12 21:16 UTC). Orbit: 51.6 deg inclination, ~420 km, 92.9 min period.
const TLE1 = '1 25544U 98067A   20194.88612269 -.00002218  00000-0 -31515-4 0  9992';
const TLE2 = '2 25544  51.6461 221.2784 0001413  89.1723 280.4612 15.49507896236008';
const rec = satellite.twoline2satrec(TLE1, TLE2);
const EPOCH_JD = Date.UTC(2020, 0, 1) / 864e5 + 2440587.5 + (194.88612269 - 1);
const LONDON = { lat: 51.5, lon: -0.12 };
const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 864e5);
const SUN = new THREE.Vector3(1, 0, 0); // direction only matters to the "visible" flag

/** Elevation (deg) of the satellite over an observer at a Julian date, straight from satellite.js. */
function elevation(jd: number, loc = LONDON) {
  const date = jdToDate(jd), pv = satellite.propagate(rec, date);
  if (!pv) throw new Error('propagation failed');
  const look = satellite.ecfToLookAngles({ latitude: loc.lat * D2R, longitude: loc.lon * D2R, height: 0 },
    satellite.eciToEcf(pv.position, satellite.gstime(date)));
  return look.elevation / D2R;
}

/** The observer's local "up" in scene axes (y up, ECI x/z/-y), as findPass computes it. */
function observerUp(jd: number, loc = LONDON) {
  const lat = loc.lat * D2R, th = satellite.gstime(jdToDate(jd)) + loc.lon * D2R, cl = Math.cos(lat);
  return new THREE.Vector3(cl * Math.cos(th), Math.sin(lat), -cl * Math.sin(th));
}

/** First pass whose peak is above `minEl`, searching forward from the epoch. */
function firstHighPass(minEl: number): Pass {
  let jd = EPOCH_JD;
  for (let i = 0; i < 12; i++) {
    const p = findPass(rec, jd, LONDON, SUN);
    if (!p) break;
    if (p.maxEl >= minEl) return p;
    jd = p.set + 1 / 1440;
  }
  throw new Error('no suitable pass found in the test window');
}

describe('findPass', () => {
  it('finds a physically sensible ISS pass over London', () => {
    const p = findPass(rec, EPOCH_JD, LONDON, SUN)!;
    expect(p).not.toBeNull();
    expect(p.rise).toBeGreaterThanOrEqual(EPOCH_JD);
    expect(p.set).toBeGreaterThan(p.rise);
    expect((p.set - p.rise) * 1440).toBeLessThan(15);      // an ISS pass lasts under ~12 minutes
    expect(p.maxEl).toBeGreaterThan(0);
    expect(p.maxEl).toBeLessThanOrEqual(90);
    for (const az of [p.azRise, p.azMax, p.azSet]) { expect(az).toBeGreaterThanOrEqual(0); expect(az).toBeLessThan(360); }
    expect(p.ongoing).toBe(false);
  });

  it('starts near the horizon and rises above it during the pass (cross-checked with satellite.js)', () => {
    const p = findPass(rec, EPOCH_JD, LONDON, SUN)!;
    expect(elevation(p.rise)).toBeGreaterThanOrEqual(0);
    expect(elevation(p.rise)).toBeLessThan(6);             // first 20 s step above the horizon
    expect(elevation(p.set)).toBeLessThan(6);
    const mid = elevation((p.rise + p.set) / 2);
    expect(mid).toBeGreaterThan(0);
    expect(p.maxEl).toBeGreaterThanOrEqual(mid - 0.5);
  });

  it('reports the peak elevation it actually reaches', () => {
    const p = findPass(rec, EPOCH_JD, LONDON, SUN)!;
    let best = -90;
    for (let jd = p.rise; jd <= p.set; jd += 5 / 86400) best = Math.max(best, elevation(jd));
    expect(p.maxEl).toBeGreaterThan(best - 3);              // 20 s sampling can miss the exact top
    expect(p.maxEl).toBeLessThanOrEqual(best + 0.01);
  });

  it('flags a pass already in progress at the start time', () => {
    const p = findPass(rec, EPOCH_JD, LONDON, SUN)!;
    const mid = (p.rise + p.set) / 2;
    const q = findPass(rec, mid, LONDON, SUN)!;
    expect(q.ongoing).toBe(true);
    expect(q.rise).toBe(mid);
  });

  it('returns null where the ISS is never above the horizon (near the pole)', () => {
    // inclination 51.6 deg + ~20 deg horizon reach at 420 km: nothing is visible beyond ~72 deg latitude
    expect(findPass(rec, EPOCH_JD, { lat: 89.9, lon: 0 }, SUN)).toBeNull();
  });

  it('skips a satellite whose elements have decayed', () => {
    const dead = satellite.twoline2satrec(TLE1, '2 25544  51.6461 221.2784 0001413  89.1723 280.4612 99.00000000236008');
    expect(findPass(dead, EPOCH_JD, LONDON, SUN)).toBeNull();
  });

  describe('naked-eye visibility', () => {
    const high = firstHighPass(30), mid = (high.rise + high.set) / 2;
    const up = observerUp(mid);
    const horizontal = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize();
    const sunAt = (elevDeg: number) => up.clone().multiplyScalar(Math.sin(elevDeg * D2R)).add(horizontal.clone().multiplyScalar(Math.cos(elevDeg * D2R)));
    const visibleWith = (sun: THREE.Vector3) => findPass(rec, high.rise - 1 / 1440, LONDON, sun)!.visible;

    it('is not visible in daylight (sun overhead)', () => expect(visibleWith(sunAt(90))).toBe(false));
    it('is not visible when the sky is dark but the ISS is in Earth\'s shadow (sun opposite)', () => expect(visibleWith(sunAt(-90))).toBe(false));
    it('is visible at dusk: observer in darkness, ISS still sunlit', () => expect(visibleWith(sunAt(-10))).toBe(true));
    it('is not visible in twilight brighter than -6 degrees', () => expect(visibleWith(sunAt(-3))).toBe(false));
  });
});

describe('PassPredictor', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const run = () => vi.advanceTimersByTimeAsync(0);

  it('asks for a location first', () => {
    expect(new PassPredictor().rows(0, rec, null, EPOCH_JD, SUN)).toEqual([['Next pass over you', 'set your location below']]);
  });

  it('returns nothing without orbital elements', () => {
    expect(new PassPredictor().rows(0, null, LONDON, EPOCH_JD, SUN)).toEqual([]);
  });

  it('shows "calculating" first, then the pass details', async () => {
    const pp = new PassPredictor();
    expect(pp.rows(0, rec, LONDON, EPOCH_JD, SUN)).toEqual([['Next pass over you', 'calculating…']]);
    await run();
    const rows = pp.rows(0, rec, LONDON, EPOCH_JD, SUN);
    expect(rows.map(r => r[0])).toEqual(['Next pass over you', 'Pass', 'Sky']);
    expect(rows[0][1]).toMatch(/\(in (\d+d \d+h|\d+h \d+m|\d+m)\)/);
    expect(rows[1][1]).toMatch(/^max \d+° [NESW]+ · [NESW]+ → [NESW]+ · \d+ min$/);
    expect(rows[2][1]).toMatch(/visible|too low|daylight/);
  });

  it('says "overhead now" when the clock is inside the pass', async () => {
    const p = findPass(rec, EPOCH_JD, LONDON, SUN)!, pp = new PassPredictor(), mid = (p.rise + p.set) / 2;
    pp.rows(0, rec, LONDON, mid, SUN); await run();
    expect(pp.rows(0, rec, LONDON, mid, SUN)[0][1]).toMatch(/^overhead now, sets /);
  });

  it('recalculates when the location changes', async () => {
    const pp = new PassPredictor();
    pp.rows(0, rec, LONDON, EPOCH_JD, SUN); await run();
    expect(pp.rows(0, rec, LONDON, EPOCH_JD, SUN)[0][1]).not.toBe('calculating…');
    expect(pp.rows(0, rec, { lat: 40.7, lon: -74 }, EPOCH_JD, SUN)).toEqual([['Next pass over you', 'calculating…']]);
  });

  it('recalculates after reset() and when the clock is rewound', async () => {
    const pp = new PassPredictor();
    pp.rows(0, rec, LONDON, EPOCH_JD, SUN); await run();
    pp.reset();
    expect(pp.rows(0, rec, LONDON, EPOCH_JD, SUN)[0][1]).toBe('calculating…');
    await run();
    expect(pp.rows(0, rec, LONDON, EPOCH_JD - 1, SUN)[0][1]).toBe('calculating…'); // a day earlier than the cache
  });

  it('reuses the cached pass while the clock advances inside the search window', async () => {
    const pp = new PassPredictor();
    pp.rows(0, rec, LONDON, EPOCH_JD, SUN); await run();
    expect(pp.rows(0, rec, LONDON, EPOCH_JD + 1 / 1440, SUN)[0][1]).not.toBe('calculating…');
  });

  it('reports no pass for an observer the satellite never reaches', async () => {
    const pp = new PassPredictor(), pole = { lat: 89.9, lon: 0 };
    pp.rows(0, rec, pole, EPOCH_JD, SUN); await run();
    expect(pp.rows(0, rec, pole, EPOCH_JD, SUN)).toEqual([['Next pass over you', 'none in the next 7 days']]);
  });
});
