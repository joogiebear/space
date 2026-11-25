import { describe, expect, it } from 'vitest';
import { MAX_STRETCH, deprojection, planeToUv } from './photoPlane';
import { PHOTOS } from './photos';

describe('deprojection', () => {
  it('leaves a face-on galaxy alone and stretches an inclined one by 1 / cos(inclination)', () => {
    expect(deprojection(0)).toBe(1);
    expect(deprojection(60)).toBeCloseTo(2, 6);
    expect(deprojection(35)).toBeCloseTo(1 / Math.cos((35 * Math.PI) / 180), 6);
  });
  it('is capped so stars do not smear into lines, even edge-on', () => {
    expect(deprojection(77)).toBe(MAX_STRETCH); // 4.4 uncapped
    expect(deprojection(90)).toBe(MAX_STRETCH);
  });
});

describe('planeToUv', () => {
  const W = 10,
    aspect = 1.5;
  it('the middle of the galaxy is the middle of the picture', () => {
    expect(planeToUv(0, 0, { angle: 37, inclination: 50 }, W, aspect)).toEqual([0.5, 0.5]);
  });
  it('with no tilt on the page, along the major axis is along the picture width', () => {
    const [u, v] = planeToUv(2.5, 0, { angle: 0, inclination: 0 }, W, aspect);
    expect(u).toBeCloseTo(0.75, 9);
    expect(v).toBeCloseTo(0.5, 9);
  });
  it('a galaxy whose long axis is vertical on the page maps its major axis to the picture height', () => {
    const [u, v] = planeToUv(2, 0, { angle: 90, inclination: 0 }, W, aspect);
    expect(u).toBeCloseTo(0.5, 9);
    expect(v).toBeCloseTo(0.5 + (2 * aspect) / W, 9);
  });
  it('across the minor axis the picture is compressed by the stretch', () => {
    const face = planeToUv(0, 2, { angle: 0, inclination: 0 }, W, 1),
      tilted = planeToUv(0, 2, { angle: 0, inclination: 60 }, W, 1);
    expect(face[1] - 0.5).toBeCloseTo(0.2, 9);
    expect(tilted[1] - 0.5).toBeCloseTo(0.1, 9); // inclination 60 degrees: half as far across
  });
  it('rotates the page tilt out: a point along the tilted long axis lands on the picture axis', () => {
    const a = -52,
      r = 3;
    const [u, v] = planeToUv(r, 0, { angle: a, inclination: 0 }, W, 1);
    expect(u - 0.5).toBeCloseTo((r * Math.cos((a * Math.PI) / 180)) / W, 9);
    expect(v - 0.5).toBeCloseTo((r * Math.sin((a * Math.PI) / 180)) / W, 9);
  });
});

describe('the photographs carry plausible geometry', () => {
  it('inclinations are 0 to 90 degrees and angles within half a turn', () => {
    for (const [key, p] of Object.entries(PHOTOS)) {
      expect(p.inclination ?? 0, key).toBeGreaterThanOrEqual(0);
      expect(p.inclination ?? 0, key).toBeLessThanOrEqual(90);
      expect(Math.abs(p.angle ?? 0), key).toBeLessThanOrEqual(180);
    }
    expect(PHOTOS.sombrero.inclination).toBeGreaterThan(80); // seen almost edge-on
    expect(PHOTOS.pinwheel.inclination).toBeLessThan(25); // seen almost face-on
  });
});
