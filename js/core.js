import * as THREE from 'three';
import { clamp, nowJD, fmtDate } from './util.js';
export { THREE };
export const $ = s => document.querySelector(s);

THREE.ColorManagement.enabled = false;
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
renderer.setClearColor(0x010208, 1);
$('#gl').appendChild(renderer.domElement);
export const camera = new THREE.PerspectiveCamera(50, 1, .0001, 1e5);
export const world = new THREE.Scene();
const skyScene = new THREE.Scene(), skyCam = new THREE.PerspectiveCamera(50, 1, .1, 100);
export const U = { uPx: { value: 1 }, uF: { value: 800 } };
export const sim = { jd: nowJD(), rate: 1, paused: false, live: true, gt: 0 };
export const cam = { yaw: .6, pitch: .5, dist: 10, want: 10, t: new THREE.Vector3(), off: new THREE.Vector3() };
export const App = { scene: null, sel: null, hover: null, path: [], interact: 0, W: 1, H: 1 };

/* ---------------- sizing ---------------- */
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  App.W = innerWidth; App.H = innerHeight;
  renderer.setPixelRatio(dpr); renderer.setSize(App.W, App.H);
  camera.aspect = skyCam.aspect = App.W / App.H;
  U.uPx.value = dpr; U.uF.value = App.H * .5 / Math.tan(camera.fov * Math.PI / 360);
  camera.updateProjectionMatrix(); skyCam.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------------- helpers for scenes ---------------- */
const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
{ const g = glowCanvas.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
export const glowTex = new THREE.CanvasTexture(glowCanvas);
export function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, 1); return s;
}
/** constant-pixel-size glowing / ring markers */
export class Markers {
  constructor(n, ring = false) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3); this.col = new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3);
    this.size = new THREE.BufferAttribute(new Float32Array(n), 1);
    g.setAttribute('position', this.pos); g.setAttribute('aCol', this.col); g.setAttribute('aSize', this.size);
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: U.uPx, uRing: { value: ring ? 1 : 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute vec3 aCol;attribute float aSize;uniform float uPx;varying vec3 vC;void main(){vC=aCol;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPx;}',
      fragmentShader: 'uniform float uRing;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float g=pow(1.-d,2.2);float r=smoothstep(.62,.7,d)*(1.-smoothstep(.9,1.,d));float a=uRing>.5?r+g*.25:g;gl_FragColor=vec4(vC,a);}'
    });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 5;
  }
  set(i, x, y, z, col, size) {
    this.pos.setXYZ(i, x, y, z); this.col.setXYZ(i, col[0], col[1], col[2]); this.size.setX(i, size);
    this.pos.needsUpdate = this.col.needsUpdate = this.size.needsUpdate = true;
  }
  hide(i) { this.size.setX(i, 0); this.size.needsUpdate = true }
}

/* ---------------- sky ---------------- */
{ const N = 2500, p = new Float32Array(N * 3), c = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * 6.2832, s = Math.sqrt(1 - u * u), k = .25 + Math.random() * .6;
    p.set([s * Math.cos(t) * 50, u * 50, s * Math.sin(t) * 50], i * 3);
    const w = Math.random(); c.set([k * (.8 + .2 * w), k * (.85 + .1 * w), k], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  var skyPts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6 * Math.min(devicePixelRatio || 1, 2), sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
  skyScene.add(skyPts);
}

/* ---------------- labels ---------------- */
const labEl = $('#labels'), labPool = []; let labUsed = 0; const lv = new THREE.Vector3();
export function emitLabel(text, pos, cls = '', dx = 10) {
  if (labUsed > 170) return;
  lv.copy(pos).project(camera);
  if (lv.z > 1 || lv.z < -1 || Math.abs(lv.x) > 1.05 || Math.abs(lv.y) > 1.05) return;
  let el = labPool[labUsed];
  if (!el) { el = document.createElement('div'); el.className = 'lb'; labEl.appendChild(el); labPool.push(el); el._t = ''; el._c = '' }
  labUsed++;
  if (el._t !== text) { el.textContent = text; el._t = text }
  const c = 'lb ' + cls; if (el._c !== c) { el.className = c; el._c = c }
  el.style.display = 'block';
  el.style.transform = `translate(${((lv.x * .5 + .5) * App.W + dx).toFixed(1)}px,${((-lv.y * .5 + .5) * App.H - 8).toFixed(1)}px)`;
}
function labelsBegin() { labUsed = 0 }
function labelsEnd() { for (let i = labUsed; i < labPool.length; i++) { if (labPool[i].style.display !== 'none') labPool[i].style.display = 'none' } }

/* ---------------- UI ---------------- */
let toastTimer;
export function toast(msg, sub = '', ms = 0) {
  const t = $('#toast'); t.innerHTML = msg + (sub ? `<small>${sub}</small>` : ''); t.style.display = 'block';
  clearTimeout(toastTimer); if (ms) toastTimer = setTimeout(() => t.style.display = 'none', ms);
}
export const hideToast = () => $('#toast').style.display = 'none';

export function showInfo(b) {
  const sc = App.scene, i = b ? (b.getInfo ? b.getInfo() : b.info) : { sub: '', text: sc.intro, rows: sc.introRows };
  $('#iT').textContent = b ? b.label : sc.title; $('#iS').textContent = i.sub || ''; $('#iP').textContent = i.text || '';
  const rows = $('#rows'); rows.innerHTML = '';
  for (const [k, v] of i.rows || []) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; rows.append(dt, dd) }
  const a = $('#act'), act = b && b.action; a.style.display = act ? 'inline-block' : 'none'; if (act) a.textContent = typeof act.label === 'function' ? act.label() : act.label;
  const e = $('#enter'); e.style.display = b && b.enter ? 'inline-block' : 'none';
  if (b && b.enter) e.textContent = (b.enterLabel || 'Enter') + ' ›';
  document.querySelectorAll('#list button').forEach(x => x.classList.toggle('sel', !!b && x.dataset.id === b.id));
}
export function select(b) {
  App.sel = b; cam.want = b.focusD || cam.want; showInfo(b);
  App.scene.onSelect?.(b);
}
export function deselect() { if (!App.sel) return; App.scene.onSelect?.(null); App.sel = null; cam.want = App.scene.initD; showInfo(null) }
$('#act').onclick = () => { const a = App.sel && App.sel.action; if (a) Promise.resolve(a.run()).then(() => showInfo(App.sel)) };
$('#enter').onclick =() => { if (App.sel && App.sel.enter) openScene(App.sel.enter) };

