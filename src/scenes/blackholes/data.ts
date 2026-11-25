/**
 * The compact objects in the Black Holes view. Masses, distances and dates are the published values, rounded to what is
 * safe to say. How big each is drawn is schematic: the real sizes span ten orders of magnitude, so each is drawn at
 * a size that fits, and the real radius is in its info.
 */
export type Kind = 'stellar' | 'supermassive' | 'merger' | 'pulsar';

export interface CompactObject {
  id: string;
  name: string;
  kind: Kind;
  /** Mass in suns */
  mass: number;
  /** Light years from us */
  distanceLy: number;
  /** Drawn horizon radius in scene units; the picture reaches about nine times this far */
  draw: number;
  /** Accretion disc colours: [outer, inner] as 0..1 rgb */
  disc: [number[], number[]];
  /** Tilt of the disc away from face-on, degrees (how edge-on we see it in the picture) */
  tilt: number;
  /** Extra rows for the info panel */
  facts: [string, string][];
  sub: string;
  text: string;
  /** Galactic longitude and latitude in degrees, for objects inside the Milky Way (measured from the Sun) */
  galactic?: { l: number; b: number };
  /** Where it sits in the atlas: the view to open and the object in it */
  home?: { scene: string; sel: string; label: string };
}

/** The Milky Way view puts the Sun 30 units from the centre, which is about 26,000 light years. */
export const LY_PER_UNIT = 26000 / 30;

/**
 * Where a thing seen at galactic longitude `l`, latitude `b` and distance `ly` from the Sun lies, as steps along three
 * directions in the Milky Way view: toward the galactic centre, along the Sun's direction of travel (longitude 90°), and
 * toward the north galactic pole (up). In scene units.
 */
export function sunOffset(l: number, b: number, ly: number): { toCentre: number; ahead: number; up: number } {
  const L = (l * Math.PI) / 180,
    B = (b * Math.PI) / 180,
    d = ly / LY_PER_UNIT;
  return { toCentre: d * Math.cos(B) * Math.cos(L), ahead: d * Math.cos(B) * Math.sin(L), up: d * Math.sin(B) };
}

/** Radius of the event horizon of a non-spinning black hole, in km: 2GM/c². About 2.95 km for each sun of mass. */
export const schwarzschildKm = (solarMasses: number) => 2.953 * solarMasses;

const AU_KM = 149_597_870.7,
  SUN_RADIUS_KM = 695_700;

/** A length in the unit that reads best: km, sun radii, or AU. */
export function fmtLength(km: number): string {
  const n = (x: number, d = 1) => x.toLocaleString('en-US', { maximumFractionDigits: d });
  if (km < 1000) return `${n(km, km < 10 ? 1 : 0)} km`;
  if (km < 5e6) return `${n(km, 0)} km`;
  if (km < 0.5 * AU_KM) return `${n(km / SUN_RADIUS_KM, 0)} sun radii`;
  return `${n(km / AU_KM, km / AU_KM < 10 ? 1 : 0)} AU`;
}

/** A mass in suns, written plainly. */
export function fmtMass(m: number): string {
  if (m < 100) return `${m % 1 ? m.toFixed(1) : m} suns`;
  if (m < 1e6) return `${Math.round(m).toLocaleString('en-US')} suns`;
  if (m < 1e9) return `${(m / 1e6).toFixed(1).replace(/\.0$/, '')} million suns`;
  return `${(m / 1e9).toFixed(1).replace(/\.0$/, '')} billion suns`;
}

export function fmtDistance(ly: number): string {
  if (ly < 1e6) return `${Math.round(ly).toLocaleString('en-US')} light years`;
  if (ly < 1e9) return `${(ly / 1e6).toFixed(ly < 1e7 ? 1 : 0).replace(/\.0$/, '')} million light years`;
  return `${(ly / 1e9).toFixed(1).replace(/\.0$/, '')} billion light years`;
}

