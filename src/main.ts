import './styles/index.css';
import { showFallback } from './fallback';
import { webglSupport } from './support';

// The 3D engine creates its WebGL renderer as soon as it is imported, so check support first and only then load it.
const root = document.getElementById('app')!;
const support = webglSupport();
if (!support.ok) {
  showFallback(root, support.reason);
} else {
  import('./app').catch(err => {
    console.error(err);
    showFallback(root, 'startup-error', err);
  });
}
