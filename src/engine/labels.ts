import * as THREE from 'three';
import { $ } from '@/ui/dom';
import { camera } from './gl';
import { App } from './state';

interface LabelEl extends HTMLDivElement {
  _t: string;
  _c: string;
}

const host = $('#labels'),
  pool: LabelEl[] = [],
  v = new THREE.Vector3();
let used = 0;

/** Draw a text label at a world position this frame. Elements are pooled and reused. */
export function emitLabel(text: string, pos: THREE.Vector3, cls = '', dx = 10) {
  if (used > 170) return;
  v.copy(pos).project(camera);
  if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return;
  let el = pool[used];
  if (!el) {
    el = document.createElement('div') as LabelEl;
    el.className = 'lb';
    host.appendChild(el);
    pool.push(el);
    el._t = '';
    el._c = '';
  }
  used++;
  if (el._t !== text) {
    el.textContent = text;
    el._t = text;
  }
  const c = 'lb ' + cls;
  if (el._c !== c) {
    el.className = c;
    el._c = c;
  }
  el.style.display = 'block';
  el.style.transform = `translate(${((v.x * 0.5 + 0.5) * App.W + dx).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * App.H - 8).toFixed(1)}px)`;
}

export function labelsBegin() {
  used = 0;
}
export function labelsEnd() {
  for (let i = used; i < pool.length; i++) if (pool[i].style.display !== 'none') pool[i].style.display = 'none';
}
