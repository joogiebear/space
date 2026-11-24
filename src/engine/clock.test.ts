import { beforeEach, describe, expect, it } from 'vitest';
import { nowJD } from '@/lib';
import { goLive, jumpTo, rateChanged, setPaused, setRate, tickClock } from './clock';
import { sim } from './state';

beforeEach(() => { Object.assign(sim, { jd: 2460000.5, rate: 1, paused: false, live: false, gt: 0 }); });

describe('tickClock', () => {
  it('advances the Julian date by rate * dt seconds', () => {
    sim.rate = 86400; // one simulated day per real second
    tickClock(0.5);
    expect(sim.jd).toBeCloseTo(2460001, 9);
  });

  it('does nothing while paused', () => {
    sim.rate = 86400; sim.paused = true;
    tickClock(1);
    expect(sim.jd).toBe(2460000.5);
    expect(sim.gt).toBe(0);
  });

  it('follows the real clock when live at 1x', () => {
    sim.live = true; sim.rate = 1;
    tickClock(0.016);
    expect(Math.abs(sim.jd - nowJD())).toBeLessThan(1 / 86400);
  });

  it('advances normally when live but sped up', () => {
    sim.live = true; sim.rate = 3600;
    tickClock(1);
    expect(sim.jd).toBeCloseTo(2460000.5 + 3600 / 86400, 9);
  });

  it('accumulates animation time with the speed capped at 300x', () => {
    sim.rate = 10; tickClock(1); expect(sim.gt).toBeCloseTo(10, 9);
    sim.rate = 1e6; tickClock(1); expect(sim.gt).toBeCloseTo(310, 9);
  });
});

describe('clock commands', () => {
  it('setRate stores the rate and tells listeners whether it came from the slider', () => {
    const seen: [number, boolean][] = [];
    rateChanged.on((r, s) => seen.push([r, s]));
    setRate(500); setRate(900, true);
    expect(sim.rate).toBe(900);
    expect(seen.slice(-2)).toEqual([[500, false], [900, true]]);
  });

  it('setPaused pauses and resumes', () => {
    setPaused(true); expect(sim.paused).toBe(true);
    setPaused(false); expect(sim.paused).toBe(false);
  });

  it('jumpTo sets the date and speed, leaves live mode and unpauses', () => {
    sim.live = true; sim.paused = true;
    jumpTo(2451545, 86400);
    expect(sim).toMatchObject({ jd: 2451545, rate: 86400, live: false, paused: false });
  });

  it('goLive snaps back to now at 1x and unpauses', () => {
    sim.paused = true; sim.rate = 1e5;
    const t0 = nowJD(); goLive();
    expect(sim.jd).toBeGreaterThanOrEqual(t0);
    expect(sim.jd - t0).toBeLessThan(1 / 86400);
    expect(sim).toMatchObject({ rate: 1, live: true, paused: false });
  });
});
