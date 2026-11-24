import * as THREE from 'three';
import { TAU, clamp, gauss, mixc, rng } from '@/lib';
import type { GalaxyDef } from './data';

/** Procedural galaxy as a point cloud in polar form (rho, angle, height). Rotation happens on the GPU. */
/** The parts of a galaxy definition the generator reads; spiral-only fields are optional. */
export type GalaxyShape = Pick<GalaxyDef, 'type' | 'core' | 'arm'> &
  Partial<Pick<GalaxyDef, 'bulge' | 'flat' | 'arms' | 'twist' | 'spread'>>;

export function makeGalaxyGeo(p: GalaxyShape, N: number, seed: number) {
  const { bulge = 0, arms = 1, spread = 0, twist = 0 } = p; // spiral-only; the other galaxy types never read them
  const R = rng(seed), rho = new Float32Array(N), ang = new Float32Array(N), yy = new Float32Array(N), sz = new Float32Array(N), col = new Float32Array(N * 3);
  const cols = []; for (let i = 0; i < 10; i++) cols.push(mixc(p.core, p.arm, i / 9)); cols.push([255, 140, 190], [255, 255, 255]);
  const clumps = []; for (let i = 0; i < 7; i++) clumps.push({ x: gauss(R) * .35, z: gauss(R) * .35, s: .08 + R() * .18 });
  for (let i = 0; i < N; i++) {
    let r, a, y, b, s = R() < .06 ? 2.2 : R() < .3 ? 1.5 : 1;
    if (p.type === 'ell') { const d = Math.pow(R(), 1.7) * .95 + .01, z = R() * 2 - 1; r = d * Math.sqrt(1 - z * z); a = R() * TAU; y = d * z * (p.flat || .7); b = Math.min(9, Math.floor(d * 9)) }
    else if (p.type === 'ring') { if (R() < .12) { const d = Math.pow(R(), 2) * .2; r = d; a = R() * TAU; y = gauss(R) * .04; b = 1 } else { r = clamp(.62 + gauss(R) * .09, .02, 1); a = R() * TAU; y = gauss(R) * .015; b = R() < .1 ? 10 : Math.floor(r * 9) } }
    else if (p.type === 'irr') { const c = clumps[Math.floor(R() * clumps.length)], x = c.x + gauss(R) * c.s, z = c.z + gauss(R) * c.s; r = Math.min(.98, Math.hypot(x, z)); a = Math.atan2(z, x); y = gauss(R) * .06; b = R() < .15 ? 10 : Math.floor(4 + R() * 5) }
    else if (R() < bulge) { const d = Math.pow(R(), 2) * .26; r = d; a = R() * TAU; y = gauss(R) * d * .5; b = Math.min(2, Math.floor(d * 10)) }
    else {
      let d = -Math.log(1 - R() * .97) * .3; if (d > 1) d = R() * .9 + .05;
      const a0 = Math.floor(R() * arms) * TAU / arms, sp = spread * (R() < .22 ? 7 : 1);
      r = d; a = a0 + twist * Math.log(1 + d * 4) / Math.log(5) + gauss(R) * sp * (1.25 - d * .6); y = gauss(R) * .012 * (1 + (1 - d) * 2); b = Math.floor(clamp(d * 1.3, 0, 1) * 9);
      if (R() < .05) { b = 10; s = 2.2 } else if (R() < .02) b = 11;
    }
    rho[i] = r; ang[i] = a; yy[i] = y; sz[i] = s; const c = cols[b]; col[i * 3] = c[0] / 255; col[i * 3 + 1] = c[1] / 255; col[i * 3 + 2] = c[2] / 255;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aRho', new THREE.BufferAttribute(rho, 1)); g.setAttribute('aAng', new THREE.BufferAttribute(ang, 1)); g.setAttribute('aY', new THREE.BufferAttribute(yy, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  return g;
}
