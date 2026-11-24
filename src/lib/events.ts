/**
 * The astronomy calendar: moon phases, equinoxes and solstices, meteor showers, planet events, eclipses and launches.
 * Pure functions on top of lib/sky.ts, so every date can be tested against published almanac values.
 *
 * Accuracy: moon phase times are good to about half an hour (abridged lunar theory); seasons, shower peaks and planet
 * events come from the Sun and the JPL planet elements, good to well under an hour. Eclipses are NASA's published times.
 */
import { LUNAR_ECLIPSES, SOLAR_ECLIPSES, eclipseUt } from '@/data/eclipses';
import type { LaunchRow } from '@/data/api';
import { planetEcl } from './astro';
import { TAU } from './math';
import {
  EPS_J2000,
  moonEclipticOfDate,
  moonEq,
  moonPhase,
  planetMagnitude,
  planetSky,
  precessionRad,
  separationDeg,
  skyPosition,
  sunEq,
  type Vec3,
} from './sky';
import { isoToJD } from './time';
import type { ViewState } from './view';

export type EventKind = 'eclipse' | 'moon' | 'season' | 'meteor' | 'planet' | 'moonplanet' | 'launch';

export interface AstroEvent {
  id: string;
  kind: EventKind;
  /** Julian date (UT) of the event */
  jd: number;
  title: string;
  detail: string;
  /** Where to look when the event is opened (the time is the event's own) */
  view?: ViewState;
  /** The view is of the sky from the user's location: move it to the best moment of that night */
  sky?: boolean;
  /** Body to keep high in the sky when choosing that moment ('moon' or a planet id); none means the darkest hour */
  focus?: string;
}

export const KIND_LABEL: Record<EventKind, string> = {
  eclipse: 'Eclipses',
  moon: 'Moon phases',
  season: 'Seasons',
  meteor: 'Meteor showers',
  planet: 'Planets',
  moonplanet: 'Moon and planets',
  launch: 'Launches',
};

const wrap = (d: number) => ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const PLANET_NAME: Record<string, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

/* ---- ecliptic longitudes ---- */

/** Sun's ecliptic longitude of date, radians (the equinox and solstice definition). */
export function sunLongitudeOfDate(jd: number) {
  const e = [0, 0, 0];
  planetEcl('earth', jd, e);
  return (Math.atan2(-e[1], -e[0]) + precessionRad(jd) + TAU) % TAU;
}
/** Sun's ecliptic longitude on the J2000 equinox, which is what the meteor-shower tables use. */
export function sunLongitudeJ2000(jd: number) {
  const e = [0, 0, 0];
  planetEcl('earth', jd, e);
  return (Math.atan2(-e[1], -e[0]) + TAU) % TAU;
}
const eclLon = (v: Vec3) => Math.atan2(v[1] * Math.cos(EPS_J2000) + v[2] * Math.sin(EPS_J2000), v[0]);

/* ---- root finding ---- */

/** Times in [jd0, jd1] where wrap(f(jd) - target) changes sign from negative to positive (f increasing through target). */
export function crossings(f: (jd: number) => number, target: number, jd0: number, jd1: number, step = 1): number[] {
  const out: number[] = [],
    g = (jd: number) => wrap(f(jd) - target);
  let a = jd0,
    ga = g(a);
  for (let b = jd0 + step; b < jd1 + step; b += step) {
    const gb = g(b);
    if (ga < 0 && gb >= 0 && Math.abs(ga) < Math.PI / 2 && Math.abs(gb) < Math.PI / 2) {
      let lo = a,
        hi = b;
      for (let i = 0; i < 40; i++) {
        const m = (lo + hi) / 2;
        if (g(m) < 0) lo = m;
        else hi = m;
      }
      const t = (lo + hi) / 2;
      if (t >= jd0 && t <= jd1) out.push(t);
    }
    a = b;
    ga = gb;
  }
  return out;
}

/** Times where `v` has a local minimum (or maximum, with `sign = -1`), refined by a ternary search. */
export function extrema(
  v: (jd: number) => number,
  jd0: number,
  jd1: number,
  step: number,
  sign = 1,
): { jd: number; value: number }[] {
  const out: { jd: number; value: number }[] = [],
    h = (jd: number) => sign * v(jd);
  let p = h(jd0 - step),
    c = h(jd0),
    cj = jd0;
  for (let t = jd0 + step; t <= jd1 + step; t += step) {
    const n = h(t);
    if (c < p && c <= n) {
      let lo = cj - step,
        hi = t;
      for (let i = 0; i < 40; i++) {
        const m1 = lo + (hi - lo) / 3,
          m2 = hi - (hi - lo) / 3;
        if (h(m1) < h(m2)) hi = m2;
        else lo = m1;
      }
      const jd = (lo + hi) / 2;
      if (jd >= jd0 && jd <= jd1) out.push({ jd, value: v(jd) });
    }
    p = c;
    c = n;
    cj = t;
  }
  return out;
}

