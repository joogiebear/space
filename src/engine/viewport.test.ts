import { describe, expect, it, vi } from 'vitest';
import { createViewportSync, type Metrics } from './viewport';

/** A fake screen: tests change it the way a phone does, without telling anyone. */
function setup(initial: Partial<Metrics> = {}) {
  const screen: Metrics = { innerW: 375, innerH: 812, rawDpr: 2, hostW: 375, hostH: 812, ...initial };
  const apply = vi.fn();
  const vp = createViewportSync(() => ({ ...screen }), apply);
  return { screen, apply, ...vp };
}

describe('createViewportSync', () => {
  it('applies the container size, with the pixel ratio, on the first resize', () => {
    const { apply, resize } = setup();
    resize();
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith({ w: 375, h: 812, dpr: 2 });
  });

  it('does nothing when asked to resize and the size has not changed', () => {
    const { apply, resize } = setup();
    resize();
    resize();
    resize();
    expect(apply).toHaveBeenCalledOnce();
  });

  it('caps the pixel ratio at 2 (a 3x phone does not pay for 9 pixels per dot)', () => {
    const { apply, resize } = setup({ rawDpr: 3 });
    resize();
    expect(apply).toHaveBeenCalledWith({ w: 375, h: 812, dpr: 2 });
  });

  it('uses the window size until the container has been laid out (0 x 0)', () => {
    const { apply, resize } = setup({ hostW: 0, hostH: 0, innerW: 390, innerH: 700 });
    resize();
    expect(apply).toHaveBeenCalledWith({ w: 390, h: 700, dpr: 2 });
  });

  it('falls back to a pixel ratio of 1 when the browser reports none', () => {
    const { apply, resize } = setup({ rawDpr: 0 });
    resize();
    expect(apply).toHaveBeenCalledWith({ w: 375, h: 812, dpr: 1 });
  });

  describe('sync(): the per-frame check that catches silent changes', () => {
    it('sets the size up on the very first frame even if nothing called resize()', () => {
      const { apply, sync } = setup();
      sync();
      expect(apply).toHaveBeenCalledOnce();
    });

    it('does nothing on frames where the window has not changed', () => {
      const { apply, resize, sync } = setup();
      resize();
      apply.mockClear();
      for (let i = 0; i < 100; i++) sync();
      expect(apply).not.toHaveBeenCalled();
    });

    it('notices the address bar hiding (taller window) with no event', () => {
      const { screen, apply, resize, sync } = setup();
      resize();
      apply.mockClear();
      screen.innerH = screen.hostH = 880; // the browser grew the page; it told nobody
      sync();
      expect(apply).toHaveBeenCalledWith({ w: 375, h: 880, dpr: 2 });
    });

    it('notices a rotation with no event', () => {
      const { screen, apply, resize, sync } = setup();
      resize();
      apply.mockClear();
      Object.assign(screen, { innerW: 812, innerH: 375, hostW: 812, hostH: 375 });
      sync();
      expect(apply).toHaveBeenCalledWith({ w: 812, h: 375, dpr: 2 });
    });

    it('notices a pixel-ratio change (browser zoom, moving to another display)', () => {
      const { screen, apply, resize, sync } = setup();
      resize();
      apply.mockClear();
      screen.rawDpr = 1;
      sync();
      expect(apply).toHaveBeenCalledWith({ w: 375, h: 812, dpr: 1 });
    });

    it('applies once per change, not once per frame', () => {
      const { screen, apply, resize, sync } = setup();
      resize();
      apply.mockClear();
      screen.innerW = screen.hostW = 360;
      for (let i = 0; i < 50; i++) sync();
      expect(apply).toHaveBeenCalledOnce();
    });

    it('survives a window change that does not change the canvas (the key is the applied size)', () => {
      const { screen, apply, resize, sync } = setup();
      resize();
      apply.mockClear();
      screen.innerH = 790; // window shrank, but the fixed canvas container stayed the same size
      sync();
      expect(apply).not.toHaveBeenCalled();
    });
  });
});
