import { TABS, chain, goScene, sceneTitle } from '@/engine/sceneManager';
import { App } from '@/engine/state';
import { $ } from './dom';

/** Breadcrumb trail and the direct-jump tab bar. */
export function buildNav() {
  const cr = $('#crumbs'); cr.innerHTML = '';
  App.path.forEach((id, i) => {
    const last = i === App.path.length - 1, b = document.createElement('button');
    b.className = 'crumb' + (last ? ' cur' : ''); b.textContent = sceneTitle(id);
    b.onclick = () => { if (!last) goScene(id, { deeper: false }); };
    cr.appendChild(b);
    if (!last) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '›'; cr.appendChild(s); }
  });
  const tb = $('#tabs'); tb.innerHTML = '';
  for (const [id, label] of TABS) {
    const b = document.createElement('button');
    b.className = 'tab' + (App.scene.id === id ? ' on' : ''); b.textContent = label;
    b.onclick = () => goScene(id, { deeper: chain(id).length > App.path.length });
    tb.appendChild(b);
  }
}
