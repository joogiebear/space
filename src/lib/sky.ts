/**
 * Sky maths for "Sky Tonight": where things are in the sky of an observer on Earth. Pure functions, no three.js.
 *
 * Frames: "equatorial" is J2000 with x toward the vernal equinox, y toward RA 6h and z toward the north celestial pole
 * (the frame of the star catalogue). "Horizon" vectors use x = east, y = up, z = south, so the scene reads like a
 * right-handed map with north away from the viewer.
 */
import { planetEcl } from './astro';
import { D2R, TAU } from './math';
import { J2000 } from './time';

export const EPS_J2000 = 23.4392911 * D2R;
const R2D = 180 / Math.PI;

export type Vec3 = [number, number, number];

/** Greenwich mean sidereal time in radians: how far the globe has turned relative to the stars. */
export const gmstRad = (jd: number) => ((((280.46061837 + 360.98564736629 * (jd - J2000)) % 360) + 360) % 360) * D2R;
/** Local sidereal time for an east longitude in radians. */
export const lstRad = (jd: number, lonRad: number) => (((gmstRad(jd) + lonRad) % TAU) + TAU) % TAU;

/** General precession in ecliptic longitude since J2000 (radians): about 50.3 arcseconds a year. */
export const precessionRad = (jd: number) => ((jd - J2000) / 36525) * 1.396971 * D2R;

export const eqVec = (ra: number, dec: number): Vec3 => [
  Math.cos(dec) * Math.cos(ra),
  Math.cos(dec) * Math.sin(ra),
  Math.sin(dec),
];

type Mat3 = number[]; // row-major
const mul = (a: Mat3, b: Mat3): Mat3 => {
  const o = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return o;
};
export const applyMat = (m: Mat3, v: ArrayLike<number>): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** Rotation about the ecliptic pole by `p`: moves J2000 equatorial coordinates to the equinox of date. */
export function precessionMatrix(p: number): Mat3 {
  const k = [0, -Math.sin(EPS_J2000), Math.cos(EPS_J2000)],
    c = Math.cos(p),
    s = Math.sin(p),
    t = 1 - c;
  return [
    t * k[0] * k[0] + c,
    t * k[0] * k[1] - s * k[2],
    t * k[0] * k[2] + s * k[1],
    t * k[1] * k[0] + s * k[2],
    t * k[1] * k[1] + c,
    t * k[1] * k[2] - s * k[0],
    t * k[2] * k[0] - s * k[1],
    t * k[2] * k[1] + s * k[0],
    t * k[2] * k[2] + c,
  ];
}

/** Equatorial of date -> horizon (east, up, south) for latitude `lat` and local sidereal time `lst` (radians). */
export function horizonMatrix(lat: number, lst: number): Mat3 {
  const sl = Math.sin(lst),
    cl = Math.cos(lst),
    sp = Math.sin(lat),
    cp = Math.cos(lat);
  return [-sl, cl, 0, cp * cl, cp * sl, sp, sp * cl, sp * sl, -cp];
}

/** J2000 equatorial -> horizon for a Julian date and observer, including precession. */
export const skyMatrix = (jd: number, latRad: number, lonRad: number): Mat3 =>
  mul(horizonMatrix(latRad, lstRad(jd, lonRad)), precessionMatrix(precessionRad(jd)));

/** Altitude and azimuth (degrees; azimuth from north through east) of a horizon vector. */
export function altAzOf(h: ArrayLike<number>) {
  const alt = Math.asin(Math.max(-1, Math.min(1, h[1] / Math.hypot(h[0], h[1], h[2]))));
  const az = Math.atan2(h[0], -h[2]); // north is -z
  return { alt: alt * R2D, az: (((az * R2D) % 360) + 360) % 360 };
}

/** Altitude and azimuth in degrees of a J2000 equatorial direction. */
export const skyPosition = (eq: ArrayLike<number>, jd: number, latRad: number, lonRad: number) =>
  altAzOf(applyMat(skyMatrix(jd, latRad, lonRad), eq));

/* ---- bodies ---- */

const eclToEq = (x: number, y: number, z: number): Vec3 => [
  x,
  y * Math.cos(EPS_J2000) - z * Math.sin(EPS_J2000),
  y * Math.sin(EPS_J2000) + z * Math.cos(EPS_J2000),
];
const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const angleBetween = (a: Vec3, b: Vec3) =>
  Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

export interface SkyObject {
  /** Unit direction, J2000 equatorial. */
  dir: Vec3;
  /** Distance from Earth in AU. */
  dist: number;
}

/** The Sun as seen from Earth. */
export function sunEq(jd: number): SkyObject {
  const e = [0, 0, 0];
  planetEcl('earth', jd, e);
  const d = Math.hypot(e[0], e[1], e[2]);
  return { dir: unit(eclToEq(-e[0], -e[1], -e[2])), dist: d };
}

