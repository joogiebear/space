import { describe, expect, it } from 'vitest';
import { AU_KM, D2R, J2000, TAU, bvColor, clamp, fmtDate, fmtNum, isoToJD, jdToDate, mixc, nowJD, orbitPos, planetEcl, rng, solveKepler } from '@/lib';

describe('time', () => {
  it('J2000 is 2000-01-01 12:00 UTC', () => {
    expect(jdToDate(J2000).toISOString()).toBe('2000-01-01T12:00:00.000Z');
  });
  it('round-trips ISO dates', () => {
    expect(isoToJD('2000-01-01T12:00Z')).toBe(J2000);
    // a double near JD 2.46e6 resolves ~0.1 ms, so the round trip is exact to within a millisecond
    expect(Math.abs(jdToDate(isoToJD('2026-12-21T14:50Z')).getTime() - Date.UTC(2026, 11, 21, 14, 50))).toBeLessThanOrEqual(1);
  });
  it('formats a date in UTC', () => {
    expect(fmtDate(J2000)).toBe('2000-01-01 12:00:00 UTC');
  });
  it('nowJD tracks the system clock', () => {
    expect(Math.abs(jdToDate(nowJD()).getTime() - Date.now())).toBeLessThan(5);
  });
});

describe('Kepler solver', () => {
  it('is the identity for a circular orbit', () => {
    for (const M of [0, 1, 3, 5]) expect(solveKepler(M, 0)).toBeCloseTo(M, 12);
  });
  it('satisfies Kepler\'s equation M = E - e sin E', () => {
    for (const e of [0.1, 0.5, 0.9, 0.97]) for (const M of [0.3, 1.5, 3.1, 6]) {
      const E = solveKepler(M, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(M % TAU, 9);
    }
  });
  it('wraps negative and large mean anomalies', () => {
    expect(solveKepler(-1, 0.3)).toBeCloseTo(solveKepler(TAU - 1, 0.3), 12);
    expect(solveKepler(TAU * 5 + 2, 0.3)).toBeCloseTo(solveKepler(2, 0.3), 9);
  });
});

describe('orbitPos', () => {
  it('puts a circular orbit at distance a and keeps it in the plane when inclination is 0', () => {
    const o = [0, 0, 0];
    orbitPos(2, 0, 0, 0, 0, 1.234, o);
    expect(Math.hypot(o[0], o[1])).toBeCloseTo(2, 12);
    expect(o[2]).toBeCloseTo(0, 12);
  });
  it('reaches perihelion distance a(1-e) at M = 0 and aphelion a(1+e) at M = pi', () => {
    const o = [0, 0, 0];
    orbitPos(1, 0.5, 0, 0, 0, 0, o);  expect(Math.hypot(...o)).toBeCloseTo(0.5, 12);
    orbitPos(1, 0.5, 0, 0, 0, Math.PI, o); expect(Math.hypot(...o)).toBeCloseTo(1.5, 12);
  });
  it('lifts out of the ecliptic by sin(i) at the quarter orbit', () => {
    const o = [0, 0, 0];
    orbitPos(1, 0, 30 * D2R, 0, 0, Math.PI / 2, o);
    expect(o[2]).toBeCloseTo(Math.sin(30 * D2R), 12);
  });
});

describe('planet positions (JPL elements)', () => {
  it('Earth is ~1 AU from the Sun all year', () => {
    const o = [0, 0, 0];
    for (let d = 0; d < 365; d += 30) {
      planetEcl('earth', J2000 + d, o);
      expect(Math.hypot(...o)).toBeGreaterThan(0.982);
      expect(Math.hypot(...o)).toBeLessThan(1.018);
    }
  });
  it('Earth is nearest the Sun in early January and farthest in early July', () => {
    const o = [0, 0, 0];
    planetEcl('earth', isoToJD('2024-01-03T00:00Z'), o); const jan = Math.hypot(...o);
    planetEcl('earth', isoToJD('2024-07-05T00:00Z'), o); const jul = Math.hypot(...o);
    expect(jan).toBeLessThan(0.985);
    expect(jul).toBeGreaterThan(1.015);
  });
  it('Jupiter is ~5.2 AU and Neptune ~30 AU out', () => {
    const o = [0, 0, 0];
    planetEcl('jupiter', J2000, o); expect(Math.hypot(...o)).toBeCloseTo(4.97, 0);
    planetEcl('neptune', J2000, o); expect(Math.hypot(...o)).toBeCloseTo(30.1, 0);
  });
  it('Earth completes a lap in about a year', () => {
    const a = [0, 0, 0], b = [0, 0, 0];
    planetEcl('earth', J2000, a); planetEcl('earth', J2000 + 365.25, b);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(0.01);
  });
  it('an AU is about 150 million km', () => expect(AU_KM).toBeCloseTo(1.496e8, -5));
});

describe('math helpers', () => {
  it('clamp bounds a value', () => { expect(clamp(5, 0, 3)).toBe(3); expect(clamp(-1, 0, 3)).toBe(0); expect(clamp(2, 0, 3)).toBe(2); });
  it('mixc interpolates colour channels', () => expect(mixc([0, 100, 200], [100, 200, 0], .5)).toEqual([50, 150, 100]));
  it('rng is deterministic per seed, in [0,1), and differs between seeds', () => {
    const a = rng(7), b = rng(7), c = rng(8);
    const xs = Array.from({ length: 5 }, () => a()), ys = Array.from({ length: 5 }, () => b());
    expect(xs).toEqual(ys);
    expect(xs.every(v => v >= 0 && v < 1)).toBe(true);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(xs);
  });
});

describe('formatting and colour', () => {
  it('fmtNum abbreviates large values and handles missing ones', () => {
    expect(fmtNum(null)).toBe('—');
    expect(fmtNum(12.345, 1)).toBe('12.3');
    expect(fmtNum(25000)).toBe((25000).toLocaleString());
    expect(fmtNum(3_500_000)).toBe('3.50 M');
  });
  it('bvColor runs from blue (hot) to red (cool) and clamps out-of-range indices', () => {
    const hot = [0, 0, 0], cool = [0, 0, 0], off = [0, 0, 0];
    bvColor(-.3, hot); bvColor(2.1, cool); bvColor(9, off);
    expect(hot[2]).toBe(1); expect(hot[0]).toBeLessThan(.7);
    expect(cool[0]).toBe(1); expect(cool[2]).toBeLessThan(.3);
    expect(off).toEqual(cool);
  });
});