/* ---- the calendar ---- */

const moonDistKm = (jd: number) => moonEclipticOfDate(jd).dist;

function moonPhases(jd0: number, jd1: number): AstroEvent[] {
  const elong = (jd: number) => moonEclipticOfDate(jd).lon - sunLongitudeOfDate(jd);
  const defs: [string, number, string][] = [
    ['New Moon', 0, 'new'],
    ['First quarter', Math.PI / 2, 'fq'],
    ['Full Moon', Math.PI, 'full'],
    ['Last quarter', -Math.PI / 2, 'lq'],
  ];
  const out: AstroEvent[] = [];
  for (const [title, target, key] of defs)
    for (const jd of crossings(elong, target, jd0, jd1))
      out.push({
        id: `${key}-${Math.round(jd * 24)}`,
        kind: 'moon',
        jd,
        title,
        detail: `The Moon is ${Math.round(moonDistKm(jd) / 100) * 100} km away`,
        view: { scene: 'earth', sel: 'moon', t: iso(jd), r: 60 },
      });
  return out;
}

function seasons(jd0: number, jd1: number): AstroEvent[] {
  const defs: [string, number, string, string][] = [
    ['March equinox', 0, 'mar', 'Day and night are equal everywhere. Spring begins in the north, autumn in the south.'],
    ['June solstice', Math.PI / 2, 'jun', 'The longest day in the north and the shortest in the south.'],
    [
      'September equinox',
      Math.PI,
      'sep',
      'Day and night are equal everywhere. Autumn begins in the north, spring in the south.',
    ],
    ['December solstice', (3 * Math.PI) / 2, 'dec', 'The shortest day in the north and the longest in the south.'],
  ];
  const out: AstroEvent[] = [];
  for (const [title, target, key, detail] of defs)
    for (const jd of crossings(sunLongitudeOfDate, target, jd0, jd1))
      out.push({
        id: `${key}-${new Date((jd - 2440587.5) * 864e5).getUTCFullYear()}`,
        kind: 'season',
        jd,
        title,
        detail,
        view: { scene: 'earth', sel: 'earth', t: iso(jd), r: 60 },
      });
  return out;
}

/** Annual meteor showers: peak at this solar longitude (J2000, degrees), zenith hourly rate at best, radiant. */
export const SHOWERS: { name: string; lon: number; zhr: number; radiant: string }[] = [
  { name: 'Quadrantids', lon: 283.15, zhr: 80, radiant: 'Boötes' },
  { name: 'Lyrids', lon: 32.32, zhr: 18, radiant: 'Lyra' },
  { name: 'Eta Aquariids', lon: 45.5, zhr: 50, radiant: 'Aquarius' },
  { name: 'Southern Delta Aquariids', lon: 125, zhr: 25, radiant: 'Aquarius' },
  { name: 'Perseids', lon: 140, zhr: 100, radiant: 'Perseus' },
  { name: 'Draconids', lon: 195.4, zhr: 10, radiant: 'Draco' },
  { name: 'Orionids', lon: 208, zhr: 20, radiant: 'Orion' },
  { name: 'Southern Taurids', lon: 223, zhr: 5, radiant: 'Taurus' },
  { name: 'Leonids', lon: 236, zhr: 15, radiant: 'Leo' },
  { name: 'Geminids', lon: 262.2, zhr: 150, radiant: 'Gemini' },
  { name: 'Ursids', lon: 270.7, zhr: 10, radiant: 'Ursa Minor' },
];

/** How much moonlight spoils a shower: under a quarter lit is good, over about 60% is poor. */
export const moonlightVerdict = (fraction: number) =>
  fraction < 0.25 ? 'dark sky, good' : fraction < 0.6 ? 'some moonlight, fair' : 'bright Moon, poor';

