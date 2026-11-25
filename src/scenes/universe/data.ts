/**
 * The Observable Universe view: what lies beyond the Local Universe, out to the oldest light we can see.
 *
 * Distances are *light-travel distances* ("lookback"): how long the light we see from it has been travelling. That is what
 * we actually observe, and it is why looking far means looking back in time. Directions are schematic. The cosmic web
 * that fills the view is generated to look like the real thing (filaments around huge voids); it is not a map of real galaxies.
 */
export interface Structure {
  id: string;
  name: string;
  /** Light-travel distance in billions of light years; 0 for us */
  gly: number;
  /** Direction on the sky as [azimuth, elevation] in degrees (schematic) */
  dir: [number, number];
  sub: string;
  text: string;
  rows?: [string, string][];
}

/** How far out the picture goes (scene units) */
export const RMAX = 300;
/** The oldest light we can see: the cosmic microwave background, light-travel distance in billions of light years */
export const EDGE_GLY = 13.8;

/**
 * The picture is on a logarithmic distance scale, otherwise the nearby universe would be a dot: scene radius for a
 * light-travel distance in billions of light years. 0 gives 0 and the edge gives RMAX.
 */
export const mapRadius = (gly: number) => (RMAX * Math.log10(1 + gly * 1000)) / Math.log10(1 + EDGE_GLY * 1000);

/** A unit vector from azimuth and elevation in degrees. */
export function dirOf(az: number, el: number): [number, number, number] {
  const a = (az * Math.PI) / 180,
    e = (el * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
}

export const STRUCTURES: Structure[] = [
  {
    id: 'you',
    name: 'Milky Way · you are here',
    gly: 0,
    dir: [0, 0],
    sub: 'Our galaxy, in the middle of everything we can see',
    text: 'Every distance here is measured from us. That does not make us special: an observer in any other galaxy would see the same, centred on themselves.',
  },
  {
    id: 'localgroup',
    name: 'Local Group',
    gly: 0.003,
    dir: [35, 12],
    sub: 'Dozens of galaxies · about 10 million light years across',
    text: 'Our galaxy’s home: the Milky Way, Andromeda, Triangulum and dozens of smaller galaxies, all held together by gravity. Everything in the Local Universe view fits inside it.',
  },
  {
    id: 'virgo',
    name: 'Virgo Cluster',
    gly: 0.054,
    dir: [95, 14],
    sub: 'About 54 million light years away',
    text: 'The nearest big cluster of galaxies, with well over a thousand members. At its heart is the giant galaxy Messier 87 and its famous black hole.',
    rows: [['Distance', 'about 54 million light years']],
  },
  {
    id: 'laniakea',
    name: 'Laniakea Supercluster',
    gly: 0.2,
    dir: [200, -18],
    sub: 'About 520 million light years across',
    text: 'The great region of galaxies we belong to, found by mapping which way galaxies flow. It holds about 100,000 galaxies, and it is drawn toward a concentration of mass near its middle called the Great Attractor.',
    rows: [
      ['Size', 'about 520 million light years across'],
      ['Galaxies', 'about 100,000'],
      ['Centre', 'about 200 million light years away'],
    ],
  },
  {
    id: 'coma',
    name: 'Coma Cluster',
    gly: 0.32,
    dir: [320, 38],
    sub: 'About 320 million light years away',
    text: 'A dense cluster of thousands of galaxies. In the 1930s its galaxies were moving so fast that Fritz Zwicky concluded there must be a great deal of unseen mass: an early clue to dark matter.',
  },
  {
    id: 'shapley',
    name: 'Shapley Supercluster',
    gly: 0.65,
    dir: [160, -30],
    sub: 'About 650 million light years away',
    text: 'The largest concentration of galaxy clusters in our part of the universe, a great pile of mass that tugs on the Local Group from far beyond the Great Attractor.',
  },
  {
    id: 'sloan',
    name: 'Sloan Great Wall',
    gly: 1.0,
    dir: [265, 28],
    sub: 'About 1 billion light years away · 1.4 billion light years long',
    text: 'A wall of galaxies strung along a single filament, mapped by the Sloan Digital Sky Survey. Structures like this are the largest known threads of the cosmic web.',
  },
  {
    id: '3c273',
    name: 'Quasar 3C 273',
    gly: 2.4,
    dir: [60, -40],
    sub: 'About 2.4 billion light years away',
    text: 'The first quasar ever identified, in 1963. It is the glowing disc around a giant black hole, and it outshines its whole galaxy, so bright that a small telescope can see it from 2.4 billion light years.',
  },
  {
    id: 'hercules',
    name: 'Hercules–Corona Borealis Great Wall',
    gly: 10,
    dir: [120, 50],
    sub: 'About 10 billion light years away · claimed to be 10 billion light years across',
    text: 'A claimed pattern of gamma-ray bursts that would make it the largest structure known. Some astronomers doubt it is real, so treat it as an open question rather than a settled fact.',
  },
  {
    id: 'ton618',
    name: 'TON 618',
    gly: 10.4,
    dir: [300, -55],
    sub: 'About 10.4 billion light years away',
    text: 'A quasar powered by one of the heaviest black holes known, tens of billions of times the Sun’s mass. We see it as it was 10 billion years ago.',
  },
  {
    id: 'jades',
    name: 'JADES-GS-z14-0',
    gly: 13.5,
    dir: [20, 62],
    sub: 'One of the most distant galaxies known · seen as it was 290 million years after the Big Bang',
    text: 'Found by the James Webb Space Telescope in 2024. Its light left it so long ago that the universe was then only about two per cent of its present age.',
  },
  {
    id: 'cmb',
    name: 'Cosmic microwave background',
    gly: EDGE_GLY,
    dir: [230, 70],
    sub: 'The oldest light · from 380,000 years after the Big Bang',
    text: 'The edge of what we can see. Before this the universe was an opaque glowing fog, so no light from earlier can reach us. The matter that sent this light is now about 46 billion light years away, because space has been expanding the whole time.',
    rows: [
      ['Light travelled', '13.8 billion years'],
      ['Distance now', 'about 46 billion light years'],
    ],
  },
];

/** Rings drawn at round distances, to give the log scale something to be read against. */
export const RINGS = [
  { gly: 0.1, label: '100 million light years' },
  { gly: 1, label: '1 billion light years' },
  { gly: 10, label: '10 billion light years' },
];
