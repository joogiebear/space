import { describe, expect, it } from 'vitest';
import { placeTip } from './tipPlacement';

const VW = 800,
  VH = 600;
describe('placeTip', () => {
  it('stays where asked when there is room', () => {
    expect(placeTip(114, 212, 120, 30, VW, VH)).toEqual({ left: 114, top: 212 });
  });
  it('flips to the left of the pointer at the right edge', () => {
    // pointer at x = 780, preferred left = 794
    const p = placeTip(794, 100, 120, 30, VW, VH);
    expect(p.left + 120).toBeLessThanOrEqual(780);
    expect(p.top).toBe(100);
  });
  it('flips above the pointer at the bottom edge', () => {
    const p = placeTip(100, 590, 120, 30, VW, VH); // pointer at y = 578
    expect(p.top + 30).toBeLessThanOrEqual(578);
  });
  it('is never pushed off the window, even in the corner or when it is wider than the window', () => {
    const p = placeTip(790, 595, 120, 30, VW, VH);
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.left + 120).toBeLessThanOrEqual(VW);
    expect(p.top + 30).toBeLessThanOrEqual(VH);
    expect(placeTip(10, 10, 900, 30, VW, VH).left).toBe(8);
  });
});
