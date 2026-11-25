import * as THREE from 'three';
import { App, Markers, U, camera, glowSprite, register } from '@/engine';
import { TAU, mixc, rng } from '@/lib';
import type { Body, Info, Layer, Scene } from '@/types';
import { GALAXIES, type GalaxyDef } from './data';
import { makeGalaxyGeo } from './generator';
import { PHOTOS, photoFade } from './photos';
import { galaxyMat, rgb01, spinTime } from './shaders';

/** A soft round window, so a rectangular photograph fades into the dark instead of showing its edges. */
let vignette: THREE.CanvasTexture | null = null;
function vignetteTex() {
  if (vignette) return vignette;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, '#fff');
    grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  return (vignette = new THREE.CanvasTexture(c));
}

/* ---------------- cosmos ---------------- */
const ASSETS = 'assets/galaxies/';

function cosmos(): Scene {
  const group = new THREE.Group(),
    mats: THREE.ShaderMaterial[] = [],
    bodies: Body[] = [];
  /** Photographs on camera-facing sprites; they replace the generated stars from afar and give way up close. */
  const photos: {
    g: GalaxyDef;
    sprite: THREE.Sprite;
    pts: THREE.ShaderMaterial;
    glow: THREE.Sprite;
    alpha: number;
    glowAlpha: number;
  }[] = [];
  const loaded = new Set<string>();
  let photosOn = true;
  const R = rng(7),
    N = 1800,
    fp = new Float32Array(N * 3),
    fc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 170 + R() * 700,
      th = R() * TAU,
      ph = Math.acos(R() * 2 - 1),
      k = 0.35 + R() * 0.5;
    fp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    const c = mixc([255, 220, 190], [170, 200, 255], R());
    fc.set([(c[0] / 255) * k, (c[1] / 255) * k, (c[2] / 255) * k], i * 3);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  group.add(
    new THREE.Points(
      fg,
      new THREE.PointsMaterial({
        size: 1.8 * U.uPx.value,
        sizeAttenuation: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    ),
  );
  for (const g of GALAXIES) {
    const geo = makeGalaxyGeo(
      { ...g, bulge: (g.bulge || 0.2) + 0.1 },
      g.type === 'ell' ? 800 : 600,
      g.key.length * 131 + 7,
    );
    const irr = g.type === 'irr',
      mat = galaxyMat(g.R, irr ? 0.8 : 1.3, irr ? 0.3 : 0.8);
    mats.push(mat);
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.position.set(...g.pos);
    pts.rotation.set(g.tilt ? g.tilt[0] : 0, 0, g.tilt ? g.tilt[1] : 0, 'ZXY');
    const glow = glowSprite(rgb01(g.core), g.R * 1.4);
    glow.material.opacity = irr ? 0.22 : 0.55;
    glow.position.set(...g.pos);
    group.add(pts, glow);
    const photo = PHOTOS[g.key];
    if (photo) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          alphaMap: vignetteTex(),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          transparent: true,
          opacity: 0,
        }),
      );
      sprite.position.set(...g.pos);
      sprite.visible = false;
      new THREE.TextureLoader().load(
        ASSETS + photo.file,
        tex => {
          if (photo.crop) {
            const [x, y, w, h] = photo.crop;
            tex.repeat.set(w, h);
            tex.offset.set(x, 1 - y - h);
          }
          const iw = tex.image.width * (photo.crop?.[2] ?? 1),
            ih = tex.image.height * (photo.crop?.[3] ?? 1),
            w = g.R * photo.size;
          sprite.scale.set(w, (w * ih) / iw, 1);
          sprite.material.map = tex;
          sprite.material.needsUpdate = true;
          loaded.add(g.key);
        },
        undefined,
        () => undefined, // no photograph: the generated galaxy stays
      );
      sprite.renderOrder = 1;
      group.add(sprite);
      photos.push({ g, sprite, pts: mat, glow, alpha: mat.uniforms.uAlpha.value, glowAlpha: glow.material.opacity });
    }
    bodies.push({
      id: g.key,
      label: g.name,
      g,
      enter: 'gal:' + g.key,
      diveColor: `rgb(${g.core.join(',')})`,
      enterLabel: 'Fly inside',
      focusD: g.R * 4.2,
      minD: g.R * 1.2,
      radNow: g.R * 0.8,
      getPos(v: THREE.Vector3) {
        return v.set(...g.pos);
      },
      info: {
        sub: g.sub,
        text: g.text,
        ...(photo
          ? { rows: [[photo.illustration ? 'Illustration' : 'Photograph', photo.credit]] as [string, string][] }
          : {}),
      },
    });
  }
  return {
    title: 'Local Universe',
    group,
    bodies,
    minD: 10,
    maxD: 700,
    initD: 190,
    sky: false,
    rate: 1,
    extent: 1000,
    intro:
      'A map of famous galaxies near the Milky Way. Positions are schematic and distances heavily compressed. Select a galaxy to focus it, or just keep zooming in on one to fly inside.',
    center(v: THREE.Vector3) {
      return v.set(0, 0, 0);
    },
    layers: [
      {
        id: 'photos',
        label: 'Galaxy photographs and art',
        color: '#ffd6a0',
        on: true,
        apply: on => (photosOn = on),
      },
    ] as Layer[],
    update() {
      for (const m of mats) m.uniforms.uTime.value = spinTime();
      for (const p of photos) {
        const k =
          photosOn && loaded.has(p.g.key) ? photoFade(camera.position.distanceTo(p.sprite.position) / p.g.R) : 0;
        p.sprite.visible = k > 0.01;
        p.sprite.material.opacity = 0.92 * k;
        // the photograph stands in for the generated stars while it is showing
        p.pts.uniforms.uAlpha.value = p.alpha * (1 - 0.9 * k);
        p.glow.material.opacity = p.glowAlpha * (1 - 0.9 * k);
      }
    },
    search(q) {
      return bodies
        .filter(b => b.label.toLowerCase().includes(q))
        .map(b => ({ label: b.label, sub: b.g.sub.split(' · ')[0], make: () => b }));
    },
  };
}

