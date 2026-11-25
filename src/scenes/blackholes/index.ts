import * as THREE from 'three';
import { camera, register } from '@/engine';
import { showView } from '@/engine/navigate';
import { prefersReducedMotion } from '@/lib';
import type { Body, Layer, Scene } from '@/types';
import {
  EHT_IMAGES,
  OBJECTS,
  fmtDistance,
  fmtLength,
  fmtMass,
  layoutX,
  reach,
  schwarzschildKm,
  type CompactObject,
} from './data';
import { blackHoleMat, ehtMat, pulsarMat } from './shaders';

const GAP = 14,
  ASSETS = 'assets/blackholes/';

function blackholes(): Scene {
  const group = new THREE.Group(),
    quad = new THREE.PlaneGeometry(2, 2),
    xs = layoutX(OBJECTS.map(reach), GAP),
    bodies: Body[] = [],
    mats: THREE.ShaderMaterial[] = [],
    /** The pictures that always face the camera, with the pair that orbit each other */
    faces: THREE.Mesh[] = [],
    pair: { mesh: THREE.Mesh; sign: number }[] = [],
    ehtMeshes: THREE.Mesh[] = [];
  let t = 0,
    ehtOn = true;

  OBJECTS.forEach((o, i) => {
    const x = xs[i];
    if (o.kind === 'pulsar') {
      const mat = pulsarMat(o.disc[0]),
        m = new THREE.Mesh(quad, mat);
      m.scale.setScalar(reach(o));
      m.position.set(x, 0, 0);
      mats.push(mat);
      faces.push(m);
      group.add(m);
    } else if (o.kind === 'merger') {
      for (const sign of [1, -1]) {
        const mat = blackHoleMat(o.disc[0], o.disc[1], o.tilt, sign * 1.7),
          m = new THREE.Mesh(quad, mat);
        m.scale.setScalar(o.draw * 9);
        mats.push(mat);
        faces.push(m);
        pair.push({ mesh: m, sign });
        group.add(m);
      }
    } else {
      const mat = blackHoleMat(o.disc[0], o.disc[1], o.tilt, i * 2.3),
        m = new THREE.Mesh(quad, mat);
      m.scale.setScalar(o.draw * 9);
      m.position.set(x, 0, 0);
      mats.push(mat);
      faces.push(m);
      group.add(m);
    }
    bodies.push(makeBody(o, x));
  });

  // the real pictures hang beneath the drawings of the same black holes, ring for ring at the same size
  for (const e of EHT_IMAGES) {
    const i = OBJECTS.findIndex(o => o.id === e.of),
      o = OBJECTS[i],
      half = (5.56 * o.draw) / e.ringFrac / 2,
      y = -(reach(o) + half * 0.8),
      mat = ehtMat(),
      m = new THREE.Mesh(quad, mat);
    m.scale.setScalar(half);
    m.position.set(xs[i], y, 0);
    m.visible = false;
    new THREE.TextureLoader().load(
      ASSETS + e.file,
      tex => {
        mat.uniforms.uMap.value = tex;
        m.visible = ehtOn;
      },
      undefined,
      () => undefined, // no picture: the drawing stays
    );
    ehtMeshes.push(m);
    faces.push(m);
    group.add(m);
    bodies.push({
      id: e.id,
      label: e.name,
      radNow: half * 0.6,
      focusD: half * 3,
      minD: half * 0.5,
      diveColor: '#000',
      getPos(v: THREE.Vector3) {
        return v.set(xs[i], y, 0);
      },
      info: {
        sub: e.sub,
        text: e.text,
        rows: [
          ['Picture', e.credit],
          ['Of', o.name],
        ],
      },
    });
  }

  return {
    title: 'Black Holes',
    group,
    bodies,
    layers: [
      {
        id: 'eht',
        label: 'Real Event Horizon Telescope images',
        color: '#ff9a4a',
        on: true,
        apply: on => {
          ehtOn = on;
          for (const m of ehtMeshes) m.visible = on && !!(m.material as THREE.ShaderMaterial).uniforms.uMap.value;
        },
      },
    ] as Layer[],
    minD: 4,
    maxD: 900,
    initD: 460,
    extent: 800,
    rate: 1,
    intro:
      'The most extreme objects known, drawn side by side from small to huge. Each picture is an illustration of how the glowing gas around it would look: the dark shadow, the bright ring, and the far side of the disc bent over the top by gravity. Sizes are not to scale; the real horizon radius is in each object’s info. Under two of them hangs the real radio picture of the same black hole.',
    center(v: THREE.Vector3) {
      return v.set(0, 0, 0);
    },
    update(dt: number) {
      t += prefersReducedMotion() ? dt * 0.1 : dt;
      for (const m of mats) m.uniforms.uTime.value = t;
      for (const m of faces) m.quaternion.copy(camera.quaternion);
      // the two black holes of GW150914 circle each other, closing in until they merge, then it starts again
      const i = OBJECTS.findIndex(o => o.kind === 'merger'),
        cycle = (t % 14) / 14,
        sep = 8 * (1 - cycle ** 3 * 0.85),
        ang = t * (0.9 + 5 * cycle ** 3);
      for (const { mesh, sign } of pair)
        mesh.position.set(xs[i] + sign * sep * Math.cos(ang), sign * sep * Math.sin(ang) * 0.35, 0);
    },
    search(q) {
      return bodies
        .filter(b => b.label.toLowerCase().includes(q))
        .map(b => ({ label: b.label, sub: b.info?.sub?.split(' · ')[0], make: () => b }));
    },
  };
}

function makeBody(o: CompactObject, x: number): Body {
  const rows: [string, string][] = [['Mass', fmtMass(o.mass)]];
  if (o.kind !== 'pulsar')
    rows.push([o.kind === 'merger' ? 'Horizon after merging' : 'Horizon radius', fmtLength(schwarzschildKm(o.mass))]);
  rows.push(['Distance', fmtDistance(o.distanceLy)], ...o.facts);
  return {
    id: o.id,
    label: o.name,
    radNow: reach(o) * 0.55,
    focusD: reach(o) * 3.2,
    minD: o.draw * 3,
    diveColor: '#000',
    getPos(v: THREE.Vector3) {
      return v.set(x, 0, 0);
    },
    info: { sub: o.sub, text: o.text, rows },
    action: o.home ? { label: o.home.label, run: () => showView({ scene: o.home!.scene, sel: o.home!.sel }) } : null,
  };
}

register('blackholes', 'Black Holes', blackholes);
