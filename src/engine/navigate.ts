import type { ViewState } from '@/lib/view';
import { chain, goScene, isBusy } from './sceneManager';
import { applyView } from './share';
import { App } from './state';

/**
 * Go to a view: change scene if needed (waiting for a transition already in flight), then apply the selection, clock and
 * camera. Used by the events calendar; the same view format as share links and tours.
 */
export async function showView(v: ViewState): Promise<boolean> {
  for (let waited = 0; isBusy() && waited < 5000; waited += 100) await new Promise(r => setTimeout(r, 100));
  const here = App.scene?.id;
  if (here !== v.scene) {
    await goScene(v.scene, { deeper: here ? chain(v.scene).length > chain(here).length : true });
    if (App.scene?.id !== v.scene) return false; // refused: another change was in flight
  }
  applyView(v);
  return true;
}
