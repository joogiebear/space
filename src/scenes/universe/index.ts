import * as THREE from 'three';
import { App, Markers, U, register } from '@/engine';
import { mixc, rng } from '@/lib';
import type { Body, Layer, Scene } from '@/types';
import { EDGE_GLY, RINGS, RMAX, STRUCTURES, dirOf, mapRadius } from './data';

/**
 * A cosmic web made to look like the real one: clusters (nodes) joined by filaments, with big empty voids between. It is
 * generated, not a map of real galaxies. Each point is placed at a real-looking light-travel distance and then drawn on the
 * logarithmic radius scale in data.ts.
 */
function makeWeb(seed: number) {
  const R = rng(seed),
    gauss = () => (R() + R() + R() + R() - 2) * 1.7,
    nodes: THREE.Vector3[] = [];
  // clusters spread through space in proportion to volume, so most are far away, as in the real universe
  for (let i = 0; i < 190; i++) {
    const d = EDGE_GLY * Math.cbrt(R()),
      u = R() * 2 - 1,
      a = R() * Math.PI * 2,
      s = Math.sqrt(1 - u * u);
    nodes.push(new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(d));
  }
  // our own neighbourhood is richer than random sampling would give it
  for (const [az, el, d] of [
    [95, 14, 0.054],
    [200, -18, 0.2],
    [320, 38, 0.32],
    [160, -30, 0.65],
    [265, 28, 1.0],
  ])
    nodes.push(new THREE.Vector3(...dirOf(az, el)).multiplyScalar(d));

  const pts: number[] = [],
    cols: number[] = [],
    push = (p: THREE.Vector3) => {
      const d = p.length();
      if (d < 1e-4 || d > EDGE_GLY) return;
      const k = mapRadius(d) / d,
        far = d / EDGE_GLY,
        c = mixc([205, 225, 255], [255, 150, 95], far),
        b = (0.5 + R() * 0.5) * (1 - 0.35 * far);
      pts.push(p.x * k, p.y * k, p.z * k);
      cols.push((c[0] / 255) * b, (c[1] / 255) * b, (c[2] / 255) * b);
    };
  const tmp = new THREE.Vector3();
  nodes.forEach((n, i) => {
    // a clump at the node
    const size = 0.04 + 0.1 * (n.length() / EDGE_GLY);
    for (let k = 0; k < 55; k++) push(tmp.set(gauss(), gauss(), gauss()).multiplyScalar(size).add(n));
    // filaments to the two nearest other nodes
    const near = nodes
      .map((m, j) => ({ j, d: m.distanceTo(n) }))
      .filter(x => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j, d } of near) {
      if (j < i && R() < 0.5) continue; // most pairs would be drawn twice
      const m = nodes[j],
        count = Math.round(20 + d * 34),
        spread = 0.035 + 0.04 * (n.length() / EDGE_GLY),
        // filaments are not straight: bow each one sideways by a random amount
        bow = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(d * 0.22),
        a = new THREE.Vector3();
      for (let k = 0; k < count; k++) {
        const t = R(),
          w = 4 * t * (1 - t);
        push(
          a
            .copy(n)
            .lerp(m, t)
            .addScaledVector(bow, w)
            .add(tmp.set(gauss(), gauss(), gauss()).multiplyScalar(spread * (0.6 + d / 3))),
        );
      }
    }
  });
  // a faint scatter of field galaxies between the filaments, thinning out where the voids are
  for (let k = 0; k < 5000; k++) {
    const d = EDGE_GLY * Math.cbrt(R()),
      u = R() * 2 - 1,
      ang = R() * Math.PI * 2,
      sq = Math.sqrt(1 - u * u);
    push(tmp.set(sq * Math.cos(ang), u, sq * Math.sin(ang)).multiplyScalar(d));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  return g;
}

function ring(radius: number, color: number) {
  const pos: number[] = [];
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    pos.push(radius * Math.cos(a), 0, radius * Math.sin(a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  const l = new THREE.LineLoop(
    g,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, depthTest: false }),
  );
  l.renderOrder = 1;
  return l;
}

