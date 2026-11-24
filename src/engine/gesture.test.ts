import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createGestures, SLOP, TAP_MS, type GestureHandlers } from './gesture';

let h: { [K in keyof GestureHandlers]: Mock<GestureHandlers[K]> };
let g: ReturnType<typeof createGestures>;
beforeEach(() => {
  h = { tap: vi.fn(), orbit: vi.fn(), pinch: vi.fn(), start: vi.fn(), end: vi.fn() };
  g = createGestures(h);
});

describe('taps', () => {
  it('a still touch is a tap', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.up(1, 100, 100, 80);
    expect(h.tap).toHaveBeenCalledWith(100, 100, 'touch');
    expect(h.start).toHaveBeenCalledTimes(1);
    expect(h.end).toHaveBeenCalledTimes(1);
  });

  it('finger wobble inside the touch slop is still a tap, and does not orbit', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.move(1, 100 + SLOP.touch - 1, 100);
    g.up(1, 100 + SLOP.touch - 1, 100, 100);
    expect(h.orbit).not.toHaveBeenCalled();
    expect(h.tap).toHaveBeenCalledTimes(1);
  });

  it('the same wobble is a drag for a mouse, which is steadier', () => {
    g.down(1, 100, 100, 'mouse', 0);
    g.move(1, 100 + SLOP.touch - 1, 100);
    g.up(1, 100 + SLOP.touch - 1, 100, 100);
    expect(h.orbit).toHaveBeenCalled();
    expect(h.tap).not.toHaveBeenCalled();
  });

  it('a long press is not a tap on touch, but a slow mouse click still is', () => {
    g.down(1, 5, 5, 'touch', 0);
    g.up(1, 5, 5, TAP_MS + 1);
    expect(h.tap).not.toHaveBeenCalled();
    g.down(2, 5, 5, 'mouse', 0);
    g.up(2, 5, 5, 5000);
    expect(h.tap).toHaveBeenCalledTimes(1);
  });

  it('dragging past the slop orbits and never taps', () => {
    g.down(1, 0, 0, 'touch', 0);
    g.move(1, 30, 0);
    g.move(1, 40, 5);
    g.up(1, 40, 5, 100);
    expect(h.orbit).toHaveBeenLastCalledWith(10, 5);
    expect(h.tap).not.toHaveBeenCalled();
  });
});

describe('two fingers', () => {
  it('fingers moving apart zoom in (ratio below 1), together zoom out', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.down(2, 200, 100, 'touch', 5);
    g.move(2, 300, 100);
    expect(h.pinch).toHaveBeenLastCalledWith(100 / 200);
    g.move(2, 150, 100);
    expect(h.pinch.mock.calls.at(-1)![0]).toBeGreaterThan(1);
    expect(h.orbit).not.toHaveBeenCalled();
  });

  it('the composed ratio is right when both fingers move', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.down(2, 200, 100, 'touch', 0);
    g.move(1, 50, 100); // distance 150
    g.move(2, 250, 100); // distance 200
    const product = h.pinch.mock.calls.reduce((a: number, c: number[]) => a * c[0], 1);
    expect(product).toBeCloseTo(100 / 200);
  });

  it('ignores sub-pixel jitter from resting fingers', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.down(2, 200, 100, 'touch', 0);
    g.move(2, 201, 100);
    g.move(2, 200, 100);
    expect(h.pinch).not.toHaveBeenCalled();
  });

  it('never taps, even if the fingers did not move and lifted together', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.down(2, 140, 100, 'touch', 10);
    g.up(2, 140, 100, 60);
    g.up(1, 100, 100, 70);
    expect(h.tap).not.toHaveBeenCalled();
    expect(h.end).toHaveBeenCalledTimes(1);
  });

  it('the finger left after a pinch neither orbits nor taps', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.down(2, 200, 100, 'touch', 0);
    g.move(2, 260, 100);
    g.up(2, 260, 100, 200);
    g.move(1, 160, 160);
    g.up(1, 160, 160, 300);
    expect(h.orbit).not.toHaveBeenCalled();
    expect(h.tap).not.toHaveBeenCalled();
  });

  it('the next touch after a pinch is a fresh gesture and can tap', () => {
    g.down(1, 100, 100, 'touch', 0);
    g.down(2, 200, 100, 'touch', 0);
    g.up(2, 200, 100, 50);
    g.up(1, 100, 100, 60);
    g.down(3, 50, 50, 'touch', 1000);
    g.up(3, 50, 50, 1050);
    expect(h.tap).toHaveBeenCalledWith(50, 50, 'touch');
  });
});

describe('housekeeping', () => {
  it('a hovering mouse (no button down) is not tracked', () => {
    expect(g.move(9, 1, 1)).toBe(false);
  });
  it('cancel ends the gesture without a tap', () => {
    g.down(1, 1, 1, 'touch', 0);
    g.cancel(1);
    expect(h.end).toHaveBeenCalledTimes(1);
    expect(h.tap).not.toHaveBeenCalled();
    expect(g.active).toBe(0);
  });
});
