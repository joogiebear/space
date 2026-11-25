import { describe, expect, it } from 'vitest';
import { EDGE_GLY, RINGS, RMAX, STRUCTURES, dirOf, mapRadius } from './data';

describe('the distance scale', () => {
  it('puts us at the middle and the oldest light at the edge', () => {
    expect(mapRadius(0)).toBe(0);
    expect(mapRadius(EDGE_GLY)).toBeCloseTo(RMAX, 6);
  });
  it('only ever grows with distance, and gives the near universe room', () => {
    let last = -1;
    for (const g of [0, 0.001, 0.01, 0.1, 1, 5, 10, 13.8]) {
      expect(mapRadius(g)).toBeGreaterThan(last);
      last = mapRadius(g);
    }
    // 100 million light years is already a quarter of the way out, not a dot in the middle
    expect(mapRadius(0.1) / RMAX).toBeGreaterThan(0.4);
  });
});

describe('directions', () => {
  it('are unit vectors', () => {
    for (const [az, el] of [
      [0, 0],
      [123, 45],
      [300, -70],
    ]) {
      const v = dirOf(az, el);
      expect(Math.hypot(...v)).toBeCloseTo(1, 9);
    }
  });
});

describe('the structures', () => {
  it('have unique ids, distances inside what we can see and a story', () => {
    expect(new Set(STRUCTURES.map(s => s.id)).size).toBe(STRUCTURES.length);
    for (const s of STRUCTURES) {
      expect(s.gly, s.id).toBeGreaterThanOrEqual(0);
      expect(s.gly, s.id).toBeLessThanOrEqual(EDGE_GLY);
      expect(s.text.length, s.id).toBeGreaterThan(80);
      expect(s.sub.length, s.id).toBeGreaterThan(10);
    }
  });
  it('run from near to far, with the oldest light last', () => {
    const d = STRUCTURES.map(s => s.gly);
    expect(d).toEqual([...d].sort((a, b) => a - b));
    expect(STRUCTURES[STRUCTURES.length - 1].id).toBe('cmb');
  });
  it('stay apart on the screen so labels do not pile up', () => {
    for (let i = 0; i < STRUCTURES.length; i++)
      for (let j = i + 1; j < STRUCTURES.length; j++) {
        const a = STRUCTURES[i],
          b = STRUCTURES[j],
          pa = dirOf(...a.dir).map(x => x * mapRadius(a.gly)),
          pb = dirOf(...b.dir).map(x => x * mapRadius(b.gly));
        expect(Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]), `${a.id} / ${b.id}`).toBeGreaterThan(14);
      }
  });
  it('rings are round distances in order', () => {
    expect(RINGS.map(r => r.gly)).toEqual([0.1, 1, 10]);
  });
});
