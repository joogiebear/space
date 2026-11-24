import { describe, expect, it } from 'vitest';
import { decodeView, encodeView } from '@/lib/view';
import { TOURS } from './tours';

const SCENES = /^(cosmos|starmap|solar|earth|gal:[a-z0-9]+)$/;

describe('tour content', () => {
  it('has unique ids and a title and blurb for the menu', () => {
    expect(new Set(TOURS.map(t => t.id)).size).toBe(TOURS.length);
    for (const t of TOURS) {
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.blurb.length).toBeGreaterThan(3);
      expect(t.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every step points at a real kind of scene and survives the share-link format', () => {
    for (const t of TOURS)
      for (const s of t.steps) {
        expect(s.view.scene, `${t.id}: ${s.title}`).toMatch(SCENES);
        expect(decodeView(encodeView(s.view))).toEqual(s.view);
        if (s.view.t) expect(Number.isFinite(Date.parse(s.view.t))).toBe(true);
      }
  });

  it('every caption is a sentence or two, not empty and not an essay', () => {
    for (const t of TOURS)
      for (const s of t.steps) {
        expect(s.title.length).toBeGreaterThan(1);
        expect(s.text.length, `${t.id}: ${s.title}`).toBeGreaterThan(40);
        expect(s.text.length, `${t.id}: ${s.title}`).toBeLessThan(260);
      }
  });

  it('a step that goes live does not also pin a date', () => {
    for (const t of TOURS) for (const s of t.steps) if (s.live) expect(s.view.t).toBeUndefined();
  });
});
