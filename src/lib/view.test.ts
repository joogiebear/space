import { describe, expect, it } from 'vitest';
import { decodeView, encodeView, type ViewState } from './view';

describe('share link format', () => {
  it('a bare scene id (the old format) still decodes', () => {
    expect(decodeView('#solar')).toEqual({ scene: 'solar' });
    expect(decodeView('#gal:andromeda')).toEqual({ scene: 'gal:andromeda' });
    expect(decodeView('#gal%3Aandromeda')).toEqual({ scene: 'gal:andromeda' });
  });

  it('a scene with nothing else encodes to just the scene id', () => {
    expect(encodeView({ scene: 'earth' })).toBe('earth');
  });

  it('round-trips every field', () => {
    const v: ViewState = {
      scene: 'solar',
      sel: 'mars',
      t: '1969-07-20T20:17:00.000Z',
      r: 3600,
      paused: true,
      y: 0.6,
      p: 0.5,
      z: 0.8,
    };
    expect(decodeView(encodeView(v))).toEqual(v);
  });

  it('keeps colons readable in the hash', () => {
    const h = encodeView({ scene: 'solar', sel: 'sb:433', t: '2026-01-01T00:00:00.000Z' });
    expect(h).not.toMatch(/%3A/i);
    expect(decodeView(h)).toMatchObject({ sel: 'sb:433', t: '2026-01-01T00:00:00.000Z' });
  });

  it('a label with spaces and symbols survives', () => {
    const v: ViewState = { scene: 'earth', q: 'ISS (ZARYA) & co' };
    expect(decodeView(encodeView(v))).toEqual(v);
  });

  it('a body id wins over a label when both are given', () => {
    expect(encodeView({ scene: 'solar', sel: 'mars', q: 'Mars' })).toBe('solar?sel=mars');
  });

  it('rate and pause only make sense with a fixed time, so live links leave them out', () => {
    expect(encodeView({ scene: 'solar', r: 5, paused: true })).toBe('solar');
  });

  it('shortens camera numbers', () => {
    expect(encodeView({ scene: 'solar', y: 0.123456789 })).toBe('solar?y=0.1235');
  });

  it('drops garbage instead of throwing', () => {
    expect(decodeView('#solar?t=not-a-date&r=abc&y=NaN&z=-4&p=99')).toEqual({ scene: 'solar', p: 1.5 });
    expect(decodeView('#solar?r=0')).toEqual({ scene: 'solar' });
    expect(decodeView('#solar?z=1e9')).toEqual({ scene: 'solar' });
  });

  it('survives a broken percent escape', () => {
    expect(decodeView('#solar%E0%A4%A')).toEqual({ scene: 'solar%E0%A4%A' });
  });

  it('an empty hash is no view', () => {
    expect(decodeView('')).toBeNull();
    expect(decodeView('#')).toBeNull();
    expect(decodeView('#?sel=mars')).toBeNull();
  });

  it('caps absurdly long values', () => {
    expect(decodeView('#solar?sel=' + 'a'.repeat(5000))!.sel).toHaveLength(120);
  });
});