export const OBJECTS: CompactObject[] = [
  {
    id: 'crab',
    name: 'Crab Pulsar',
    kind: 'pulsar',
    mass: 1.4,
    distanceLy: 6500,
    draw: 1.1,
    disc: [
      [0.55, 0.7, 1],
      [0.9, 0.95, 1],
    ],
    tilt: 0,
    sub: 'Neutron star · 6,500 light years away',
    text: 'Not a black hole but the next thing down: the crushed core of a star seen to explode in 1054. It is about 20 km across, spins 30 times a second, and sweeps two beams of radiation past us like a lighthouse.',
    galactic: { l: 184.56, b: -5.78 },
    home: { scene: 'gal:milkyway', sel: 'crab', label: 'Find it in the Milky Way' },
    facts: [
      ['Size', 'about 20 km across'],
      ['Spin', '30 times a second'],
      ['Born', 'supernova seen from Earth in 1054'],
    ],
  },
  {
    id: 'gaiabh1',
    name: 'Gaia BH1',
    kind: 'stellar',
    mass: 9.6,
    distanceLy: 1560,
    draw: 0.9,
    disc: [
      [0.55, 0.7, 1],
      [0.95, 0.97, 1],
    ],
    tilt: 78,
    sub: 'Stellar black hole · 1,560 light years away',
    text: 'The closest black hole known, found in 2022 from the wobble it causes in a Sun-like star circling it at about the distance of Earth from the Sun. It is quiet: it is not feeding, so it gives off no light of its own.',
    galactic: { l: 22.63, b: 18.05 },
    home: { scene: 'gal:milkyway', sel: 'gaiabh1', label: 'Find it in the Milky Way' },
    facts: [['Found', '2022, from Gaia satellite data']],
  },
  {
    id: 'cygx1',
    name: 'Cygnus X-1',
    kind: 'stellar',
    mass: 21.2,
    distanceLy: 7200,
    draw: 1.2,
    disc: [
      [0.5, 0.65, 1],
      [0.95, 0.97, 1],
    ],
    tilt: 72,
    sub: 'Stellar black hole · 7,200 light years away',
    text: 'The first object widely accepted as a black hole. It pulls gas off a blue supergiant companion into a hot disc that glows in X-rays, and it spins close to the fastest rate possible.',
    galactic: { l: 71.33, b: 3.07 },
    home: { scene: 'gal:milkyway', sel: 'cygx1', label: 'Find it in the Milky Way' },
    facts: [
      ['Discovered', 'X-ray source found in 1964'],
      ['Companion', 'a blue supergiant about 40 times the Sun’s mass'],
    ],
  },
  {
    id: 'gw150914',
    name: 'GW150914',
    kind: 'merger',
    mass: 62,
    distanceLy: 1.3e9,
    draw: 0.8,
    disc: [
      [0.6, 0.7, 1],
      [1, 0.95, 0.9],
    ],
    tilt: 80,
    sub: 'Two black holes merging · 1.3 billion light years away',
    text: 'Two black holes of about 36 and 29 suns spiralled together and merged. The ripples in space arrived on 14 September 2015 and were the first gravitational waves ever detected. About 3 suns of mass were radiated away in a fraction of a second.',
    facts: [
      ['Before', 'about 36 and 29 suns'],
      ['Radiated', 'about 3 suns, as gravitational waves'],
    ],
  },
  {
    id: 'sgra',
    name: 'Sagittarius A*',
    kind: 'supermassive',
    mass: 4.3e6,
    distanceLy: 26700,
    draw: 2.4,
    disc: [
      [1, 0.5, 0.2],
      [1, 0.9, 0.7],
    ],
    tilt: 68,
    sub: 'Supermassive black hole · 26,700 light years away',
    text: 'The black hole at the centre of the Milky Way. Stars race around it at thousands of kilometres a second. It is quiet now, living on a trickle of gas. The Event Horizon Telescope imaged its shadow in 2022.',
    home: { scene: 'gal:milkyway', sel: 'sgra', label: 'Find it in the Milky Way' },
    facts: [['First image', 'Event Horizon Telescope, 2022']],
  },
  {
    id: 'm87',
    name: 'Messier 87*',
    kind: 'supermassive',
    mass: 6.5e9,
    distanceLy: 53e6,
    draw: 3.4,
    disc: [
      [1, 0.45, 0.15],
      [1, 0.88, 0.6],
    ],
    tilt: 70,
    sub: 'Supermassive black hole · 53 million light years away',
    text: 'The black hole in the giant galaxy M87, the first ever imaged: in 2019 the Event Horizon Telescope showed a ring of hot gas around a dark shadow. It also fires a jet of particles that stretches about 5,000 light years.',
    home: { scene: 'gal:m87', sel: 'm87bh', label: 'Find it in its galaxy' },
    facts: [
      ['First image', 'Event Horizon Telescope, 2019'],
      ['Jet', 'about 5,000 light years long'],
    ],
  },
  {
    id: 'ton618',
    name: 'TON 618',
    kind: 'supermassive',
    mass: 6.6e10,
    distanceLy: 10.4e9,
    draw: 4.4,
    disc: [
      [0.95, 0.4, 0.15],
      [1, 0.8, 0.5],
    ],
    tilt: 75,
    sub: 'Ultramassive black hole · about 10 billion light years away',
    text: 'One of the heaviest black holes known, powering a quasar so bright it outshines its whole galaxy. Its horizon is about 1,300 times the Earth–Sun distance across: far wider than the whole solar system.',
    facts: [
      ['Mass', 'estimates run from 40 to 66 billion suns'],
      ['Distance', 'light-travel time; it is further now'],
    ],
  },
];

