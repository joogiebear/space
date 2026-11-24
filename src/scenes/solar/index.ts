import * as THREE from 'three';
import { App, Markers, U, camera, glowSprite, register, screenOf, sim } from '@/engine';
import { AU_KM, D2R, J2000, TAU, fmtNum, orbitPos, planetEcl, planetEl } from '@/lib';
import { fmtDate } from '@/lib';
import { fetchSmallBodies, fetchSpacecraft } from '@/data/api';
import type { SmallBodyRow } from '@/data/api';
import { MOONS, PLANETS } from './data';
import type { PlanetDef } from './data';
import { SOLAR_PRESETS } from './presets';
import type { Body, Scene } from '@/types';
import { AFS, AVS } from './shaders';
import { bandTex, ringTex } from './textures';

const TEX = 'assets/tex/';
const PXF = .0045;

/** Sun, planet, dwarf planet or moon. */
interface SolarBody extends Body {
  kind: string;
  real: number;
  rkm?: number;
  p: THREE.Vector3;
  mesh: THREE.Mesh;
  moons?: SolarBody[];
  parentBody?: SolarBody;
  orbit?: THREE.Line;
  d?: PlanetDef;
}
/** A moon: SolarBody plus its orbit parameters (km converted to AU). */
interface MoonBody extends SolarBody {
  a: number; P: number; inc: number; th0: number; parentBody: SolarBody; line: MoonLine;
}
interface CraftBody extends Body { track: number[][]; p: THREE.Vector3; hidden?: boolean }
interface RowBody extends Body { r: SmallBodyRow; setOrbit(): THREE.Vector3[] }
type MoonLine = THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
type OrbitLine = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;

const rDisp = (real: number, dist: number) => Math.max(real, dist * PXF * (.55 + .45 * Math.sqrt(real / 4.26e-5)));
const km = (k: number) => k / AU_KM;
const eclToThree = (a: number[], o: THREE.Vector3) => o.set(a[0], a[2], -a[1]);

