import type { TourStep } from '@/engine/tour';
import {
  compass16,
  findRiseSet,
  jdToDate,
  moonEq,
  moonPhase,
  planetMagnitude,
  planetSky,
  skyPosition,
  sunEq,
  twilightName,
  type Vec3,
} from '@/lib';
import { bestViewingMoment } from '@/lib/events';
import { eqVec } from '@/lib/sky';
import { PLANETS } from './sky/planets';

/** The brightest stars with J2000 position, Hipparcos number (the id Sky Tonight gives them) and a fact worth knowing. */
export const TOUR_STARS: { name: string; hip: number; ra: number; dec: number; mag: number; fact: string }[] = [
  {
    name: 'Sirius',
    hip: 32349,
    ra: 101.287,
    dec: -16.716,
    mag: -1.46,
    fact: 'The brightest star in the night sky, only 8.6 light years away.',
  },
  {
    name: 'Canopus',
    hip: 30438,
    ra: 95.988,
    dec: -52.696,
    mag: -0.74,
    fact: 'The second brightest star: a giant about 310 light years away.',
  },
  {
    name: 'Arcturus',
    hip: 69673,
    ra: 213.915,
    dec: 19.182,
    mag: -0.05,
    fact: 'An orange giant 37 light years away, and the brightest star north of the celestial equator.',
  },
  {
    name: 'Vega',
    hip: 91262,
    ra: 279.235,
    dec: 38.784,
    mag: 0.03,
    fact: 'A blue-white star 25 light years away. It was the first star other than the Sun to be photographed.',
  },
  {
    name: 'Capella',
    hip: 24608,
    ra: 79.172,
    dec: 45.998,
    mag: 0.08,
    fact: 'It looks like one star but is really two pairs of stars, about 43 light years away.',
  },
  {
    name: 'Rigel',
    hip: 24436,
    ra: 78.634,
    dec: -8.202,
    mag: 0.13,
    fact: 'A blue supergiant roughly 860 light years away, tens of thousands of times brighter than the Sun.',
  },
  {
    name: 'Procyon',
    hip: 37279,
    ra: 114.825,
    dec: 5.225,
    mag: 0.34,
    fact: 'One of our nearest neighbours: 11.5 light years away.',
  },
  {
    name: 'Betelgeuse',
    hip: 27989,
    ra: 88.793,
    dec: 7.407,
    mag: 0.5,
    fact: 'A red supergiant so large that, in place of the Sun, it would swallow the orbit of Mars. It may explode some day.',
  },
  {
    name: 'Altair',
    hip: 97649,
    ra: 297.696,
    dec: 8.868,
    mag: 0.76,
    fact: 'Only 17 light years away and spinning so fast it turns once in about nine hours, bulging at the middle.',
  },
  {
    name: 'Aldebaran',
    hip: 21421,
    ra: 68.98,
    dec: 16.509,
    mag: 0.86,
    fact: 'The orange eye of Taurus, a giant 65 light years away.',
  },
  {
    name: 'Antares',
    hip: 80763,
    ra: 247.352,
    dec: -26.432,
    mag: 1.06,
    fact: 'A red supergiant whose name means rival of Mars, for its colour.',
  },
  {
    name: 'Spica',
    hip: 65474,
    ra: 201.298,
    dec: -11.161,
    mag: 0.97,
    fact: 'A hot blue star about 250 light years away, really a close pair circling each other every four days.',
  },
  {
    name: 'Pollux',
    hip: 37826,
    ra: 116.329,
    dec: 28.026,
    mag: 1.14,
    fact: 'An orange giant 34 light years away, with a planet at least twice the mass of Jupiter.',
  },
  {
    name: 'Fomalhaut',
    hip: 113368,
    ra: 344.413,
    dec: -29.622,
    mag: 1.16,
    fact: 'A young star 25 light years away, surrounded by a wide disc of dust where planets may be forming.',
  },
  {
    name: 'Deneb',
    hip: 102098,
    ra: 310.358,
    dec: 45.28,
    mag: 1.25,
    fact: 'One of the most luminous stars we can see: thousands of light years away, yet still bright.',
  },
  {
    name: 'Regulus',
    hip: 49669,
    ra: 152.093,
    dec: 11.967,
    mag: 1.35,
    fact: 'The heart of Leo, 79 light years away, spinning so fast it is flattened.',
  },
];

const PHASE_NOTE = (fraction: number) =>
  fraction < 0.08
    ? 'Almost new, so it is a faint sliver at best and hard to find.'
    : fraction < 0.35
      ? 'Look for earthshine: the dim glow on the dark part, lit by light reflected from Earth.'
      : fraction < 0.65
        ? 'Half lit is the best time to see craters, along the line between light and dark.'
        : fraction < 0.92
          ? 'Mostly lit and heading for full.'
          : 'Nearly full: bright enough to wash out faint stars, and flat because there are no shadows to show relief.';