/* ---------------- one galaxy up close ---------------- */
const RG = 60;
function galaxy(g: GalaxyDef): Scene {
  const group = new THREE.Group(),
    N = g.key === 'milkyway' ? 26000 : 18000;
  const geo = makeGalaxyGeo(g, N, g.key.length * 977 + 3),
    mat = galaxyMat(RG, 1.1, 0.8);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  group.add(pts);
  const core = glowSprite(rgb01(g.core), RG * 0.5);
  core.material.opacity = 0.5;
  group.add(core);
  const bodies: Body[] = [],
    mk = new Markers(2, true);
  group.add(mk.points);
  if (g.key === 'milkyway') {
    const mkb = (
      id: string,
      label: string,
      rho: number,
      ang0: number,
      col: number[],
      info: Info,
      extra: Partial<Body> = {},
    ): Body => ({
      id,
      label,
      rho,
      ang0,
      col,
      info,
      radNow: 1.2,
      focusD: 14,
      minD: 3,
      labelCls: '',
      getPos(v: THREE.Vector3) {
        const a = ang0 + spinTime() / (0.5 + rho);
        return v.set(rho * RG * Math.cos(a), 0, rho * RG * Math.sin(a));
      },
      ...extra,
    });
    bodies.push(
      mkb(
        'sun',
        'Sun · you are here',
        0.5,
        2.2,
        [1, 0.9, 0.55],
        {
          sub: 'Our star · ~26,000 ly from the centre',
          text: 'The Sun sits in the Orion Spur, a minor arm between two major spiral arms, and orbits the galaxy once every ~225 million years. Enter to see the stars nearest to us.',
        },
        { enter: 'starmap', enterLabel: 'Enter the star map', diveColor: '#ffe8a0' },
      ),
    );
    bodies.push(
      mkb('sgra', 'Sagittarius A*', 0, 0, [1, 0.65, 0.4], {
        sub: 'Supermassive black hole',
        text: 'A black hole of about 4 million solar masses sits at the very centre of the Milky Way, ringed by a dense cluster of ancient stars.',
      }),
    );
  }
  const tmp = new THREE.Vector3();
  return {
    title: g.name,
    group,
    bodies,
    minD: 6,
    maxD: 420,
    exitD: 300,
    initD: 150,
    rate: 1,
    extent: 400,
    intro: g.text + (g.key === 'milkyway' ? ' Find the Sun and zoom in on it (or use Enter) to go closer.' : ''),
    introRows: [['Type', g.sub]],
    center(v: THREE.Vector3) {
      return v.set(0, 0, 0);
    },
    update() {
      mat.uniforms.uTime.value = spinTime();
      bodies.forEach((b, i) => {
        b.getPos(tmp);
        mk.set(i, tmp.x, tmp.y, tmp.z, b.col, App.sel === b ? 46 : 30);
      });
    },
    search(q) {
      return bodies.filter(b => b.label.toLowerCase().includes(q)).map(b => ({ label: b.label, make: () => b }));
    },
  };
}

register('cosmos', 'Local Universe', cosmos);
for (const g of GALAXIES) register('gal:' + g.key, g.name, () => galaxy(g));