/** How far the picture reaches from its centre, in scene units. */
export const reach = (o: CompactObject) => (o.kind === 'merger' ? o.draw * 9 + 8 : o.draw * 9);

/** Where to put each picture along the x axis so none overlaps: centres in order, packed with a gap and centred on 0. */
export function layoutX(halves: number[], gap: number): number[] {
  const out: number[] = [];
  let x = 0;
  halves.forEach((h, i) => {
    if (i) x += halves[i - 1] + gap + h;
    out.push(x);
  });
  const mid = (out[0] + out[out.length - 1]) / 2;
  return out.map(v => v - mid);
}

/** The two real pictures of a black hole's shadow, shown beneath the drawing of the same object. */
export interface EhtImage {
  id: string;
  /** The object it is a picture of */
  of: string;
  name: string;
  file: string;
  /** How wide the bright ring is across, as a fraction of the picture: used to draw the ring at the same size as the drawing's */
  ringFrac: number;
  sub: string;
  text: string;
  credit: string;
}

export const EHT_IMAGES: EhtImage[] = [
  {
    id: 'm87eht',
    of: 'm87',
    name: 'M87* · EHT image',
    file: 'm87.jpg',
    ringFrac: 0.375,
    sub: 'Radio image · released 10 April 2019',
    text: 'The first image of a black hole. Eight radio telescopes on Earth worked together as one dish the size of the planet. The bright crescent is hot gas swirling toward the hole, brighter on the side moving toward us; the dark middle is the shadow. The colours are false: this is radio light.',
    credit: 'EHT Collaboration (CC BY 4.0)',
  },
  {
    id: 'sgraeht',
    of: 'sgra',
    name: 'Sagittarius A* · EHT image',
    file: 'sgra.jpg',
    ringFrac: 0.62,
    sub: 'Radio image · released 12 May 2022',
    text: 'The black hole at the heart of our own galaxy, about 1,500 times lighter than M87*. Its gas circles in minutes, so the picture is an average of many observations. It has the same ring and shadow that Einstein’s theory predicts. The colours are false: this is radio light.',
    credit: 'EHT Collaboration (CC BY 4.0)',
  },
];
