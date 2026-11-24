import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './motion';

const stubMedia = (matches: boolean) => {
  const mm = vi.fn((q: string) => ({ matches, media: q }));
  vi.stubGlobal('matchMedia', mm);
  return mm;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('prefersReducedMotion', () => {
  it('asks the browser for the reduce setting', () => {
    const mm = stubMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(mm).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('is false when the user has not asked for less motion', () => {
    stubMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('is false (not an error) where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('what it changes', () => {
  it('turns auto-orbit off by default for those users, and leaves it on for everyone else', async () => {
    stubMedia(true);
    expect((await import('@/engine/state')).opts.autoOrbit).toBe(false);
    vi.resetModules();
    stubMedia(false);
    expect((await import('@/engine/state')).opts.autoOrbit).toBe(true);
  });
});