const iso = (jd: number) => jdToDate(jd).toISOString();
const clock = (jd: number) => jdToDate(jd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** The brightest candidate that is up, or null: used for the planet and the star. */
export function brightest<T>(items: T[], mag: (x: T) => number, alt: (x: T) => number, minAlt: number): T | null {
  let best: T | null = null;
  for (const x of items) if (alt(x) > minAlt && (best === null || mag(x) < mag(best))) best = x;
  return best;
}

/**
 * A tour of the sky as it is for this person tonight: the Moon, the brightest planet and the brightest star that are
 * up, then a day in twelve seconds. Built when it starts, because what is above the horizon depends on where you are
 * and when, so a fixed script would often point at empty sky.
 */
export function skyTourSteps(jdNow: number, loc: { lat: number; lon: number }, located: boolean): TourStep[] {
  const lat = (loc.lat * Math.PI) / 180,
    lon = (loc.lon * Math.PI) / 180;
  const at = (dir: Vec3, jd: number) => skyPosition(dir, jd, lat, lon);
  const sunAltAt = (jd: number) => at(sunEq(jd).dir, jd).alt;

  // right now if it is already dark; otherwise the darkest hour of this night
  const dark = sunAltAt(jdNow) < -6,
    t = dark ? jdNow : bestViewingMoment(jdNow, loc.lat, loc.lon),
    sunAlt = sunAltAt(t),
    where = located
      ? `${loc.lat.toFixed(1)}°, ${loc.lon.toFixed(1)}°`
      : 'Greenwich (set your own with “Your location”)';

  const steps: TourStep[] = [
    {
      view: dark ? { scene: 'sky' } : { scene: 'sky', t: iso(t), r: 1 },
      live: dark,
      title: `Your sky ${dark ? 'right now' : 'tonight'}`,
      text: `${twilightName(sunAlt)} from ${where}${dark ? '' : `, at ${clock(t)}`}. The ring is the horizon with its compass points; drag to look around. Everything is where it really is.`,
    },
  ];

  // the Moon
  const ph = moonPhase(t),
    moonAlt = at(moonEq(t).dir, t);
  const pct = `${(ph.fraction * 100).toFixed(0)}% lit`;
  if (moonAlt.alt > 3)
    steps.push({
      view: { scene: 'sky', sel: 'moon' },
      title: 'The Moon',
      text: `${ph.name}, ${pct}, in the ${compass16(moonAlt.az)} at ${moonAlt.alt.toFixed(0)}°. ${PHASE_NOTE(ph.fraction)}`,
    });
  else {
    const rs = findRiseSet(j => at(moonEq(j).dir, j).alt, t, 0.125, 24, 10);
    steps.push({
      view: { scene: 'sky' },
      title: 'The Moon is down',
      text: `${ph.name}, ${pct}, below the horizon at this hour.${rs.rise ? ` It rises at ${clock(rs.rise)}.` : ''} Wait for it and the stars fade as it climbs.`,
    });
  }

  // the brightest planet that is up
  const planets = PLANETS.filter(p => p.naked),
    planetPos = new Map(planets.map(p => [p.id, at(planetSky(p.id, t).dir, t)])),
    planetMag = (p: (typeof PLANETS)[number]) => {
      const s = planetSky(p.id, t);
      return planetMagnitude(p.id, s.sunDist, s.dist);
    };
  // planets show in twilight (Venus even by day), but not against a bright sky
  const planet = sunAlt < -3 ? brightest(planets, planetMag, p => planetPos.get(p.id)!.alt, 8) : null;
  if (planet) {
    const pos = planetPos.get(planet.id)!;
    steps.push({
      view: { scene: 'sky', sel: planet.id },
      title: planet.label,
      text: `${planet.text} It is ${pos.alt.toFixed(0)}° up in the ${compass16(pos.az)}. Planets shine steadily; stars twinkle.`,
    });
  } else
    steps.push({
      view: { scene: 'sky' },
      title: 'No bright planet up',
      text:
        sunAlt < -3
          ? 'None of the naked-eye planets is well above the horizon at this hour. The Events calendar lists when each is at its best.'
          : 'The sky never gets properly dark here at this time of year, so planets are lost in the glow. Try the Time panel to move to another season.',
    });

  // the brightest star that is up
  const starPos = new Map(TOUR_STARS.map(s => [s.hip, at(eqVec((s.ra * Math.PI) / 180, (s.dec * Math.PI) / 180), t)])),
    // stars need a properly dark sky
    star =
      sunAlt < -9
        ? brightest(
            TOUR_STARS,
            s => s.mag,
            s => starPos.get(s.hip)!.alt,
            15,
          )
        : null;
  if (star) {
    const pos = starPos.get(star.hip)!;
    steps.push({
      view: { scene: 'sky', sel: 'hip' + star.hip, q: star.name },
      title: star.name,
      text: `${star.fact} It is ${pos.alt.toFixed(0)}° up in the ${compass16(pos.az)}.`,
    });
  }

  // a day in twelve seconds, then back to now
  steps.push(
    {
      view: { scene: 'sky', t: iso(t), r: 7200 },
      hold: 12000,
      transient: true,
      title: 'Watch the sky turn',
      text: 'A whole day passes in twelve seconds. The Earth spins, so the stars rise in the east, cross the sky and set in the west, and the Sun brings daylight.',
    },
    {
      view: { scene: 'sky' },
      live: true,
      title: 'Over to you',
      text: 'The clock is back on real time. Pick any object for its rise and set times, try the Layers, or open Events to see what is coming up.',
    },
  );
  return steps;
}