function meteorShowers(jd0: number, jd1: number): AstroEvent[] {
  const out: AstroEvent[] = [];
  for (const s of SHOWERS)
    for (const jd of crossings(sunLongitudeJ2000, (s.lon * Math.PI) / 180, jd0, jd1)) {
      const moon = moonPhase(jd).fraction;
      out.push({
        id: `${s.name}-${new Date((jd - 2440587.5) * 864e5).getUTCFullYear()}`,
        kind: 'meteor',
        jd,
        title: `${s.name} peak`,
        detail: `Up to about ${s.zhr} meteors an hour, from ${s.radiant}. Moon ${(moon * 100).toFixed(0)}% lit: ${moonlightVerdict(moon)}.`,
        view: { scene: 'sky', t: iso(jd) },
        sky: true,
      });
    }
  return out;
}

const SUN_SHY = 15; // planets closer to the Sun than this (degrees) are lost in its glare

function planetEvents(jd0: number, jd1: number): AstroEvent[] {
  const out: AstroEvent[] = [];
  const lonOf = (id: string) => (jd: number) => eclLon(planetSky(id, jd).dir) - eclLon(sunEq(jd).dir);
  // oppositions: the planet is due south at midnight, closest and brightest
  for (const id of ['mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const f = lonOf(id);
    // longitude difference falls through 180 degrees; crossings() wants it rising, so negate
    for (const jd of crossings(j => -f(j), -Math.PI, jd0, jd1)) {
      const p = planetSky(id, jd),
        mag = planetMagnitude(id, p.sunDist, p.dist);
      out.push({
        id: `opp-${id}-${Math.round(jd)}`,
        kind: 'planet',
        jd,
        title: `${PLANET_NAME[id]} at opposition`,
        detail: `Opposite the Sun, so up all night and at its closest and brightest: ${p.dist.toFixed(2)} AU away, about magnitude ${mag.toFixed(1)}.`,
        view: { scene: 'sky', sel: id, t: iso(jd) },
        sky: true,
        focus: id,
      });
    }
  }
  // greatest elongations of the inner planets: the best time to see them
  for (const id of ['mercury', 'venus']) {
    const elong = (jd: number) => separationDeg(planetSky(id, jd).dir, sunEq(jd).dir);
    for (const e of extrema(elong, jd0, jd1, 1, -1)) {
      const east = wrap(lonOf(id)(e.jd)) > 0;
      out.push({
        id: `elong-${id}-${Math.round(e.jd)}`,
        kind: 'planet',
        jd: e.jd,
        title: `${PLANET_NAME[id]} at greatest ${east ? 'eastern' : 'western'} elongation`,
        detail: `${e.value.toFixed(0)}° from the Sun: ${PLANET_NAME[id]} is as far from the Sun as it gets, in the ${east ? 'evening sky after sunset' : 'morning sky before sunrise'}.`,
        view: { scene: 'sky', sel: id, t: iso(e.jd) },
        sky: true,
        focus: id,
      });
    }
  }
  // planets passing close to each other
  const BRIGHT = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  for (let i = 0; i < BRIGHT.length; i++)
    for (let j = i + 1; j < BRIGHT.length; j++) {
      const a = BRIGHT[i],
        b = BRIGHT[j];
      const sep = (jd: number) => separationDeg(planetSky(a, jd).dir, planetSky(b, jd).dir);
      for (const m of extrema(sep, jd0, jd1, 1)) {
        if (m.value > 2) continue;
        const sun = sunEq(m.jd).dir;
        if (
          separationDeg(planetSky(a, m.jd).dir, sun) < SUN_SHY ||
          separationDeg(planetSky(b, m.jd).dir, sun) < SUN_SHY
        )
          continue;
        out.push({
          id: `conj-${a}-${b}-${Math.round(m.jd)}`,
          kind: 'planet',
          jd: m.jd,
          title: `${PLANET_NAME[a]} and ${PLANET_NAME[b]} close together`,
          detail: `Only ${m.value.toFixed(1)}° apart in the sky: both fit in one binocular view.`,
          view: { scene: 'sky', sel: a, t: iso(m.jd) },
          sky: true,
          focus: a,
        });
      }
    }
  return out;
}

function moonPlanetEvents(jd0: number, jd1: number): AstroEvent[] {
  const out: AstroEvent[] = [];
  for (const id of ['venus', 'mars', 'jupiter', 'saturn']) {
    const sep = (jd: number) => separationDeg(moonEq(jd).dir, planetSky(id, jd).dir);
    for (const m of extrema(sep, jd0, jd1, 0.125)) {
      if (m.value > 4) continue;
      if (separationDeg(planetSky(id, m.jd).dir, sunEq(m.jd).dir) < SUN_SHY) continue;
      out.push({
        id: `moon-${id}-${Math.round(m.jd * 4)}`,
        kind: 'moonplanet',
        jd: m.jd,
        title: `Moon near ${PLANET_NAME[id]}`,
        detail: `${m.value.toFixed(1)}° apart at their closest. Where you are, the pairing can look a little different.`,
        view: { scene: 'sky', sel: 'moon', t: iso(m.jd) },
        sky: true,
        focus: 'moon',
      });
    }
  }
  return out;
}

function eclipses(jd0: number, jd1: number): AstroEvent[] {
  const out: AstroEvent[] = [];
  for (const [date, time, type, mag, where, path] of SOLAR_ECLIPSES) {
    const jd = eclipseUt(date, time);
    if (jd < jd0 || jd > jd1) continue;
    out.push({
      id: `se-${date}`,
      kind: 'eclipse',
      jd,
      title: `${type} solar eclipse`,
      detail: `Magnitude ${mag.toFixed(3)}. Visible from ${where}.${path ? ` Central path: ${path}.` : ''}`,
      view: { scene: 'earth', sel: 'moon', t: iso(jd - 0.02), r: 60 },
    });
  }
  for (const [date, time, type, mag, where] of LUNAR_ECLIPSES) {
    const jd = eclipseUt(date, time);
    if (jd < jd0 || jd > jd1) continue;
    out.push({
      id: `le-${date}`,
      kind: 'eclipse',
      jd,
      title: `${type} lunar eclipse`,
      detail: `${type === 'Penumbral' ? 'A faint shading of the Moon' : `Umbral magnitude ${mag.toFixed(3)}`}. Visible from ${where}.`,
      view: { scene: 'earth', sel: 'moon', t: iso(jd - 0.02), r: 60 },
    });
  }
  return out;
}

/** Launches from the Launch Library feed. */
export function launchEvents(rows: LaunchRow[], jd0: number, jd1: number): AstroEvent[] {
  const out: AstroEvent[] = [];
  for (const [net, name, provider, site, status] of rows) {
    const jd = isoToJD(net);
    if (!Number.isFinite(jd) || jd < jd0 || jd > jd1) continue;
    out.push({
      id: `launch-${name}-${net}`,
      kind: 'launch',
      jd,
      title: name,
      detail: [provider, site, status && `status: ${status}`].filter(Boolean).join(' · '),
    });
  }
  return out;
}

const iso = (jd: number) => new Date((jd - 2440587.5) * 864e5).toISOString();

/** Every computed event between two Julian dates, soonest first (launches come from the network: see launchEvents). */
export function computeEvents(jd0: number, jd1: number, kinds?: Set<EventKind>): AstroEvent[] {
  const want = (k: EventKind) => !kinds || kinds.has(k);
  const all = [
    ...(want('moon') ? moonPhases(jd0, jd1) : []),
    ...(want('season') ? seasons(jd0, jd1) : []),
    ...(want('meteor') ? meteorShowers(jd0, jd1) : []),
    ...(want('planet') ? planetEvents(jd0, jd1) : []),
    ...(want('moonplanet') ? moonPlanetEvents(jd0, jd1) : []),
    ...(want('eclipse') ? eclipses(jd0, jd1) : []),
  ];
  return all.sort((a, b) => a.jd - b.jd);
}

/* ---- choosing when to look ---- */

/**
 * The best moment within 12 hours of `jd` to look at the sky from a place: with a focus body, the time it is highest
 * while the Sun is well below the horizon; with none, the darkest hour. Falls back to the darkest hour when the body
 * never clears the horizon in the dark (a planet in the glare near the Sun).
 */
export function bestViewingMoment(jd: number, latDeg: number, lonDeg: number, focus?: string): number {
  const lat = (latDeg * Math.PI) / 180,
    lon = (lonDeg * Math.PI) / 180,
    step = 15 / 1440;
  let darkest = jd,
    darkAlt = Infinity,
    best = jd,
    bestAlt = -Infinity;
  for (let t = jd - 0.5; t <= jd + 0.5; t += step) {
    const sunAlt = skyPosition(sunEq(t).dir, t, lat, lon).alt;
    if (sunAlt < darkAlt) {
      darkAlt = sunAlt;
      darkest = t;
    }
    if (focus && sunAlt < -4) {
      const dir = focus === 'moon' ? moonEq(t).dir : planetSky(focus, t).dir,
        alt = skyPosition(dir, t, lat, lon).alt;
      if (alt > bestAlt) {
        bestAlt = alt;
        best = t;
      }
    }
  }
  return focus && bestAlt > 0 ? best : darkest;
}
