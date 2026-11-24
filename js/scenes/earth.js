import { THREE, U, sim, App, cam, camera, Markers, register } from '../core.js';
import { TAU, D2R, J2000, RE_KM, planetEcl, jdToDate, fmtNum } from '../util.js';

const TEX = 'assets/tex/';
const EPS = 23.4393 * D2R, MU = 398600.4418, J2 = 1.08262668e-3, REQ = 6378.137;
const CAT_COL = [[1, .9, .3], [.5, .85, 1], [.62, .7, 1], [.55, 1, .65], [1, .62, .28], [1, .33, .3], [.9, .5, 1]];
const CAT_HEX = c => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const eclToEqThree = (x, y, z, o) => { const ye = y * Math.cos(EPS) - z * Math.sin(EPS), ze = y * Math.sin(EPS) + z * Math.cos(EPS); return o.set(x, ze, -ye) };
const gmst = jd => (((280.46061837 + 360.98564736629 * (jd - J2000)) % 360) + 360) % 360 * D2R;

const SVS = `attribute vec4 aE1;attribute vec4 aE2;attribute vec3 aCol;attribute float aSize;uniform float uDays,uPx;uniform float uVis[8];varying vec3 vC;varying float vF;
void main(){float cat=aE2.w;if(uVis[int(cat+.5)]<.5){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
float inc=aE1.x,e=aE1.z;float n=aE2.y/60.;float a=pow(398600.4418/(n*n),1./3.);float dt=(uDays-aE2.z)*86400.;
float p=a*(1.-e*e);float k=1.5*.00108262668*pow(6378.137/p,2.);float ci=cos(inc);
float Om=aE1.y-k*n*ci*dt;float w=aE1.w+.5*k*n*(5.*ci*ci-1.)*dt;float M=mod(aE2.x+n*(1.+.5*k*sqrt(1.-e*e)*(3.*ci*ci-1.))*dt,6.2831853);
float E=e>.8?3.14159265:M;for(int i=0;i<7;i++){E-=(E-e*sin(E)-M)/(1.-e*cos(E));}
float xv=a*(cos(E)-e),yv=a*sqrt(1.-e*e)*sin(E);float cw=cos(w),sw=sin(w),cO=cos(Om),sO=sin(Om),sI=sin(inc);
vec3 r=vec3((cw*cO-sw*sO*ci)*xv+(-sw*cO-cw*sO*ci)*yv,(cw*sO+sw*cO*ci)*xv+(-sw*sO+cw*cO*ci)*yv,sw*sI*xv+cw*sI*yv)/6371.;
gl_Position=projectionMatrix*modelViewMatrix*vec4(r.x,r.z,-r.y,1.);gl_PointSize=aSize*uPx;vC=aCol;}`;
const SFS = `varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,smoothstep(1.,.3,d));}`;

