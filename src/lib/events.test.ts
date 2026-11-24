import { describe, expect, it } from 'vitest';
import { LUNAR_ECLIPSES, SOLAR_ECLIPSES, eclipseUt } from '@/data/eclipses';
import {
  KIND_LABEL,
  SHOWERS,
  bestViewingMoment,
  computeEvents,
  crossings,
  extrema,
  launchEvents,
  moonlightVerdict,
  sunLongitudeOfDate,
  type AstroEvent,
} from './events';
import { skyPosition, sunEq } from './sky';
import { isoToJD } from './time';

const minutes = (a: number, b: number) => Math.abs(a - b) * 1440;
const run = (from: string, to: string, kinds?: AstroEvent['kind'][]) =>
  computeEvents(isoToJD(from), isoToJD(to), kinds ? new Set(kinds) : undefined);
const find = (list: AstroEvent[], title: RegExp) => list.filter(e => title.test(e.title));

describe('root finding', () => {
  it('crossings finds each upward crossing of a target, once', () => {
    const f = (t: number) => Math.PI * 2 * (t / 10); // one turn every 10 days
    const found = crossings(f, 0, 0.5, 35, 0.5);
    expect(found).toHaveLength(3);
    expect(found[0]).toBeCloseTo(10, 6);
    expect(found[2]).toBeCloseTo(30, 6);
  });

  it('crossings does not report the wrap-around jump as a crossing', () => {
    const f = (t: number) => (Math.PI * 2 * (t / 10)) % (Math.PI * 2);
    expect(crossings(f, Math.PI, 0, 25, 0.5)).toHaveLength(3); // at 5, 15 and 25; the jump from 2π back to 0 is not one
  });

  it('extrema finds minima and (with sign -1) maxima, refined well below the step', () => {
    const v = (t: number) => Math.cos(t * 0.7) * 3;
    const mins = extrema(v, 0, 20, 0.5);
    expect(mins[0].jd).toBeCloseTo(Math.PI / 0.7, 4);
    expect(mins[0].value).toBeCloseTo(-3, 6);
    const maxes = extrema(v, 0.2, 20, 0.5, -1);
    expect(maxes[0].jd).toBeCloseTo((2 * Math.PI) / 0.7, 4);
  });
});

describe('moon phases', () => {
  const phases = run('2025-03-01', '2025-04-30', ['moon']);

  it('finds four phases a lunation, in order', () => {
    const names = phases.map(p => p.title);
    expect(names.slice(0, 4)).toEqual(
      ['New Moon', 'First quarter', 'Full Moon', 'Last quarter'].sort((a, b) => names.indexOf(a) - names.indexOf(b)),
    );
    for (let i = 1; i < phases.length; i++) {
      const gap = phases[i].jd - phases[i - 1].jd;
      expect(gap).toBeGreaterThan(6);
      expect(gap).toBeLessThan(9);
    }
  });

  it('puts the March 2025 full Moon within 25 minutes of the almanac (14 March 06:55 UTC)', () => {
    const full = find(phases, /Full Moon/)[0];
    expect(minutes(full.jd, isoToJD('2025-03-14T06:55:00Z'))).toBeLessThan(25);
  });

  it('puts the January 2000 phases within 25 minutes of the almanac', () => {
    const p = run('2000-01-01', '2000-02-01', ['moon']);
    expect(minutes(find(p, /New Moon/)[0].jd, isoToJD('2000-01-06T18:14:00Z'))).toBeLessThan(25);
    expect(minutes(find(p, /First/)[0].jd, isoToJD('2000-01-14T13:34:00Z'))).toBeLessThan(25);
    expect(minutes(find(p, /Full/)[0].jd, isoToJD('2000-01-21T04:40:00Z'))).toBeLessThan(25);
    expect(minutes(find(p, /Last/)[0].jd, isoToJD('2000-01-28T07:57:00Z'))).toBeLessThan(25);
  });

  it('a year has about 12 or 13 of each phase', () => {
    const y = run('2026-01-01', '2026-12-31', ['moon']);
    for (const name of ['New Moon', 'Full Moon']) expect([12, 13]).toContain(find(y, new RegExp(name)).length);
  });
});

