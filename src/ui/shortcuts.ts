import { togglePause } from '@/engine/clock';
import { orbitBy, zoomBy } from '@/engine/input';
import { goUp, openScene } from '@/engine/sceneManager';
import { deselect } from '@/engine/selection';
import { App } from '@/engine/state';
import { focusSearch } from './searchFocus';
import { toast } from './toast';

/** Anything that already uses these keys itself: typing, activating a button, a menu, a dialog. */
const OWNS_KEYS =
  'input, textarea, select, button, summary, a[href], [contenteditable=""], [contenteditable="true"], [role="dialog"]';
export const ownsKeys = (target: EventTarget | null) => target instanceof Element && target.closest(OWNS_KEYS) !== null;

export const HELP = '←→↑↓ orbit · + − zoom · Enter go inside · Esc back · Space pause · / search';

/**
 * Global keys. They only act when focus is on the map (or nowhere), so Space still presses a focused button, Enter
 * still follows a link, and arrow keys still move a slider. Esc always works: it deselects, then goes up a level.
 * Returns true when it handled the key.
 */
export function handleKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const stop = () => e.preventDefault();

  if (e.key === 'Escape') {
    if (App.sel) deselect();
    else goUp();
    return true;
  }
  if (ownsKeys(e.target)) return false;

  switch (e.key) {
    case 'Backspace':
      stop();
      if (App.sel) deselect();
      else goUp();
      return true;
    case ' ':
      stop();
      togglePause();
      return true;
    case '/':
      stop();
      focusSearch();
      return true;
    case '?':
      stop();
      toast('Keyboard controls', HELP, 7000);
      return true;
    case 'Enter':
      if (!App.sel?.enter) return false;
      stop();
      openScene(App.sel.enter);
      return true;
    case 'ArrowLeft':
      stop();
      orbitBy(-0.12, 0);
      return true;
    case 'ArrowRight':
      stop();
      orbitBy(0.12, 0);
      return true;
    case 'ArrowUp':
      stop();
      orbitBy(0, 0.1);
      return true;
    case 'ArrowDown':
      stop();
      orbitBy(0, -0.1);
      return true;
    case '+':
    case '=':
      stop();
      zoomBy(0.85);
      return true;
    case '-':
    case '_':
      stop();
      zoomBy(1 / 0.85);
      return true;
  }
  return false;
}

export function initShortcuts() {
  addEventListener('keydown', handleKey);
}
