/**
 * Turns raw pointer events into intent: tap, orbit or pinch. Kept free of the DOM and three.js so it can be tested.
 *
 * Rules that matter on a touchscreen:
 * - A gesture is a tap only if it stayed within the slop radius, was short, and never had a second finger. A finger
 *   wobbles by several pixels even when "still", so the radius is larger for touch than for a mouse.
 * - Once two fingers have been down, the gesture can never become a tap or an orbit, even after one lifts. Otherwise
 *   the finger left behind either selects whatever is under it or makes the view jump.
 * - Pinch jitter below a couple of pixels is ignored, so resting two fingers does not creep the zoom.
 */
export type PointerKind = 'mouse' | 'touch' | 'pen';

export interface GestureHandlers {
  /** A clean tap or click at this point. */
  tap(x: number, y: number, kind: PointerKind): void;
  /** One pointer dragging: movement since the last event, in pixels. */
  orbit(dx: number, dy: number): void;
  /** Two pointers: ratio of the old finger distance to the new one (below 1 = fingers apart = zoom in). */
  pinch(k: number): void;
  /** The first pointer went down / the last one came up. */
  start(): void;
  end(): void;
}

export const SLOP: Record<PointerKind, number> = { mouse: 5, pen: 8, touch: 12 };
export const TAP_MS = 500;
const PINCH_DEADBAND = 2;

interface Pt {
  x: number;
  y: number;
}
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function createGestures(h: GestureHandlers) {
  const ptrs = new Map<number, Pt>();
  let multi = false,
    moved = false,
    start: { x: number; y: number; t: number; kind: PointerKind } | null = null,
    pinchD = 0;

  const pinchBase = () => {
    const [a, b] = [...ptrs.values()];
    pinchD = a && b ? dist(a, b) : 0;
  };

  function down(id: number, x: number, y: number, kind: PointerKind, t: number) {
    if (ptrs.size === 0) {
      multi = false;
      moved = false;
      start = { x, y, t, kind };
      h.start();
    }
    ptrs.set(id, { x, y });
    if (ptrs.size >= 2) {
      multi = true;
      moved = true;
      pinchBase();
    }
  }

  /** Returns false when the pointer is not one of ours (a hovering mouse). */
  function move(id: number, x: number, y: number): boolean {
    const p = ptrs.get(id);
    if (!p) return false;
    const dx = x - p.x,
      dy = y - p.y;
    p.x = x;
    p.y = y;
    if (multi) {
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()],
          d = dist(a, b);
        if (pinchD > 0 && d > 0 && Math.abs(d - pinchD) >= PINCH_DEADBAND) {
          h.pinch(pinchD / d);
          pinchD = d;
        }
      }
      return true; // a lone finger left after a pinch does nothing
    }
    if (!moved && start && Math.hypot(x - start.x, y - start.y) > SLOP[start.kind]) moved = true;
    if (moved) h.orbit(dx, dy);
    return true;
  }

  function up(id: number, x: number, y: number, t: number) {
    if (!ptrs.delete(id)) return;
    if (ptrs.size === 2) pinchBase();
    else pinchD = 0;
    if (ptrs.size > 0) return;
    const s = start;
    start = null;
    h.end();
    if (s && !multi && !moved && (s.kind !== 'touch' || t - s.t <= TAP_MS)) h.tap(x, y, s.kind);
  }

  function cancel(id: number) {
    if (!ptrs.delete(id)) return;
    if (ptrs.size === 2) pinchBase();
    else pinchD = 0;
    if (ptrs.size === 0) {
      start = null;
      h.end();
    }
  }

  return {
    down,
    move,
    up,
    cancel,
    get active() {
      return ptrs.size;
    },
  };
}
