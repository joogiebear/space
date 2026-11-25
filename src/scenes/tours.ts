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
    id: 'address',
    title: 'Our cosmic address',
    blurb: 'From your planet out to the edge of the observable universe, one step at a time',
    steps: [
      {
        view: { scene: 'earth', sel: 'earth' },
        title: 'Planet Earth',
        text: 'Your address starts here: a rocky planet about 12,700 km across, the third from its star. Light can circle it about seven and a half times in a second.',
      },
      {
        view: { scene: 'solar', sel: 'sun' },
        title: 'The Solar System',
        text: 'Earth is one of eight planets circling the Sun. Out to Neptune it is about 60 AU across, and light takes around four hours to get from the Sun to Neptune.',
      },
      {
        view: { scene: 'starmap', sel: 'sol' },
        title: 'The neighbourhood',
        text: 'The nearest other star, Proxima Centauri, is 4.2 light years away. Even the stars you can see by eye are almost all within a few thousand light years: a tiny patch of our galaxy.',
      },
      {
        view: { scene: 'gal:milkyway', sel: 'sun' },
        title: 'The Milky Way',
        text: 'The Sun sits about 26,000 light years from the centre of a galaxy roughly 100,000 light years across, in a minor arm called the Orion Spur. We orbit the centre once every 225 million years.',
      },
      {
        view: { scene: 'cosmos', sel: 'andromeda' },
        title: 'The Local Group',
        text: 'Our galaxy has dozens of neighbours in a region about 10 million light years across. The biggest are the Milky Way and Andromeda, 2.5 million light years away and heading our way.',
      },
      {
        view: { scene: 'universe', sel: 'virgo' },
        title: 'The Virgo Cluster',
        text: 'The nearest big cluster of galaxies is about 54 million light years away, home to well over a thousand galaxies and the giant black hole of Messier 87.',
      },
      {
        view: { scene: 'universe', sel: 'laniakea' },
        title: 'Laniakea',
        text: 'The Virgo Cluster and our Local Group are both part of Laniakea, a supercluster about 520 million light years across holding some 100,000 galaxies. This is the biggest thing we are known to belong to.',
      },
      {
        view: { scene: 'universe', sel: 'cmb' },
        title: 'The edge of what we can see',
        text: 'The oldest light, from 380,000 years after the Big Bang, has travelled 13.8 billion years to reach us. The matter that sent it is now about 46 billion light years away. Beyond lies more universe we cannot see.',
      },
    ],
  },
  {
    id: 'blackholes',
    title: 'Black holes, from small to huge',
    blurb: 'A pulsar, stellar and supermassive black holes, and two that merged',
    steps: [
      {
        view: { scene: 'blackholes', sel: 'crab' },
        title: 'Not quite a black hole',
        text: 'A neutron star is what a heavy star leaves behind when it stops short of becoming a black hole: about 20 km across, with more mass than the Sun. This one flashes 30 times a second.',
      },
      {
        view: { scene: 'blackholes', sel: 'gaiabh1' },
        title: 'The nearest known',
        text: 'Gaia BH1 is only 1,560 light years away and about 10 times the Sun’s mass, yet its horizon is just 28 km across. It was found by the wobble of the star orbiting it.',
      },
      {
        view: { scene: 'blackholes', sel: 'gw150914' },
        title: 'Two become one',
        text: 'In 2015 two black holes merged and sent out ripples in space itself, the first gravitational waves ever detected. For a moment they outshone all the stars in the universe, in waves rather than light.',
      },
      {
        view: { scene: 'blackholes', sel: 'sgra' },
        title: 'At the heart of the Milky Way',
        text: 'Sagittarius A* weighs 4.3 million suns and sits 26,700 light years away. Its horizon is about 25 million km across, comfortably inside Mercury’s orbit.',
      },
      {
        view: { scene: 'blackholes', sel: 'm87' },
        title: 'The first picture',
        text: 'In 2019 astronomers combined radio dishes across the world to photograph this one: a glowing ring around a dark shadow. Its horizon is about 128 times the Earth–Sun distance across.',
      },
      {
        view: { scene: 'blackholes', sel: 'ton618' },
        title: 'The heavyweight',
        text: 'TON 618 is thought to weigh tens of billions of suns. Its horizon is roughly 1,300 times the Earth–Sun distance across, far wider than our whole solar system.',
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
