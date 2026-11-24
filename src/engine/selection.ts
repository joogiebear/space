import type { Body } from '@/types';
import { emitter } from './events';
import { App, cam } from './state';

/** Fires with the new selection (or null). The info panel subscribes. */
export const selectionChanged = emitter<[Body | null]>();

export function select(b: Body) {
  App.sel = b;
  cam.want = b.focusD || cam.want;
  selectionChanged.emit(b);
  App.scene.onSelect?.(b);
}

export function deselect() {
  if (!App.sel) return;
  App.scene.onSelect?.(null);
  App.sel = null;
  cam.want = App.scene.initD;
  selectionChanged.emit(null);
}
