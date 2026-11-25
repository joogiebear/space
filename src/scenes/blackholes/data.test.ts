import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EHT_IMAGES,
  LY_PER_UNIT,
  OBJECTS,
  fmtDistance,
  fmtLength,
  fmtMass,
  layoutX,
  reach,
  schwarzschildKm,
  sunOffset,
} from './data';

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

describe('where things are in the Milky Way', () => {
  it('puts the galactic centre 30 units from the Sun, straight ahead of longitude 0', () => {
    const o = sunOffset(0, 0, 26000);
    expect(o.toCentre).toBeCloseTo(30, 6);
    expect(o.ahead).toBeCloseTo(0, 6);
    expect(o.up).toBeCloseTo(0, 6);
    expect(LY_PER_UNIT).toBeCloseTo(866.67, 1);
  });
  it('puts longitude 90 along the direction the Sun travels and the pole straight up', () => {
    expect(sunOffset(90, 0, 1000).ahead).toBeCloseTo(1000 / LY_PER_UNIT, 6);
    expect(sunOffset(0, 90, 1000).up).toBeCloseTo(1000 / LY_PER_UNIT, 6);
  });
  it('keeps the real distance from the Sun', () => {
    for (const o of OBJECTS) {
      if (!o.galactic) continue;
      const v = sunOffset(o.galactic.l, o.galactic.b, o.distanceLy);
      expect(Math.hypot(v.toCentre, v.ahead, v.up) * LY_PER_UNIT).toBeCloseTo(o.distanceLy, 3);
    }
  });
  it('knows which objects live in the Milky Way, and every home names an object', () => {
    expect(OBJECTS.filter(o => o.galactic).map(o => o.id)).toEqual(['crab', 'gaiabh1', 'cygx1']);
    for (const o of OBJECTS.filter(o => o.home)) expect(o.home!.sel.length).toBeGreaterThan(2);
  });
});

describe('the real Event Horizon Telescope images', () => {
  const credits = readFileSync('public/assets/blackholes/CREDITS.md', 'utf8');
  it('belong to an object, exist as files, and are credited', () => {
    for (const e of EHT_IMAGES) {
      expect(
        OBJECTS.some(o => o.id === e.of),
        e.id,
      ).toBe(true);
      expect(() => readFileSync('public/assets/blackholes/' + e.file), e.file).not.toThrow();
      expect(credits, e.file).toContain('`' + e.file + '`');
      expect(e.credit).toMatch(/EHT/);
      expect(e.ringFrac).toBeGreaterThan(0.1);
      expect(e.ringFrac).toBeLessThan(1);
    }
  });
});
