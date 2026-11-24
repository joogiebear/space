import * as THREE from 'three';
import { App, Markers, U, cam, camera, register, sim } from '@/engine';
import { setFov } from '@/engine/gl';
import {
  D2R,
  TAU,
  applyMat,
  clamp,
  compass16,
  findRiseSet,
  jdToDate,
  moonEq,
  moonPhase,
  planetMagnitude,
  planetSky,
  skyAppearance,
  skyMatrix,
  starSizePx,
  sunEq,
  twilightName,
  altAzOf,
  type Vec3,
} from '@/lib';
import { loadStarSky, type StarSky } from '@/data/stars';
import { askLocation, loadLocation, saveLocation, type Loc } from '../earth/location';
import type { Body, EmitLabel, Info, InfoRows, Layer, Scene, SearchResult } from '@/types';
import { createSkySatellites } from './satellites';
import { DOME_FS, DOME_VS, GROUND_FS, MOON_FS, MOON_VS, STAR_FS, STAR_VS } from './shaders';

/** Radius of the celestial sphere in scene units. The camera sits at its centre (within about a unit of it). */
const R = 300;
const GREENWICH: Loc = { lat: 51.4769, lon: -0.0005 };
const TEX = 'assets/tex/';
/** The Moon and Sun are drawn this many times larger than life so they read on a screen; planets are dots anyway. */
const DISC_SCALE = 2.5;

const PLANETS: { id: string; label: string; color: [number, number, number]; naked: boolean; text: string }[] = [
  {
    id: 'mercury',
    label: 'Mercury',
    color: [0.78, 0.74, 0.7],
    naked: true,
    text: 'Always close to the Sun, so look low in the west after sunset or low in the east before sunrise.',
  },
  {
    id: 'venus',
    label: 'Venus',
    color: [1, 0.94, 0.78],
    naked: true,
    text: 'The brightest planet, the “morning” or “evening star”. It never strays more than 47° from the Sun.',
  },
  {
    id: 'mars',
    label: 'Mars',
    color: [1, 0.55, 0.36],
    naked: true,
    text: 'The red planet. It is at its brightest every two years or so, when Earth overtakes it.',
  },
  {
    id: 'jupiter',
    label: 'Jupiter',
    color: [1, 0.9, 0.75],
    naked: true,
    text: 'Steady and brilliant. Binoculars show its four large moons as a line of tiny dots.',
  },
  {
    id: 'saturn',
    label: 'Saturn',
    color: [0.95, 0.86, 0.62],
    naked: true,
    text: 'A pale gold point. Its rings need a small telescope to see.',
  },
  {
    id: 'uranus',
    label: 'Uranus',
    color: [0.62, 0.9, 0.93],
    naked: false,
    text: 'Just at the limit of naked-eye visibility under very dark skies; binoculars make it easy.',
  },
  {
    id: 'neptune',
    label: 'Neptune',
    color: [0.48, 0.6, 1],
    naked: false,
    text: 'Too faint to see without a telescope or good binoculars.',
  },
];

interface SkyBody extends Body {
  /** Unit direction in J2000 equatorial coordinates at the current simulation time (not for satellites). */
  eq(): Vec3;
  /** Altitude in degrees above the horizon threshold used for rise and set. */
  riseAlt: number;
}

