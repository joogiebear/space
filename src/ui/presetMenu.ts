import { jumpTo } from '@/engine/clock';
import { select } from '@/engine/selection';
import { App } from '@/engine/state';
import { fmtDate, isoToJD } from '@/lib';
import { $ } from './dom';
import { toast } from './toast';

/** "Jump to a moment in time…" menu, filled from the scene's `presets`. */
export function buildPresetMenu() {
  const jump = $<HTMLSelectElement>('#jump'), ps = App.scene.presets || [];
  jump.innerHTML = ''; jump.style.display = ps.length ? 'block' : 'none';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Jump to a moment in time…'; jump.append(o0);
  ps.forEach((p, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = p.label; jump.append(o); });
}

export function initPresetMenu() {
  const jump = $<HTMLSelectElement>('#jump');
  jump.onchange = () => {
    const p = (App.scene.presets || [])[+jump.value]; jump.value = ''; jump.blur();
    if (!p) return;
    const jd = isoToJD(p.date);
    jumpTo(jd, p.rate ?? App.scene.rate ?? 1);
    const b = p.focus ? (App.scene.bodies || []).find(x => x.id === p.focus) : p.query ? App.scene.search?.(p.query)?.[0]?.make() : null;
    if (b) select(b);
    toast(p.label, p.note || fmtDate(jd), 7000);
  };
}
