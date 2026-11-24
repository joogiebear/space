import { clamp } from '@/lib';
import type { Body } from '@/types';
import { emitter } from './events';
import { renderer } from './gl';
import { pickAt } from './picking';
import { deselect, select } from './selection';
import { openScene } from './sceneManager';
import { App, cam } from './state';

/** (body under the pointer or null, clientX, clientY): the tooltip subscribes. */
export const hoverChanged = emitter<[Body | null, number, number]>();
/** The pointer is moving with a button down: hide the tooltip. */
export const dragStarted = emitter();

export function zoomBy(k: number) {
  const lo = App.sel && App.sel.minD || App.scene.minD;
  cam.want = clamp(cam.want * k, lo, App.scene.maxD);
  App.interact = performance.now();
}

/** Mouse, touch (drag + pinch) and wheel control of the orbit camera, plus picking by click. */
export function initInput() {
  const gl = document.querySelector('#gl') as HTMLElement, el = renderer.domElement;
  const ptrs = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; moved: boolean } | null = null, pinch = 0, hoverT = 0;

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    down = { x: e.clientX, y: e.clientY, moved: false }; App.dragging = true; gl.classList.add('drag');
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });

  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) {
      const now = performance.now();
      if (now - hoverT > 70) {
        hoverT = now; const h = pickAt(e.clientX, e.clientY, false); App.hover = h; gl.classList.toggle('hover', !!h);
        hoverChanged.emit(h, e.clientX, e.clientY);
      }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; dragStarted.emit();
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomBy(pinch / d); pinch = d; if (down) down.moved = true; return;
    }
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
    if (down && down.moved) { cam.yaw -= dx * .0055; cam.pitch = clamp(cam.pitch + dy * .0055, -1.5, 1.5); App.interact = performance.now(); }
  });

  el.addEventListener('pointerup', e => {
    ptrs.delete(e.pointerId); gl.classList.remove('drag'); pinch = 0;
    if (down && !down.moved && ptrs.size === 0) { const h = pickAt(e.clientX, e.clientY, true); if (h) select(h); else deselect(); }
    down = null; App.dragging = false;
  });

  el.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); down = null; App.dragging = false; gl.classList.remove('drag'); });

  el.addEventListener('dblclick', e => {
    const h = pickAt(e.clientX, e.clientY, true);
    if (h && h.enter) { select(h); openScene(h.enter); }
  });

  el.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0013))); }, { passive: false });
}