function buildList() {
  const el = $('#list'); el.innerHTML = '';
  const add = (b, sub) => { const x = document.createElement('button'); x.textContent = b.label; if (sub) x.className = 'sub'; x.dataset.id = b.id; x.onclick = () => select(b); el.appendChild(x) };
  for (const b of App.scene.bodies || []) { if (b.parentBody) continue; add(b); for (const m of b.moons || []) add(m, true) }
}
function buildLayers() {
  const el = $('#layers'); el.innerHTML = '';
  const ls = App.scene.layers || []; if (!ls.length) return;
  const h = document.createElement('h4'); h.textContent = 'Layers'; el.appendChild(h);
  for (const L of ls) {
    const lab = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = L.on;
    cb.onchange = () => { L.on = cb.checked; L.apply(L.on) };
    lab.appendChild(cb);
    if (L.color) { const i = document.createElement('i'); i.style.background = L.color; lab.appendChild(i) }
    lab.appendChild(document.createTextNode(L.label));
    if (L.count != null) { const s = document.createElement('span'); s.textContent = L.count.toLocaleString(); lab.appendChild(s) }
    el.appendChild(lab);
  }
}
const REG = {}, cache = {};
export function register(id, title, factory) { REG[id] = { title, factory } }
const PARENT = id => id === 'cosmos' ? null : id.startsWith('gal:') ? 'cosmos' : id === 'starmap' ? 'gal:milkyway' : id === 'solar' ? 'starmap' : id === 'earth' ? 'solar' : null;
export const chain = id => { const c = []; for (let x = id; x; x = PARENT(x)) c.unshift(x); return c };
const TABS = [['cosmos', 'Galaxies'], ['gal:milkyway', 'Milky Way'], ['starmap', 'Star Map'], ['solar', 'Solar System'], ['earth', 'Earth Orbit']];
function buildNav() {
  const cr = $('#crumbs'); cr.innerHTML = '';
  App.path.forEach((id, i) => {
    const b = document.createElement('button'); b.className = 'crumb' + (i === App.path.length - 1 ? ' cur' : ''); b.textContent = REG[id].title; b.onclick = () => i < App.path.length - 1 && goScene(id, { deeper: false });
    cr.appendChild(b); if (i < App.path.length - 1) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '›'; cr.appendChild(s) }
  });
  const tb = $('#tabs'); tb.innerHTML = '';
  for (const [id, label] of TABS) { const b = document.createElement('button'); b.className = 'tab' + (App.scene.id === id ? ' on' : ''); b.textContent = label; b.onclick = () => goScene(id, { deeper: chain(id).length > App.path.length }); tb.appendChild(b) }
}

