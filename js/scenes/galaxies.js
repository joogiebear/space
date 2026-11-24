import { THREE, U, sim, App, Markers, glowSprite, register } from '../core.js';
import { TAU, rng, gauss, mixc, clamp } from '../util.js';

export const GALAXIES = [
  { key: 'milkyway', name: 'Milky Way', pos: [0, 0, 0], R: 7, type: 'spiral', arms: 4, twist: 5.4, spread: .14, bulge: .2, tilt: [.35, .15], core: [255, 225, 170], arm: [160, 192, 255],
    sub: 'Barred spiral · ~100,000 ly across · home', text: 'Our home galaxy holds 100–400 billion stars. Enter it to find the Sun, tucked into a minor spur between the major spiral arms.' },
  { key: 'andromeda', name: 'Andromeda (M31)', pos: [32, 7, -18], R: 10, type: 'spiral', arms: 2, twist: 4.6, spread: .15, bulge: .28, tilt: [1.15, .4], core: [255, 225, 175], arm: [175, 200, 255],
    sub: 'Spiral · 2.5 million ly away', text: 'The nearest large galaxy. It is falling toward us and will merge with the Milky Way in roughly 4.5 billion years.' },
  { key: 'triangulum', name: 'Triangulum (M33)', pos: [24, -5, -36], R: 5, type: 'spiral', arms: 2, twist: 3.6, spread: .22, bulge: .1, tilt: [.55, -.3], core: [255, 235, 200], arm: [150, 190, 255],
    sub: 'Spiral · 2.7 million ly away', text: 'Third-largest member of the Local Group, about 60,000 ly across, rich in star-forming nebulae.' },
  { key: 'lmc', name: 'Large Magellanic Cloud', pos: [-10, -5, 6], R: 2.8, type: 'irr', core: [255, 235, 215], arm: [170, 200, 255],
    sub: 'Irregular dwarf · 160,000 ly away', text: 'A satellite of the Milky Way. It hosts the Tarantula Nebula, the most active star-forming region in the Local Group.' },
  { key: 'smc', name: 'Small Magellanic Cloud', pos: [-14, -8, 10], R: 1.9, type: 'irr', core: [255, 235, 215], arm: [170, 200, 255],
    sub: 'Irregular dwarf · 200,000 ly away', text: 'A dwarf companion of the Milky Way, visible to the naked eye from the southern hemisphere.' },
  { key: 'whirlpool', name: 'Whirlpool (M51)', pos: [-46, 12, -52], R: 8.5, type: 'spiral', arms: 2, twist: 6.4, spread: .09, bulge: .12, tilt: [.25, .3], core: [255, 225, 180], arm: [150, 185, 255],
    sub: 'Grand-design spiral · 31 million ly away', text: 'A textbook spiral whose arms are being pulled into shape by a smaller companion galaxy, NGC 5195.' },
  { key: 'sombrero', name: 'Sombrero (M104)', pos: [62, -8, 30], R: 8.5, type: 'spiral', arms: 3, twist: 3, spread: .2, bulge: .55, tilt: [1.5, .2], core: [255, 230, 190], arm: [220, 215, 200],
    sub: 'Spiral, edge-on · 29 million ly away', text: 'Seen almost edge-on, with a huge central bulge and a dark ring of dust that gives it the look of a hat.' },
  { key: 'pinwheel', name: 'Pinwheel (M101)', pos: [-30, 28, 42], R: 9.5, type: 'spiral', arms: 3, twist: 5, spread: .12, bulge: .1, tilt: [.1, -.2], core: [255, 230, 190], arm: [155, 190, 255],
    sub: 'Face-on spiral · 21 million ly away', text: 'Roughly twice the width of the Milky Way, with lopsided arms that betray past close encounters.' },
  { key: 'centaurusa', name: 'Centaurus A', pos: [-72, -14, 16], R: 8, type: 'ell', flat: .8, core: [255, 215, 160], arm: [255, 190, 130], tilt: [.5, .3],
    sub: 'Elliptical · 12 million ly away', text: 'The closest active galaxy: an elliptical wrapped in a dust lane, its black hole blasting out radio jets.' },
  { key: 'm87', name: 'Messier 87', pos: [22, -26, 82], R: 11, type: 'ell', flat: 1, core: [255, 225, 175], arm: [255, 205, 150], tilt: [0, 0],
    sub: 'Giant elliptical · 53 million ly away', text: 'The heavyweight of the Virgo Cluster. Its 6.5-billion-solar-mass black hole was the first ever imaged.' },
  { key: 'cartwheel', name: 'Cartwheel Galaxy', pos: [92, 20, -62], R: 7, type: 'ring', core: [255, 235, 210], arm: [130, 175, 255], tilt: [.7, .2],
    sub: 'Ring galaxy · ~500 million ly away', text: 'A smaller galaxy punched straight through this one, sending a ring of star formation rippling outward like a stone in a pond.' },
  { key: 'bodes', name: "Bode's Galaxy (M81)", pos: [-6, 38, -72], R: 8, type: 'spiral', arms: 2, twist: 5.6, spread: .1, bulge: .3, tilt: [.9, -.4], core: [255, 225, 170], arm: [160, 190, 255],
    sub: 'Spiral · 12 million ly away', text: 'A bright grand-design spiral in Ursa Major, locked in a gravitational dance with its neighbour M82.' },
];

