import { describe, expect, it } from 'vitest';
import { OBJECTS, fmtDistance, fmtLength, fmtMass, layoutX, reach, schwarzschildKm } from './data';

describe('horizon radius', () => {
  it('is about 2.95 km per sun of mass', () => {
    expect(schwarzschildKm(1)).toBeCloseTo(2.953, 3);
    // Sagittarius A*: about 18 sun radii; M87*: about 128 AU; TON 618: about 1,300 AU
    expect(schwarzschildKm(4.3e6) / 695700).toBeGreaterThan(17);
    expect(schwarzschildKm(4.3e6) / 695700).toBeLessThan(19);
    expect(schwarzschildKm(6.5e9) / 149597870.7).toBeCloseTo(128, -1);
    expect(schwarzschildKm(6.6e10) / 149597870.7).toBeCloseTo(1303, -1);
  });
});

describe('plain-language numbers', () => {
  it('writes lengths in a sensible unit', () => {
    expect(fmtLength(28)).toBe('28 km');
    expect(fmtLength(12_700_000)).toBe('18 sun radii');
    expect(fmtLength(1.92e10)).toBe('128 AU');
  });
  it('writes masses and distances', () => {
    expect(fmtMass(9.6)).toBe('9.6 suns');
    expect(fmtMass(4.3e6)).toBe('4.3 million suns');
    expect(fmtMass(6.6e10)).toBe('66 billion suns');
    expect(fmtDistance(1560)).toBe('1,560 light years');
    expect(fmtDistance(53e6)).toBe('53 million light years');
    expect(fmtDistance(1.3e9)).toBe('1.3 billion light years');
  });
});

describe('the objects', () => {
  it('have unique ids, real masses and a story', () => {
    expect(new Set(OBJECTS.map(o => o.id)).size).toBe(OBJECTS.length);
    for (const o of OBJECTS) {
      expect(o.mass, o.id).toBeGreaterThan(1);
      expect(o.text.length, o.id).toBeGreaterThan(80);
      expect(o.draw, o.id).toBeGreaterThan(0);
    }
  });
  it('run from the lightest to the heaviest, after the pulsar, and drawn bigger as they get heavier', () => {
    const rest = OBJECTS.slice(1);
    expect(rest.map(o => o.mass)).toEqual(rest.map(o => o.mass).sort((x, y) => x - y));
    // the merger is two holes drawn smaller on purpose, so leave it out of the size order
    const drawn = rest.filter(o => o.kind !== 'merger').map(o => o.draw);
    expect(drawn).toEqual([...drawn].sort((x, y) => x - y));
  });
});

describe('layout', () => {
  it('leaves a gap between neighbours and is centred', () => {
    const halves = OBJECTS.map(reach),
      xs = layoutX(halves, 10);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1] - halves[i - 1] - halves[i]).toBeCloseTo(10, 6);
    expect(xs[0] + xs[xs.length - 1]).toBeCloseTo(0, 6);
  });
});
