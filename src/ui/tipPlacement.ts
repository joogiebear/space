/**
 * Where to put the hover tip. `x`, `y` are the tip's preferred top-left (already offset from the pointer). It flips to
 * the other side of the pointer when it would run past the right or bottom edge, then is held inside the window.
 */
export function placeTip(x: number, y: number, w: number, h: number, vw: number, vh: number, gap = 8) {
  const OFFSET_X = 14,
    OFFSET_Y = 12;
  let left = x,
    top = y;
  if (left + w + gap > vw) left = x - OFFSET_X * 2 - w; // pointer is at x - 14: put the tip to its left
  if (top + h + gap > vh) top = y - OFFSET_Y * 2 - h; // and above it
  left = Math.max(gap, Math.min(left, vw - w - gap));
  top = Math.max(gap, Math.min(top, vh - h - gap));
  return { left, top };
}
