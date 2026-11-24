import * as THREE from 'three';

/** Horizontal cloud-band texture for gas giants. */
export function bandTex(bands: [string, number][]) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const g = c.getContext('2d')!;
  const n = bands.length * 3;
  for (let i = 0; i < n; i++) {
    const [col, w] = bands[(i * 7 + (i >> 1)) % bands.length];
    g.fillStyle = col;
    g.globalAlpha = 0.55 + 0.45 * w;
    g.fillRect(0, (i * 256) / n, 8, 256 / n + 1);
  }
  g.globalAlpha = 1;
  return new THREE.CanvasTexture(c);
}
/** Saturn's ring gradient, including the Cassini division. */
export function ringTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 4;
  const g = c.getContext('2d')!,
    gr = g.createLinearGradient(0, 0, 256, 0);
  (
    [
      [0, 'rgba(180,160,120,0)'],
      [0.08, 'rgba(190,170,130,.35)'],
      [0.25, 'rgba(230,212,170,.75)'],
      [0.38, 'rgba(235,218,176,.8)'],
      [0.42, 'rgba(40,36,30,.05)'],
      [0.5, 'rgba(225,208,166,.78)'],
      [0.8, 'rgba(210,192,150,.6)'],
      [0.9, 'rgba(190,172,132,.35)'],
      [1, 'rgba(170,150,110,0)'],
    ] as [number, string][]
  ).forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 4);
  return new THREE.CanvasTexture(c);
}