function sky(): Scene {
  const group = new THREE.Group(),
    celestial = new THREE.Group(),
    tmp = new THREE.Vector3();
  celestial.matrixAutoUpdate = false;
  group.add(celestial);
  let loc: Loc = loadLocation() ?? GREENWICH,
    located = loadLocation() !== null;
  let stars: StarSky | null = null;
  const layers = { con: true, conNames: true, starNames: true, horizon: true, grid: false, sats: true };
  /** 0 in daylight, 1 in full darkness: star labels follow the stars. */
  let starVis = 1;

  /* ---- the current sky matrix (J2000 equatorial -> east/up/south), cached per simulation time ---- */
  let mJd = NaN,
    mKey = '',
    M: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const mat = () => {
    const key = `${loc.lat},${loc.lon}`;
    if (sim.jd !== mJd || key !== mKey) {
      mJd = sim.jd;
      mKey = key;
      M = skyMatrix(sim.jd, loc.lat * D2R, loc.lon * D2R);
    }
    return M;
  };
  const worldOf = (eq: Vec3, out: THREE.Vector3, r = R) => {
    const h = applyMat(mat(), eq);
    return out.set(h[0] * r, h[1] * r, h[2] * r);
  };
  const altAzNow = (eq: Vec3) => altAzOf(applyMat(mat(), eq));
  const altAzAt = (eq: Vec3, jd: number) => altAzOf(applyMat(skyMatrix(jd, loc.lat * D2R, loc.lon * D2R), eq));

  /* ---- backdrop: sky dome, ground, horizon marks ---- */
  const U_SUN = new THREE.Vector3(0, -1, 0),
    uZen = { value: new THREE.Color() },
    uHor = { value: new THREE.Color() },
    uGround = { value: new THREE.Color() },
    uGlow = { value: 0 };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.98, 40, 20),
    new THREE.ShaderMaterial({
      uniforms: { uZen, uHor, uSun: { value: U_SUN }, uGlow },
      vertexShader: DOME_VS,
      fragmentShader: DOME_FS,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  );
  dome.renderOrder = -10;
  group.add(dome);
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.97, 48, 12, 0, TAU, Math.PI / 2, Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { uGround, uHor },
      vertexShader: DOME_VS,
      fragmentShader: GROUND_FS,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  );
  ground.renderOrder = 20;
  group.add(ground);

  const horizonMarks = new THREE.Group();
  {
    const pts: number[] = [],
      r = R * 0.965;
    for (let a = 0; a < 360; a += 2) {
      const a0 = a * D2R,
        a1 = (a + 2) * D2R;
      pts.push(Math.sin(a0) * r, 0, -Math.cos(a0) * r, Math.sin(a1) * r, 0, -Math.cos(a1) * r);
    }
    for (let a = 0; a < 360; a += 5) {
      const len = a % 90 === 0 ? 0.045 : a % 45 === 0 ? 0.03 : a % 15 === 0 ? 0.02 : 0.01,
        a0 = a * D2R;
      pts.push(Math.sin(a0) * r, 0, -Math.cos(a0) * r, Math.sin(a0) * r, len * r, -Math.cos(a0) * r);
    }
    horizonMarks.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
        new THREE.LineBasicMaterial({
          color: 0xaecbff,
          transparent: true,
          opacity: 0.55,
          depthTest: false,
          depthWrite: false,
        }),
      ),
    );
    horizonMarks.renderOrder = 21;
  }
  group.add(horizonMarks);

  const gridGroup = new THREE.Group();
  {
    const pts: number[] = [],
      r = R * 0.96;
    for (const alt of [30, 60]) {
      const y = Math.sin(alt * D2R) * r,
        rr = Math.cos(alt * D2R) * r;
      for (let a = 0; a < 360; a += 3) {
        const a0 = a * D2R,
          a1 = (a + 3) * D2R;
        pts.push(Math.sin(a0) * rr, y, -Math.cos(a0) * rr, Math.sin(a1) * rr, y, -Math.cos(a1) * rr);
      }
    }
    for (let az = 0; az < 360; az += 45)
      for (let alt = 0; alt < 90; alt += 3) {
        const a = az * D2R,
          p0 = alt * D2R,
          p1 = (alt + 3) * D2R;
        pts.push(
          Math.sin(a) * Math.cos(p0) * r,
          Math.sin(p0) * r,
          -Math.cos(a) * Math.cos(p0) * r,
          Math.sin(a) * Math.cos(p1) * r,
          Math.sin(p1) * r,
          -Math.cos(a) * Math.cos(p1) * r,
        );
      }
    gridGroup.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
        new THREE.LineBasicMaterial({
          color: 0x5a78d8,
          transparent: true,
          opacity: 0.22,
          depthTest: false,
          depthWrite: false,
        }),
      ),
    );
    gridGroup.visible = false;
  }
  group.add(gridGroup);

  /* ---- things that move with the sky: stars, constellation lines, the Sun, Moon and planets ---- */
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uPx: U.uPx, uVis: { value: 1 } },
    vertexShader: STAR_VS,
    fragmentShader: STAR_FS,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const conMat = new THREE.LineBasicMaterial({
    color: 0x6f95e8,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    depthTest: false,
  });
  let conLines: THREE.LineSegments | null = null,
    conLabels: { name: string; eq: Vec3 }[] = [];

  // 0 Sun core, 1 Sun glow, 2.. planets
  const dots = new Markers(2 + PLANETS.length);
  celestial.add(dots.points);
  const moonTex = new THREE.TextureLoader().load(TEX + 'moon_1024.jpg');
  const moonSun = { value: new THREE.Vector3(1, 0, 0) };
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry((R * 0.00454 * DISC_SCALE) / 1, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: moonTex }, uSun: moonSun },
      vertexShader: MOON_VS,
      fragmentShader: MOON_FS,
      depthTest: false,
      depthWrite: false,
    }),
  );
  moonMesh.renderOrder = 4;
  celestial.add(moonMesh);
  const selMk = new Markers(1, true);
  group.add(selMk.points);
  selMk.hide(0);

  /* ---- bodies ---- */
  const frame = {
    jd: NaN,
    sun: sunEq(2451545) as ReturnType<typeof sunEq>,
    moon: moonEq(2451545) as ReturnType<typeof moonEq>,
  };
  const planetCache = new Map<string, ReturnType<typeof planetSky>>();
  /** Positions of the Sun, Moon and planets at the current time, computed once per time step. */
  function ephemeris() {
    if (frame.jd !== sim.jd) {
      frame.jd = sim.jd;
      frame.sun = sunEq(sim.jd);
      frame.moon = moonEq(sim.jd);
      planetCache.clear();
    }
    return frame;
  }
  const planetNow = (id: string) => {
    ephemeris();
    let p = planetCache.get(id);
    if (!p) planetCache.set(id, (p = planetSky(id, sim.jd)));
    return p;
  };

  const sunScene = new THREE.Vector3();
  const sats = createSkySatellites({
    R,
    loc: () => loc,
    jd: () => sim.jd,
    // the Earth scene's axes are the equatorial ones turned so that y is the pole: (x, z, -y)
    sunDir: () => {
      const s = ephemeris().sun.dir;
      return sunScene.set(s[0], s[2], -s[1]);
    },
    sunAlt: () => altAzNow(ephemeris().sun.dir).alt,
    enabled: () => layers.sats,
    fmt: jd => jdToDate(jd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  group.add(sats.group);
  /** Altitude and azimuth of anything in the sky: a catalogue body from its direction, a satellite from its look angles. */
  const skyPos = (b: Body) =>
    (b as { altAz?: () => { alt: number; az: number } }).altAz?.() ?? altAzNow((b as SkyBody).eq());
  const hasSkyPos = (b: Body | null) =>
    !!b && (typeof (b as SkyBody).eq === 'function' || typeof (b as { altAz?: unknown }).altAz === 'function');

  const fmtTime = (jd: number) =>
    jdToDate(jd).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const events = new Map<string, { at: number; rows: InfoRows }>();
  /** Rise and set rows for the next 24 hours, cached for ten simulated minutes (the search steps through a day). */
  function riseSetRows(b: SkyBody): InfoRows {
    const key = `${b.id}|${loc.lat}|${loc.lon}`,
      hit = events.get(key);
    if (hit && Math.abs(hit.at - sim.jd) < 10 / 1440) return hit.rows;
    const jd0 = sim.jd;
    const alt = (jd: number) => altAzAt(directionAt(b, jd), jd).alt;
    const rs = findRiseSet(alt, jd0, b.riseAlt, 24, 10);
    const rows: InfoRows = [];
    if (rs.always) rows.push(['Rises / sets', 'always above the horizon today']);
    else if (rs.never) rows.push(['Rises / sets', 'stays below the horizon today']);
    else {
      rows.push(['Rises', rs.rise ? fmtTime(rs.rise) : '—']);
      rows.push(['Sets', rs.set ? fmtTime(rs.set) : '—']);
    }
    events.set(key, { at: jd0, rows });
    return rows;
  }
  function directionAt(b: SkyBody, jd: number): Vec3 {
    if (b.id === 'sun') return sunEq(jd).dir;
    if (b.id === 'moon') return moonEq(jd).dir;
    if (b.starIdx !== undefined) return b.eq();
    return planetSky(b.id, jd).dir;
  }

  const posRows = (b: SkyBody): InfoRows => {
    const { alt, az } = altAzNow(b.eq());
    return [
      ['Altitude', `${alt.toFixed(1)}° ${alt > 0 ? 'above' : 'below'} the horizon`],
      ['Direction', `${compass16(az)} (${az.toFixed(0)}° from north)`],
    ];
  };

  // assign onto the object itself (not a spread) so getters such as noLabel keep working
  const make = (b: Omit<SkyBody, 'getPos'>): SkyBody =>
    Object.assign(b, { getPos: (v: THREE.Vector3) => worldOf(b.eq(), v) }) as SkyBody;

  const sun: SkyBody = make({
    id: 'sun',
    label: 'The Sun',
    radNow: R * 0.0046 * DISC_SCALE,
    riseAlt: -0.833,
    live: true,
    diveColor: '#ffe9a8',
    eq: () => ephemeris().sun.dir,
    getInfo(): Info {
      const s = ephemeris().sun,
        { alt } = altAzNow(s.dir);
      return {
        sub: `Our star · ${s.dist.toFixed(3)} AU away`,
        text: 'Never look at the Sun directly, and never through binoculars or a telescope. It is drawn larger than life here so you can find it.',
        rows: [...posRows(sun), ...riseSetRows(sun), ['Sky now', twilightName(alt)]],
      };
    },
  } as Omit<SkyBody, 'getPos'>);

  const moon: SkyBody = make({
    id: 'moon',
    label: 'The Moon',
    radNow: R * 0.0046 * DISC_SCALE,
    riseAlt: 0.125,
    live: true,
    eq: () => ephemeris().moon.dir,
    getInfo(): Info {
      const m = ephemeris().moon,
        ph = moonPhase(sim.jd);
      return {
        sub: `${ph.name} · ${(ph.fraction * 100).toFixed(0)}% lit`,
        text: `About ${Math.round(m.dist * 149597870.7).toLocaleString()} km away. Drawn about ${DISC_SCALE}× larger than life so its phase is easy to see.`,
        rows: [...posRows(moon), ...riseSetRows(moon), ['Phase', `${ph.name}, ${(ph.fraction * 100).toFixed(0)}% lit`]],
      };
    },
  } as Omit<SkyBody, 'getPos'>);

  const planetBodies: SkyBody[] = PLANETS.map(p =>
    make({
      id: p.id,
      label: p.label,
      riseAlt: 0,
      live: true,
      planetDef: p,
      eq: () => planetNow(p.id).dir,
      getInfo(): Info {
        const ps = planetNow(p.id),
          mag = planetMagnitude(p.id, ps.sunDist, ps.dist);
        return {
          sub: `Planet · about magnitude ${mag.toFixed(1)}${mag > 6 ? ' (needs a telescope)' : mag > 4.5 ? ' (needs a dark sky or binoculars)' : ''}`,
          text: p.text,
          rows: [
            ...posRows(self(p.id)),
            ...riseSetRows(self(p.id)),
            ['Distance from Earth', `${ps.dist.toFixed(2)} AU`],
            ['Distance from the Sun', `${ps.sunDist.toFixed(2)} AU`],
          ],
        };
      },
    } as Omit<SkyBody, 'getPos'>),
  );
  const self = (id: string) => planetBodies.find(b => b.id === id)!;

  const you: Body = {
    id: 'you',
    label: 'Your location',
    noLabel: true,
    getPos: v => v.set(0, R, 0),
    live: true,
    action: { label: () => (located ? 'Change my location' : 'Set my location'), run: setLocation },
    getInfo: () => ({
      sub: located ? 'Where the sky is seen from' : 'Using Greenwich as a stand-in',
      text: located
        ? 'Straight overhead is the zenith. The location stays in this browser and is never sent anywhere.'
        : 'No location is saved yet, so this shows the sky over Greenwich, London. Set yours to see the sky above you.',
      rows: [
        ['Latitude', loc.lat.toFixed(3) + '°'],
        ['Longitude', loc.lon.toFixed(3) + '°'],
      ],
    }),
  };
  async function setLocation() {
    const nl = await askLocation(located ? loc : null);
    if (nl) {
      loc = nl;
      located = true;
      saveLocation(nl);
      events.clear();
      sats.reset();
      aimAtStart();
    }
  }

  const starBodies = new Map<number, SkyBody>();
  function starLabel(k: number) {
    const n = stars!.named.get(k);
    return n ? n[1] : stars!.hip[k] ? 'HIP ' + stars!.hip[k] : 'Star ' + k;
  }
  function starBody(k: number): SkyBody {
    let b = starBodies.get(k);
    if (b) return b;
    const s = stars!,
      eq: Vec3 = [s.dir[k * 3], s.dir[k * 3 + 1], s.dir[k * 3 + 2]],
      n = s.named.get(k);
    b = make({
      id: s.hip[k] ? 'hip' + s.hip[k] : 'star' + k,
      label: starLabel(k),
      starIdx: k,
      riseAlt: 0,
      live: true,
      get noLabel() {
        return !layers.starNames || starVis < 0.35;
      },
      eq: () => eq,
      getInfo(): Info {
        const ly = s.dist[k] * 3.26156;
        const rows: InfoRows = [...posRows(starBodies.get(k)!), ...riseSetRows(starBodies.get(k)!)];
        if (n?.[2]) rows.push(['Constellation', n[2]]);
        if (n?.[3]) rows.push(['Spectral type', n[3]]);
        rows.push(['Magnitude', s.mag[k].toFixed(2)]);
        rows.push([
          'Distance',
          ly > 1e5 ? 'unknown' : `${ly < 100 ? ly.toFixed(1) : Math.round(ly).toLocaleString()} light-years`,
        ]);
        return {
          sub: `Star${n?.[2] ? ' · ' + n[2] : ''}`,
          text: n
            ? 'One of the named stars of the night sky.'
            : 'A star from the Hipparcos and Yale Bright Star catalogues.',
          rows,
        };
      },
    } as Omit<SkyBody, 'getPos'>);
    starBodies.set(k, b);
    return b;
  }

  /* ---- where to look: face the object, or the south (north in the southern hemisphere) at a comfortable height ---- */
  let turn: { yaw: number; pitch: number } | null = null;
  const wrapPi = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  function lookAt(alt: number, az: number) {
    // yaw = -azimuth and pitch = -altitude (the camera sits opposite the direction it looks)
    turn = { yaw: cam.yaw + wrapPi(-az * D2R - cam.yaw), pitch: clamp(-Math.max(alt, 3) * D2R, -1.5, 1.5) };
  }
  function aimAtStart() {
    sc.startYaw = loc.lat >= 0 ? -Math.PI : 0;
    sc.startPitch = -22 * D2R;
    cam.yaw = sc.startYaw;
    cam.pitch = sc.startPitch;
  }

  /* ---- labels ---- */
  const CARDINALS: [string, number][] = [
    ['N', 0],
    ['NE', 45],
    ['E', 90],
    ['SE', 135],
    ['S', 180],
    ['SW', 225],
    ['W', 270],
    ['NW', 315],
  ];
  function extraLabels(emit: EmitLabel) {
    if (layers.horizon)
      for (const [name, az] of CARDINALS) {
        const a = az * D2R,
          al = 2.5 * D2R;
        tmp.set(Math.sin(a) * Math.cos(al), Math.sin(al), -Math.cos(a) * Math.cos(al)).multiplyScalar(R * 0.96);
        emit(name, tmp, az % 90 === 0 ? 'cardinal' : 'dim', az % 90 === 0 ? -4 : -8);
      }
    if (layers.conNames && conLabels.length && skyAppearance(altAzNow(ephemeris().sun.dir).alt).starVisibility > 0.25)
      for (const c of conLabels) {
        const h = applyMat(mat(), c.eq);
        if (h[1] < 0.05) continue;
        tmp.set(h[0] * R, h[1] * R, h[2] * R);
        emit(c.name, tmp, 'dim con', -18);
      }
  }

  async function loadStars(status: (message: string) => void) {
    status('loading the star catalogue…');
    stars = await loadStarSky();
    const s = stars,
      n = s.n,
      pos = new Float32Array(n * 3),
      size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = s.dir[i * 3] * R;
      pos[i * 3 + 1] = s.dir[i * 3 + 1] * R;
      pos[i * 3 + 2] = s.dir[i * 3 + 2] * R;
      size[i] = starSizePx(s.mag[i]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(s.color, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const pts = new THREE.Points(g, starMat);
    pts.frustumCulled = false;
    pts.renderOrder = 1;
    celestial.add(pts);

    const seg: number[] = [];
    conLabels = [];
    for (const [, name, , lines] of s.constellations) {
      const used = new Set<number>();
      for (const ln of lines)
        for (let k = 0; k + 1 < ln.length; k++) {
          const a = s.byHip.get(ln[k]),
            b = s.byHip.get(ln[k + 1]);
          if (a === undefined || b === undefined) continue;
          seg.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
          used.add(a);
          used.add(b);
        }
      if (used.size) {
        let x = 0,
          y = 0,
          z = 0;
        for (const i of used) {
          x += s.dir[i * 3];
          y += s.dir[i * 3 + 1];
          z += s.dir[i * 3 + 2];
        }
        const l = Math.hypot(x, y, z);
        conLabels.push({ name, eq: [x / l, y / l, z / l] });
      }
    }
    conLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3)),
      conMat,
    );
    conLines.frustumCulled = false;
    conLines.renderOrder = 2;
    celestial.add(conLines);

    // the brightest stars are listed in Objects; every named star is reachable by search
    const bright: number[] = [];
    for (let i = 0; i < n; i++) if (s.named.has(i) && s.mag[i] <= 2.0) bright.push(i);
    bright.sort((a, b) => s.mag[a] - s.mag[b]);
    for (const i of bright) bodies.push(starBody(i));
  }

  /* ---- scene object ---- */
  const bodies: Body[] = [you, sun, moon, ...planetBodies];
  const sc: Scene = {
    title: 'Sky Tonight',
    group,
    bodies,
    minD: 0.15,
    maxD: 1.2,
    initD: 0.6,
    sky: false,
    rate: 1,
    live: true,
    lookAround: true,
    liveIntro: true,
    timeLabel: 'Moment (UTC)',
    startYaw: -Math.PI,
    startPitch: -22 * D2R,
    center: v => v.set(0, 0, 0),
    intro:
      'The sky as it looks from your location, at the date and time shown. Drag to look around, scroll or pinch to zoom, and select anything for its details. The Time panel makes the sky turn: try 1 hour per second.',
    get introRows(): InfoRows {
      const e = ephemeris(),
        sunAlt = altAzNow(e.sun.dir).alt,
        ph = moonPhase(sim.jd),
        ma = altAzNow(e.moon.dir);
      const up: string[] = [];
      for (const p of PLANETS) {
        if (!p.naked) continue;
        const a = altAzNow(planetNow(p.id).dir);
        if (a.alt > 3) up.push(`${p.label} (${compass16(a.az)}, ${a.alt.toFixed(0)}°)`);
      }
      return [
        ['Location', `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°${located ? '' : ' (stand-in: set yours)'}`],
        ['Sky', `${twilightName(sunAlt)} · Sun ${sunAlt.toFixed(0)}°`],
        [
          'Moon',
          `${ph.name}, ${(ph.fraction * 100).toFixed(0)}% lit, ${ma.alt > 0 ? `${compass16(ma.az)} at ${ma.alt.toFixed(0)}°` : 'below the horizon'}`,
        ],
        [
          'Planets up',
          up.length ? up.join(', ') + (sunAlt > -6 ? ' · lost in the daylight' : '') : 'none above the horizon',
        ],
        ...sats.summary(),
        ['Stars', stars ? `${stars.n.toLocaleString()} in the catalogue` : '…'],
      ];
    },
    layers: [
      { id: 'con', label: 'Constellation lines', color: '#6f95e8', on: true, apply: on => (layers.con = on) },
      { id: 'conNames', label: 'Constellation names', on: true, apply: on => (layers.conNames = on) },
      { id: 'starNames', label: 'Star names', on: true, apply: on => (layers.starNames = on) },
      { id: 'sats', label: 'Satellites', color: '#ffeb8c', on: true, apply: on => (layers.sats = on) },
      { id: 'horizon', label: 'Horizon and compass', on: true, apply: on => (layers.horizon = on) },
      { id: 'grid', label: 'Altitude and azimuth grid', color: '#5a78d8', on: false, apply: on => (layers.grid = on) },
    ] as Layer[],
    async load(status) {
      // the satellites do not depend on the stars: a missing star catalogue must not take them down
      const satsDone = sats.load().then(() => void bodies.push(...sats.stationBodies()));
      try {
        await loadStars(status);
      } finally {
        await satsDone;
      }
    },
    enter() {
      loc = loadLocation() ?? loc;
      located = loadLocation() !== null;
      events.clear();
      sats.reset();
      aimAtStart();
      turn = null;
    },
    leave() {
      setFov(50);
      turn = null;
    },
    isHidden: b => b.id !== 'you' && skyPos(b).alt < -1,
    onSelect(b) {
      if (!b) {
        selMk.hide(0);
        return;
      }
      if (hasSkyPos(b)) {
        const a = skyPos(b);
        lookAt(a.alt, a.az);
      } else lookAt(90, 0);
    },
    update(dt) {
      const m = mat(),
        e = ephemeris();
      celestial.matrix.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      celestial.matrixWorldNeedsUpdate = true;
      celestial.updateMatrixWorld(true);

      const sunH = applyMat(m, e.sun.dir),
        sunAlt = altAzOf(sunH).alt,
        look = skyAppearance(sunAlt);
      U_SUN.set(sunH[0], sunH[1], sunH[2]);
      uZen.value.setRGB(look.zenith[0], look.zenith[1], look.zenith[2]);
      uHor.value.setRGB(look.horizon[0], look.horizon[1], look.horizon[2]);
      const dayness = 1 - look.starVisibility;
      uGround.value.setRGB(0.012 + 0.16 * dayness, 0.014 + 0.19 * dayness, 0.024 + 0.15 * dayness);
      uGlow.value = clamp(1 - Math.abs(sunAlt + 3) / 12, 0, 1) * 0.9;
      starMat.uniforms.uVis.value = starVis = look.starVisibility;
      conMat.opacity = 0.3 * look.starVisibility;
      if (conLines) conLines.visible = layers.con;
      horizonMarks.visible = layers.horizon;
      gridGroup.visible = layers.grid;

      // Sun, Moon, planets in the rotating frame
      const put = (i: number, eq: Vec3, col: ArrayLike<number>, px: number) =>
        dots.set(i, eq[0] * R, eq[1] * R, eq[2] * R, col, px);
      put(0, e.sun.dir, [1, 0.96, 0.8], 34);
      put(1, e.sun.dir, [1, 0.8, 0.45], 90 * (0.4 + 0.6 * dayness));
      PLANETS.forEach((p, i) => {
        const ps = planetNow(p.id),
          mag = planetMagnitude(p.id, ps.sunDist, ps.dist);
        const px = mag > 7 ? 0 : Math.max(4.5, starSizePx(mag) + 4);
        // planets wash out in bright daylight except the brightest
        const vis = dayness > 0.6 && mag > -3 ? 0 : 1;
        put(2 + i, ps.dir, p.color, px * vis);
      });
      moonMesh.position.set(e.moon.dir[0] * R * 0.999, e.moon.dir[1] * R * 0.999, e.moon.dir[2] * R * 0.999);
      // face the near side toward the observer, with lunar north toward the celestial pole
      const x = new THREE.Vector3(-e.moon.dir[0], -e.moon.dir[1], -e.moon.dir[2]),
        north = new THREE.Vector3(0, 0, 1),
        y = north.sub(x.clone().multiplyScalar(north.dot(x))).normalize(),
        z = new THREE.Vector3().crossVectors(x, y);
      moonMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      moonSun.value.set(sunH[0], sunH[1], sunH[2]);

      // zoom is the field of view: the camera stays at the centre
      setFov(clamp(cam.dist * 75, 6, 95));

      if (App.dragging) turn = null;
      if (turn) {
        const k = 1 - Math.exp(-dt * 4.5);
        cam.yaw += (turn.yaw - cam.yaw) * k;
        cam.pitch += (turn.pitch - cam.pitch) * k;
        if (Math.abs(turn.yaw - cam.yaw) < 0.002 && Math.abs(turn.pitch - cam.pitch) < 0.002) turn = null;
      }
      if (App.sel && hasSkyPos(App.sel)) {
        App.sel.getPos(tmp);
        selMk.set(0, tmp.x, tmp.y, tmp.z, [1, 1, 1], 30);
      } else selMk.hide(0);
      sats.update(App.sel);
    },
    extraLabels(emit) {
      extraLabels(emit);
      sats.extraLabels(emit);
    },
    pickCustom(mx, my) {
      if (!stars) return null;
      const s = stars,
        m = mat(),
        cam3 = App.W,
        h = App.H;
      let best = -1,
        bd = 14 * 14;
      const v = new THREE.Vector3();
      for (let k = 0; k < s.n; k++) {
        if (s.mag[k] > 5.2) continue;
        const hz = applyMat(m, [s.dir[k * 3], s.dir[k * 3 + 1], s.dir[k * 3 + 2]]);
        if (hz[1] < 0.02) continue;
        v.set(hz[0] * R, hz[1] * R, hz[2] * R).project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const dx = (v.x * 0.5 + 0.5) * cam3 - mx,
          dy = (-v.y * 0.5 + 0.5) * h - my,
          d = dx * dx + dy * dy - (6 - s.mag[k]) * 2; // favour brighter stars when several are close
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      return best >= 0 ? starBody(best) : null;
    },
    search(q): SearchResult[] {
      const out: SearchResult[] = [];
      for (const b of [sun, moon, ...planetBodies])
        if (b.label.toLowerCase().includes(q)) out.push({ label: b.label, sub: 'Solar system', make: () => b });
      if (stars) {
        const hipQ = /^hip\s*(\d+)$/.exec(q);
        stars.named.forEach((n, k) => {
          if (n[1].toLowerCase().includes(q) && out.length < 40)
            out.push({ label: n[1], sub: `Star · mag ${stars!.mag[k].toFixed(1)}`, make: () => starBody(k) });
        });
        if (hipQ) {
          const k = stars.byHip.get(+hipQ[1]);
          if (k !== undefined) out.push({ label: 'HIP ' + hipQ[1], sub: 'Star', make: () => starBody(k) });
        }
      }
      out.push(...sats.search(q));
      return out;
    },
  };
  return sc;
}

register('sky', 'Sky Tonight', sky);
