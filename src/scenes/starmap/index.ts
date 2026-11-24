import * as THREE from 'three';
import { App, Markers, U, cam, camera, register } from '@/engine';
import { PC_LY, bvColor, fmtNum, TAU } from '@/lib';
import { fetchConstellations, fetchExoplanets, fetchStarNames, fetchStarsBinary } from '@/data/api';
import { METHOD, METHOD_LIST, eqToThree } from './constants';
import type { Scene } from '@/types';
import { EFS, EVS, FS, VS } from './shaders';

function starmap(): Scene {
  const group = new THREE.Group(), tmp = new THREE.Vector3();
  let N = 0, pos, hip, names = [], namedIdx = new Map(), starPts = null, mat = null, absm = null;
  const exoHosts = [], exoMat = new THREE.ShaderMaterial({ uniforms: { uPx: U.uPx }, vertexShader: EVS, fragmentShader: EFS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  let exoPts = null, exoCount = 0, hostByPick = null, conLines = null, conLabels = [];
  const sol = { id: 'sol', label: 'Sol (the Sun)', enter: 'solar', enterLabel: 'Enter the solar system', focusD: 4, minD: .05, getPos: v => v.set(0, 0, 0),
    info: { sub: 'Our star · G2V yellow dwarf', text: 'The centre of the map. Double-click to fly into the solar system.', rows: [['Distance', '0']] } };
  const solMk = new Markers(1); group.add(solMk.points); solMk.set(0, 0, 0, 0, [1, .9, .6], 30);
  const selMk = new Markers(1, true); group.add(selMk.points); selMk.hide(0);
  // distance rings (equatorial plane)
  const rings = new THREE.Group(), ringR = [1, 3, 10, 30, 100, 300, 1000, 3000];
  for (const r of ringR) { const pts = []; for (let i = 0; i <= 128; i++) pts.push(new THREE.Vector3(Math.cos(i / 128 * TAU) * r, 0, Math.sin(i / 128 * TAU) * r));
    rings.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5a78d8, transparent: true, opacity: .22, depthWrite: false }))) }
  group.add(rings);
  const layerSt = { rings: true, stars: true, exo: false, con: true }, methodOn = {};
  METHOD_LIST.forEach(m => methodOn[m[0]] = true);

  const starBody = (i) => ({ id: 'hyg' + i, label: starLabel(i), idx: i, minD: .02, focusD: 6, live: false,
    getPos: v => v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]), getInfo: () => starInfo(i) });
  const starLabel = i => { const n = namedIdx.get(i); return n ? n[1] : hip[i] ? 'HIP ' + hip[i] : 'HYG ' + i };
  function starInfo(i) {
    const n = namedIdx.get(i), d = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]), rows = [['Distance', `${fmtNum(d * PC_LY, 1)} light-years (${fmtNum(d, 2)} pc)`], ['Absolute magnitude', absm[i].toFixed(2)], ['Colour index (B−V)', ciOf(i).toFixed(2)]];
    if (n) { if (n[3]) rows.unshift(['Spectral type', n[3]]); if (n[2]) rows.unshift(['Constellation', n[2]]); rows.push(['Apparent magnitude', String(n[5])]) }
    if (hip[i]) rows.push(['Hipparcos', String(hip[i])]);
    return { sub: n ? 'Star · ' + (n[2] || 'HYG catalogue') : 'Star · HYG catalogue', text: n ? 'One of the named stars of the night sky.' : 'A star from the HYG database (Hipparcos, Yale Bright Star and Gliese catalogues).', rows };
  }
  let ciArr; const ciOf = i => ciArr[i];
  const hostBody = h => ({ id: 'exo:' + h.name, label: h.name, minD: .01, focusD: 3, getPos: v => v.set(h.x, h.y, h.z),
    info: { sub: `Exoplanet system · ${h.planets.length} known planet${h.planets.length > 1 ? 's' : ''}`, text: h.planets.map(p => `${p[0]}${p[6] ? ' · ' + (+p[6]).toFixed(1) + ' R⊕' : ''}${p[5] ? ' · ' + p[5] + ' AU' : ''}`).join('\n'),
      rows: [['Distance', `${fmtNum(h.d * PC_LY, 0)} light-years`], ['Star type', h.spect || '—'], ['Method', h.planets[0][9]], ['Discovered', String(h.planets.map(p => p[8]).sort()[0] || '—')]] } });

  function pickScreen(mx, my, click) {
    if (!pos) return null;
    camera.updateMatrixWorld(); const e = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
    const W = App.W, H = App.H, cx = camera.position;
    // exoplanet hosts first
    if (layerSt.exo) { let bd = 12, bh = null;
      for (const h of exoHosts) { if (!methodOn[h.mkey]) continue; const w = e[3] * h.x + e[7] * h.y + e[11] * h.z + e[15]; if (w <= 0) continue;
        const sx = ((e[0] * h.x + e[4] * h.y + e[8] * h.z + e[12]) / w * .5 + .5) * W, sy = (-(e[1] * h.x + e[5] * h.y + e[9] * h.z + e[13]) / w * .5 + .5) * H, d = Math.hypot(sx - mx, sy - my); if (d < bd) { bd = d; bh = h } }
      if (bh) return hostBody(bh); }
    if (!layerSt.stars) return null;
    let best = -1, bs = 1e9; const ref = U.uRef || 20;
    for (let i = 0; i < N; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], w = e[3] * x + e[7] * y + e[11] * z + e[15]; if (w <= 0) continue;
      const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * .5 + .5) * W; if (Math.abs(sx - mx) > 14) continue;
      const sy = (-(e[1] * x + e[5] * y + e[9] * z + e[13]) / w * .5 + .5) * H, d = Math.hypot(sx - mx, sy - my); if (d > 14) continue;
      const dd = Math.min(Math.max(Math.hypot(x - cx.x, y - cx.y, z - cx.z), .02), cam.dist > 1 ? Math.max(cam.dist * .5, 15) : 15), m = absm[i] + 5 * Math.log10(dd / 10);
      if (m > 8.8) continue; const s = d + m * 1.6; if (s < bs) { bs = s; best = i }
    }
    return best >= 0 ? starBody(best) : null;
  }
  const labTmp = new THREE.Vector3(), cp = new THREE.Vector3();
  let labCache = [], labT = 0;

  return {
    title: 'Star Map', group, bodies: [sol], minD: .03, maxD: 40000, initD: 14, sky: false, rate: 1, extent: 1e5,
    intro: 'About 120,000 real stars from the HYG catalogue plus every confirmed exoplanet host, at true 3D positions. One unit is one parsec (3.26 light-years). Stars brighten as you approach. Rings mark 1, 3, 10, 30, 100… parsecs.',
    introRows: [['Stars', '0'], ['Exoplanet systems', '0']],
    center: v => v.set(0, 0, 0),
    layers: [],
    async load(status) {
      status('downloading star catalogue (first run can take a minute)…');
      const [bin, nm, ex, cons] = await Promise.all([fetchStarsBinary(), fetchStarNames(), fetchExoplanets(), fetchConstellations()]);
      const dv = new DataView(bin); N = dv.getUint32(0, true); const f = new Float32Array(bin, 4, N * 5); hip = new Int32Array(bin.slice(4 + N * 20, 4 + N * 24));
      pos = new Float32Array(N * 3); absm = new Float32Array(N); ciArr = new Float32Array(N); const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { eqToThree(f[i * 5], f[i * 5 + 1], f[i * 5 + 2], tmp); pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z; absm[i] = f[i * 5 + 3]; ciArr[i] = f[i * 5 + 4]; bvColor(f[i * 5 + 4], col, i * 3) }
      names = nm; for (const n of nm) namedIdx.set(n[0], n);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAbs', new THREE.BufferAttribute(absm, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
      mat = new THREE.ShaderMaterial({ uniforms: { uPx: U.uPx, uRef: { value: 20 }, uGain: { value: 0 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
      starPts = new THREE.Points(g, mat); starPts.frustumCulled = false; group.add(starPts);
      // constellation figures: Hipparcos id pairs -> line segments between real 3D star positions
      const byHip = new Map(); for (let i = 0; i < N; i++) if (hip[i] > 0 && !byHip.has(hip[i])) byHip.set(hip[i], i);
      const seg = []; conLabels = [];
      for (const [abbr, name, eng, lines] of cons) {
        const used = new Set<number>();
        for (const ln of lines) for (let k = 0; k + 1 < ln.length; k++) { const a = byHip.get(ln[k]), b = byHip.get(ln[k + 1]); if (a == null || b == null) continue;
          seg.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]); used.add(a); used.add(b) }
        if (used.size) { let x = 0, y = 0, z = 0; for (const i of used) { x += pos[i * 3]; y += pos[i * 3 + 1]; z += pos[i * 3 + 2] } conLabels.push({ name, v: new THREE.Vector3(x / used.size, y / used.size, z / used.size) }) }
      }
      conLines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3)),
        new THREE.LineBasicMaterial({ color: 0x6f95e8, transparent: true, opacity: .4, depthWrite: false, depthTest: false })); conLines.frustumCulled = false; group.add(conLines);
      // exoplanets grouped by host
      status('placing exoplanets…');
      const byHost = new Map();
      for (const r of ex) { if (r[3] == null || r[4] == null || r[2] == null) continue; let h = byHost.get(r[1]); if (!h) { const ra = r[3] * Math.PI / 180, de = r[4] * Math.PI / 180, d = r[2];
          eqToThree(d * Math.cos(de) * Math.cos(ra), d * Math.cos(de) * Math.sin(ra), d * Math.sin(de), tmp); h = { name: r[1], x: tmp.x, y: tmp.y, z: tmp.z, d, spect: r[12], planets: [] }; byHost.set(r[1], h); exoHosts.push(h) } h.planets.push(r) }
      const ep = new Float32Array(exoHosts.length * 3), ec = new Float32Array(exoHosts.length * 3), cnt = {};
      exoHosts.forEach((h, i) => { ep.set([h.x, h.y, h.z], i * 3); const m = h.planets[0][9]; h.mkey = METHOD[m] ? m : 'Other'; cnt[h.mkey] = (cnt[h.mkey] || 0) + 1; ec.set(METHOD[m] || [1, 1, 1], i * 3) });
      exoCount = ex.length; const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('aCol', new THREE.BufferAttribute(ec, 3));
      exoPts = new THREE.Points(eg, exoMat); exoPts.frustumCulled = false; exoPts.visible = layerSt.exo; group.add(exoPts); this.exoColAttr = eg.getAttribute('aCol'); this.exoCols = ec.slice();
      const self = this;
      this.layers = [
        { id: 'stars', label: 'Stars (HYG)', color: '#cfe0ff', count: N, on: true, apply: o => { layerSt.stars = o; starPts.visible = o } },
        { id: 'con', label: 'Constellations', color: '#6f95e8', count: conLabels.length, on: true, apply: o => { layerSt.con = o; conLines.visible = o } },
        { id: 'exo', label: 'Exoplanet systems', color: '#4cd9ff', count: exoHosts.length, on: false, apply: o => { layerSt.exo = o; exoPts.visible = o } },
        ...METHOD_LIST.map(([m, c]) => ({ id: 'm' + m, label: '  ' + m, color: c, count: cnt[m] || 0, on: true, apply: o => { methodOn[m] = o; const a = self.exoColAttr; exoHosts.forEach((h, i) => { const k = h.mkey === m ? (o ? 1 : 0) : null; if (k !== null) a.setXYZ(i, self.exoCols[i * 3] * k, self.exoCols[i * 3 + 1] * k, self.exoCols[i * 3 + 2] * k) }); a.needsUpdate = true } })),
        { id: 'rings', label: 'Distance rings', on: true, apply: o => { layerSt.rings = o; rings.visible = o } },
      ];
      this.introRows = [['Stars', N.toLocaleString()], ['Exoplanet systems', exoHosts.length.toLocaleString()], ['Confirmed exoplanets', exoCount.toLocaleString()]];
    },
    update() {
      if (mat) { mat.uniforms.uRef.value = U.uRef = Math.max(cam.dist * .5, 15) }
      if (App.sel) { App.sel.getPos(tmp); selMk.set(0, tmp.x, tmp.y, tmp.z, [.55, .7, 1], 34) } else selMk.hide(0);
    },
    pickCustom: pickScreen,
    extraLabels(emit) {
      const now = performance.now();
      if (now - labT > 200 && pos) { labT = now; cp.copy(camera.position); const arr = [];
        for (const n of names) { const i = n[0]; labTmp.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          const d = Math.min(Math.max(labTmp.distanceTo(cp), .02), Math.max(cam.dist * .5, 15)), m = absm[i] + 5 * Math.log10(d / 10); if (m < 6.2 + (cam.dist < 8 ? 1.5 : 0)) arr.push([m, i, n[1]]) }
        arr.sort((a, b) => a[0] - b[0]); labCache = arr.slice(0, 45) }
      for (const [, i, name] of labCache) { labTmp.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); if (!App.sel || App.sel.idx !== i) emit(name, labTmp, 'dim', 8) }
      if (layerSt.con && cam.dist < 60) for (const c of conLabels) emit(c.name, c.v, 'dim', 4);
      if (layerSt.rings) for (const r of ringR) { labTmp.set(r, 0, 0); emit(fmtNum(r * PC_LY, 0) + ' ly', labTmp, 'dim', 3) }
      emit('Sol', labTmp.set(0, 0, 0), '', 12);
    },
    search(q) {
      const out = [];
      for (const n of names) if (n[1].toLowerCase().includes(q)) { out.push({ label: n[1], sub: (n[2] || '') + ' · ' + fmtNum(n[4] * PC_LY, 1) + ' ly', make: () => starBody(n[0]) }); if (out.length > 8) break }
      for (const h of exoHosts) { const hit = h.name.toLowerCase().includes(q) || h.planets.some(p => p[0].toLowerCase().includes(q)); if (hit) { out.push({ label: h.name, sub: h.planets.length + ' planet(s)', make: () => hostBody(h) }); if (out.length > 16) break } }
      if ('sol sun'.includes(q)) out.unshift({ label: 'Sol (the Sun)', make: () => sol });
      return out;
    },
  };
}
register('starmap', 'Star Map', starmap);
