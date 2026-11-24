import type { Tour } from '@/engine/tour';
import { nowJD } from '@/lib';
import { loadLocation } from './earth/location';
import { skyTourSteps } from './skyTour';

const GREENWICH = { lat: 51.4769, lon: -0.0005 };

/**
 * Guided tours. Each step names a scene and (optionally) an object, a moment in time and a camera distance, using the
 * same view format as share links. Objects that are not found are skipped, so a tour never breaks on missing data.
 * Facts are rounded to what is safe to say in a caption.
 */
export const TOURS: Tour[] = [
  {
    id: 'solar',
    title: 'The solar system, one world at a time',
    blurb: 'The Sun and every planet, with the one fact worth knowing about each',
    steps: [
      {
        view: { scene: 'solar', sel: 'sun' },
        title: 'The Sun',
        text: 'It holds 99.8% of all the mass in the solar system. Everything else, every planet, moon and asteroid, is the leftover 0.2%.',
      },
      {
        view: { scene: 'solar', sel: 'mercury' },
        title: 'Mercury',
        text: 'The smallest planet and the fastest: it circles the Sun in just 88 days. With almost no atmosphere, it swings from about 430 °C in daylight to about −180 °C at night.',
      },
      {
        view: { scene: 'solar', sel: 'venus' },
        title: 'Venus',
        text: 'Hotter than Mercury, at around 465 °C, because its thick carbon dioxide air traps heat. It spins backwards, and one day there lasts longer than its year.',
      },
      {
        view: { scene: 'solar', sel: 'earth' },
        title: 'Earth',
        text: 'The only world we know with liquid oceans on the surface, and the only one known to have life. About 71% of its surface is water.',
      },
      {
        view: { scene: 'solar', sel: 'mars' },
        title: 'Mars',
        text: 'Home to Olympus Mons, a volcano about 22 km high, roughly two and a half times the height of Everest. A day on Mars is almost the same as ours: 24 hours 37 minutes.',
      },
      {
        view: { scene: 'solar', sel: 'jupiter' },
        title: 'Jupiter',
        text: 'More than twice as massive as all the other planets put together. Its Great Red Spot is a storm that has been raging for at least 150 years.',
      },
      {
        view: { scene: 'solar', sel: 'saturn' },
        title: 'Saturn',
        text: 'Its rings stretch about 280,000 km across yet are mostly only tens of metres thick. The planet itself is less dense than water.',
      },
      {
        view: { scene: 'solar', sel: 'uranus' },
        title: 'Uranus',
        text: 'Tipped on its side, with an axis tilted about 98°, so it rolls around the Sun. Each pole gets about 42 years of sunlight, then 42 years of darkness.',
      },
      {
        view: { scene: 'solar', sel: 'neptune' },
        title: 'Neptune',
        text: 'The windiest planet, with gusts above 2,000 km/h. It takes 165 years to orbit the Sun, so it has completed only one lap since it was discovered in 1846.',
      },
      {
        view: { scene: 'solar', sel: 'pluto' },
        title: 'Pluto',
        text: 'A dwarf planet on a 248-year orbit. New Horizons flew past it in July 2015 and found mountains of water ice and a heart-shaped plain of nitrogen ice.',
      },
    ],
  },
  {
    id: 'zoomout',
    title: 'Our place in the universe',
    blurb: 'Start in Earth orbit and zoom out, level by level, to the neighbouring galaxies',
    steps: [
      {
        view: { scene: 'earth', sel: 'earth' },
        title: 'Earth orbit',
        text: 'Thousands of working satellites circle the planet, along with the International Space Station and countless pieces of debris. This is the closest view in the atlas.',
        live: true,
      },
      {
        view: { scene: 'solar', sel: 'sun' },
        title: 'The solar system',
        text: 'Zoom out and Earth becomes one of eight planets circling a single star, about 150 million km away. Light from the Sun takes 8 minutes to reach us.',
      },
      {
        view: { scene: 'starmap', sel: 'sol' },
        title: 'Our stellar neighbourhood',
        text: 'The nearest other star, Proxima Centauri, is 4.2 light years away. At the speed of our fastest spacecraft, the trip would take tens of thousands of years.',
      },
      {
        view: { scene: 'gal:milkyway' },
        title: 'The Milky Way',
        text: 'Our galaxy holds hundreds of billions of stars in a disc about 100,000 light years wide. The Sun is about 26,000 light years from the centre, in a quiet spiral arm.',
      },
      {
        view: { scene: 'cosmos', sel: 'andromeda' },
        title: 'The galaxies around us',
        text: 'Andromeda, 2.5 million light years away, is the nearest large galaxy. It is moving toward us, and the two galaxies are expected to merge in about 4 to 5 billion years.',
      },
    ],
  },
  {
    id: 'timetravel',
    title: 'Earth and Moon through time',
    blurb: 'Apollo 11, a total eclipse, the solstice, and back to now',
    steps: [
      {
        view: { scene: 'earth', sel: 'moon', t: '1969-07-20T20:17:00.000Z', r: 60 },
        title: 'Apollo 11, 20 July 1969',
        text: 'At 20:17 UTC the lunar module Eagle touched down in the Sea of Tranquility. Watch the Moon move as the minutes run.',
      },
      {
        view: { scene: 'earth', sel: 'moon', t: '2024-04-08T17:30:00.000Z', r: 60 },
        title: 'Total solar eclipse, 8 April 2024',
        text: 'Around 18:17 UTC the Moon’s shadow swept across Mexico, the United States and Canada. The Moon lines up exactly between the Sun and Earth.',
      },
      {
        view: { scene: 'earth', sel: 'earth', t: '2026-12-21T20:50:00.000Z', r: 60 },
        title: 'December solstice',
        text: 'The northern hemisphere is tilted as far from the Sun as it gets. Watch the day-night line: the far north stays in darkness all day.',
      },
      {
        view: { scene: 'earth', sel: 'earth' },
        title: 'Back to now',
        text: 'The clock is back on real time and satellites are live again. Use the Time controls to jump anywhere else.',
        live: true,
      },
    ],
  },
  {
    id: 'skytonight',
    title: 'Your sky tonight',
    blurb: 'The Moon, the brightest planet and star that are up, worked out for where you are',
    steps: [],
    build: () => {
      const saved = loadLocation();
      return skyTourSteps(nowJD(), saved ?? GREENWICH, saved !== null);
    },
  },
];
