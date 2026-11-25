import { pauseChanged, rateChanged } from '@/engine/clock';
import { dragStarted, hoverChanged } from '@/engine/input';
import { slowTick } from '@/engine/loop';
import { sceneEntered } from '@/engine/sceneManager';
import { selectionChanged } from '@/engine/selection';
import { tourChanged } from '@/engine/tour';
import { App, scene, sim } from '@/engine/state';
import { clamp, fmtDate } from '@/lib';
import type { Body, Info } from '@/types';
import { announce } from './announce';
import { sceneBodies, sceneLayers, scenePresets, ui } from './store';

/** Fill the info panel for a body, or with the scene intro when `b` is null. */
export function refreshInfo(b: Body | null) {
  const sc = scene(),
    i: Info = b ? (b.getInfo ? b.getInfo() : (b.info ?? {})) : { sub: '', text: sc.intro, rows: sc.introRows };
  const act = b && b.action;
  ui.selId = b ? b.id : null;
  ui.info.title = b ? b.label : sc.title;
  ui.info.sub = i.sub || '';
  ui.info.text = i.text || '';
  ui.info.rows = (i.rows || []).map(r => [...r]);
  ui.info.actionLabel = act ? (typeof act.label === 'function' ? act.label() : act.label) : null;
  ui.info.enterLabel = b && b.enter ? (b.enterLabel || 'Enter') + ' ›' : null;
}

const refreshDate = () => {
  ui.dateText = App.scene?.timeLabel ? fmtDate(sim.jd) : fmtDate(sim.jd).slice(0, 10);
};

/** Copy engine events into the reactive store. Call once before mounting the app. */
/** The kind of thing under the pointer ("Near-Earth asteroid"), looked up once per object, not on every pointer move. */
let tipFor: { id: string; sub: string } | null = null;
function tipSub(b: Body): string {
  if (tipFor?.id === b.id) return tipFor.sub;
  let sub = '';
  try {
    sub = (b.info ?? b.getInfo?.())?.sub ?? '';
  } catch {
    // a body whose details are not ready yet just shows its name
  }
  tipFor = { id: b.id, sub };
  return sub;
}

export function initBridge() {
  tourChanged.on(t => {
    if (t) Object.assign(ui.tour, t, { active: true });
    else ui.tour.active = false;
    if (t) announce(t.title + '. ' + t.text);
  });
  selectionChanged.on((b, quiet) => {
    refreshInfo(b);
    // on a phone: show the details of what was just picked; tapping empty space dismisses them
    if (b) {
      if (!quiet) ui.sheet = 'info';
    } else if (ui.sheet === 'info') ui.sheet = 'none';
  });
  slowTick.on(() => {
    if (App.sel && App.sel.live) refreshInfo(App.sel);
    else if (!App.sel && App.scene?.liveIntro) refreshInfo(null);
    refreshDate();
  });
  sceneEntered.on(sc => {
    ui.sceneId = sc.id;
    ui.title = sc.title;
    ui.timeLabel = sc.timeLabel || 'Date';
    ui.path = [...App.path];
    sceneBodies.value = sc.bodies ?? [];
    sceneLayers.value = sc.layers ?? [];
    scenePresets.value = sc.presets ?? [];
    ui.sceneSerial++;
    ui.sheet = 'none';
    announce(`${sc.title} view`);
    refreshInfo(null);
    refreshDate();
  });
  rateChanged.on((r, fromSlider) => {
    ui.rate = r;
    if (!fromSlider) ui.sliderPos = clamp((100 * Math.log10(Math.max(r, 1))) / 8, 0, 100);
  });
  pauseChanged.on(p => {
    ui.paused = p;
  });
  hoverChanged.on((b, x, y) => {
    ui.tip.visible = !!b;
    if (b) {
      ui.tip.text = b.label;
      ui.tip.sub = tipSub(b);
      ui.tip.x = x + 14;
      ui.tip.y = y + 12;
    }
  });
  dragStarted.on(() => {
    ui.tip.visible = false;
  });
}