/* search */
const qEl = $('#q'), resEl = $('#results');
qEl.addEventListener('input', () => {
  const q = qEl.value.trim().toLowerCase(); resEl.innerHTML = '';
  if (q.length < 2) { resEl.classList.remove('open'); return }
  const rs = App.scene.search ? App.scene.search(q) : [];
  for (const r of rs.slice(0, 14)) { const b = document.createElement('button'); b.innerHTML = ''; b.append(r.label); if (r.sub) { const s = document.createElement('small'); s.textContent = r.sub; b.append(s) }
    b.onclick = () => { const body = r.make(); if (body) select(body); resEl.classList.remove('open'); qEl.value = '' }; resEl.appendChild(b) }
  resEl.classList.toggle('open', rs.length > 0);
});
qEl.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { qEl.value = ''; resEl.classList.remove('open'); qEl.blur() } if (e.key === 'Enter') resEl.querySelector('button')?.click() });

/* time controls */
const rateFmt = r => r < 1000 ? '×' + Math.round(r) : r < 86400 * 365 ? `×${Math.round(r).toLocaleString()}  (${(r / 86400).toFixed(r < 864000 ? 1 : 0)} d/s)` : `×${(r / 1e6).toFixed(1)}M  (${(r / 86400 / 365.25).toFixed(1)} yr/s)`;
function setRate(r, fromSlider) {
  sim.rate = r; if (!fromSlider) $('#speed').value = clamp(100 * Math.log10(Math.max(r, 1)) / 8, 0, 100);
  $('#rateTxt').textContent = rateFmt(r);
}
$('#speed').oninput = e => { sim.live = false; setRate(Math.pow(10, +e.target.value / 100 * 8), true) };
$('#pause').onclick = togglePause;
function togglePause() { sim.paused = !sim.paused; $('#pause').textContent = sim.paused ? 'Play' : 'Pause' }
$('#live').onclick = () => { sim.jd = nowJD(); sim.live = true; sim.paused = false; $('#pause').textContent = 'Pause'; setRate(1) };

/* ---------------- scene manager ---------------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let busy = false;
export const openScene = id => goScene(id, { deeper: true });
export const goUp = () => { const p = PARENT(App.scene.id); if (p) goScene(p, { deeper: false }) };
export async function goScene(id, { deeper = true, instant = false } = {}) {
  if (busy || !REG[id]) return; busy = true;
  const f = $('#fade'); if (!instant) { f.style.opacity = 1; await sleep(360) }
  const prev = App.scene; if (prev) { prev.leave?.(); world.remove(prev.group) }
  const sc = cache[id] || (cache[id] = REG[id].factory()); sc.id = id;
  App.scene = sc; App.sel = null; App.hover = null; App.path = chain(id);
  $('#tip').style.display = 'none';
  if (sc.load && !sc.loaded) {
    toast('Loading ' + sc.title + '…', 'first visit downloads live data');
    try { await sc.load(msg => toast('Loading ' + sc.title + '…', msg)) } catch (e) { console.error(e); toast('Some data failed to load', String(e).slice(0, 120), 4000) }
    sc.loaded = true; if (!$('#toast').innerHTML.includes('failed')) hideToast();
  }
  world.add(sc.group); sc.enter?.();
  sc.center(cam.t); cam.off.set(0, 0, 0); cam.want = sc.initD; cam.dist = instant ? sc.initD : sc.initD * (deeper ? 2.4 : .45); cam.pitch = .5;
  skyPts.visible = sc.sky !== false;
  if (sc.rate != null) { setRate(sc.rate); sim.live = !!sc.live; if (sc.live) sim.jd = nowJD() }
  $('#dateLbl').textContent = sc.timeLabel || 'Date';
  buildNav(); buildList(); buildLayers(); showInfo(null); qEl.value = ''; resEl.classList.remove('open');
  try { history.replaceState(null, '', '#' + id) } catch (e) { }
  f.style.opacity = 0; busy = false;
}

/* ---------------- picking + input ---------------- */
const pv = new THREE.Vector3();
export function screenOf(v, out) {
  pv.copy(v).project(camera); out.x = (pv.x * .5 + .5) * App.W; out.y = (-pv.y * .5 + .5) * App.H; out.z = pv.z; return pv.z > -1 && pv.z < 1;
}
const sp = { x: 0, y: 0, z: 0 }, bp = new THREE.Vector3();
export function pickAt(mx, my, click) {
  const sc = App.scene; let best = null, bz = 1e9;
  for (const b of sc.bodies || []) {
    if (sc.isHidden && sc.isHidden(b)) continue;
    b.getPos(bp); if (!screenOf(bp, sp)) continue;
    const rpx = Math.max(b.radNow ? b.radNow * U.uF.value / camera.position.distanceTo(bp) : 0, 12);
    if (Math.hypot(sp.x - mx, sp.y - my) <= rpx && sp.z < bz) { best = b; bz = sp.z }
  }
  return best || (sc.pickCustom ? sc.pickCustom(mx, my, click) : null);
}
const gl = $('#gl'), el = renderer.domElement, ptrs = new Map(); let down = null, pinch = 0, hoverT = 0;
el.addEventListener('pointerdown', e => {
  el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, moved: false }; gl.classList.add('drag');
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y) }
});
el.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  const tip = $('#tip');
  if (!p) {
    const now = performance.now(); if (now - hoverT > 70) { hoverT = now; const h = pickAt(e.clientX, e.clientY, false); App.hover = h; gl.classList.toggle('hover', !!h);
      if (h) { tip.textContent = h.label; tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 12 + 'px' } else tip.style.display = 'none' }
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; tip.style.display = 'none';
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) zoomBy(pinch / d); pinch = d; if (down) down.moved = true; return }
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
  if (down && down.moved) { cam.yaw -= dx * .0055; cam.pitch = clamp(cam.pitch + dy * .0055, -1.5, 1.5); App.interact = performance.now() }
});
el.addEventListener('pointerup', e => {
  ptrs.delete(e.pointerId); gl.classList.remove('drag'); pinch = 0;
  if (down && !down.moved && ptrs.size === 0) { const h = pickAt(e.clientX, e.clientY, true); if (h) select(h); else deselect() }
  down = null;
});
el.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); down = null; gl.classList.remove('drag') });
el.addEventListener('dblclick', e => { const h = pickAt(e.clientX, e.clientY, true); if (h && h.enter) { select(h); openScene(h.enter) } });
el.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0013))) }, { passive: false });
export function zoomBy(k) { const lo = App.sel && App.sel.minD || App.scene.minD; cam.want = clamp(cam.want * k, lo, App.scene.maxD); App.interact = performance.now() }
addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'Backspace') { if (App.sel) deselect(); else goUp() }
  else if (e.key === ' ') { e.preventDefault(); togglePause() }
  else if (e.key === '/') { e.preventDefault(); qEl.focus() }
});

