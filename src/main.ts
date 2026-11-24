import './styles/index.css';
import { startLoop } from '@/engine/loop';
import { initInput } from '@/engine/input';
import { goScene, isSceneId } from '@/engine/sceneManager';
import { initUI } from '@/ui';
import '@/scenes';

/** Scene from the URL hash (#cosmos, #starmap, #solar, #earth, #gal:andromeda...), or null. */
const fromHash = () => {
  const h = decodeURIComponent(location.hash.slice(1));
  return h && isSceneId(h) ? h : null;
};

initUI();
initInput();
startLoop();
goScene(fromHash() || 'cosmos', { instant: true });
// back/forward and manual hash edits switch scenes; the app's own hash writes use replaceState, which does not fire this
addEventListener('hashchange', () => { const h = fromHash(); if (h) goScene(h); });