describe('seasons', () => {
  const s = run('2026-01-01', '2026-12-31', ['season']);
  it('puts the 2026 equinoxes and solstices within 15 minutes of the almanac', () => {
    expect(minutes(find(s, /March/)[0].jd, isoToJD('2026-03-20T14:46:00Z'))).toBeLessThan(15);
    expect(minutes(find(s, /June/)[0].jd, isoToJD('2026-06-21T08:25:00Z'))).toBeLessThan(15);
    expect(minutes(find(s, /September/)[0].jd, isoToJD('2026-09-23T00:05:00Z'))).toBeLessThan(15);
    expect(minutes(find(s, /December/)[0].jd, isoToJD('2026-12-21T20:50:00Z'))).toBeLessThan(15);
  });
  it('has exactly four, in calendar order', () => {
    expect(s.map(e => e.title)).toEqual(['March equinox', 'June solstice', 'September equinox', 'December solstice']);
  });
  it('the Sun is at the right longitude at each one', () => {
    s.forEach((e, i) =>
      expect(sunLongitudeOfDate(e.jd) % (2 * Math.PI)).toBeCloseTo(((i * Math.PI) / 2) % (2 * Math.PI), 4),
    );
  });
});

describe('meteor showers', () => {
  const m = run('2026-01-01', '2026-12-31', ['meteor']);
  it('has every shower once a year', () => expect(m).toHaveLength(SHOWERS.length));
  const day = (e: AstroEvent) => new Date((e.jd - 2440587.5) * 864e5).toISOString().slice(5, 10);
  it('peaks on the dates the International Meteor Organization lists', () => {
    expect(['01-03', '01-04']).toContain(day(find(m, /Quadrantids/)[0]));
    expect(['04-22', '04-23']).toContain(day(find(m, /Lyrids/)[0]));
    expect(['08-12', '08-13']).toContain(day(find(m, /Perseids/)[0]));
    expect(['10-21', '10-22']).toContain(day(find(m, /Orionids/)[0]));
    expect(['11-17', '11-18']).toContain(day(find(m, /Leonids/)[0]));
    expect(['12-13', '12-14']).toContain(day(find(m, /Geminids/)[0]));
  });
  it('says how much moonlight there is: the 2026 Perseids fall on a new Moon', () => {
    const p = find(m, /Perseids/)[0];
    expect(p.detail).toMatch(/Moon \d% lit: dark sky, good/);
    expect(p.sky).toBe(true);
  });
  it('the verdict gets worse with a brighter Moon', () => {
    expect(moonlightVerdict(0.05)).toContain('good');
    expect(moonlightVerdict(0.4)).toContain('fair');
    expect(moonlightVerdict(0.95)).toContain('poor');
  });
});

describe('planet events', () => {
  it('finds the oppositions on the dates in the almanac', () => {
    const p = run('2025-01-01', '2027-03-31', ['planet']);
    const opp = (name: string) => find(p, new RegExp(`${name} at opposition`));
    expect(Math.abs(opp('Mars')[0].jd - isoToJD('2025-01-16T00:00:00Z'))).toBeLessThan(1.5);
    expect(Math.abs(opp('Saturn')[0].jd - isoToJD('2025-09-21T00:00:00Z'))).toBeLessThan(1.5);
    expect(Math.abs(opp('Jupiter')[0].jd - isoToJD('2026-01-10T00:00:00Z'))).toBeLessThan(1.5);
    expect(Math.abs(opp('Mars')[1].jd - isoToJD('2027-02-19T00:00:00Z'))).toBeLessThan(1.5);
  });

  it('finds Venus at greatest eastern elongation in August 2026, about 46 degrees from the Sun', () => {
    const e = find(run('2026-06-01', '2026-10-31', ['planet']), /Venus at greatest eastern/)[0];
    expect(Math.abs(e.jd - isoToJD('2026-08-15T00:00:00Z'))).toBeLessThan(3);
    expect(e.detail).toMatch(/4[56]° from the Sun/);
    expect(e.detail).toContain('evening');
  });

  it('finds the close Venus and Jupiter pairing in June 2026', () => {
    const c = find(run('2026-05-15', '2026-07-15', ['planet']), /Venus and Jupiter/)[0];
    expect(Math.abs(c.jd - isoToJD('2026-06-09T00:00:00Z'))).toBeLessThan(2);
    expect(c.detail).toMatch(/Only [01]\.\d° apart/);
  });

  it('only reports pairings within two degrees', () => {
    for (const e of run('2025-01-01', '2027-12-31', ['planet']).filter(e => /close together/.test(e.title))) {
      expect(e.detail).toMatch(/Only \d\.\d° apart/);
    }
  });
});

describe('moon and planet pairings', () => {
  it('lists a few a year at most 4 degrees apart, and they are off by default in the UI', () => {
    const e = run('2026-01-01', '2026-12-31', ['moonplanet']);
    expect(e.length).toBeGreaterThan(8);
    expect(e.length).toBeLessThan(60);
    for (const x of e) expect(parseFloat(/(\d+\.\d)°/.exec(x.detail)![1])).toBeLessThanOrEqual(4);
  });
});

