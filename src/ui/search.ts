import { select } from '@/engine/selection';
import { App } from '@/engine/state';
import { $ } from './dom';

const input = () => $<HTMLInputElement>('#q'), results = () => $('#results');

export function resetSearch() { input().value = ''; results().classList.remove('open'); }
export function focusSearch() { input().focus(); }

/** Per-scene search box: each scene's `search(q)` returns results. */
export function initSearch() {
  const q = input(), res = results();
  q.addEventListener('input', () => {
    const text = q.value.trim().toLowerCase(); res.innerHTML = '';
    if (text.length < 2) { res.classList.remove('open'); return; }
    const rs = App.scene.search ? App.scene.search(text) : [];
    for (const r of rs.slice(0, 14)) {
      const b = document.createElement('button'); b.append(r.label);
      if (r.sub) { const s = document.createElement('small'); s.textContent = r.sub; b.append(s); }
      b.onclick = () => { const body = r.make(); if (body) select(body); res.classList.remove('open'); q.value = ''; };
      res.appendChild(b);
    }
    res.classList.toggle('open', rs.length > 0);
  });
  q.addEventListener('keydown', e => {
    e.stopPropagation(); // typing must not trigger the global shortcuts
    if (e.key === 'Escape') { resetSearch(); q.blur(); }
    if (e.key === 'Enter') res.querySelector('button')?.click();
  });
}
