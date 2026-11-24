import { THREE, U, sim, App, cam, camera, Markers, glowSprite, register, screenOf } from '../core.js';
import { TAU, D2R, J2000, AU_KM, planetEcl, planetEl, orbitPos, fmtNum, fmtDate } from '../util.js';

const TEX = 'assets/tex/';
const PXF = .0045;
const rDisp = (real, dist) => Math.max(real, dist * PXF * (.55 + .45 * Math.sqrt(real / 4.26e-5)));
const km = k => k / AU_KM;

const PLANETS = [
  { id: 'mercury', label: 'Mercury', rkm: 2439.7, color: 0xa59b91, sub: 'Planet · 88-day year', text: 'The smallest planet and closest to the Sun. Its surface swings from 430 °C by day to −180 °C at night.', period: '88 days' },
  { id: 'venus', label: 'Venus', rkm: 6051.8, color: 0xe4c37d, sub: 'Planet · 225-day year', text: 'Hotter than Mercury thanks to a runaway greenhouse effect. It spins backwards, so the Sun rises in the west.', period: '225 days' },
  { id: 'earth', label: 'Earth', rkm: 6371, color: 0x3264be, tex: 'earth_atmos_2048.jpg', enter: 'earth', enterLabel: 'Enter Earth orbit', sub: 'Planet · 365.25-day year', text: 'The only world known to host life. Double-click to see every satellite and piece of debris tracked in orbit around it.', period: '365.25 days' },
  { id: 'mars', label: 'Mars', rkm: 3389.5, color: 0xc36944, sub: 'Planet · 687-day year', text: 'A cold desert world with the tallest volcano (Olympus Mons) and the longest canyon system (Valles Marineris) in the solar system.', period: '687 days' },
  { id: 'jupiter', label: 'Jupiter', rkm: 69911, color: 0xd0b28a, bands: [['#b9926b', .5], ['#e8d6b4', .8], ['#a86f4a', .6], ['#eadbc0', .7], ['#b98458', .5], ['#e2cca3', .6], ['#9d6a48', .4]], sub: 'Gas giant · 12-year orbit', text: 'More massive than all other planets combined. The Great Red Spot is a storm wider than Earth that has raged for centuries.', period: '11.9 years' },
  { id: 'saturn', label: 'Saturn', rkm: 58232, color: 0xdecb9b, ring: true, bands: [['#cdb888', .5], ['#ecdcae', .7], ['#d3be8e', .5], ['#e6d4a4', .6]], sub: 'Gas giant · 29-year orbit', text: 'Famous for its spectacular rings of ice and rock. It is so light that it would float in a big enough bathtub.', period: '29.5 years' },
  { id: 'uranus', label: 'Uranus', rkm: 25362, color: 0x8ccdd7, sub: 'Ice giant · 84-year orbit', text: 'Tipped on its side with an axial tilt of 98°, so each pole gets 42 years of sunlight followed by 42 years of dark.', period: '84 years' },
  { id: 'neptune', label: 'Neptune', rkm: 24622, color: 0x4160d7, sub: 'Ice giant · 165-year orbit', text: 'The windiest planet, with gusts above 2,000 km/h. It was found by mathematical prediction before anyone saw it.', period: '165 years' },
  { id: 'pluto', label: 'Pluto', rkm: 1188, color: 0xc8af96, dwarf: true, sub: 'Dwarf planet · 248-year orbit', text: 'A dwarf planet in the Kuiper Belt, with a heart-shaped nitrogen ice plain. Its moon Charon is half its size.', period: '248 years' },
];
// parent, id, label, radius km, orbit km, period d (neg = retrograde), color, inclination rad, text
const MOONS = [
  ['earth', 'moon', 'The Moon', 1737, 384400, 27.32, 0xbdbab4, .09, 'Earth\'s only natural satellite. Tidally locked, it always shows us the same face.'],
  ['mars', 'phobos', 'Phobos', 11, 9376, .319, 0x8c7d73, 0, 'A lumpy moon that circles Mars three times a day, and is slowly spiralling inward.'],
  ['mars', 'deimos', 'Deimos', 6, 23463, 1.263, 0xa09182, 0, 'The smaller and more distant of Mars\'s two tiny moons.'],
  ['jupiter', 'io', 'Io', 1822, 421800, 1.769, 0xebd778, 0, 'The most volcanically active body in the solar system, with lava fountains hundreds of km tall.'],
  ['jupiter', 'europa', 'Europa', 1561, 671100, 3.551, 0xd7c3aa, 0, 'A cracked ice shell hides a global ocean with twice the water of all Earth\'s seas.'],
  ['jupiter', 'ganymede', 'Ganymede', 2634, 1070400, 7.155, 0xa59687, 0, 'The largest moon in the solar system, bigger than Mercury, and the only one with its own magnetic field.'],
  ['jupiter', 'callisto', 'Callisto', 2410, 1882700, 16.69, 0x6e6258, 0, 'One of the most heavily cratered surfaces in the solar system, with a possible subsurface ocean.'],
  ['saturn', 'enceladus', 'Enceladus', 252, 238040, 1.37, 0xf0f5fa, 0, 'Geysers at its south pole spray water into space, feeding Saturn\'s E ring.'],
  ['saturn', 'rhea', 'Rhea', 764, 527100, 4.518, 0xc8c3be, 0, 'Saturn\'s second-largest moon, an icy world with heavily cratered terrain.'],
  ['saturn', 'titan', 'Titan', 2575, 1221900, 15.945, 0xd7a55a, 0, 'The only moon with a thick atmosphere, plus rivers and lakes of liquid methane.'],
  ['uranus', 'miranda', 'Miranda', 235, 129900, 1.413, 0xaaaaaa, 0, 'Patchwork terrain with a 20-km-high cliff, perhaps from being shattered and reassembled.'],
  ['uranus', 'titania', 'Titania', 788, 436300, 8.706, 0xafa5a0, 0, 'The largest moon of Uranus, with huge canyons.'],
  ['uranus', 'oberon', 'Oberon', 761, 583500, 13.46, 0x968c87, 0, 'The outermost major moon of Uranus, with ancient, heavily cratered terrain.'],
  ['neptune', 'triton', 'Triton', 1353, 354800, -5.877, 0xe1d7d7, .5, 'Orbits backwards, so it was probably a captured Kuiper Belt object. Nitrogen geysers erupt on its surface.'],
  ['pluto', 'charon', 'Charon', 606, 19591, 6.387, 0xa09691, 0, 'So large relative to Pluto that the two orbit a point in empty space between them.'],
];

