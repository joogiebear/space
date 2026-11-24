import { describe, expect, it } from 'vitest';
import { isoToJD, skyPosition, sunEq } from '@/lib';
import { PLANETS } from './sky/planets';
import { TOUR_STARS, brightest, skyTourSteps } from './skyTour';

const LONDON = { lat: 51.5074, lon: -0.1278 };
const SYDNEY = { lat: -33.8688, lon: 151.2093 };
const D2R = Math.PI / 180;
const sunAlt = (jd: number, p = LONDON) => skyPosition(sunEq(jd).dir, jd, p.lat * D2R, p.lon * D2R).alt;
const steps = (when: string, p = LONDON, located = true) => skyTourSteps(isoToJD(when), p, located);

describe('brightest', () => {
  const items = [
    { n: 'a', mag: 2, alt: 50 },
    { n: 'b', mag: -1, alt: 5 },
    { n: 'c', mag: 0.5, alt: 30 },
  ];
  it('picks the brightest of those above the limit', () => {
    expect(
      brightest(
        items,
        x => x.mag,
        x => x.alt,
        10,
      )?.n,
    ).toBe('c'); // b is brighter but too low
    expect(
      brightest(
        items,
        x => x.mag,
        x => x.alt,
        0,
      )?.n,
    ).toBe('b');
  });
  it('returns null when nothing is up', () => {
    expect(
      brightest(
        items,
        x => x.mag,
        x => x.alt,
        80,
      ),
    ).toBeNull();
    expect(
      brightest(
        [],
        () => 0,
        () => 0,
        0,
      ),
    ).toBeNull();
  });
});

describe('the star table', () => {
  it('has real positions: Sirius is the brightest, and every entry is on the sky sphere', () => {
    const sorted = [...TOUR_STARS].sort((a, b) => a.mag - b.mag);
    expect(sorted[0].name).toBe('Sirius');
    for (const s of TOUR_STARS) {
      expect(s.ra).toBeGreaterThanOrEqual(0);
      expect(s.ra).toBeLessThan(360);
      expect(Math.abs(s.dec)).toBeLessThanOrEqual(90);
      expect(s.fact.length).toBeGreaterThan(20);
    }
    expect(new Set(TOUR_STARS.map(s => s.hip)).size).toBe(TOUR_STARS.length);
  });
});

describe('the sky tour', () => {
  it('on a dark evening starts right now, then the Moon, a planet and a star, a time-lapse, and back to real time', () => {
    const s = steps('2026-11-24T20:00:00Z');
    expect(s).toHaveLength(6);
    expect(s[0].live).toBe(true);
    expect(s[0].title).toBe('Your sky right now');
    expect(s[0].text).toContain('Full night');
    expect(s[1].view).toMatchObject({ scene: 'sky', sel: 'moon' });
    expect(s[1].text).toMatch(/Full Moon, 100% lit, in the [NESW]+ at \d+°/);
    expect(PLANETS.map(p => p.id)).toContain(s[2].view.sel);
    expect(s[2].text).toMatch(/\d+° up in the [NESW]+\. Planets shine steadily/);
    expect(s[3].view.sel).toMatch(/^hip\d+$/);
    expect(s[3].view.q).toBeTruthy();
    expect(s.at(-2)).toMatchObject({ title: 'Watch the sky turn', transient: true, hold: 12000 });
    expect(s.at(-2)!.view.r).toBe(7200);
    expect(s.at(-1)).toMatchObject({ title: 'Over to you', live: true });
  });

  it('by day it moves to the darkest hour of the coming night instead', () => {
    const now = isoToJD('2026-06-21T12:00:00Z'),
      s = skyTourSteps(now, LONDON, true);
    expect(s[0].live).toBe(false);
    expect(s[0].title).toBe('Your sky tonight');
    const t = isoToJD(s[0].view.t!);
    expect(Math.abs(t - now)).toBeLessThanOrEqual(0.5);
    expect(sunAlt(t)).toBeLessThan(-6);
    expect(s[0].text).toMatch(/at \d/); // the time is stated
    expect(s.at(-2)!.view.t).toBe(s[0].view.t); // the time-lapse starts from the same moment
  });

  it('the star it names is the brightest one really above 15 degrees at that moment', () => {
    for (const [when, place] of [
      ['2026-11-24T20:00:00Z', LONDON],
      ['2026-11-24T12:00:00Z', SYDNEY],
      ['2026-03-10T22:00:00Z', LONDON],
    ] as const) {
      const jd = isoToJD(when),
        s = skyTourSteps(jd, place, true),
        t = s[0].live ? jd : isoToJD(s[0].view.t!);
      const up = TOUR_STARS.filter(star => {
        const dec = star.dec * D2R,
          ra = star.ra * D2R;
        const v: [number, number, number] = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
        return skyPosition(v, t, place.lat * D2R, place.lon * D2R).alt > 15;
      });
      const expected = up.sort((a, b) => a.mag - b.mag)[0];
      const named = s.find(x => x.view.sel?.startsWith('hip'))!;
      expect(named.title, `${when} ${place.lat}`).toBe(expected.name);
    }
  });

  it('says so when the Moon is not up, and when it will rise', () => {
    const moon = steps('2026-08-12T22:00:00Z')[1]; // new Moon: it sets with the Sun
    expect(moon.title).toBe('The Moon is down');
    expect(moon.view.sel).toBeUndefined();
    expect(moon.text).toMatch(/New Moon|Waning crescent|Waxing crescent/);
    expect(moon.text).toMatch(/below the horizon/);
    expect(moon.text).toMatch(/rises at/);
  });

  it('works in the southern hemisphere', () => {
    const s = steps('2026-11-24T12:00:00Z', SYDNEY); // 23:00 local
    expect(s).toHaveLength(6);
    expect(s[0].text).toContain('-33.9°, 151.2°');
  });

  it('where the sky never gets dark, it does not point at stars it cannot show', () => {
    const s = skyTourSteps(isoToJD('2026-06-21T12:00:00Z'), { lat: 80, lon: 0 }, true);
    expect(s.some(x => x.view.sel?.startsWith('hip'))).toBe(false);
    expect(s.find(x => x.title === 'No bright planet up')?.text).toMatch(/never gets properly dark/);
    expect(s.at(-1)!.live).toBe(true); // still ends cleanly
  });

  it('admits when it is showing Greenwich as a stand-in', () => {
    expect(steps('2026-11-24T20:00:00Z', LONDON, false)[0].text).toContain('Greenwich');
    expect(steps('2026-11-24T20:00:00Z', LONDON, true)[0].text).not.toContain('Greenwich');
  });

  it('every step has a title and a caption of sensible length', () => {
    for (const s of steps('2026-11-24T20:00:00Z')) {
      expect(s.title.length).toBeGreaterThan(2);
      expect(s.text.length).toBeGreaterThan(40);
      expect(s.text.length).toBeLessThan(330);
    }
  });
});