function earth() {
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

  const earthBody = { id: 'earth', label: 'Earth', radNow: 1, focusD: 5, minD: 1.3, getPos: v => v.set(0, 0, 0), noLabel: true,
    info: { sub: 'Planet · Earth orbit view', text: 'The globe shows real day and night for the simulation date. Every dot around it is a catalogued object in orbit. Click one for its details and orbit.', rows: [['Radius', '6,371 km']] } };
  const moonBody = { id: 'moon', label: 'The Moon', radNow: .2725, focusD: 2, minD: .5, getPos: v => v.copy(moonMesh.position),
    info: { sub: 'Natural satellite · ~384,400 km away', text: 'Shown at its true position and relative size. Notice how small Earth\'s whole satellite swarm looks next to the distance to the Moon.', rows: [] } };
  const mk = new Markers(1, true); group.add(mk.points); mk.hide(0);

  let N = 0, sats = [], e1, e2, cats = [], lower = [], fetched = '', points = null, mat = null, cpu = null, cpuT = 0, cnt = [], stationIdx = [];
  const visible = new Array(8).fill(1);
  const satPos = (i, days, o) => { // JS twin of the vertex shader
    const inc = e1[i * 4], e = e1[i * 4 + 2], n = e2[i * 4 + 1] / 60, a = Math.cbrt(MU / (n * n)), dt = (days - e2[i * 4 + 2]) * 86400, p = a * (1 - e * e), k = 1.5 * J2 * (REQ / p) ** 2, ci = Math.cos(inc);
    const Om = e1[i * 4 + 1] - k * n * ci * dt, w = e1[i * 4 + 3] + .5 * k * n * (5 * ci * ci - 1) * dt, M = e2[i * 4] + n * (1 + .5 * k * Math.sqrt(1 - e * e) * (3 * ci * ci - 1)) * dt;
    let E = ((M % TAU) + TAU) % TAU; const Mm = E; if (e > .8) E = Math.PI; for (let j = 0; j < 8; j++) E -= (E - e * Math.sin(E) - Mm) / (1 - e * Math.cos(E));
    const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E), cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), sI = Math.sin(inc);
    const x = ((cw * cO - sw * sO * ci) * xv + (-sw * cO - cw * sO * ci) * yv) / RE_KM, y = ((cw * sO + sw * cO * ci) * xv + (-sw * sO + cw * cO * ci) * yv) / RE_KM, z = (sw * sI * xv + cw * sI * yv) / RE_KM;
    o[0] = x; o[1] = z; o[2] = -y; return o;
  };
  const sb = [0, 0, 0];
  function satBody(i) {
    const s = sats[i], rec = typeof satellite !== 'undefined' ? satellite.twoline2satrec(s[1], s[2]) : null;
    return { id: 'sat' + i, label: s[0], idx: i, minD: .004, focusD: .9, live: true,
      getPos: v => { satPos(i, sim.jd - J2000, sb); return v.set(sb[0], sb[1], sb[2]) },
      getInfo() {
        const n = e2[i * 4 + 1], per = TAU / n, a = Math.cbrt(MU / ((n / 60) ** 2)), e = e1[i * 4 + 2], rows = [['Category', cats[s[3]]], ['NORAD ID', s[1].slice(2, 7).trim()], ['Int\'l designator', s[1].slice(9, 17).trim() || '—']];
        if (rec) { const pv = satellite.propagate(rec, jdToDate(sim.jd)); if (pv.position) { const gd = satellite.eciToGeodetic(pv.position, satellite.gstime(jdToDate(sim.jd))), v = pv.velocity;
          rows.push(['Altitude', fmtNum(gd.height, 0) + ' km'], ['Position', `${(gd.latitude / D2R).toFixed(1)}°, ${(gd.longitude / D2R).toFixed(1)}°`], ['Speed', Math.hypot(v.x, v.y, v.z).toFixed(2) + ' km/s']) } else rows.push(['Status', 'orbit decayed or out of TLE validity']) }
        rows.push(['Orbit', `${fmtNum(a * (1 - e) - REQ, 0)} × ${fmtNum(a * (1 + e) - REQ, 0)} km`], ['Inclination', (e1[i * 4] / D2R).toFixed(2) + '°'], ['Period', per.toFixed(1) + ' min'], ['TLE epoch', s[1].slice(18, 32).trim()]);
        return { sub: cats[s[3]], text: s[3] === 5 || s[3] === 6 ? 'Orbital debris: a dead object still circling the Earth. Collisions among objects like this are the main threat to working satellites.' : s[3] === 0 ? 'A crewed space station. Select it to follow it around the globe.' : 'A catalogued object in Earth orbit. Position is propagated from its public orbital elements.', rows };
      } };
  }
  let orbitLine = null;
  function clearOrbit() { if (orbitLine) { group.remove(orbitLine); orbitLine.geometry.dispose(); orbitLine = null } }
  const hostScene = {
    title: 'Earth Orbit', group, bodies: [earthBody, moonBody], minD: .0035, maxD: 400, initD: 5.2, rate: 60, live: false, timeLabel: 'Simulated date', extent: 800,
    intro: 'Loading catalogue…', introRows: [],
    center: v => v.set(0, 0, 0),
    layers: [],
    async load(status) {
      status('downloading orbital elements from CelesTrak…');
      const d = await fetch('/api/sats').then(r => r.json()); sats = d.sats; cats = d.cats; fetched = d.fetched; N = sats.length;
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
      this.layers = cats.map((c, i) => ({ id: 'c' + i, label: c, color: CAT_HEX(CAT_COL[i]), count: cnt[i], on: true, apply: o => { visible[i] = o ? 1 : 0; mat.uniforms.uVis.value = visible.slice() } }));
      this.intro = 'Every active satellite, station and tracked piece of debris in the public CelesTrak catalogue, drawn at its real position for the date shown. Positions are propagated on the GPU from orbital elements, so accuracy is a few kilometres. Click any dot.';
      this.introRows = [['Objects', N.toLocaleString()], ['Catalogue fetched', fetched]];
    },
    update() {
      const jd = sim.jd; if (mat) mat.uniforms.uDays.value = jd - J2000;
      earthMesh.rotation.y = gmst(jd); clouds.rotation.y = gmst(jd) * 1.003;
      planetEcl('earth', jd, ecl); const l = Math.hypot(ecl[0], ecl[1], ecl[2]); eclToEqThree(-ecl[0] / l, -ecl[1] / l, -ecl[2] / l, sunDir); sunLight.position.copy(sunDir).multiplyScalar(100);
      const d = jd - J2000, Lm = (218.316 + 13.176396 * d) * D2R, Mm = (134.963 + 13.064993 * d) * D2R, F = (93.272 + 13.22935 * d) * D2R, lon = Lm + 6.289 * D2R * Math.sin(Mm), lat = 5.128 * D2R * Math.sin(F), dist = (385001 - 20905 * Math.cos(Mm)) / RE_KM;
      eclToEqThree(dist * Math.cos(lat) * Math.cos(lon), dist * Math.cos(lat) * Math.sin(lon), dist * Math.sin(lat), moonMesh.position);
      if (App.sel) { App.sel.getPos(tmp); mk.set(0, tmp.x, tmp.y, tmp.z, [1, 1, 1], 26) } else mk.hide(0);
    },
    onSelect(b) { clearOrbit(); if (b && b.idx != null) { const pts = [], per = TAU / e2[b.idx * 4 + 1] / 1440, o = [0, 0, 0], d0 = sim.jd - J2000; for (let i = 0; i <= 220; i++) { satPos(b.idx, d0 + per * i / 220, o); pts.push(new THREE.Vector3(o[0], o[1], o[2])) }
      orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6 })); group.add(orbitLine) } },
    pickCustom(mx, my) {
      if (!points) return null; const now = performance.now(), o = [0, 0, 0];
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
    extraLabels(emit) { if (!points) return; const o = [0, 0, 0], d = sim.jd - J2000; if (!visible[0]) return; for (const i of stationIdx) { satPos(i, d, o); emit(sats[i][0].replace(/\s*\(.*\)/, ''), tmp.set(o[0], o[1], o[2]), 'dim', 8) } emit('Moon', moonMesh.position, 'dim', 10) },
    search(q) { const out = []; for (let i = 0; i < N; i++) if (lower[i].includes(q)) { out.push({ label: sats[i][0], sub: cats[sats[i][3]], make: () => satBody(i) }); if (out.length > 14) break } return out },
  };
  return hostScene;
}
register('earth', 'Earth Orbit', earth);
