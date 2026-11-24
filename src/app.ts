import { contextLost, contextRestored } from '@/engine/gl';
import { startLoop } from '@/engine/loop';
import { initInput } from '@/engine/input';
import { goScene, isSceneId } from '@/engine/sceneManager';
import { initUI } from '@/ui';
import { toast } from '@/ui/toast';
import '@/scenes';

/** Scene from the URL hash (#cosmos, #starmap, #solar, #earth, #gal:andromeda...), or null. */
const fromHash = () => {
  const h = decodeURIComponent(location.hash.slice(1));
  return h && isSceneId(h) ? h : null;
};

initUI();
initInput();
startLoop();

// A GPU reset (driver crash, sleep/wake, another tab hogging memory) invalidates every buffer. Say so, and reload
// when the browser gives the context back: the URL hash restores the same view.
contextLost.on(() => toast('Graphics paused', 'The browser reset the graphics card. Restoring…'));
contextRestored.on(() => location.reload());

goScene(fromHash() || 'cosmos', { instant: true });
// back/forward and manual hash edits switch scenes; the app's own hash writes use replaceState, which does not fire this
addEventListener('hashchange', () => {
  const h = fromHash();
  if (h) goScene(h);
});
