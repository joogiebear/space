import { reactive } from 'vue';
import { showView } from '@/engine/navigate';
import { LANDMARKS, LOG_MAX, LOG_MIN, type Landmark } from '@/lib/scale';
import { announce } from './announce';

/** The Scale of the Universe panel: one slider that runs from a proton to the whole observable universe. */
export const scaleUi = reactive({
  open: false,
  /** log10 of the size in metres */
  log: Math.log10(1.7),
});

export const clampLog = (x: number) => Math.min(LOG_MAX, Math.max(LOG_MIN, x));

export function openScale() {
  scaleUi.open = true;
  announce('Scale of the universe');
}
export const closeScale = () => (scaleUi.open = false);
export const toggleScale = () => (scaleUi.open ? closeScale() : openScale());
export const setLog = (x: number) => (scaleUi.log = clampLog(x));

/** Move the slider onto a landmark. */
export function pickLandmark(id: string) {
  const l = LANDMARKS.find(x => x.id === id);
  if (l) setLog(Math.log10(l.m));
}

/** Show a landmark in the atlas, if the atlas has a view of it. */
export async function showLandmark(l: Landmark) {
  if (!l.view) return;
  closeScale();
  await showView(l.view);
}

/** For tests. */
export function resetScaleForTests() {
  scaleUi.open = false;
  scaleUi.log = Math.log10(1.7);
}
