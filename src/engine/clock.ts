import { nowJD } from '@/lib';
import { emitter } from './events';
import { sim } from './state';

/** (rate, fromSlider): the UI updates its slider and readout. */
export const rateChanged = emitter<[number, boolean]>();
export const pauseChanged = emitter<[boolean]>();

export function setRate(r: number, fromSlider = false) {
  sim.rate = r;
  rateChanged.emit(r, fromSlider);
}

export function setPaused(p: boolean) {
  sim.paused = p;
  pauseChanged.emit(p);
}

export const togglePause = () => setPaused(!sim.paused);

/** Snap back to the real clock at 1x. */
export function goLive() {
  sim.jd = nowJD(); sim.live = true; setPaused(false); setRate(1);
}

/** Jump to a Julian date at a given speed (time-travel presets). */
export function jumpTo(jd: number, rate: number) {
  sim.jd = jd; sim.live = false; setPaused(false); setRate(rate);
}

/** Advance the clock by `dt` real seconds. */
export function tickClock(dt: number) {
  if (sim.paused) return;
  if (sim.live && sim.rate === 1) sim.jd = nowJD(); else sim.jd += sim.rate * dt / 86400;
  sim.gt += dt * Math.min(sim.rate, 300);
}
