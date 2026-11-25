/** Choosing how much work the Milky Way shader does, from the device and from how the frames are going. */

export interface DeviceHints {
  /** `(pointer: coarse)`: a touch screen is the main input */
  coarsePointer: boolean;
  /** logical processors, if the browser says */
  cores?: number;
  /** gigabytes of memory, rounded down by the browser (Chromium only) */
  memoryGb?: number;
}

/** Phones, tablets and modest machines start on the light version. */
export function wantsLightMilkyWay(d: DeviceHints): boolean {
  return d.coarsePointer || (d.cores !== undefined && d.cores <= 4) || (d.memoryGb !== undefined && d.memoryGb <= 4);
}

export function deviceHints(): DeviceHints {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
  return {
    coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    cores: nav?.hardwareConcurrency,
    memoryGb: nav?.deviceMemory,
  };
}

/**
 * Watches frame times while something costly is being drawn and says once when the average over `frames` frames is
 * slower than `limit` seconds, so the caller can step down to a cheaper version. Resets while `active` is false, so a
 * slow spell with nothing costly on screen does not count against it.
 */
export function createFrameGovernor(limit: number, frames: number) {
  let sum = 0,
    n = 0,
    done = false;
  return (dt: number, active: boolean): boolean => {
    if (done) return false;
    if (!active || dt <= 0) {
      sum = 0;
      n = 0;
      return false;
    }
    sum += dt;
    if (++n < frames) return false;
    const slow = sum / n > limit;
    sum = 0;
    n = 0;
    if (slow) done = true;
    return slow;
  };
}