const AVS = `attribute vec4 aE1;attribute vec4 aE2;uniform float uJD,uPx,uSize;varying vec3 vC;uniform vec3 uCol;
void main(){float a=aE1.x,e=aE1.y,I=aE1.z,Om=aE1.w,w=aE2.x;
float n=.01720209895/(a*sqrt(a));float M=mod(aE2.y+n*(uJD-aE2.z),6.2831853);
float E=e>.8?3.14159265:M;for(int k=0;k<10;k++){E-=(E-e*sin(E)-M)/(1.-e*cos(E));}
float xv=a*(cos(E)-e),yv=a*sqrt(1.-e*e)*sin(E);float cw=cos(w),sw=sin(w),cO=cos(Om),sO=sin(Om),cI=cos(I),sI=sin(I);
vec3 p=vec3((cw*cO-sw*sO*cI)*xv+(-sw*cO-cw*sO*cI)*yv,(cw*sO+sw*cO*cI)*xv+(-sw*sO+cw*cO*cI)*yv,sw*sI*xv+cw*sI*yv);
gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,p.z,-p.y,1.);
float f=aE2.w;vC=f<.5?uCol:f<1.5?vec3(1.,.62,.25):f<2.5?vec3(1.,.28,.25):vec3(.45,.92,1.);gl_PointSize=uSize*uPx*(f>2.5?1.5:1.);}`;
const AFS = `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,smoothstep(1.,.2,d)*.5);}`;