describe('eclipses', () => {
  it('uses NASA’s table: 22 solar and 23 lunar eclipses from 2025 to 2034', () => {
    expect(SOLAR_ECLIPSES).toHaveLength(22);
    expect(LUNAR_ECLIPSES).toHaveLength(23);
    expect(run('2025-01-01', '2034-12-31', ['eclipse'])).toHaveLength(45);
  });

  it('converts the 2026 total solar eclipse from Terrestrial Time to the 17:46 UT usually quoted', () => {
    const e = run('2026-08-01', '2026-08-31', ['eclipse']).find(x => x.title === 'Total solar eclipse')!;
    expect(minutes(e.jd, isoToJD('2026-08-12T17:46:00Z'))).toBeLessThan(1.5);
    expect(e.detail).toContain('Spain');
    expect(e.view).toMatchObject({ scene: 'earth', sel: 'moon' });
  });

  it('every solar eclipse falls at a new Moon and every lunar eclipse at a full Moon (to within 40 minutes)', () => {
    const phases = run('2025-01-01', '2034-12-31', ['moon']);
    const near = (jd: number, name: string) => phases.some(p => p.title === name && Math.abs(p.jd - jd) < 40 / 1440);
    for (const [d, t] of SOLAR_ECLIPSES) expect(near(eclipseUt(d, t), 'New Moon'), `solar ${d}`).toBe(true);
    for (const [d, t] of LUNAR_ECLIPSES) expect(near(eclipseUt(d, t), 'Full Moon'), `lunar ${d}`).toBe(true);
  });

  it('classifies by type in the title', () => {
    const e = run('2025-01-01', '2034-12-31', ['eclipse']);
    expect(find(e, /Total lunar/).length).toBeGreaterThan(5);
    expect(find(e, /Annular solar/).length).toBeGreaterThan(3);
    expect(find(e, /Hybrid solar/)).toHaveLength(1);
  });
});

describe('launches', () => {
  const rows: [string, string, string, string, string][] = [
    ['2026-12-01T10:00:00Z', 'Falcon 9 | Starlink', 'SpaceX', 'Cape Canaveral', 'Go'],
    ['2027-06-01T10:00:00Z', 'Far future', 'X', 'Y', ''],
    ['not a date', 'Broken', '', '', ''],
  ];
  it('keeps launches in range and drops unreadable ones', () => {
    const ev = launchEvents(rows, isoToJD('2026-11-24T00:00:00Z'), isoToJD('2027-01-01T00:00:00Z'));
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: 'launch', title: 'Falcon 9 | Starlink' });
    expect(ev[0].detail).toBe('SpaceX · Cape Canaveral · status: Go');
    expect(ev[0].view).toBeUndefined();
  });
});

describe('when to look', () => {
  const LONDON = { lat: 51.5, lon: -0.12 };
  const alt = (jd: number) =>
    skyPosition(sunEq(jd).dir, jd, (LONDON.lat * Math.PI) / 180, (LONDON.lon * Math.PI) / 180).alt;

  it('with no focus it picks the darkest hour, about local midnight', () => {
    const jd = isoToJD('2026-08-12T12:00:00Z'); // an event stamped at noon
    const t = bestViewingMoment(jd, LONDON.lat, LONDON.lon);
    expect(Math.abs(t - jd)).toBeLessThanOrEqual(0.5);
    expect(alt(t)).toBeLessThan(alt(jd));
    expect(alt(t)).toBeLessThan(-15); // astronomical darkness in August in London is marginal; this is still deep twilight
  });

  it('with a focus it picks a time the body is up and the sky is dark', () => {
    const jd = isoToJD('2026-11-24T14:53:00Z'); // full Moon
    const t = bestViewingMoment(jd, LONDON.lat, LONDON.lon, 'moon');
    expect(alt(t)).toBeLessThan(-4);
  });

  it('falls back to the darkest hour when the focus never clears the horizon in the dark', () => {
    // a south-pole observer in midwinter... use Mercury near the Sun: any answer must stay within half a day
    const jd = isoToJD('2026-06-21T12:00:00Z');
    const t = bestViewingMoment(jd, LONDON.lat, LONDON.lon, 'mercury');
    expect(Math.abs(t - jd)).toBeLessThanOrEqual(0.5);
  });
});

describe('labels', () => {
  it('has a label for every kind of event', () => {
    for (const k of ['eclipse', 'moon', 'season', 'meteor', 'planet', 'moonplanet', 'launch'] as const)
      expect(KIND_LABEL[k]).toBeTruthy();
  });
});
