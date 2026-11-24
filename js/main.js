import { goScene, start } from './core.js';
import './scenes/galaxies.js';
import './scenes/starmap.js';
import './scenes/solar.js';
import './scenes/earth.js';

const ids = ['cosmos', 'starmap', 'solar', 'earth'];
const fromHash = () => {
  const h = decodeURIComponent(location.hash.slice(1));
  return h && (ids.includes(h) || h.startsWith('gal:')) ? h : null;
};
start();
goScene(fromHash() || 'cosmos', { instant: true });
// back/forward and manual hash edits switch scenes; the app's own hash writes are a no-op here
window.addEventListener('hashchange', () => { const h = fromHash(); if (h) goScene(h); });
