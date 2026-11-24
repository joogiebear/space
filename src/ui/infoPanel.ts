import { slowTick } from '@/engine/loop';
import { openScene } from '@/engine/sceneManager';
import { selectionChanged } from '@/engine/selection';
import { App, sim, scene } from '@/engine/state';
import { fmtDate } from '@/lib';
import type { Body, Info } from '@/types';
import { $ } from './dom';

/** Fill the bottom-left panel for a body, or for the scene intro when `b` is null. */
export function showInfo(b: Body | null) {
  const sc = scene(), i: Info = b ? (b.getInfo ? b.getInfo() : b.info ?? {}) : { sub: '', text: sc.intro, rows: sc.introRows };
  $('#iT').textContent = b ? b.label : sc.title;
  $('#iS').textContent = i.sub || '';
  $('#iP').textContent = i.text || '';
  const rows = $('#rows'); rows.innerHTML = '';
  for (const [k, v] of i.rows || []) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k; dd.textContent = v; rows.append(dt, dd);
  }
  const a = $('#act'), act = b && b.action;
  a.style.display = act ? 'inline-block' : 'none';
  if (act) a.textContent = typeof act.label === 'function' ? act.label() : act.label;
  const e = $('#enter'); e.style.display = b && b.enter ? 'inline-block' : 'none';
  if (b && b.enter) e.textContent = (b.enterLabel || 'Enter') + ' ›';
  document.querySelectorAll<HTMLElement>('#list button').forEach(x => x.classList.toggle('sel', !!b && x.dataset.id === b.id));
}

export function initInfoPanel() {
  selectionChanged.on(showInfo);
  $('#act').onclick = () => { const a = App.sel && App.sel.action; if (a) Promise.resolve(a.run()).then(() => showInfo(App.sel)); };
  $('#enter').onclick = () => { if (App.sel && App.sel.enter) openScene(App.sel.enter); };
  slowTick.on(() => {
    if (App.sel && App.sel.live) showInfo(App.sel);
    $('#dateTxt').textContent = scene().timeLabel ? fmtDate(sim.jd) : fmtDate(sim.jd).slice(0, 10);
  });
}
