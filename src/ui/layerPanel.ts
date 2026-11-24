import { App } from '@/engine/state';
import { $ } from './dom';

/** Checkbox list from the scene's `layers`. */
export function buildLayerPanel() {
  const el = $('#layers'); el.innerHTML = '';
  const ls = App.scene.layers || []; if (!ls.length) return;
  const h = document.createElement('h4'); h.textContent = 'Layers'; el.appendChild(h);
  for (const L of ls) {
    const lab = document.createElement('label'), cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = L.on;
    cb.onchange = () => { L.on = cb.checked; L.apply(L.on); };
    lab.appendChild(cb);
    if (L.color) { const i = document.createElement('i'); i.style.background = L.color; lab.appendChild(i); }
    lab.appendChild(document.createTextNode(L.label));
    if (L.count != null) { const s = document.createElement('span'); s.textContent = L.count.toLocaleString(); lab.appendChild(s); }
    el.appendChild(lab);
  }
}