/* ---------------- main loop ---------------- */
const tgt = new THREE.Vector3(); let lastSel = undefined, last = performance.now(), infoT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const sc = App.scene; if (!sc || busy && !sc.group.parent) { return }
  if (!sim.paused) {
    if (sim.live && sim.rate === 1) sim.jd = nowJD(); else sim.jd += sim.rate * dt / 86400;
    sim.gt += dt * Math.min(sim.rate, 300);
  }
  sc.update(dt);
  // camera follow
  if (App.sel) App.sel.getPos(tgt); else sc.center(tgt);
  if (lastSel !== App.sel) { cam.off.copy(cam.t).sub(tgt); lastSel = App.sel }
  cam.off.multiplyScalar(Math.exp(-dt * 6)); cam.t.copy(tgt).add(cam.off);
  const lo = App.sel && App.sel.minD || sc.minD; cam.want = clamp(cam.want, lo, sc.maxD);
  cam.dist *= Math.pow(cam.want / cam.dist, 1 - Math.exp(-dt * 4.5));
  if ($('#tAuto').checked && !down && now - App.interact > 2500) cam.yaw += dt * .04;
  const cp = Math.cos(cam.pitch);
  camera.position.set(cam.t.x + cam.dist * cp * Math.sin(cam.yaw), cam.t.y + cam.dist * Math.sin(cam.pitch), cam.t.z + cam.dist * cp * Math.cos(cam.yaw));
  camera.lookAt(cam.t);
  camera.near = Math.max(cam.dist * .0015, 1e-9); camera.far = cam.dist * 3000 + (sc.extent || 0); camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  skyCam.quaternion.copy(camera.quaternion);
  // labels
  labelsBegin();
  if ($('#tLab').checked || App.sel) {
    for (const b of sc.bodies || []) {
      if (sc.isHidden && sc.isHidden(b) || b.noLabel) continue;
      const isSel = App.sel === b, isHov = App.hover === b; if (!$('#tLab').checked && !isSel && !isHov) continue;
      b.getPos(bp); emitLabel(b.label, bp, (isSel ? 'sel ' : '') + (isHov ? 'hov ' : '') + (b.labelCls || ''), Math.max(8, b.radNow ? Math.min(60, b.radNow * U.uF.value / camera.position.distanceTo(bp)) : 8) + 6);
    }
    if ($('#tLab').checked) sc.extraLabels?.(emitLabel);
  }
  labelsEnd();
  if (now - infoT > 500) { infoT = now; if (App.sel && App.sel.live) showInfo(App.sel); $('#dateTxt').textContent = sc.timeLabel ? fmtDate(sim.jd) : fmtDate(sim.jd).slice(0, 10) }
  renderer.clear(); if (skyPts.visible) renderer.render(skyScene, skyCam); renderer.clearDepth(); renderer.render(world, camera);
}
export function start() { setRate(sim.rate); requestAnimationFrame(frame) }
export { setRate };
