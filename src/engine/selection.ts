import type { Body } from '@/types';
import { emitter } from './events';
import { App, cam, scene } from './state';

/** Fires with the new selection (or null). The info panel subscribes. */
/** `quiet` means the camera is merely homing in on something during a zoom; no details sheet should pop up. */
export const selectionChanged = emitter<[Body | null, boolean]>();

export function select(b: Body, quiet = false) {
  App.sel = b;
  cam.want = b.focusD || cam.want;
  selectionChanged.emit(b, quiet);
  scene().onSelect?.(b);
}

export function deselect() {
  if (!App.sel) return;
  scene().onSelect?.(null);
  App.sel = null;
  cam.want = scene().initD;
  selectionChanged.emit(null, false);
}
