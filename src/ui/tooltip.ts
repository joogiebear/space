import { dragStarted, hoverChanged } from '@/engine/input';
import { $ } from './dom';

/** Hover label that follows the pointer. */
export function initTooltip() {
  const tip = $('#tip');
  hoverChanged.on((b, x, y) => {
    if (b) { tip.textContent = b.label; tip.style.display = 'block'; tip.style.left = x + 14 + 'px'; tip.style.top = y + 12 + 'px'; }
    else tip.style.display = 'none';
  });
  dragStarted.on(() => { tip.style.display = 'none'; });
}
