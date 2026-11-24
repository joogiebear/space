import { goLive, pauseChanged, rateChanged, setRate, togglePause } from '@/engine/clock';
import { opts, sim } from '@/engine/state';
import { clamp } from '@/lib';
import { $ } from './dom';

const rateFmt = (r: number) => r < 1000 ? '×' + Math.round(r)
  : r < 86400 * 365 ? `×${Math.round(r).toLocaleString()}  (${(r / 86400).toFixed(r < 864000 ? 1 : 0)} d/s)`
  : `×${(r / 1e6).toFixed(1)}M  (${(r / 86400 / 365.25).toFixed(1)} yr/s)`;

/** Speed slider (log scale, 1x to 1e8x), pause/live buttons and the label/auto-orbit toggles. */
export function initTimeControls() {
  const speed = $<HTMLInputElement>('#speed');
  rateChanged.on((r, fromSlider) => {
    if (!fromSlider) speed.value = String(clamp(100 * Math.log10(Math.max(r, 1)) / 8, 0, 100));
    $('#rateTxt').textContent = rateFmt(r);
  });
  pauseChanged.on(p => { $('#pause').textContent = p ? 'Play' : 'Pause'; });
  speed.oninput = () => { sim.live = false; setRate(Math.pow(10, +speed.value / 100 * 8), true); };
  $('#pause').onclick = togglePause;
  $('#live').onclick = goLive;
  $<HTMLInputElement>('#tLab').onchange = e => { opts.labels = (e.target as HTMLInputElement).checked; };
  $<HTMLInputElement>('#tAuto').onchange = e => { opts.autoOrbit = (e.target as HTMLInputElement).checked; };
  setRate(sim.rate);
}
