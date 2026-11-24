import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { App, Markers, U, camera, register, sim } from '@/engine';
import { D2R, J2000, RE_KM, TAU, fmtNum, jdToDate, nowJD, planetEcl } from '@/lib';
import { CAT_COL, CAT_HEX, EPS, J2, MU, REQ, eclToEqThree, gmst } from './constants';
import { fetchSatellites } from '@/data/api';
import type { SatRecord } from '@/data/api';
import { askLocation, loadLocation, saveLocation } from './location';
import { PassPredictor } from './passes';
import { EARTH_PRESETS } from './presets';
import type { Body, Layer, Scene, SearchResult } from '@/types';
import { SFS, SVS } from './shaders';

const TEX = 'assets/tex/';

function earth(): Scene {
  const group = new THREE.Group(), tmp = new THREE.Vector3(), loader = new THREE.TextureLoader();
  const sunDir = new THREE.Vector3(1, 0, 0), ecl = [0, 0, 0];
  const blue = new THREE.DataTexture(new Uint8Array([22, 52, 104, 255]), 1, 1); blue.needsUpdate = true;
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;
  const eMat = new THREE.ShaderMaterial({ uniforms: { uDay: { value: blue }, uNight: { value: black }, uSun: { value: sunDir } },
    vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D uDay,uNight;uniform vec3 uSun;varying vec2 vUv;varying vec3 vN;void main(){vec3 N=normalize(vN);float l=dot(N,normalize(uSun));vec3 day=texture2D(uDay,vUv).rgb,night=texture2D(uNight,vUv).rgb;float dm=smoothstep(-.12,.22,l);vec3 c=mix(night*1.5+day*.03,day*(.05+max(l,0.)*1.05),dm);gl_FragColor=vec4(c,1.);}' });
  loader.load(TEX + 'earth_atmos_2048.jpg', t => eMat.uniforms.uDay.value = t); loader.load(TEX + 'earth_lights_2048.png', t => eMat.uniforms.uNight.value = t);
  const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), eMat); group.add(earthMesh);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false, emissive: 0x050608 });
  loader.load(TEX + 'earth_clouds_1024.png', t => { cloudMat.map = t; cloudMat.needsUpdate = true });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 48), cloudMat); group.add(clouds);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 48), new THREE.ShaderMaterial({ uniforms: { uSun: { value: sunDir } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uSun;varying vec3 vN;varying vec3 vW;void main(){float i=pow(.74-dot(vN,vec3(0.,0.,1.)),3.);float l=smoothstep(-.35,.35,dot(vW,normalize(uSun)));gl_FragColor=vec4(vec3(.3,.6,1.)*i*(.15+.85*l),1.);}' }));
  group.add(atm);
  const sunLight = new THREE.DirectionalLight(0xffffff, 3.2); group.add(sunLight, new THREE.AmbientLight(0xffffff, .12));
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(.2725, 40, 28), new THREE.MeshLambertMaterial({ color: 0xbbbbbb })); group.add(moonMesh);
  loader.load(TEX + 'moon_1024.jpg', t => { moonMesh.material.map = t; moonMesh.material.color.set(0xffffff); moonMesh.material.needsUpdate = true });

  const earthBody: Body = { id: 'earth', label: 'Earth', radNow: 1, focusD: 5, minD: 1.3, getPos: (v: THREE.Vector3) => v.set(0, 0, 0), noLabel: true,
    info: { sub: 'Planet · Earth orbit view', text: 'The globe shows real day and night for the simulation date. Every dot around it is a catalogued object in orbit. Click one for its details and orbit.', rows: [['Radius', '6,371 km']] } };
  const moonBody: Body = { id: 'moon', label: 'The Moon', radNow: .2725, focusD: 2, minD: .5, getPos: (v: THREE.Vector3) => v.copy(moonMesh.position),
    info: { sub: 'Natural satellite · ~384,400 km away', text: 'Shown at its true position and relative size. Notice how small Earth\'s whole satellite swarm looks next to the distance to the Moon.', rows: [] } };
  const mk = new Markers(1, true); group.add(mk.points); mk.hide(0);

  let N = 0, sats: SatRecord[] = [], fetched = '', points: THREE.Points | null = null, mat: THREE.ShaderMaterial | null = null, cpuT = 0, cats: string[] = [], lower: string[] = [], cnt: number[] = [], stationIdx: number[] = [];
  let e1!: Float32Array, e2!: Float32Array, cpu!: Float32Array; // assigned in load(), which runs before update/pick
  const visible: number[] = new Array(8).fill(1);
  const satPos = (i: number, days: number, o: number[]) => { // JS twin of the vertex shader
    const inc = e1[i * 4], e = e1[i * 4 + 2], n = e2[i * 4 + 1] / 60, a = Math.cbrt(MU / (n * n)), dt = (days - e2[i * 4 + 2]) * 86400, p = a * (1 - e * e), k = 1.5 * J2 * (REQ / p) ** 2, ci = Math.cos(inc);
    const Om = e1[i * 4 + 1] - k * n * ci * dt, w = e1[i * 4 + 3] + .5 * k * n * (5 * ci * ci - 1) * dt, M = e2[i * 4] + n * (1 + .5 * k * Math.sqrt(1 - e * e) * (3 * ci * ci - 1)) * dt;
    let E = ((M % TAU) + TAU) % TAU; const Mm = E; if (e > .8) E = Math.PI; for (let j = 0; j < 8; j++) E -= (E - e * Math.sin(E) - Mm) / (1 - e * Math.cos(E));
    const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E), cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), sI = Math.sin(inc);
    const x = ((cw * cO - sw * sO * ci) * xv + (-sw * cO - cw * sO * ci) * yv) / RE_KM, y = ((cw * sO + sw * cO * ci) * xv + (-sw * sO + cw * cO * ci) * yv) / RE_KM, z = (sw * sI * xv + cw * sI * yv) / RE_KM;
    o[0] = x; o[1] = z; o[2] = -y; return o;
  };
  const sb = [0, 0, 0];
  // ---- observer location and pass prediction ----
  const trackGrp = new THREE.Group(); group.add(trackGrp); // Earth-fixed frame: spins with the globe
  let loc = loadLocation();
  const predictor = new PassPredictor();
  const youMk = new Markers(1, true), youPos = new THREE.Vector3(), tmpW = new THREE.Vector3(); trackGrp.add(youMk.points);
  function placeYou() {
    if (!loc) { youMk.hide(0); return }
    const la = loc.lat * D2R, lo = loc.lon * D2R;
    youPos.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(1.004); youMk.set(0, youPos.x, youPos.y, youPos.z, [.4, 1, .6], 18);
  }
  placeYou();
  async function setLocation() {
    const nl = await askLocation(loc);
    if (nl) { loc = nl; saveLocation(nl); placeYou(); predictor.reset(); }
  }
  function satBody(i: number): Body {
    const s = sats[i], rec = satellite.twoline2satrec(s[1], s[2]);
    return { id: 'sat' + i, label: s[0], idx: i, action: rec ? { label: () => loc ? 'Change my location' : 'Set my location', run: setLocation } : null, minD: .004, focusD: s[3] === 0 ? 2.8 : .9, live: true,
      getPos: (v: THREE.Vector3) => { satPos(i, sim.jd - J2000, sb); return v.set(sb[0], sb[1], sb[2]) },
      getInfo() {
        const n = e2[i * 4 + 1], per = TAU / n, a = Math.cbrt(MU / ((n / 60) ** 2)), e = e1[i * 4 + 2], rows: string[][] = [['Category', cats[s[3]]], ['NORAD ID', s[1].slice(2, 7).trim()], ['Int\'l designator', s[1].slice(9, 17).trim() || '—']];
        if (rec) { const pv = satellite.propagate(rec, jdToDate(sim.jd)); if (pv.position) { const gd = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, satellite.gstime(jdToDate(sim.jd))), v = pv.velocity as satellite.EciVec3<number>;
          rows.push(['Altitude', fmtNum(gd.height, 0) + ' km'], ['Position', `${(gd.latitude / D2R).toFixed(1)}°, ${(gd.longitude / D2R).toFixed(1)}°`], ['Speed', Math.hypot(v.x, v.y, v.z).toFixed(2) + ' km/s']) } else rows.push(['Status', 'orbit decayed or out of TLE validity']) }
        rows.push(['Orbit', `${fmtNum(a * (1 - e) - REQ, 0)} × ${fmtNum(a * (1 + e) - REQ, 0)} km`], ['Inclination', (e1[i * 4] / D2R).toFixed(2) + '°'], ['Period', per.toFixed(1) + ' min'], ['TLE epoch', s[1].slice(18, 32).trim()]);
        rows.push(...predictor.rows(i, rec, loc, sim.jd, sunDir));
        return { sub: cats[s[3]], text: s[3] === 5 || s[3] === 6 ? 'Orbital debris: a dead object still circling the Earth. Collisions among objects like this are the main threat to working satellites.' : s[3] === 0 ? 'A crewed space station. Select it to follow it around the globe.' : 'A catalogued object in Earth orbit. Position is propagated from its public orbital elements.', rows };
      } };
  }
  let orbitLine: THREE.Line | null = null, trackLine: THREE.Line | null = null, trackT = 0, trackIdx = -1, issBody: Body | null = null;
  function clearOrbit() { if (orbitLine) { group.remove(orbitLine); orbitLine.geometry.dispose(); orbitLine = null } clearTrack() }
  function clearTrack() { if (trackLine) { trackGrp.remove(trackLine); trackLine.geometry.dispose(); trackLine = null } trackIdx = -1 }
  // ground track: the sub-satellite path on the surface, from 0.4 orbits ago to 1.3 orbits ahead
  function buildTrack(idx: number) {
    if (trackLine) { trackGrp.remove(trackLine); trackLine.geometry.dispose() }
    const per = TAU / e2[idx * 4 + 1] / 1440, jd0 = sim.jd, o = [0, 0, 0], pts: THREE.Vector3[] = [], K = 260;
    for (let i = 0; i <= K; i++) {
      const dt = per * (-.4 + 1.7 * i / K); satPos(idx, jd0 + dt - J2000, o);
      const g = gmst(jd0 + dt), c = Math.cos(g), s = Math.sin(g), x = o[0] * c - o[2] * s, z = o[0] * s + o[2] * c, L = Math.hypot(x, o[1], z) || 1;
      pts.push(new THREE.Vector3(x / L * 1.006, o[1] / L * 1.006, z / L * 1.006));
    }
    trackLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4cf0ff, transparent: true, opacity: .85, depthWrite: false }));
    trackGrp.add(trackLine); trackIdx = idx; trackT = performance.now();
  }
  const hostScene: Scene = {
    title: 'Earth Orbit', group, bodies: [earthBody, moonBody], minD: .0035, maxD: 400, exitD: 120, initD: 5.2, rate: 60, live: false, timeLabel: 'Simulated date', extent: 800,
    // satellite elements are only good for weeks around today, so the dots hide for far-away dates (see update)
    presets: EARTH_PRESETS,
    enter() { if (Math.abs(sim.jd - nowJD()) > 45) { sim.jd = nowJD() } }, // come back to the present when the clock was left far away
    intro: 'Loading catalogue…', introRows: [],
    center: v => v.set(0, 0, 0),
    layers: [],
    async load(status) {
      status('downloading orbital elements from CelesTrak…');
      const d = await fetchSatellites(); sats = d.sats; cats = d.cats; fetched = d.fetched; N = sats.length;
      e1 = new Float32Array(N * 4); e2 = new Float32Array(N * 4); const col = new Float32Array(N * 3), sz = new Float32Array(N); lower = new Array(N); cnt = new Array(cats.length).fill(0);
      let ok = 0;
      for (let i = 0; i < N; i++) {
        const [name, l1, l2, c] = sats[i]; lower[i] = name.toLowerCase();
        const yy = +l1.slice(18, 20), year = yy < 57 ? 2000 + yy : 1900 + yy, epoch = Date.UTC(year, 0, 1) / 864e5 + 2440587.5 + (+l1.slice(20, 32)) - 1;
        const n = +l2.slice(52, 63) * TAU / 1440, e = +('0.' + l2.slice(26, 33).trim());
        e1.set([+l2.slice(8, 16) * D2R, +l2.slice(17, 25) * D2R, e, +l2.slice(34, 42) * D2R], i * 4); e2.set([+l2.slice(43, 51) * D2R, n, epoch - J2000, c], i * 4);
        col.set(CAT_COL[c] || [1, 1, 1], i * 3); sz[i] = c === 0 ? 7 : c === 5 || c === 6 ? 2.6 : c === 2 ? 2 : 2.4; cnt[c]++;
        if (n > 0 && e < .95) ok++; if (c === 0) stationIdx.push(i);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute('aE1', new THREE.BufferAttribute(e1, 4)); g.setAttribute('aE2', new THREE.BufferAttribute(e2, 4)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
      mat = new THREE.ShaderMaterial({ uniforms: { uDays: { value: 0 }, uPx: U.uPx, uVis: { value: visible } }, vertexShader: SVS, fragmentShader: SFS, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending });
      points = new THREE.Points(g, mat); points.frustumCulled = false; group.add(points); cpu = new Float32Array(N * 3);
      this.layers = cats.map((c, i): Layer => ({ id: 'c' + i, label: c, color: CAT_HEX(CAT_COL[i]), count: cnt[i], on: true, apply: (o: boolean) => { visible[i] = o ? 1 : 0; mat!.uniforms.uVis.value = visible.slice() } }));
      const iss = sats.findIndex(s => /^ISS \(ZARYA\)/.test(s[0]));
      if (iss >= 0 && !issBody) { issBody = satBody(iss); issBody.label = 'ISS (International Space Station)'; issBody.pinned = true; this.bodies!.splice(1, 0, issBody) }
      this.intro = 'Every active satellite, station and tracked piece of debris in the public CelesTrak catalogue, drawn at its real position for the date shown. Positions are propagated on the GPU from orbital elements, so accuracy is a few kilometres. Click any dot.';
      this.introRows = [['Objects', N.toLocaleString()], ['Catalogue fetched', fetched]];
    },
    update() {
      const jd = sim.jd; if (mat) mat.uniforms.uDays.value = jd - J2000;
      if (points) points.visible = Math.abs(jd - nowJD()) < 30;
      earthMesh.rotation.y = gmst(jd); clouds.rotation.y = gmst(jd) * 1.003;
      planetEcl('earth', jd, ecl); const l = Math.hypot(ecl[0], ecl[1], ecl[2]); eclToEqThree(-ecl[0] / l, -ecl[1] / l, -ecl[2] / l, sunDir); sunLight.position.copy(sunDir).multiplyScalar(100);
      const d = jd - J2000, Lm = (218.316 + 13.176396 * d) * D2R, Mm = (134.963 + 13.064993 * d) * D2R, F = (93.272 + 13.22935 * d) * D2R, lon = Lm + 6.289 * D2R * Math.sin(Mm), lat = 5.128 * D2R * Math.sin(F), dist = (385001 - 20905 * Math.cos(Mm)) / RE_KM;
      eclToEqThree(dist * Math.cos(lat) * Math.cos(lon), dist * Math.cos(lat) * Math.sin(lon), dist * Math.sin(lat), moonMesh.position);
      trackGrp.rotation.y = gmst(jd);
      if (trackIdx >= 0 && performance.now() - trackT > 3000) buildTrack(trackIdx); // keep the window sliding with the clock
      if (App.sel) { App.sel.getPos(tmp); mk.set(0, tmp.x, tmp.y, tmp.z, [1, 1, 1], 26) } else mk.hide(0);
    },
    onSelect(b) { clearOrbit(); if (b && b.idx != null) { buildTrack(b.idx); const pts: THREE.Vector3[] = [], per = TAU / e2[b.idx * 4 + 1] / 1440, o = [0, 0, 0], d0 = sim.jd - J2000; for (let i = 0; i <= 220; i++) { satPos(b.idx, d0 + per * i / 220, o); pts.push(new THREE.Vector3(o[0], o[1], o[2])) }
      orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6 })); group.add(orbitLine) } },
    pickCustom(mx, my) {
      if (!points || !points.visible) return null; const now = performance.now(), o = [0, 0, 0];
      if (now - cpuT > 300) { cpuT = now; const d = sim.jd - J2000; for (let i = 0; i < N; i++) { satPos(i, d, o); cpu[i * 3] = o[0]; cpu[i * 3 + 1] = o[1]; cpu[i * 3 + 2] = o[2] } }
      camera.updateMatrixWorld(); const e = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements, cp = camera.position, W = App.W, H = App.H;
      let best = -1, bd = 13;
      for (let i = 0; i < N; i++) {
        if (!visible[e2[i * 4 + 3]]) continue; const x = cpu[i * 3], y = cpu[i * 3 + 1], z = cpu[i * 3 + 2], w = e[3] * x + e[7] * y + e[11] * z + e[15]; if (w <= 0) continue;
        const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * .5 + .5) * W; if (Math.abs(sx - mx) > bd) continue;
        const sy = (-(e[1] * x + e[5] * y + e[9] * z + e[13]) / w * .5 + .5) * H, d = Math.hypot(sx - mx, sy - my) - (e2[i * 4 + 3] === 0 ? 5 : 0); if (d >= bd) continue;
        const vx = x - cp.x, vy = y - cp.y, vz = z - cp.z, L = Math.hypot(vx, vy, vz), t = -(cp.x * vx + cp.y * vy + cp.z * vz) / L; // occluded by Earth?
        if (t > 0 && t < L) { const px = cp.x + vx / L * t, py = cp.y + vy / L * t, pz = cp.z + vz / L * t; if (Math.hypot(px, py, pz) < 1) continue }
        bd = d; best = i;
      }
      return best >= 0 ? satBody(best) : null;
    },
    extraLabels(emit) { if (loc) emit('You', trackGrp.localToWorld(tmpW.copy(youPos)), '', 9); if (!points) return; const o = [0, 0, 0], d = sim.jd - J2000; if (!visible[0]) return; for (const i of stationIdx) { satPos(i, d, o); emit(sats[i][0].replace(/\s*\(.*\)/, ''), tmp.set(o[0], o[1], o[2]), 'dim', 8) } emit('Moon', moonMesh.position, 'dim', 10) },
    search(q: string) { const out: SearchResult[] = []; for (let i = 0; i < N; i++) if (lower[i].includes(q)) { out.push({ label: sats[i][0], sub: cats[sats[i][3]], make: () => satBody(i) }); if (out.length > 14) break } return out },
  };
  return hostScene;
}

register('earth', 'Earth Orbit', earth);
