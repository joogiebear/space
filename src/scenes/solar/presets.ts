import type { Preset } from '@/types';

/** Historic solar-system moments for the "Jump to a moment in time" menu (dates UTC). */
export const SOLAR_PRESETS: Preset[] = [
  {
    label: 'Voyager 1 launches (1977-09-05)',
    date: '1977-09-05T12:56Z',
    focus: 'jupiter',
    rate: 86400 * 10,
    note: 'Jupiter and Saturn were lined up for a once-in-175-years Grand Tour. Watch the outer planets.',
  },
  {
    label: "Halley's Comet at perihelion (1986-02-09)",
    date: '1986-02-09T12:00Z',
    query: 'halley',
    rate: 86400 * 2,
    note: "Closest approach to the Sun, 0.59 AU. The comet's orbit is retrograde, opposite to the planets.",
  },
  {
    label: 'Voyager 2 flies past Neptune (1989-08-25)',
    date: '1989-08-25T03:56Z',
    focus: 'neptune',
    rate: 86400 * 10,
    note: 'The only spacecraft ever to visit Neptune.',
  },
  {
    label: 'Comet hits Jupiter (1994-07-16)',
    date: '1994-07-16T20:15Z',
    focus: 'jupiter',
    rate: 86400,
    note: 'Fragments of Shoemaker–Levy 9 began striking Jupiter.',
  },
  {
    label: 'Mars closest in 60,000 years (2003-08-27)',
    date: '2003-08-27T09:51Z',
    focus: 'mars',
    rate: 86400 * 3,
    note: 'Mars opposition at 55.8 million km.',
  },
  {
    label: 'Neptune completes its first orbit (2011-07-12)',
    date: '2011-07-12T12:00Z',
    focus: 'neptune',
    rate: 86400 * 30,
    note: 'Back where it was discovered in 1846, after 164.8 years.',
  },
  {
    label: 'New Horizons flies past Pluto (2015-07-14)',
    date: '2015-07-14T11:49Z',
    focus: 'pluto',
    rate: 86400 * 5,
    note: 'First close look at Pluto.',
  },
  {
    label: 'Cassini ends at Saturn (2017-09-15)',
    date: '2017-09-15T11:55Z',
    focus: 'saturn',
    rate: 86400 * 5,
    note: "After 13 years the probe was steered into Saturn's atmosphere.",
  },
  {
    label: 'Great Conjunction (2020-12-21)',
    date: '2020-12-21T18:20Z',
    focus: 'jupiter',
    rate: 86400 * 3,
    note: 'Jupiter and Saturn looked only 0.1° apart from Earth.',
  },
  {
    label: 'Perseverance lands on Mars (2021-02-18)',
    date: '2021-02-18T20:55Z',
    focus: 'mars',
    rate: 86400 * 3,
    note: 'Jezero Crater touchdown.',
  },
];
