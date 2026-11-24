import { describe, expect, it } from 'vitest';
import { STATIC_FILES, endpoint } from './api';

describe('endpoint', () => {
  it('leaves routes alone when the Python server answers them', () => {
    expect(endpoint('/api/sats', false)).toBe('/api/sats');
    expect(endpoint('/api/stars.bin', false, '/space/')).toBe('/api/stars.bin');
  });

  it('maps every route to a file under data/ in static mode', () => {
    expect(endpoint('/api/sats', true, '/')).toBe('/data/sats.json');
    expect(endpoint('/api/stars.json', true, '/')).toBe('/data/stars_names.json');
    expect(endpoint('/api/stars.bin', true, '/')).toBe('/data/stars.bin');
  });

  it('respects the site base path (GitHub Pages serves under /space/)', () => {
    expect(endpoint('/api/sbdb', true, '/space/')).toBe('/space/data/sbdb.json');
    expect(endpoint('/api/craft', true, './')).toBe('./data/craft.json');
  });

  it('rejects an unknown route instead of fetching a wrong URL', () => {
    expect(() => endpoint('/api/nope', true, '/')).toThrow(/Unknown data route/);
  });

  it('exports files the server also writes (names stay in sync with server/export.py)', () => {
    expect(Object.values(STATIC_FILES).sort()).toEqual([
      'constellations.json',
      'craft.json',
      'exo.json',
      'sats.json',
      'sbdb.json',
      'stars.bin',
      'stars_names.json',
    ]);
  });
});
