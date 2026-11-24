import { describe, expect, it } from 'vitest';
import { D2R } from './math';
import {
  altAzOf,
  applyMat,
  apparentMag,
  compass16,
  eqVec,
  galacticOf,
  milkyWayProfile,
  milkyWayVisibility,
  findRiseSet,
  horizonMatrix,
  moonEclipticOfDate,
  moonEq,
  moonPhase,
  planetSky,
  precessionMatrix,
  precessionRad,
  separationDeg,
  skyAppearance,
  skyMatrix,
  skyPosition,
  starSizePx,
  sunEq,
  twilightName,
} from './sky';
import { isoToJD } from './time';

const R2D = 180 / Math.PI;
const raDecOf = (v: number[]) => ({
  ra: (((Math.atan2(v[1], v[0]) * R2D) % 360) + 360) % 360,
  dec: Math.asin(v[2]) * R2D,
});

describe('horizon geometry', () => {
  it('the point on the meridian at the observer’s declination is at the zenith', () => {
    const lat = 40 * D2R,
      lst = 1.2;
    const h = applyMat(horizonMatrix(lat, lst), eqVec(lst, lat));
    expect(altAzOf(h).alt).toBeCloseTo(90, 6);
  });

  it('the north celestial pole stands at an altitude equal to the latitude, due north', () => {
    for (const lat of [10, 51.5, 80]) {
      const { alt, az } = altAzOf(applyMat(horizonMatrix(lat * D2R, 2.3), eqVec(0, Math.PI / 2)));
      expect(alt).toBeCloseTo(lat, 6);
      expect(Math.min(az, 360 - az)).toBeLessThan(1e-6);
    }
  });

  it('the south celestial pole is above the southern observer’s horizon, due south', () => {
    const { alt, az } = altAzOf(applyMat(horizonMatrix(-33.9 * D2R, 0.7), eqVec(0, -Math.PI / 2)));
    expect(alt).toBeCloseTo(33.9, 6);
    expect(az).toBeCloseTo(180, 6);
  });

  it('on the equator the equinox rises in the east and sets in the west', () => {
    const lat = 0;
    // hour angle -6h (just before crossing the meridian, to the east): LST = RA - 6h
    const east = altAzOf(applyMat(horizonMatrix(lat, -Math.PI / 2), eqVec(0, 0)));
    expect(east.alt).toBeCloseTo(0, 6);
    expect(east.az).toBeCloseTo(90, 6);
    const west = altAzOf(applyMat(horizonMatrix(lat, Math.PI / 2), eqVec(0, 0)));
    expect(west.az).toBeCloseTo(270, 6);
  });

  it('rotation matrices keep lengths and are proper rotations', () => {
    const m = skyMatrix(isoToJD('2026-11-24T20:00Z'), 51.5 * D2R, -0.12 * D2R);
    const v = applyMat(m, [0.3, -0.5, 0.81]);
    expect(Math.hypot(...v)).toBeCloseTo(Math.hypot(0.3, 0.5, 0.81), 9);
    const det =
      m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    expect(det).toBeCloseTo(1, 9);
  });

  it('precession turns the sky by about 50 arcseconds a year, and not at all at J2000', () => {
    expect(precessionRad(2451545)).toBe(0);
    expect(precessionRad(isoToJD('2026-01-01T00:00Z')) * R2D).toBeCloseTo(0.3632, 3);
    const m = precessionMatrix(0);
    expect(applyMat(m, [1, 2, 3]).map(x => +x.toFixed(9))).toEqual([1, 2, 3]);
  });

  it('compass names', () => {
    expect([0, 90, 180, 270, 45, 359].map(compass16)).toEqual(['N', 'E', 'S', 'W', 'NE', 'N']);
  });
});

describe('the Sun', () => {
  it('is at the vernal equinox point on the March equinox 2000', () => {
    const { ra, dec } = raDecOf(sunEq(isoToJD('2000-03-20T07:35Z')).dir);
    expect(Math.min(ra, 360 - ra)).toBeLessThan(0.3);
    expect(Math.abs(dec)).toBeLessThan(0.15);
  });

  it('matches the almanac at J2000: RA about 18h 45m, Dec about -23.0 degrees, 0.983 AU', () => {
    const s = sunEq(2451545.0),
      { ra, dec } = raDecOf(s.dir);
    expect(ra).toBeCloseTo(281.3, 0);
    expect(dec).toBeCloseTo(-23.0, 0);
    expect(s.dist).toBeCloseTo(0.983, 2);
  });

  it('is at the solstice declination in June', () => {
    expect(raDecOf(sunEq(isoToJD('2024-06-20T21:00Z')).dir).dec).toBeCloseTo(23.44, 1);
  });

  it('rises and sets in London near the times in the almanac on the 2024 June solstice', () => {
    const jd0 = isoToJD('2024-06-21T00:00Z'),
      lat = 51.5074 * D2R,
      lon = -0.1278 * D2R;
    const alt = (jd: number) => skyPosition(sunEq(jd).dir, jd, lat, lon).alt;
    const r = findRiseSet(alt, jd0, -0.833, 24, 1);
    const hhmm = (jd: number) => (jd - jd0) * 1440; // minutes after 00:00 UTC
    expect(Math.abs(hhmm(r.rise!) - (3 * 60 + 43))).toBeLessThan(5);
    expect(Math.abs(hhmm(r.set!) - (20 * 60 + 21))).toBeLessThan(5);
  });
});