/* ---- procedural galaxy generator -> BufferGeometry (rotation is done on the GPU) ---- */
function makeGalaxyGeo(p, N, seed) {
  const R = rng(seed), rho = new Float32Array(N), ang = new Float32Array(N), yy = new Float32Array(N), sz = new Float32Array(N), col = new Float32Array(N * 3);
  const cols = []; for (let i = 0; i < 10; i++) cols.push(mixc(p.core, p.arm, i / 9)); cols.push([255, 140, 190], [255, 255, 255]);
  const clumps = []; for (let i = 0; i < 7; i++) clumps.push({ x: gauss(R) * .35, z: gauss(R) * .35, s: .08 + R() * .18 });
  for (let i = 0; i < N; i++) {
    let r, a, y, b, s = R() < .06 ? 2.2 : R() < .3 ? 1.5 : 1;
    if (p.type === 'ell') { const d = Math.pow(R(), 1.7) * .95 + .01, z = R() * 2 - 1; r = d * Math.sqrt(1 - z * z); a = R() * TAU; y = d * z * (p.flat || .7); b = Math.min(9, Math.floor(d * 9)) }
    else if (p.type === 'ring') { if (R() < .12) { const d = Math.pow(R(), 2) * .2; r = d; a = R() * TAU; y = gauss(R) * .04; b = 1 } else { r = clamp(.62 + gauss(R) * .09, .02, 1); a = R() * TAU; y = gauss(R) * .015; b = R() < .1 ? 10 : Math.floor(r * 9) } }
    else if (p.type === 'irr') { const c = clumps[Math.floor(R() * clumps.length)], x = c.x + gauss(R) * c.s, z = c.z + gauss(R) * c.s; r = Math.min(.98, Math.hypot(x, z)); a = Math.atan2(z, x); y = gauss(R) * .06; b = R() < .15 ? 10 : Math.floor(4 + R() * 5) }
    else if (R() < p.bulge) { const d = Math.pow(R(), 2) * .26; r = d; a = R() * TAU; y = gauss(R) * d * .5; b = Math.min(2, Math.floor(d * 10)) }
    else {
      let d = -Math.log(1 - R() * .97) * .3; if (d > 1) d = R() * .9 + .05;
      const a0 = Math.floor(R() * p.arms) * TAU / p.arms, sp = p.spread * (R() < .22 ? 7 : 1);
      r = d; a = a0 + p.twist * Math.log(1 + d * 4) / Math.log(5) + gauss(R) * sp * (1.25 - d * .6); y = gauss(R) * .012 * (1 + (1 - d) * 2); b = Math.floor(clamp(d * 1.3, 0, 1) * 9);
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
const VS = `attribute float aRho;attribute float aAng;attribute float aY;attribute float aSize;attribute vec3 aCol;
uniform float uTime,uScale,uPx,uF,uSz;varying vec3 vC;
void main(){float a=aAng+uTime/(.5+aRho);vec3 p=vec3(cos(a)*aRho,aY,sin(a)*aRho)*uScale;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
float s=uF/max(-mv.z,1e-4);gl_PointSize=aSize*uSz*uPx*(1.+min(1.6,s*.04));vC=aCol;}`;
const FS = `uniform float uAlpha;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=smoothstep(1.,.15,d)*uAlpha;gl_FragColor=vec4(vC,a);}`;
function galaxyMat(scale, sz, alpha) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uScale: { value: scale }, uPx: U.uPx, uF: U.uF, uSz: { value: sz }, uAlpha: { value: alpha } },
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
}
export const spinTime = () => sim.gt * .1;
const rgb01 = c => new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255);

/* ---------------- cosmos ---------------- */
function cosmos() {
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
function galaxy(g) {
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
