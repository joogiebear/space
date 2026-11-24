/**
 * Decides when the WebGL drawing buffer must be resized. Kept free of three.js and the DOM so it can be tested.
 *
 * Why not just listen for "resize"? Phone browsers change the visible area (address bar sliding away, rotation, the
 * first layout) without a reliable resize, visualViewport or ResizeObserver event. A canvas sized only from events
 * stays too small and leaves a hard black edge. So callers also run sync() every frame: it re-reads the window size
 * (cheap, no layout) and does the real work only when something changed.
 */
export interface Metrics {
  /** window.innerWidth / innerHeight / devicePixelRatio: cheap to read, no layout */
  innerW: number;
  innerH: number;
  rawDpr: number;
  /** the canvas container's laid-out size; 0 when it has not been laid out yet */
  hostW: number;
  hostH: number;
}
export interface Size {
  w: number;
  h: number;
  /** pixel ratio, capped at 2: more costs fill-rate and gains nothing visible */
  dpr: number;
}

export function createViewportSync(measure: () => Metrics, apply: (size: Size) => void) {
  let seen: [number, number, number] | null = null;
  let last = '';

  /** Re-measure and apply if the resulting size differs from the last one applied. */
  function resize() {
    const m = measure();
    seen = [m.innerW, m.innerH, m.rawDpr];
    const w = m.hostW || m.innerW,
      h = m.hostH || m.innerH,
      dpr = Math.min(m.rawDpr || 1, 2);
    const key = `${w}x${h}@${dpr}`;
    if (key === last) return;
    last = key;
    apply({ w, h, dpr });
  }

  /** Cheap per-frame check: only does the work of resize() when the window itself changed. */
  function sync() {
    const m = measure();
    if (!seen || m.innerW !== seen[0] || m.innerH !== seen[1] || m.rawDpr !== seen[2]) resize();
  }

  return { resize, sync };
}
