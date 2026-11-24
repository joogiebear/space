import { contextLost, contextRestored } from '@/engine/gl';
import { startLoop } from '@/engine/loop';
import { initInput } from '@/engine/input';
import { goScene, isSceneId } from '@/engine/sceneManager';
import { applyView, initShare, viewFromHash } from '@/engine/share';
import { App } from '@/engine/state';
import { initUI } from '@/ui';
import { toast } from '@/ui/toast';
import '@/scenes';

/** The view in the URL hash (#solar, or #solar?sel=mars&t=... from a share link), if it names a real scene. */
const fromHash = () => {
  const v = viewFromHash();
  return v && isSceneId(v.scene) ? v : null;
};

initUI();
initInput();
startLoop();

// A GPU reset (driver crash, sleep/wake, another tab hogging memory) invalidates every buffer. Say so, and reload
// when the browser gives the context back: the URL hash restores the same view.
contextLost.on(() => toast('Graphics paused', 'The browser reset the graphics card. Restoring…'));
contextRestored.on(() => location.reload());

initShare();
const start = fromHash();
goScene(start?.scene || 'cosmos', { instant: true }).then(() => start && applyView(start));
// back/forward and manual hash edits switch scenes; the app's own hash writes use replaceState, which does not fire this
addEventListener('hashchange', () => {
  const v = fromHash();
  if (!v) return;
  if (App.scene?.id === v.scene) applyView(v);
  else goScene(v.scene).then(() => App.scene?.id === v.scene && applyView(v));
});
