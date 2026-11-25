import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GALAXIES } from './data';
import { PHOTOS, photoFade } from './photos';

describe('galaxy photographs', () => {
  it('belong to galaxies that exist, and their files are in the project', () => {
    const keys = new Set(GALAXIES.map(g => g.key));
    for (const [key, p] of Object.entries(PHOTOS)) {
      expect(keys.has(key), key).toBe(true);
      expect(existsSync(`public/assets/galaxies/${p.file}`), p.file).toBe(true);
      expect(p.size).toBeGreaterThan(1);
      expect(p.credit.length).toBeGreaterThan(10);
    }
  });
  it('every photograph is credited in the credits file, with its licence', () => {
    const credits = readFileSync('public/assets/galaxies/CREDITS.md', 'utf8');
    for (const p of Object.values(PHOTOS)) expect(credits, p.file).toContain('`' + p.file + '`');
    expect(credits).toMatch(/CC BY 4\.0/);
    expect(credits).toMatch(/Public domain/);
  });
  it('a crop stays inside the picture', () => {
    for (const p of Object.values(PHOTOS)) {
      if (!p.crop) continue;
      const [x, y, w, h] = p.crop;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(1);
      expect(y + h).toBeLessThanOrEqual(1);
    }
  });
  it('only the two galaxies that cannot be photographed whole are illustrations, and say so', () => {
    expect(PHOTOS.milkyway.illustration).toBe(true);
    expect(PHOTOS.milkyway.credit).toMatch(/artist/i);
    expect(PHOTOS.sagdwarf.illustration).toBe(true);
    expect(PHOTOS.sagdwarf.credit).toMatch(/illustration/i);
    for (const [key, p] of Object.entries(PHOTOS))
      if (key !== 'milkyway' && key !== 'sagdwarf') expect(p.illustration, key).toBeFalsy();
  });
});

describe('photoFade', () => {
  it('is gone up close, full from afar, and smooth in between', () => {
    expect(photoFade(1)).toBe(0);
    expect(photoFade(4.5)).toBe(0);
    expect(photoFade(11)).toBe(1);
    expect(photoFade(50)).toBe(1);
    const mid = photoFade(7.75);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
    expect(photoFade(6)).toBeLessThan(photoFade(9));
  });
});
