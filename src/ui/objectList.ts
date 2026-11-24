import { select } from '@/engine/selection';
import { App, scene } from '@/engine/state';
import type { Body } from '@/types';
import { $ } from './dom';

/** The "Objects" list: top-level bodies, with their moons indented beneath. */
export function buildObjectList() {
  const el = $('#list'); el.innerHTML = '';
  const add = (b: Body, sub = false) => {
    const x = document.createElement('button');
    x.textContent = b.label; if (sub) x.className = 'sub'; x.dataset.id = b.id; x.onclick = () => select(b);
    el.appendChild(x);
  };
  for (const b of scene().bodies || []) {
    if (b.parentBody) continue;
    add(b);
    for (const m of b.moons || []) add(m, true);
  }
}