describe('the Moon', () => {
  it('matches Meeus example 47.a (1992 April 12 0h TD) to within half a degree and 2000 km', () => {
    const m = moonEclipticOfDate(2448724.5);
    expect(m.lon * R2D).toBeCloseTo(133.163, 0);
    expect(Math.abs(m.lon * R2D - 133.163)).toBeLessThan(0.5);
    expect(Math.abs(m.lat * R2D - -3.229)).toBeLessThan(0.5);
    expect(Math.abs(m.dist - 368409.7)).toBeLessThan(2000);
  });

  it('is next to the Sun at new moon and opposite it at full moon', () => {
    const sep = (iso: string) => {
      const jd = isoToJD(iso);
      return separationDeg(sunEq(jd).dir, moonEq(jd).dir);
    };
    expect(sep('2000-01-06T18:14Z')).toBeLessThan(2.5);
    expect(sep('2000-01-21T04:40Z')).toBeGreaterThan(177);
  });

  it('reports phases: new, first quarter, full, last quarter', () => {
    const at = (iso: string) => moonPhase(isoToJD(iso));
    expect(at('2000-01-06T18:14Z').fraction).toBeLessThan(0.01);
    expect(at('2000-01-21T04:40Z').fraction).toBeGreaterThan(0.99);
    expect(at('2000-01-21T04:40Z').name).toBe('Full Moon');
    expect(at('2000-01-14T13:34Z').name).toBe('First quarter');
    expect(at('2000-01-14T13:34Z').fraction).toBeCloseTo(0.5, 1);
    expect(at('2000-01-28T07:57Z').name).toBe('Last quarter');
    expect(at('2000-01-10T00:00Z').name).toMatch(/Waxing/);
    expect(at('2000-01-25T00:00Z').name).toMatch(/Waning/);
  });
});

describe('planets', () => {
  it('never stray farther from the Sun than their orbits allow', () => {
    let mercury = 0,
      venus = 0;
    for (let d = 0; d < 800; d += 4) {
      const jd = 2460000 + d,
        sun = sunEq(jd).dir;
      mercury = Math.max(mercury, separationDeg(sun, planetSky('mercury', jd).dir));
      venus = Math.max(venus, separationDeg(sun, planetSky('venus', jd).dir));
    }
    expect(mercury).toBeLessThan(28.5);
    expect(mercury).toBeGreaterThan(20);
    expect(venus).toBeLessThan(47.5);
    expect(venus).toBeGreaterThan(40);
  });

  it('distances are physical', () => {
    const jd = isoToJD('2026-11-24T00:00Z');
    expect(planetSky('mars', jd).dist).toBeGreaterThan(0.35);
    expect(planetSky('mars', jd).dist).toBeLessThan(2.7);
    expect(planetSky('jupiter', jd).dist).toBeGreaterThan(3.9);
    expect(planetSky('jupiter', jd).dist).toBeLessThan(6.5);
  });
});

describe('brightness and appearance', () => {
  it('apparent magnitude: the 10 parsec rule, and Sirius', () => {
    expect(apparentMag(4.83, 10)).toBeCloseTo(4.83, 6); // a star at 10 parsecs shows its absolute magnitude
    expect(apparentMag(1.43, 2.64)).toBeCloseTo(-1.46, 1); // Sirius
  });

  it('brighter stars are drawn larger, and the faintest are tiny but not gone', () => {
    expect(starSizePx(-1)).toBeGreaterThan(starSizePx(2));
    expect(starSizePx(2)).toBeGreaterThan(starSizePx(5));
    expect(starSizePx(6)).toBeGreaterThan(0.5);
    expect(starSizePx(-10)).toBeLessThanOrEqual(15);
  });

  it('names the stages of twilight', () => {
    expect(twilightName(30)).toBe('Daytime');
    expect(twilightName(-3)).toBe('Civil twilight');
    expect(twilightName(-9)).toBe('Nautical twilight');
    expect(twilightName(-15)).toBe('Astronomical twilight');
    expect(twilightName(-30)).toBe('Full night');
  });

  it('the sky is blue by day, dark at night, and the stars come out as the Sun sinks', () => {
    const day = skyAppearance(40),
      night = skyAppearance(-30),
      dusk = skyAppearance(-6);
    expect(day.zenith[2]).toBeGreaterThan(day.zenith[0]);
    expect(day.zenith[2]).toBeGreaterThan(0.5);
    expect(night.zenith.every(c => c < 0.03)).toBe(true);
    expect(day.starVisibility).toBe(0);
    expect(night.starVisibility).toBe(1);
    expect(dusk.starVisibility).toBeGreaterThan(0);
    expect(dusk.starVisibility).toBeLessThan(1);
    expect(dusk.horizon[0]).toBeGreaterThan(night.horizon[0]); // a warm glow at the horizon at dusk
  });

  it('twilight gets steadily darker', () => {
    let last = Infinity;
    for (let a = 20; a >= -20; a -= 4) {
      const z = skyAppearance(a).zenith,
        lum = z[0] + z[1] + z[2];
      expect(lum).toBeLessThanOrEqual(last + 1e-9);
      last = lum;
    }
  });
});