function solar() {
  const group = new THREE.Group(), tmp = new THREE.Vector3(), ecl = [0, 0, 0];
  const loader = new THREE.TextureLoader();
  group.add(new THREE.PointLight(0xffffff, 3.2, 0, 0), new THREE.AmbientLight(0xffffff, .22));
  const bodies: Body[] = [], byId: Record<string, SolarBody> = {}, orbitLines: { line: OrbitLine; b: SolarBody }[] = [], moonLines: MoonBody[] = [];
  const sphereGeo = new THREE.SphereGeometry(1, 48, 32);

  // Sun
  const sunMesh = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a8 })), sunGlow = glowSprite(0xffa040, 1), sunGlow2 = glowSprite(0xffd890, 1);
  group.add(sunMesh, sunGlow, sunGlow2);
  const sun: SolarBody = { id: 'sun', label: 'The Sun', kind: 'sun', rkm: 695700, real: km(695700), p: new THREE.Vector3(), mesh: sunMesh, focusD: .06, minD: km(695700) * 1.8, enter: null,
   
    getPos(v: THREE.Vector3) { return v.copy(this.p) }, info: { sub: 'G-type star · 4.6 billion years old', text: 'Holds 99.86% of the solar system\'s mass. Every second it fuses ~600 million tonnes of hydrogen into helium.', rows: [['Diameter', '1,391,000 km'], ['Surface temperature', '5,500 °C']] } };
  bodies.push(sun); byId.sun = sun;

  for (const d of PLANETS) {
    const mat = new THREE.MeshLambertMaterial({ color: d.color, emissive: 0x08080c });
    if (d.bands) { mat.map = bandTex(d.bands); mat.color.set(0xffffff) }
    if (d.tex) loader.load(TEX + d.tex, t => { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true });
    const mesh = new THREE.Mesh(sphereGeo, mat); group.add(mesh);
    const b: SolarBody = { id: d.id, label: d.label, kind: d.dwarf ? 'dwarf' : 'planet', real: km(d.rkm), rkm: d.rkm, p: new THREE.Vector3(), mesh, moons: [], enter: d.enter, enterLabel: d.enterLabel, live: true,
      getPos(v: THREE.Vector3) { return v.copy(this.p) }, d };
    b.getInfo = () => ({ sub: d.sub, text: d.text, rows: [['Distance from Sun', b.p.length().toFixed(3) + ' AU'], ['Light travel time', (b.p.length() * 8.317).toFixed(1) + ' min'], ['Year', d.period], ['Radius', fmtNum(d.rkm, 0) + ' km'], ['Moons shown', String(b.moons!.length)]] });
    if (d.ring) { const rg = new THREE.RingGeometry(1.24, 2.3, 128, 1), pa = rg.attributes.position, uv = rg.attributes.uv;
      for (let i = 0; i < pa.count; i++) uv.setXY(i, (Math.hypot(pa.getX(i), pa.getY(i)) - 1.24) / 1.06, .5);
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2;
      const tilt = new THREE.Group(); tilt.add(ring); tilt.rotation.z = .466; mesh.add(tilt); }
    // orbit line
    const el = planetEl(d.id, sim.jd), pts: THREE.Vector3[] = [], o = [0, 0, 0];
    for (let i = 0; i <= 256; i++) { orbitPos(el.a, el.e, el.I, el.Om, el.w, i / 256 * TAU, o); pts.push(new THREE.Vector3(o[0], o[2], -o[1])) }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7f9bff, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(line); orbitLines.push({ line, b }); b.orbit = line;
    bodies.push(b); byId[d.id] = b;
  }
  const unitCircle = (() => { const p: THREE.Vector3[] = []; for (let i = 0; i <= 96; i++) p.push(new THREE.Vector3(Math.cos(i / 96 * TAU), 0, Math.sin(i / 96 * TAU))); return new THREE.BufferGeometry().setFromPoints(p) })();
  for (const m of MOONS) {
    const par = byId[m[0]], mmat = new THREE.MeshLambertMaterial({ color: m[6], emissive: 0x0a0a0c }), mesh = new THREE.Mesh(sphereGeo, mmat); group.add(mesh);
    if (m[1] === 'moon') loader.load(TEX + 'moon_1024.jpg', t => { mmat.map = t; mmat.color.set(0xffffff); mmat.needsUpdate = true });
    const b0: Omit<MoonBody, 'line'> = { id: m[1], label: m[2], kind: 'moon', real: km(m[3]), a: km(m[4]), P: m[5], inc: m[7], th0: m[1].length * 1.9, p: new THREE.Vector3(), mesh, parentBody: par, labelCls: 'dim',
      getPos(this: SolarBody, v: THREE.Vector3) { return v.copy(this.p) }, info: { sub: 'Moon of ' + par.label, text: m[8], rows: [['Orbit radius', fmtNum(m[4], 0) + ' km'], ['Orbital period', Math.abs(m[5]) + ' days' + (m[5] < 0 ? ' (retrograde)' : '')], ['Radius', fmtNum(m[3], 0) + ' km']] } };
    const b = b0 as MoonBody; // `line` is attached just below
    const ml: MoonLine = new THREE.LineLoop(unitCircle, new THREE.LineBasicMaterial({ color: 0xaac0ff, transparent: true, opacity: .35, depthWrite: false })); ml.scale.setScalar(b.a); ml.rotation.x = b.inc; group.add(ml); b.line = ml; moonLines.push(b);
    par.moons!.push(b); bodies.push(b); byId[m[1]] = b;
  }
  for (const b of bodies) if (b.kind === 'planet' || b.kind === 'dwarf') { const far = b.moons!.reduce((a: number, m: Body) => Math.max(a, m.a), 0); b.focusD = Math.max(far * 2.7, b.real * 14); b.minD = b.real * 2.2 }
  for (const b of bodies) if (b.kind === 'moon') { b.focusD = Math.max(b.real * 12, b.a * .25); b.minD = b.real * 2.2 }
  const inFamily = (m: Body) => { const s = App.sel; return !!s && (s === m.parentBody || s.parentBody === m.parentBody || s === m) };

  // small bodies on the GPU
  const smallMat = (col: [number, number, number], size: number) => new THREE.ShaderMaterial({ uniforms: { uJD: { value: 0 }, uPx: U.uPx, uSize: { value: size }, uCol: { value: new THREE.Color(...col) } }, vertexShader: AVS, fragmentShader: AFS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const sets: Record<string, THREE.Points> = {}; let ast: SmallBodyRow[] = [], com: SmallBodyRow[] = [], allRows: SmallBodyRow[] = [];
  function buildSet(rows: SmallBodyRow[], mat: THREE.ShaderMaterial) {
    const n = rows.length, g = new THREE.BufferGeometry(), e1 = new Float32Array(n * 4), e2 = new Float32Array(n * 4);
    rows.forEach((r, i) => { e1.set([r[1], r[2], r[3] * D2R, r[4] * D2R], i * 4); e2.set([r[5] * D2R, r[6] * D2R, r[7] - J2000, r[9]], i * 4) });
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aE1', new THREE.BufferAttribute(e1, 4)); g.setAttribute('aE2', new THREE.BufferAttribute(e2, 4));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; group.add(p); return p;
  }
  function craftPos(b: CraftBody, jd: number) { // linear interpolation along the Horizons track, clamped at the ends
    const t = b.track; let k = 0, hi = t.length - 1;
    if (jd <= t[0][0]) k = 0; else if (jd >= t[hi][0]) k = hi - 1; else { let lo = 0; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m][0] <= jd) lo = m; else hi = m } k = lo }
    const a = t[k], c = t[k + 1], f = Math.min(1, Math.max(0, (jd - a[0]) / (c[0] - a[0])));
    b.p.set(a[1] + (c[1] - a[1]) * f, a[3] + (c[3] - a[3]) * f, -(a[2] + (c[2] - a[2]) * f));
  }
  const craftMk = new Markers(24, true); group.add(craftMk.points); let craft: CraftBody[] = [];
  const selMk = new Markers(1, true); group.add(selMk.points); selMk.hide(0);
  let selLine: THREE.Line | null = null;

  function rowBody(r: SmallBodyRow): RowBody {
    const o = [0, 0, 0]; const kind = ['Main-belt / other asteroid', 'Near-Earth asteroid', 'Potentially hazardous asteroid', 'Comet'][r[9]] || 'Small body';
    const n = .01720209895 / Math.pow(r[1], 1.5);
    const pos = (v: THREE.Vector3, jd = sim.jd) => { orbitPos(r[1], r[2], r[3] * D2R, r[4] * D2R, r[5] * D2R, r[6] * D2R + n * (jd - r[7]), o); return v.set(o[0], o[2], -o[1]) };
    const D = r[8] ? 1329 / Math.sqrt(.14) * Math.pow(10, -r[8] / 5) : 0;
    return { id: 'sb:' + r[0], label: r[0], r, minD: .0005, focusD: .8, live: true, getPos: (v: THREE.Vector3) => pos(v),
      getInfo: () => { const p = pos(tmp.clone()); return { sub: kind, text: r[9] === 3 ? 'A comet on an eccentric orbit; it warms and grows a tail as it nears the Sun.' : r[9] === 2 ? 'Its orbit passes within 0.05 AU of Earth\'s and it is large enough to cause regional damage in an impact. Astronomers monitor it closely.' : 'A small body orbiting the Sun, tracked by the JPL Small-Body Database.',
        rows: [['Distance from Sun', p.length().toFixed(3) + ' AU'], ['Semi-major axis', r[1] + ' AU'], ['Eccentricity', String(r[2])], ['Inclination', r[3] + '°'], ['Orbital period', (Math.pow(r[1], 1.5)).toFixed(2) + ' years'], ...(r[8] ? [['Abs. magnitude H', String(r[8])], ['Est. diameter', D > 1 ? D.toFixed(1) + ' km' : (D * 1000).toFixed(0) + ' m']] : [])] } },
      setOrbit() { const pts: THREE.Vector3[] = [], oo = [0, 0, 0]; for (let i = 0; i <= 240; i++) { orbitPos(r[1], r[2], r[3] * D2R, r[4] * D2R, r[5] * D2R, i / 240 * TAU, oo); pts.push(new THREE.Vector3(oo[0], oo[2], -oo[1])) } return pts } };
  }

  const sc: Scene = {
    title: 'Solar System', group, bodies, minD: 2e-5, maxD: 500, exitD: 300, initD: 90, rate: 5 * 86400, live: false, timeLabel: 'Simulated date', extent: 600,
    presets: SOLAR_PRESETS,
    intro: 'Real positions of the planets for the date shown, computed from JPL orbital elements, plus ~96,000 asteroids, 1,300 comets and 14 spacecraft. Planet and moon sizes are exaggerated when zoomed out. Select a planet to reveal its moons; double-click Earth to see its satellites.',
    introRows: [['Asteroids', '…'], ['Comets', '…']],
    center: v => v.set(0, 0, 0),
    layers: [],
    isHidden: b => b.kind === 'moon' && !inFamily(b),
    async load(status) {
      const self = this; status('downloading asteroid & comet orbits…');
      const [sb, cr] = await Promise.all([fetchSmallBodies(), fetchSpacecraft()]);
      ast = sb.ast; com = sb.com; allRows = ast.concat(com);
      sets.belt = buildSet(ast.filter(r => r[9] === 0), smallMat([.78, .7, .55], 1.5));
      sets.neo = buildSet(ast.filter(r => r[9] > 0), smallMat([1, .62, .25], 1.3));
      sets.com = buildSet(com, smallMat([.45, .92, 1], 3));
      const nNeo = ast.filter(r => r[9] > 0).length;
      craft = cr.craft.filter(c => c.track && c.track.length > 1).map((c, i) => { const b: CraftBody = { id: 'craft:' + c.id, label: c.name, track: c.track, p: new THREE.Vector3(), minD: .002, focusD: .5, noLabel: false, labelCls: '',
        getPos(v: THREE.Vector3) { return v.copy(this.p) },
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
        else if (b.kind === 'moon') { const mb = b as MoonBody, th = mb.th0 + TAU * days / mb.P, x = Math.cos(th) * mb.a, z = Math.sin(th) * mb.a; mb.p.set(mb.parentBody.p.x + x, mb.parentBody.p.y - z * Math.sin(mb.inc), mb.parentBody.p.z + z * Math.cos(mb.inc)) }
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
      for (const k in sets) (sets[k].material as THREE.ShaderMaterial).uniforms.uJD.value = days;
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
      const s = { x: 0, y: 0, z: 0 }; let best: CraftBody | null = null, bd = 14;
      for (const c of craft) { if (c.hidden) continue; if (!screenOf(c.p, s)) continue; const d = Math.hypot(s.x - mx, s.y - my); if (d < bd) { bd = d; best = c } }
      if (best || !click || !allRows.length) return best;
      const o = [0, 0, 0], v = new THREE.Vector3(), days = sim.jd, camera_ = camera; camera_.updateMatrixWorld();
      const e = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements; let br = null as SmallBodyRow | null; bd = 16;
      const test = (rows: SmallBodyRow[], flagOk: (r: SmallBodyRow) => boolean) => { for (const r of rows) { if (!flagOk(r)) continue;
        const n = .01720209895 / (r[1] * Math.sqrt(r[1])); orbitPos(r[1], r[2], r[3] * D2R, r[4] * D2R, r[5] * D2R, r[6] * D2R + n * (days - r[7]), o);
        const x = o[0], y = o[2], z = -o[1], w = e[3] * x + e[7] * y + e[11] * z + e[15]; if (w <= 0) continue;
        const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * .5 + .5) * App.W; if (Math.abs(sx - mx) > bd) continue;
        const sy = (-(e[1] * x + e[5] * y + e[9] * z + e[13]) / w * .5 + .5) * App.H, d = Math.hypot(sx - mx, sy - my); if (d < bd) { bd = d; br = r } } };
      if (sets.neo.visible) test(ast, (r: SmallBodyRow) => r[9] > 0); if (sets.belt.visible) test(ast, (r: SmallBodyRow) => r[9] === 0); if (sets.com.visible) test(com, () => true);
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