function universe(): Scene {
  const group = new THREE.Group(),
    web = new THREE.Points(
      makeWeb(31),
      new THREE.PointsMaterial({
        size: 1.7 * U.uPx.value,
        sizeAttenuation: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    ),
    shells = new THREE.Group(),
    // the edge of what we can see: a faint glowing shell seen from inside
    edge = new THREE.Mesh(
      new THREE.SphereGeometry(RMAX * 1.02, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff7a3a,
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    );
  web.frustumCulled = false;
  for (const r of RINGS) shells.add(ring(mapRadius(r.gly), 0x6f86d8));
  shells.add(ring(RMAX, 0xff9a5a));
  group.add(web, shells, edge);

  const mk = new Markers(STRUCTURES.length + RINGS.length, true),
    bodies: Body[] = [];
  group.add(mk.points);
  for (const s of STRUCTURES) {
    const d = dirOf(...s.dir),
      r = mapRadius(s.gly);
    bodies.push({
      id: s.id,
      label: s.name,
      col: s.id === 'cmb' ? [1, 0.55, 0.3] : [0.8, 0.9, 1],
      radNow: 7,
      focusD: s.id === 'cmb' ? 260 : 90,
      minD: 8,
      diveColor: '#cfd8ff',
      getPos(v: THREE.Vector3) {
        return v.set(d[0] * r, d[1] * r, d[2] * r);
      },
      info: {
        sub: s.sub,
        text: s.text,
        rows: s.rows ?? [['Light travelled', s.gly ? `about ${fmtGly(s.gly)}` : 'none: this is us']],
      },
      ...(s.id === 'you' || s.id === 'localgroup' ? { enter: 'cosmos', enterLabel: 'Enter the Local Universe' } : {}),
    });
  }
  // the rings are labelled so the distance scale can be read
  RINGS.forEach((ringDef, i) => {
    const r = mapRadius(ringDef.gly),
      d = dirOf(18 + i * 40, 4);
    bodies.push({
      id: 'ring' + i,
      label: ringDef.label,
      col: [0.45, 0.55, 0.9],
      labelCls: '',
      radNow: 4,
      focusD: 160,
      minD: 8,
      getPos(v: THREE.Vector3) {
        return v.set(d[0] * r, d[1] * r, d[2] * r);
      },
      info: {
        sub: 'A ring at this distance from us',
        text: `Everything on this ring is ${ringDef.label} away, as light travels. The scale is squeezed so near things get room: each ring is ten times further than the last, but drawn only a steady step further out.`,
      },
    });
  });

  const tmp = new THREE.Vector3();
  let webOn = true,
    shellsOn = true;
  return {
    title: 'Observable Universe',
    group,
    bodies,
    layers: [
      { id: 'web', label: 'Cosmic web (schematic)', color: '#9db8ff', on: true, apply: on => (webOn = on) },
      { id: 'shells', label: 'Distance rings and the edge', color: '#ff9a5a', on: true, apply: on => (shellsOn = on) },
    ] as Layer[],
    minD: 12,
    maxD: 1100,
    initD: 900,
    extent: 900,
    rate: 1,
    sky: false,
    intro:
      'Everything we can see, out to the oldest light. The farther you look the further back in time you see, so the outer edge is the early universe. Distance is squeezed on a log scale, with rings at 100 million, 1 billion and 10 billion light years. The web of filaments is schematic: made to look like the real thing, not a map of real galaxies.',
    center(v: THREE.Vector3) {
      return v.set(0, 0, 0);
    },
    update() {
      web.visible = webOn;
      shells.visible = shellsOn;
      edge.visible = shellsOn;
      bodies.forEach((b, i) => {
        b.getPos(tmp);
        mk.set(i, tmp.x, tmp.y, tmp.z, b.col, App.sel === b ? 40 : 22);
      });
    },
    search(q) {
      return bodies
        .filter(b => b.label.toLowerCase().includes(q))
        .map(b => ({ label: b.label, sub: b.info?.sub?.split(' · ')[0], make: () => b }));
    },
  };
}

/** Billions of light years in words: "2.4 billion light years", "54 million light years". */
function fmtGly(g: number) {
  if (g >= 1) return `${g % 1 ? g.toFixed(1) : g} billion light years`;
  return `${Math.round(g * 1000)} million light years`;
}

register('universe', 'Observable Universe', universe);