/** A planet as seen from Earth (geocentric), plus its distance from the Sun for the brightness estimate. */
export function planetSky(id: string, jd: number): SkyObject & { sunDist: number } {
  const p = [0, 0, 0],
    e = [0, 0, 0];
  planetEcl(id, jd, p);
  planetEcl('earth', jd, e);
  const g: Vec3 = [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
  return { dir: unit(eclToEq(...g)), dist: Math.hypot(...g), sunDist: Math.hypot(p[0], p[1], p[2]) };
}

/** Abridged lunar theory (about 0.3 degrees): ecliptic longitude and latitude of date in radians, distance in km. */
export function moonEclipticOfDate(jd: number) {
  const d = jd - J2000,
    L = 218.316 + 13.176396 * d,
    M = (134.963 + 13.064993 * d) * D2R,
    F = (93.272 + 13.22935 * d) * D2R,
    D = (297.85 + 12.190749 * d) * D2R,
    Ms = (357.529 + 0.98560028 * d) * D2R;
  const lon =
      L +
      6.289 * Math.sin(M) +
      1.274 * Math.sin(2 * D - M) +
      0.658 * Math.sin(2 * D) +
      0.214 * Math.sin(2 * M) -
      0.186 * Math.sin(Ms) -
      0.114 * Math.sin(2 * F),
    lat = 5.128 * Math.sin(F) + 0.281 * Math.sin(M + F) + 0.278 * Math.sin(M - F) + 0.173 * Math.sin(2 * D - F),
    dist = 385001 - 20905 * Math.cos(M) - 3699 * Math.cos(2 * D - M) - 2956 * Math.cos(2 * D);
  return { lon: (((lon % 360) + 360) % 360) * D2R, lat: lat * D2R, dist };
}

/** The Moon, in the same J2000 frame as the stars (the of-date longitude is wound back by the precession). */
export function moonEq(jd: number): SkyObject & { lon: number } {
  const m = moonEclipticOfDate(jd),
    lon = m.lon - precessionRad(jd);
  const v = eclToEq(Math.cos(m.lat) * Math.cos(lon), Math.cos(m.lat) * Math.sin(lon), Math.sin(m.lat));
  return { dir: unit(v), dist: m.dist / 149597870.7, lon: m.lon };
}

/** Angle between two directions, in degrees. */
export const separationDeg = (a: Vec3, b: Vec3) => angleBetween(a, b) * R2D;

const PHASES = [
  'New Moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full Moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
];
/** Phase name, illuminated fraction (0-1) and age angle (degrees past new) from the Moon's and Sun's positions. */
export function moonPhase(jd: number) {
  const sun = sunEq(jd).dir,
    moon = moonEq(jd);
  const elong = angleBetween(sun, moon.dir);
  const e = [0, 0, 0];
  planetEcl('earth', jd, e);
  const sunLon = Math.atan2(-e[1], -e[0]); // geocentric ecliptic longitude of the Sun, J2000
  const age = ((((moon.lon - precessionRad(jd) - sunLon) * R2D) % 360) + 360) % 360;
  return { fraction: (1 - Math.cos(elong)) / 2, age, name: PHASES[Math.round(age / 45) % 8] };
}

/** Approximate apparent magnitude: the planet's mean brightness at 1 AU, corrected for distance (no phase terms). */
const V0: Record<string, number> = {
  mercury: -0.42,
  venus: -4.4,
  mars: -1.52,
  jupiter: -9.4,
  saturn: -8.88,
  uranus: -7.19,
  neptune: -6.87,
};
export const planetMagnitude = (id: string, sunDist: number, earthDist: number) =>
  (V0[id] ?? 0) + 5 * Math.log10(sunDist * earthDist);

/** Apparent magnitude of a catalogue star from its absolute magnitude and distance in parsecs. */
export const apparentMag = (absMag: number, distPc: number) => absMag + 5 * Math.log10(Math.max(distPc, 1e-3)) - 5;

/* ---- events and appearance ---- */

export interface RiseSet {
  rise: number | null;
  set: number | null;
  /** Above `threshold` for the whole window / below it for the whole window. */
  always: boolean;
  never: boolean;
}
/**
 * First rise and first set within `hours` after `jd0`, found by stepping `altAt` (degrees) and interpolating across
 * `threshold` (0 for stars and planets, -0.833 for the Sun's upper limb with refraction).
 */
export function findRiseSet(
  altAt: (jd: number) => number,
  jd0: number,
  threshold = 0,
  hours = 24,
  stepMin = 10,
): RiseSet {
  const out: RiseSet = { rise: null, set: null, always: true, never: true };
  const step = stepMin / 1440,
    n = Math.ceil(hours / 24 / step);
  let prevJd = jd0,
    prev = altAt(jd0) - threshold;
  out.always = prev > 0;
  out.never = prev <= 0;
  for (let i = 1; i <= n; i++) {
    const jd = jd0 + i * step,
      cur = altAt(jd) - threshold;
    if (cur > 0) out.never = false;
    else out.always = false;
    if (prev <= 0 && cur > 0 && out.rise === null) out.rise = prevJd + (step * -prev) / (cur - prev);
    if (prev > 0 && cur <= 0 && out.set === null) out.set = prevJd + (step * prev) / (prev - cur);
    prevJd = jd;
    prev = cur;
  }
  return out;
}

const COMP = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass16 = (az: number) => COMP[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];

/** Plain-language state of the sky from the Sun's altitude in degrees. */
export function twilightName(sunAlt: number) {
  return sunAlt > -0.833
    ? 'Daytime'
    : sunAlt > -6
      ? 'Civil twilight'
      : sunAlt > -12
        ? 'Nautical twilight'
        : sunAlt > -18
          ? 'Astronomical twilight'
          : 'Full night';
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Sky gradient colours (0-1 RGB) and how visible the stars are, from the Sun's altitude in degrees. */
export function skyAppearance(sunAlt: number) {
  const DAY_Z: Vec3 = [0.16, 0.38, 0.78],
    DAY_H: Vec3 = [0.55, 0.72, 0.92],
    DUSK_Z: Vec3 = [0.06, 0.1, 0.28],
    DUSK_H: Vec3 = [0.95, 0.5, 0.25],
    NIGHT_Z: Vec3 = [0.004, 0.006, 0.02],
    NIGHT_H: Vec3 = [0.02, 0.03, 0.07];
  const day = smooth(-4, 14, sunAlt), // full blue day sky above ~14 degrees
    dusk = smooth(-18, -2, sunAlt); // twilight glow builds from astronomical twilight
  const glow = dusk * (1 - day);
  let zenith = mix(NIGHT_Z, DUSK_Z, dusk);
  let horizon = mix(NIGHT_H, DUSK_H, glow);
  zenith = mix(zenith, DAY_Z, day);
  horizon = mix(horizon, DAY_H, day);
  return { zenith, horizon, starVisibility: 1 - smooth(-14, -3, sunAlt) };
}

/** Marker size in pixels for a star of apparent magnitude `m`: brighter is bigger, the faintest visible are specks. */
export const starSizePx = (m: number) => Math.max(0, Math.min(15, 1.7 + (6.6 - m) * 1.55));

/* ---- the Milky Way ---- */

/** J2000 equatorial -> galactic (the standard Hipparcos matrix): rows give the x (toward the centre), y and pole axes. */
const GAL: number[][] = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];
/** Galactic longitude and latitude, in degrees, of a J2000 equatorial direction. */
export function galacticOf(eq: ArrayLike<number>) {
  const x = GAL[0][0] * eq[0] + GAL[0][1] * eq[1] + GAL[0][2] * eq[2],
    y = GAL[1][0] * eq[0] + GAL[1][1] * eq[1] + GAL[1][2] * eq[2],
    z = GAL[2][0] * eq[0] + GAL[2][1] * eq[1] + GAL[2][2] * eq[2],
    n = Math.hypot(x, y, z);
  return { l: (((Math.atan2(y, x) * R2D) % 360) + 360) % 360, b: Math.asin(Math.max(-1, Math.min(1, z / n))) * R2D };
}

/**
 * The smooth shape of the Milky Way's glow, before dust lanes and grain are added: a thin bright disc and a wider faint
 * one, both stronger toward the galactic centre (l = 0), plus the central bulge. The shader uses the same numbers.
 */
export const MW = {
  discScale: 6, // degrees of galactic latitude over which the thin disc fades
  thickScale: 15,
  thickWeight: 0.4,
  longitudeFloor: 0.5, // brightness far from the centre, relative to toward it
  longitudeSpan: 50,
  bulgeL: 14,
  bulgeB: 9,
  bulgeWeight: 1.1,
};
export function milkyWayProfile(l: number, b: number) {
  const wl = ((((l + 180) % 360) + 360) % 360) - 180,
    lw = MW.longitudeFloor + (1 - MW.longitudeFloor) * Math.exp(-((wl / MW.longitudeSpan) ** 2)),
    ab = Math.abs(b);
  return (
    Math.exp(-ab / MW.discScale) * lw +
    MW.thickWeight * Math.exp(-ab / MW.thickScale) * lw +
    MW.bulgeWeight * Math.exp(-((wl / MW.bulgeL) ** 2) - (b / MW.bulgeB) ** 2)
  );
}

/**
 * How much of the Milky Way can be seen, 0 to 1: it needs a properly dark sky (gone by nautical twilight), and a Moon
 * above the horizon drowns it in proportion to how much of it is lit and how high it stands.
 */
export function milkyWayVisibility(sunAlt: number, moonAlt: number, moonFraction: number) {
  const dark = smooth(-9, -17, sunAlt),
    moon = moonAlt > 0 ? moonFraction * Math.min(1, moonAlt / 25) : 0;
  return dark * (1 - 0.85 * moon);
}