function bandTex(bands) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
  const n = bands.length * 3; for (let i = 0; i < n; i++) { const [col, w] = bands[(i * 7 + (i >> 1)) % bands.length]; g.fillStyle = col; g.globalAlpha = .55 + .45 * w; g.fillRect(0, i * 256 / n, 8, 256 / n + 1) }
  g.globalAlpha = 1; return new THREE.CanvasTexture(c);
}
function ringTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 4; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0);
  [[0, 'rgba(180,160,120,0)'], [.08, 'rgba(190,170,130,.35)'], [.25, 'rgba(230,212,170,.75)'], [.38, 'rgba(235,218,176,.8)'], [.42, 'rgba(40,36,30,.05)'], [.5, 'rgba(225,208,166,.78)'], [.8, 'rgba(210,192,150,.6)'], [.9, 'rgba(190,172,132,.35)'], [1, 'rgba(170,150,110,0)']].forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 256, 4); return new THREE.CanvasTexture(c);
}
const eclToThree = (a, o) => o.set(a[0], a[2], -a[1]);

function solar() {
  const group = new THREE.Group(), tmp = new THREE.Vector3(), ecl = [0, 0, 0];
  const loader = new THREE.TextureLoader();
  group.add(new THREE.PointLight(0xffffff, 3.2, 0, 0), new THREE.AmbientLight(0xffffff, .22));
  const bodies = [], byId = {}, orbitLines = [], moonLines = [];
  const sphereGeo = new THREE.SphereGeometry(1, 48, 32);

  // Sun
  const sunMesh = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a8 })), sunGlow = glowSprite(0xffa040, 1), sunGlow2 = glowSprite(0xffd890, 1);
  group.add(sunMesh, sunGlow, sunGlow2);
  const sun = { id: 'sun', label: 'The Sun', kind: 'sun', rkm: 695700, real: km(695700), p: new THREE.Vector3(), mesh: sunMesh, focusD: .06, minD: km(695700) * 1.8, enter: null,
    getPos(v) { return v.copy(this.p) }, info: { sub: 'G-type star · 4.6 billion years old', text: 'Holds 99.86% of the solar system\'s mass. Every second it fuses ~600 million tonnes of hydrogen into helium.', rows: [['Diameter', '1,391,000 km'], ['Surface temperature', '5,500 °C']] } };
  bodies.push(sun); byId.sun = sun;

  for (const d of PLANETS) {
    const mat = new THREE.MeshLambertMaterial({ color: d.color, emissive: 0x08080c });
    if (d.bands) { mat.map = bandTex(d.bands); mat.color.set(0xffffff) }
    if (d.tex) loader.load(TEX + d.tex, t => { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true });
    const mesh = new THREE.Mesh(sphereGeo, mat); group.add(mesh);
    const b = { id: d.id, label: d.label, kind: d.dwarf ? 'dwarf' : 'planet', real: km(d.rkm), rkm: d.rkm, p: new THREE.Vector3(), mesh, moons: [], enter: d.enter, enterLabel: d.enterLabel, live: true,
      getPos(v) { return v.copy(this.p) }, d };
    b.getInfo = () => ({ sub: d.sub, text: d.text, rows: [['Distance from Sun', b.p.length().toFixed(3) + ' AU'], ['Light travel time', (b.p.length() * 8.317).toFixed(1) + ' min'], ['Year', d.period], ['Radius', fmtNum(d.rkm, 0) + ' km'], ['Moons shown', String(b.moons.length)]] });
    if (d.ring) { const rg = new THREE.RingGeometry(1.24, 2.3, 128, 1), pa = rg.attributes.position, uv = rg.attributes.uv;
      for (let i = 0; i < pa.count; i++) uv.setXY(i, (Math.hypot(pa.getX(i), pa.getY(i)) - 1.24) / 1.06, .5);
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2;
      const tilt = new THREE.Group(); tilt.add(ring); tilt.rotation.z = .466; mesh.add(tilt); }
    // orbit line
    const el = planetEl(d.id, sim.jd), pts = [], o = [0, 0, 0];
    for (let i = 0; i <= 256; i++) { orbitPos(el.a, el.e, el.I, el.Om, el.w, i / 256 * TAU, o); pts.push(new THREE.Vector3(o[0], o[2], -o[1])) }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7f9bff, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(line); orbitLines.push({ line, b }); b.orbit = line;
    bodies.push(b); byId[d.id] = b;
  }
  const unitCircle = (() => { const p = []; for (let i = 0; i <= 96; i++) p.push(new THREE.Vector3(Math.cos(i / 96 * TAU), 0, Math.sin(i / 96 * TAU))); return new THREE.BufferGeometry().setFromPoints(p) })();
  for (const m of MOONS) {
    const par = byId[m[0]], mesh = new THREE.Mesh(sphereGeo, new THREE.MeshLambertMaterial({ color: m[6], emissive: 0x0a0a0c })); group.add(mesh);
    if (m[1] === 'moon') loader.load(TEX + 'moon_1024.jpg', t => { mesh.material.map = t; mesh.material.color.set(0xffffff); mesh.material.needsUpdate = true });
    const b = { id: m[1], label: m[2], kind: 'moon', real: km(m[3]), a: km(m[4]), P: m[5], inc: m[7], th0: m[1].length * 1.9, p: new THREE.Vector3(), mesh, parentBody: par, labelCls: 'dim',
      getPos(v) { return v.copy(this.p) }, info: { sub: 'Moon of ' + par.label, text: m[8], rows: [['Orbit radius', fmtNum(m[4], 0) + ' km'], ['Orbital period', Math.abs(m[5]) + ' days' + (m[5] < 0 ? ' (retrograde)' : '')], ['Radius', fmtNum(m[3], 0) + ' km']] } };
    const ml = new THREE.LineLoop(unitCircle, new THREE.LineBasicMaterial({ color: 0xaac0ff, transparent: true, opacity: .35, depthWrite: false })); ml.scale.setScalar(b.a); ml.rotation.x = b.inc; group.add(ml); b.line = ml; moonLines.push(b);
    par.moons.push(b); bodies.push(b); byId[m[1]] = b;
  }
  for (const b of bodies) if (b.kind === 'planet' || b.kind === 'dwarf') { const far = b.moons.reduce((a, m) => Math.max(a, m.a), 0); b.focusD = Math.max(far * 2.7, b.real * 14); b.minD = b.real * 2.2 }
  for (const b of bodies) if (b.kind === 'moon') { b.focusD = Math.max(b.real * 12, b.a * .25); b.minD = b.real * 2.2 }
  const inFamily = m => { const s = App.sel; return !!s && (s === m.parentBody || s.parentBody === m.parentBody || s === m) };

  // small bodies on the GPU
  const smallMat = (col, size) => new THREE.ShaderMaterial({ uniforms: { uJD: { value: 0 }, uPx: U.uPx, uSize: { value: size }, uCol: { value: new THREE.Color(...col) } }, vertexShader: AVS, fragmentShader: AFS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const sets = {}; let ast = [], com = [], allRows = [];
  function buildSet(rows, mat) {
    const n = rows.length, g = new THREE.BufferGeometry(), e1 = new Float32Array(n * 4), e2 = new Float32Array(n * 4);
    rows.forEach((r, i) => { e1.set([r[1], r[2], r[3] * D2R, r[4] * D2R], i * 4); e2.set([r[5] * D2R, r[6] * D2R, r[7] - J2000, r[9]], i * 4) });
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aE1', new THREE.BufferAttribute(e1, 4)); g.setAttribute('aE2', new THREE.BufferAttribute(e2, 4));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; group.add(p); return p;
  }
  function craftPos(b, jd) { // linear interpolation along the Horizons track, clamped at the ends
    const t = b.track; let k = 0, hi = t.length - 1;
    if (jd <= t[0][0]) k = 0; else if (jd >= t[hi][0]) k = hi - 1; else { let lo = 0; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m][0] <= jd) lo = m; else hi = m } k = lo }
    const a = t[k], c = t[k + 1], f = Math.min(1, Math.max(0, (jd - a[0]) / (c[0] - a[0])));
    b.p.set(a[1] + (c[1] - a[1]) * f, a[3] + (c[3] - a[3]) * f, -(a[2] + (c[2] - a[2]) * f));
  }
  const craftMk = new Markers(24, true); group.add(craftMk.points); let craft = [];
  const selMk = new Markers(1, true); group.add(selMk.points); selMk.hide(0);
  let selLine = null;

  function rowBody(r) {
    const o = [0, 0, 0]; const kind = ['Main-belt / other asteroid', 'Near-Earth asteroid', 'Potentially hazardous asteroid', 'Comet'][r[9]] || 'Small body';
    const n = .01720209895 / Math.pow(r[1], 1.5);
    const pos = (v, jd = sim.jd) => { orbitPos(r[1], r[2], r[3] * D2R, r[4] * D2R, r[5] * D2R, r[6] * D2R + n * (jd - r[7]), o); return v.set(o[0], o[2], -o[1]) };
    const D = r[8] ? 1329 / Math.sqrt(.14) * Math.pow(10, -r[8] / 5) : 0;
    return { id: 'sb:' + r[0], label: r[0], r, minD: .0005, focusD: .8, live: true, getPos: v => pos(v),
      getInfo: () => { const p = pos(tmp.clone()); return { sub: kind, text: r[9] === 3 ? 'A comet on an eccentric orbit; it warms and grows a tail as it nears the Sun.' : r[9] === 2 ? 'Its orbit passes within 0.05 AU of Earth\'s and it is large enough to cause regional damage in an impact. Astronomers monitor it closely.' : 'A small body orbiting the Sun, tracked by the JPL Small-Body Database.',
        rows: [['Distance from Sun', p.length().toFixed(3) + ' AU'], ['Semi-major axis', r[1] + ' AU'], ['Eccentricity', String(r[2])], ['Inclination', r[3] + '°'], ['Orbital period', (Math.pow(r[1], 1.5)).toFixed(2) + ' years'], ...(r[8] ? [['Abs. magnitude H', String(r[8])], ['Est. diameter', D > 1 ? D.toFixed(1) + ' km' : (D * 1000).toFixed(0) + ' m']] : [])] } },
      setOrbit() { const pts = [], oo = [0, 0, 0]; for (let i = 0; i <= 240; i++) { orbitPos(r[1], r[2], r[3] * D2R, r[4] * D2R, r[5] * D2R, i / 240 * TAU, oo); pts.push(new THREE.Vector3(oo[0], oo[2], -oo[1])) } return pts } };
  }

  const sc = {
    title: 'Solar System', group, bodies, minD: 2e-5, maxD: 500, initD: 90, rate: 5 * 86400, live: false, timeLabel: 'Simulated date', extent: 600,
    presets: [
      { label: 'Voyager 1 launches (1977-09-05)', date: '1977-09-05T12:56Z', focus: 'jupiter', rate: 86400 * 10, note: 'Jupiter and Saturn were lined up for a once-in-175-years Grand Tour. Watch the outer planets.' },
      { label: 'Halley\'s Comet at perihelion (1986-02-09)', date: '1986-02-09T12:00Z', query: 'halley', rate: 86400 * 2, note: 'Closest approach to the Sun, 0.59 AU. The comet\'s orbit is retrograde, opposite to the planets.' },
      { label: 'Voyager 2 flies past Neptune (1989-08-25)', date: '1989-08-25T03:56Z', focus: 'neptune', rate: 86400 * 10, note: 'The only spacecraft ever to visit Neptune.' },
      { label: 'Comet hits Jupiter (1994-07-16)', date: '1994-07-16T20:15Z', focus: 'jupiter', rate: 86400, note: 'Fragments of Shoemaker–Levy 9 began striking Jupiter.' },
      { label: 'Mars closest in 60,000 years (2003-08-27)', date: '2003-08-27T09:51Z', focus: 'mars', rate: 86400 * 3, note: 'Mars opposition at 55.8 million km.' },
      { label: 'Neptune completes its first orbit (2011-07-12)', date: '2011-07-12T12:00Z', focus: 'neptune', rate: 86400 * 30, note: 'Back where it was discovered in 1846, after 164.8 years.' },
      { label: 'New Horizons flies past Pluto (2015-07-14)', date: '2015-07-14T11:49Z', focus: 'pluto', rate: 86400 * 5, note: 'First close look at Pluto.' },
      { label: 'Cassini ends at Saturn (2017-09-15)', date: '2017-09-15T11:55Z', focus: 'saturn', rate: 86400 * 5, note: 'After 13 years the probe was steered into Saturn\'s atmosphere.' },
      { label: 'Great Conjunction (2020-12-21)', date: '2020-12-21T18:20Z', focus: 'jupiter', rate: 86400 * 3, note: 'Jupiter and Saturn looked only 0.1° apart from Earth.' },
      { label: 'Perseverance lands on Mars (2021-02-18)', date: '2021-02-18T20:55Z', focus: 'mars', rate: 86400 * 3, note: 'Jezero Crater touchdown.' },
    ],
    intro: 'Real positions of the planets for the date shown, computed from JPL orbital elements, plus ~96,000 asteroids, 1,300 comets and 14 spacecraft. Planet and moon sizes are exaggerated when zoomed out. Select a planet to reveal its moons; double-click Earth to see its satellites.',
    introRows: [['Asteroids', '…'], ['Comets', '…']],
    center: v => v.set(0, 0, 0),
    layers: [],
    isHidden: b => b.kind === 'moon' && !inFamily(b),
    async load(status) {
      const self = this; status('downloading asteroid & comet orbits…');
      const [sb, cr] = await Promise.all([fetch('/api/sbdb').then(r => r.json()), fetch('/api/craft').then(r => r.json()).catch(() => ({ craft: [] }))]);
      ast = sb.ast; com = sb.com; allRows = ast.concat(com);
      sets.belt = buildSet(ast.filter(r => r[9] === 0), smallMat([.78, .7, .55], 1.5));
      sets.neo = buildSet(ast.filter(r => r[9] > 0), smallMat([1, .62, .25], 1.3));
      sets.com = buildSet(com, smallMat([.45, .92, 1], 3));
      const nNeo = ast.filter(r => r[9] > 0).length;
      craft = cr.craft.filter(c => c.track && c.track.length > 1).map((c, i) => { const b = { id: 'craft:' + c.id, label: c.name, track: c.track, p: new THREE.Vector3(), minD: .002, focusD: .5, noLabel: false, labelCls: '',
        getPos(v) { return v.copy(this.p) },
        getInfo() { const d = this.p.length(); return { sub: 'Spacecraft', text: 'Position interpolated from JPL Horizons ephemeris (fetched ' + cr.when + '; covers roughly 2 months back to 10 months ahead, held at the nearest end outside that).', rows: [['Distance from Sun', d.toFixed(2) + ' AU'], ['Light travel time from Sun', (d * 8.317 / 60).toFixed(1) + ' hours']] } } };
        craftPos(b, sim.jd); craftMk.set(i, b.p.x, b.p.y, b.p.z, [1, .85, .35], 16); return b });
      const loaded = (self.loadedAt = Date.now());
      this.layers = [
        { id: 'orbits', label: 'Planet orbits', on: true, apply: o => { orbitLines.forEach(x => x.line.visible = o) } },
        { id: 'belt', label: 'Asteroids', color: '#c7b38c', count: sets.belt.geometry.attributes.aE1.count, on: true, apply: o => sets.belt.visible = o },
        { id: 'neo', label: 'Near-Earth & hazardous', color: '#ffa040', count: nNeo, on: true, apply: o => sets.neo.visible = o },
        { id: 'com', label: 'Comets', color: '#73ebff', count: com.length, on: true, apply: o => sets.com.visible = o },
        { id: 'craft', label: 'Spacecraft', color: '#ffd959', count: craft.length, on: true, apply: o => { craftMk.points.visible = o; craft.forEach(c => c.hidden = !o) } },
      ];
      this.introRows = [['Date shown', 'simulation clock'], ['Asteroids', ast.length.toLocaleString()], ['Comets', com.length.toLocaleString()], ['Spacecraft', String(craft.length)]];
      bodies.push(...craft);
    },
    update(dt) {
      const jd = sim.jd, days = jd - J2000;
      sun.getPos(tmp); camera.position && 0;
      for (const b of bodies) {
        if (b.kind === 'planet' || b.kind === 'dwarf') { planetEcl(b.id, jd, ecl); eclToThree(ecl, b.p) }
        else if (b.kind === 'moon') { const th = b.th0 + TAU * days / b.P, x = Math.cos(th) * b.a, z = Math.sin(th) * b.a; b.p.set(b.parentBody.p.x + x, b.parentBody.p.y - z * Math.sin(b.inc), b.parentBody.p.z + z * Math.cos(b.inc)) }
      }
      const cpos = camera.position;
      for (const b of bodies) {
        if (!b.mesh) continue; const vis = b.kind !== 'moon' || inFamily(b); b.mesh.visible = vis; if (!vis) continue;
        const dist = cpos.distanceTo(b.p), r = rDisp(b.real, dist); b.radNow = r; b.mesh.position.copy(b.p); b.mesh.scale.setScalar(r);
        if (b.kind !== 'sun' && b.id !== 'moon') b.mesh.rotation.y += dt * .15;
      }
      const sd = cpos.length(), sr = sun.radNow || 0;
      sunGlow.scale.setScalar(sr * 3.4); sunGlow2.scale.setScalar(sr * 1.7); sunGlow.material.opacity = .5; sunGlow2.material.opacity = .4;
      for (const m of moonLines) { m.line.visible = inFamily(m) && sc.layerOrbits !== false; m.line.position.copy(m.parentBody.p) }
      for (const o of orbitLines) o.line.material.opacity = App.sel && (App.sel === o.b || App.sel.parentBody === o.b) ? .65 : .2;
      for (const k in sets) sets[k].material.uniforms.uJD.value = days;
      craft.forEach((c, i) => { craftPos(c, jd); craftMk.set(i, c.p.x, c.p.y, c.p.z, [1, .85, .35], 16) });
      if (App.sel) { App.sel.getPos(tmp); selMk.set(0, tmp.x, tmp.y, tmp.z, [.55, .7, 1], App.sel.radNow ? Math.max(30, App.sel.radNow * U.uF.value / cpos.distanceTo(tmp) * 2.4 + 12) : 34) } else selMk.hide(0);
      this.timeBadge = fmtDate(jd);
    },
    onSelect(b) {
      if (selLine) { group.remove(selLine); selLine.geometry.dispose(); selLine = null }
      if (b && b.setOrbit) { selLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(b.setOrbit()), new THREE.LineBasicMaterial({ color: 0x9fb8ff, transparent: true, opacity: .8, depthTest: false })); group.add(selLine) }
    },
    pickCustom(mx, my, click) {
      // spacecraft (cheap) then small bodies (click only)
      const s = { x: 0, y: 0, z: 0 }; let best = null, bd = 14;
      for (const c of craft) { if (c.hidden) continue; if (!screenOf(c.p, s)) continue; const d = Math.hypot(s.x - mx, s.y - my); if (d < bd) { bd = d; best = c } }
      if (best || !click || !allRows.length) return best;
      const o = [0, 0, 0], v = new THREE.Vector3(), days = sim.jd, camera_ = camera; camera_.updateMatrixWorld();
      const e = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements; let br = null; bd = 16;
      const test = (rows, flagOk) => { for (const r of rows) { if (!flagOk(r)) continue;
        const n = .01720209895 / (r[1] * Math.sqrt(r[1])); orbitPos(r[1], r[2], r[3] * D2R, r[4] * D2R, r[5] * D2R, r[6] * D2R + n * (days - r[7]), o);
        const x = o[0], y = o[2], z = -o[1], w = e[3] * x + e[7] * y + e[11] * z + e[15]; if (w <= 0) continue;
        const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * .5 + .5) * App.W; if (Math.abs(sx - mx) > bd) continue;
        const sy = (-(e[1] * x + e[5] * y + e[9] * z + e[13]) / w * .5 + .5) * App.H, d = Math.hypot(sx - mx, sy - my); if (d < bd) { bd = d; br = r } } };
      if (sets.neo.visible) test(ast, r => r[9] > 0); if (sets.belt.visible) test(ast, r => r[9] === 0); if (sets.com.visible) test(com, () => true);
      return br ? rowBody(br) : null;
    },
    extraLabels(emit) { for (const c of craft) if (!c.hidden) emit(c.label, c.p, 'dim', 10) },
    search(q) {
      const out = bodies.filter(b => b.label.toLowerCase().includes(q) && !b.hidden).map(b => ({ label: b.label, sub: b.kind, make: () => b }));
      for (const r of allRows) { if (r[0].toLowerCase().includes(q)) { out.push({ label: r[0], sub: ['asteroid', 'near-Earth asteroid', 'hazardous asteroid', 'comet'][r[9]], make: () => rowBody(r) }); if (out.length > 14) break } }
      return out;
    },
  };
  return sc;
}
register('solar', 'Solar System', solar);
