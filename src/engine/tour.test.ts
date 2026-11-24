import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeScene } from '@/test/fakeScene';

const { sceneEntered, goScene, applyView, goLive, isBusy } = vi.hoisted(() => ({
  isBusy: vi.fn(() => false),
  sceneEntered: (() => {
    const fns: ((s: { id: string }) => void)[] = [];
    return { on: (f: (s: { id: string }) => void) => fns.push(f), emit: (s: { id: string }) => fns.forEach(f => f(s)) };
  })(),
  goScene: vi.fn(),
  applyView: vi.fn(),
  goLive: vi.fn(),
}));
vi.mock('./sceneManager', () => ({
  goScene: (...a: unknown[]) => goScene(...a),
  isBusy: () => isBusy(),
  sceneEntered,
  chain: (id: string) => (id === 'earth' ? ['solar', 'earth'] : ['solar']),
}));
vi.mock('./share', () => ({ applyView: (...a: unknown[]) => applyView(...a) }));
vi.mock('./clock', () => ({ goLive: () => goLive() }));

import { App } from './state';
import { next, prev, readingMs, startTour, stopTour, toggleAuto, tourActive, tourChanged, type Tour } from './tour';

const tour: Tour = {
  id: 't',
  title: 'T',
  blurb: '',
  steps: [
    { view: { scene: 'solar', sel: 'sun' }, title: 'One', text: 'a' },
    { view: { scene: 'solar', sel: 'mars' }, title: 'Two', text: 'b', hold: 1000 },
    { view: { scene: 'earth', sel: 'moon' }, title: 'Three', text: 'c', live: true },
  ],
};
let last: ReturnType<typeof snapshot>;
const snapshot = (s: unknown) => s as { title: string; index: number; auto: boolean } | null;

beforeEach(() => {
  vi.useFakeTimers();
  isBusy.mockReset().mockReturnValue(false);
  goScene.mockReset().mockImplementation(async (id: string) => {
    App.scene = makeScene({ id });
    sceneEntered.emit({ id });
  });
  applyView.mockReset();
  goLive.mockReset();
  App.scene = makeScene({ id: 'solar' });
  tourChanged.on(s => (last = snapshot(s)));
});
afterEach(() => {
  stopTour();
  vi.useRealTimers();
});

describe('guided tour engine', () => {
  it('starts on the first step, in the scene it is already in, without a scene change', async () => {
    startTour(tour);
    await vi.advanceTimersByTimeAsync(0);
    expect(goScene).not.toHaveBeenCalled();
    expect(applyView).toHaveBeenCalledWith({ scene: 'solar', sel: 'sun' }, { glide: true });
    expect(last).toMatchObject({ title: 'One', index: 0, auto: true });
    expect(tourActive()).toBe(true);
  });

  it('moves on by itself after the reading time, using a step’s own hold when given', async () => {
    startTour(tour);
    await vi.advanceTimersByTimeAsync(readingMs('a') - 1);
    expect(last).toMatchObject({ index: 0 });
    await vi.advanceTimersByTimeAsync(2);
    expect(last).toMatchObject({ index: 1 });
    await vi.advanceTimersByTimeAsync(1001);
    expect(last).toMatchObject({ index: 2 });
  });

  it('changes scene when a step needs a different one, diving deeper only when the target is lower in the tree', async () => {
    startTour(tour);
    await vi.advanceTimersByTimeAsync(0);
    next();
    await vi.advanceTimersByTimeAsync(0);
    next();
    await vi.advanceTimersByTimeAsync(0);
    expect(goScene).toHaveBeenCalledWith('earth', { deeper: true });
    prev();
    await vi.advanceTimersByTimeAsync(0);
    expect(goScene).toHaveBeenLastCalledWith('solar', { deeper: false });
  });

  it('a live step returns to the real clock and drops the date from its view', async () => {
    startTour({
      ...tour,
      steps: [{ view: { scene: 'solar', t: '2000-01-01T00:00:00.000Z', r: 60 }, title: 'x', text: 'y', live: true }],
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(goLive).toHaveBeenCalled();
    expect(applyView.mock.calls[0][0]).toMatchObject({ t: undefined, r: undefined });
  });

  it('pausing stops the automatic advance; playing resumes it', async () => {
    startTour(tour);
    toggleAuto();
    expect(last).toMatchObject({ auto: false });
    await vi.advanceTimersByTimeAsync(60000);
    expect(last).toMatchObject({ index: 0 });
    toggleAuto();
    await vi.advanceTimersByTimeAsync(readingMs('a') + 1);
    expect(last).toMatchObject({ index: 1 });
  });

  it('Back does nothing on the first step, and Next on the last step finishes the tour', async () => {
    startTour(tour);
    await vi.advanceTimersByTimeAsync(0);
    prev();
    expect(last).toMatchObject({ index: 0 });
    next();
    next();
    await vi.advanceTimersByTimeAsync(0);
    next();
    expect(last).toBeNull();
    expect(tourActive()).toBe(false);
  });

  it('ending the tour cancels its timer, so nothing moves afterwards', async () => {
    startTour(tour);
    stopTour();
    await vi.advanceTimersByTimeAsync(60000);
    expect(applyView).toHaveBeenCalledTimes(1); // only the first step, never the one after it
    expect(last).toBeNull();
  });

  it('leaving the tour’s scene by another route (a tab, a breadcrumb) ends it', async () => {
    startTour(tour);
    await vi.advanceTimersByTimeAsync(0);
    sceneEntered.emit({ id: 'starmap' });
    expect(tourActive()).toBe(false);
  });

  it('a refused scene change ends the tour instead of leaving it stuck', async () => {
    goScene.mockImplementation(async () => {}); // the manager was busy and did nothing
    startTour({ ...tour, steps: [tour.steps[2]] });
    await vi.advanceTimersByTimeAsync(0);
    expect(tourActive()).toBe(false);
  });

  it('a stale step finishing late cannot apply over a newer one', async () => {
    let release: () => void = () => {};
    goScene.mockImplementationOnce(async (id: string) => {
      await new Promise<void>(r => (release = r));
      App.scene = makeScene({ id });
    });
    startTour({ ...tour, steps: [tour.steps[2], tour.steps[0]] });
    next(); // while the first scene change is still in flight
    await vi.advanceTimersByTimeAsync(0);
    const before = applyView.mock.calls.length;
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(applyView.mock.calls.length).toBe(before);
  });

  it('waits for a scene change already in flight instead of being refused, and does not mistake it for the user leaving', async () => {
    let busyFor = 3;
    isBusy.mockImplementation(() => busyFor-- > 0);
    startTour({ ...tour, steps: [tour.steps[2]] });
    await vi.advanceTimersByTimeAsync(50);
    expect(goScene).not.toHaveBeenCalled();
    sceneEntered.emit({ id: 'solar' }); // the transition we were waiting for lands
    expect(tourActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(goScene).toHaveBeenCalledWith('earth', expect.anything());
    expect(tourActive()).toBe(true);
  });

  it('an empty tour does nothing', () => {
    startTour({ ...tour, steps: [] });
    expect(tourActive()).toBe(false);
  });
});

describe('reading time', () => {
  it('grows with the text but is capped', () => {
    expect(readingMs('x'.repeat(200))).toBeGreaterThan(readingMs('x'.repeat(20)));
    expect(readingMs('x'.repeat(100000))).toBe(20000);
  });
});
