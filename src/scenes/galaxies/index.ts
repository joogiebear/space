import * as THREE from 'three';
import { App, Markers, U, glowSprite, register } from '@/engine';
import { TAU, gauss, mixc, rng } from '@/lib';
import type { Scene } from '@/types';
import { GALAXIES, type GalaxyDef } from './data';
import { makeGalaxyGeo } from './generator';
import { galaxyMat, rgb01, spinTime } from './shaders';

/* ---------------- cosmos ---------------- */
function cosmos(): Scene {
  const group = new THREE.Group(), mats = [], bodies = [];
  const R = rng(7), N = 1800, fp = new Float32Array(N * 3), fc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 170 + R() * 700, th = R() * TAU, ph = Math.acos(R() * 2 - 1), k = .35 + R() * .5;
    fp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    const c = mixc([255, 220, 190], [170, 200, 255], R()); fc.set([c[0] / 255 * k, c[1] / 255 * k, c[2] / 255 * k], i * 3);
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  group.add(new THREE.Points(fg, new THREE.PointsMaterial({ size: 1.8 * U.uPx.value, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false })));
  for (const g of GALAXIES) {
    const geo = makeGalaxyGeo({ ...g, bulge: (g.bulge || .2) + .1 }, g.type === 'ell' ? 800 : 600, g.key.length * 131 + 7);
    const irr = g.type === 'irr', mat = galaxyMat(g.R, irr ? .8 : 1.3, irr ? .3 : .8); mats.push(mat);
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.position.set(...g.pos); pts.rotation.set(g.tilt ? g.tilt[0] : 0, 0, g.tilt ? g.tilt[1] : 0, 'ZXY');
    const glow = glowSprite(rgb01(g.core), g.R * 1.4); glow.material.opacity = irr ? .22 : .55; glow.position.set(...g.pos);
    group.add(pts, glow);
    bodies.push({ id: g.key, label: g.name, g, enter: 'gal:' + g.key, enterLabel: 'Fly inside', focusD: g.R * 4.2, minD: g.R * 1.2, radNow: g.R * .8,
      getPos(v) { return v.set(...g.pos) }, info: { sub: g.sub, text: g.text } });
  }
  return { title: 'Local Universe', group, bodies, minD: 10, maxD: 700, initD: 190, sky: false, rate: 1, extent: 1000,
    intro: 'A map of famous galaxies near the Milky Way. Positions are schematic and distances heavily compressed. Click a galaxy to focus, double-click to fly inside.',
    center(v) { return v.set(0, 0, 0) }, update() { for (const m of mats) m.uniforms.uTime.value = spinTime() },
    search(q) { return bodies.filter(b => b.label.toLowerCase().includes(q)).map(b => ({ label: b.label, sub: b.g.sub.split(' · ')[0], make: () => b })) } };
}

/* ---------------- one galaxy up close ---------------- */
const RG = 60;
function galaxy(g: GalaxyDef): Scene {
  const group = new THREE.Group(), N = g.key === 'milkyway' ? 26000 : 18000;
  const geo = makeGalaxyGeo(g, N, g.key.length * 977 + 3), mat = galaxyMat(RG, 1.1, .8);
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; group.add(pts);
  const core = glowSprite(rgb01(g.core), RG * .5); core.material.opacity = .5; group.add(core);
  const bodies = [], mk = new Markers(2, true); group.add(mk.points);
  if (g.key === 'milkyway') {
    const mkb = (id, label, rho, ang0, col, info, extra = {}) => ({ id, label, rho, ang0, col, info, radNow: 1.2, focusD: 14, minD: 3, labelCls: '',
      getPos(v) { const a = ang0 + spinTime() / (.5 + rho); return v.set(rho * RG * Math.cos(a), 0, rho * RG * Math.sin(a)) }, ...extra });
    bodies.push(mkb('sun', 'Sun · you are here', .5, 2.2, [1, .9, .55], { sub: 'Our star · ~26,000 ly from the centre', text: 'The Sun sits in the Orion Spur, a minor arm between two major spiral arms, and orbits the galaxy once every ~225 million years. Enter to see the stars nearest to us.' }, { enter: 'starmap', enterLabel: 'Enter the star map' }));
    bodies.push(mkb('sgra', 'Sagittarius A*', 0, 0, [1, .65, .4], { sub: 'Supermassive black hole', text: 'A black hole of about 4 million solar masses sits at the very centre of the Milky Way, ringed by a dense cluster of ancient stars.' }));
  }
  const tmp = new THREE.Vector3();
  return { title: g.name, group, bodies, minD: 6, maxD: 420, initD: 150, rate: 1, extent: 400,
    intro: g.text + (g.key === 'milkyway' ? ' Find the Sun and double-click it to go closer.' : ''), introRows: [['Type', g.sub]],
    center(v) { return v.set(0, 0, 0) },
    update() { mat.uniforms.uTime.value = spinTime(); bodies.forEach((b, i) => { b.getPos(tmp); mk.set(i, tmp.x, tmp.y, tmp.z, b.col, App.sel === b ? 46 : 30) }) },
    search(q) { return bodies.filter(b => b.label.toLowerCase().includes(q)).map(b => ({ label: b.label, make: () => b })) } };
}

register('cosmos', 'Local Universe', cosmos);
for (const g of GALAXIES) register('gal:' + g.key, g.name, () => galaxy(g));