describe('rise and set search', () => {
  it('finds a rise and a set for an ordinary star', () => {
    const jd0 = isoToJD('2026-03-01T00:00Z'),
      lat = 40 * D2R,
      lon = -75 * D2R,
      star = eqVec(88.79 * D2R, 7.4 * D2R); // Betelgeuse
    const alt = (jd: number) => skyPosition(star, jd, lat, lon).alt;
    const r = findRiseSet(alt, jd0, 0, 36, 5);
    expect(r.rise).not.toBeNull();
    expect(r.set).not.toBeNull();
    expect(r.always).toBe(false);
    expect(r.never).toBe(false);
  });

  it('a circumpolar star never sets, and a star around the other pole never rises', () => {
    const jd0 = isoToJD('2026-03-01T00:00Z'),
      lat = 51.5 * D2R;
    const north = (jd: number) => skyPosition(eqVec(0, 89 * D2R), jd, lat, 0).alt;
    const r = findRiseSet(north, jd0);
    expect(r.always).toBe(true);
    expect(r.set).toBeNull();
    const south = (jd: number) => skyPosition(eqVec(0, -89 * D2R), jd, lat, 0).alt;
    const s = findRiseSet(south, jd0);
    expect(s.never).toBe(true);
    expect(s.rise).toBeNull();
  });
});

describe('the Milky Way', () => {
  const eq = (ra: number, dec: number) => eqVec(ra * D2R, dec * D2R);
  it('galactic coordinates: the centre, the north pole, and two famous stars', () => {
    const gc = galacticOf(eq(266.405, -28.936));
    expect(Math.min(gc.l, 360 - gc.l)).toBeLessThan(0.05);
    expect(Math.abs(gc.b)).toBeLessThan(0.05);
    expect(galacticOf(eq(192.859, 27.128)).b).toBeCloseTo(90, 1);
    const deneb = galacticOf(eq(310.358, 45.28));
    expect(deneb.l).toBeCloseTo(84.3, 0);
    expect(deneb.b).toBeCloseTo(2.0, 0);
    const sirius = galacticOf(eq(101.287, -16.716));
    expect(sirius.l).toBeCloseTo(227.2, 0);
    expect(sirius.b).toBeCloseTo(-8.9, 0);
  });

  it('the glow is brightest along the plane, symmetric about it, and fades away from it', () => {
    for (const l of [0, 90, 200]) {
      expect(milkyWayProfile(l, 0)).toBeGreaterThan(milkyWayProfile(l, 10));
      expect(milkyWayProfile(l, 10)).toBeGreaterThan(milkyWayProfile(l, 40));
      expect(milkyWayProfile(l, 12)).toBeCloseTo(milkyWayProfile(l, -12), 9);
    }
    expect(milkyWayProfile(0, 90)).toBeLessThan(0.1);
  });

  it('it is brighter toward the galactic centre than away from it, with a bulge', () => {
    expect(milkyWayProfile(0, 0)).toBeGreaterThan(milkyWayProfile(180, 0) * 1.5);
    expect(milkyWayProfile(0, 0)).toBeGreaterThan(milkyWayProfile(40, 0));
    expect(milkyWayProfile(359, 0)).toBeCloseTo(milkyWayProfile(1, 0), 1); // continuous across l = 0
  });

  it('is visible only in a properly dark sky, and a bright Moon drowns it', () => {
    expect(milkyWayVisibility(10, -30, 0)).toBe(0); // daytime
    expect(milkyWayVisibility(-10, -30, 0)).toBeLessThan(0.5); // twilight: fading
    expect(milkyWayVisibility(-30, -30, 0)).toBe(1); // a dark, moonless night
    expect(milkyWayVisibility(-30, 50, 1)).toBeLessThan(0.2); // a full Moon high up
    expect(milkyWayVisibility(-30, -10, 1)).toBe(1); // a full Moon below the horizon does not matter
    expect(milkyWayVisibility(-30, 50, 0.05)).toBeGreaterThan(0.9); // a thin crescent barely matters
  });
});
