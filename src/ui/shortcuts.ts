import { togglePause } from '@/engine/clock';
import { goUp } from '@/engine/sceneManager';
import { deselect } from '@/engine/selection';
import { App } from '@/engine/state';
import { focusSearch } from './search';

/** Esc/Backspace: deselect, then go up a level. Space: pause. "/": search. */
export function initShortcuts() {
  addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'Backspace') { if (App.sel) deselect(); else goUp(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === '/') { e.preventDefault(); focusSearch(); }
  });
}
