/**
 * The scale of things, from a proton to the whole observable universe: landmarks, plain-language sizes, and how long it
 * would take light, a jet or a spacecraft to cross each one. Sizes are in metres and are the usual published figures,
 * rounded; most things have no sharp edge, so treat them as "about".
 */
export const C = 299_792_458; // m/s
export const LIGHT_YEAR = 9.4607e15; // m
export const AU = 1.495978707e11; // m
export const AGE_OF_UNIVERSE_YEARS = 13.8e9;

export type ScaleKind = 'tiny' | 'life' | 'world' | 'star' | 'galaxy' | 'cosmos';

export interface Landmark {
  id: string;
  name: string;
  /** Size in metres: a width, or a distance where the name says so */
  m: number;
  kind: ScaleKind;
  /** One line that makes it real */
  note: string;
  /** A view in the atlas that shows it */
  view?: { scene: string; sel?: string };
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'proton',
    name: 'A proton',
    m: 1.7e-15,
    kind: 'tiny',
    note: 'Every atom’s nucleus contains them. About 300 billion would fit side by side across a single grain of sand.',
  },
  {
    id: 'hydrogen',
    name: 'A hydrogen atom',
    m: 1.06e-10,
    kind: 'tiny',
    note: 'The simplest atom. It is mostly empty space: its single proton is about 60,000 times smaller than the atom around it.',
  },
  {
    id: 'dna',
    name: 'The width of DNA',
    m: 2e-9,
    kind: 'life',
    note: 'The double helix that carries your genes. Stretched out, the DNA in one of your cells would be about 2 metres long.',
  },
  {
    id: 'virus',
    name: 'A coronavirus',
    m: 1e-7,
    kind: 'life',
    note: 'Too small to see with any ordinary microscope, but made of the same atoms as everything else.',
  },
  {
    id: 'cell',
    name: 'A red blood cell',
    m: 7.5e-6,
    kind: 'life',
    note: 'You have about 25 trillion of them, and your body makes around two million new ones every second.',
  },
  {
    id: 'hair',
    name: 'The width of a human hair',
    m: 7e-5,
    kind: 'life',
    note: 'About the smallest thing the unaided eye can pick out.',
  },
  {
    id: 'ant',
    name: 'An ant',
    m: 4e-3,
    kind: 'life',
    note: 'Some ants are smaller and some bigger, but a few millimetres is typical.',
  },
  {
    id: 'human',
    name: 'A person',
    m: 1.7,
    kind: 'life',
    note: 'Counted in powers of ten, you are a little over a third of the way up from a proton to the whole universe.',
  },
  { id: 'whale', name: 'A blue whale', m: 30, kind: 'life', note: 'The largest animal that has ever lived.' },
  {
    id: 'everest',
    name: 'The height of Mount Everest',
    m: 8849,
    kind: 'world',
    note: 'About 8.8 km above sea level, the highest point on Earth.',
  },
  {
    id: 'earth',
    name: 'Earth',
    m: 1.2742e7,
    kind: 'world',
    note: 'Light could circle it about seven and a half times in one second.',
    view: { scene: 'earth', sel: 'earth' },
  },
  {
    id: 'sun',
    name: 'The Sun',
    m: 1.3927e9,
    kind: 'star',
    note: 'About 109 Earths would fit side by side across it.',
    view: { scene: 'solar', sel: 'sun' },
  },
  {
    id: 'au',
    name: 'From Earth to the Sun',
    m: AU,
    kind: 'star',
    note: 'One astronomical unit. Sunlight takes about 8 minutes 20 seconds to arrive.',
    view: { scene: 'solar', sel: 'earth' },
  },
  {
    id: 'neptune',
    name: 'The orbit of Neptune',
    m: 9.0e12,
    kind: 'star',
    note: 'The planets’ whole home is a disc about 60 AU wide. Almost all of it is empty.',
    view: { scene: 'solar' },
  },
  {
    id: 'oort',
    name: 'The Oort cloud (outer edge)',
    m: 3e16,
    kind: 'star',
    note: 'A vast shell of icy comets, thought to reach about a light year and a half out. We have never seen it directly.',
  },
  {
    id: 'proxima',
    name: 'The distance to Proxima Centauri',
    m: 4.0e16,
    kind: 'star',
    note: 'The nearest other star. Our fastest spacecraft would need about 75,000 years.',
    view: { scene: 'starmap', sel: 'sol' },
  },
  {
    id: 'orion',
    name: 'The Orion Nebula',
    m: 2.3e17,
    kind: 'star',
    note: 'A stellar nursery you can see with the naked eye, about 24 light years across.',
  },
  {
    id: 'milkyway',
    name: 'The Milky Way',
    m: 9.46e20,
    kind: 'galaxy',
    note: 'About 100,000 light years across and home to hundreds of billions of stars.',
    view: { scene: 'gal:milkyway' },
  },
  {
    id: 'andromeda',
    name: 'The distance to Andromeda',
    m: 2.4e22,
    kind: 'galaxy',
    note: 'The nearest big galaxy, 2.5 million light years away. You can just see it as a smudge on a dark night.',
    view: { scene: 'cosmos', sel: 'andromeda' },
  },
  {
    id: 'localgroup',
    name: 'The Local Group',
    m: 9.46e22,
    kind: 'galaxy',
    note: 'Our galaxy’s neighbourhood: dozens of galaxies in a region about 10 million light years across.',
    view: { scene: 'cosmos' },
  },
  {
    id: 'virgo',
    name: 'The distance to the Virgo Cluster',
    m: 5.1e23,
    kind: 'cosmos',
    note: 'The nearest big cluster of galaxies, about 54 million light years away.',
    view: { scene: 'universe', sel: 'virgo' },
  },
  {
    id: 'laniakea',
    name: 'The Laniakea Supercluster',
    m: 4.9e24,
    kind: 'cosmos',
    note: 'The great region of galaxies our own galaxy belongs to: about 520 million light years across.',
    view: { scene: 'universe', sel: 'laniakea' },
  },
  {
    id: 'universe',
    name: 'The observable universe',
    m: 8.8e26,
    kind: 'cosmos',
    note: 'About 93 billion light years across: everything whose light has had time to reach us. There is more beyond, but we cannot see it.',
    view: { scene: 'universe' },
  },
];

/** The ends of the slider, as powers of ten of a metre. */
export const LOG_MIN = -16;
export const LOG_MAX = 27.5;

export const KIND_LABEL: Record<ScaleKind, string> = {
  tiny: 'Atoms and particles',
  life: 'Life',
  world: 'The world',
  star: 'Stars and the solar system',
  galaxy: 'Galaxies',
  cosmos: 'The universe',
};

/** 0 at the smallest end of the slider, 1 at the largest. */
export const scalePos = (m: number) => (Math.log10(m) - LOG_MIN) / (LOG_MAX - LOG_MIN);
export const sizeAt = (log10m: number) => 10 ** log10m;

/** Sizes in the unit that reads best, each starting where it becomes the natural choice. */
const UNITS: { name: string; size: number; from: number }[] = [
  { name: 'femtometres', size: 1e-15, from: 0 },
  { name: 'picometres', size: 1e-12, from: 1e-12 },
  { name: 'nanometres', size: 1e-9, from: 1e-9 },
  { name: 'micrometres', size: 1e-6, from: 1e-6 },
  { name: 'millimetres', size: 1e-3, from: 1e-3 },
  { name: 'metres', size: 1, from: 1 },
  { name: 'km', size: 1e3, from: 1e3 },
  { name: 'million km', size: 1e9, from: 1e9 },
  { name: 'AU', size: AU, from: 0.5 * AU },
  { name: 'light years', size: LIGHT_YEAR, from: 0.1 * LIGHT_YEAR },
  { name: 'million light years', size: 1e6 * LIGHT_YEAR, from: 1e6 * LIGHT_YEAR },
  { name: 'billion light years', size: 1e9 * LIGHT_YEAR, from: 1e9 * LIGHT_YEAR },
];

const num = (x: number) => {
  const digits = x >= 100 ? 0 : x >= 10 ? 0 : 1;
  return x.toLocaleString('en-US', { maximumFractionDigits: digits }).replace(/\.0$/, '');
};

/** A size in metres written plainly: "12,742 km", "8.3 AU", "93 billion light years". */
export function fmtSize(m: number): string {
  let u = UNITS[0];
  for (const x of UNITS) if (m >= x.from) u = x;
  const v = m / u.size;
  return `${num(v)} ${v === 1 && u.name.endsWith('s') ? u.name.slice(0, -1) : u.name}`;
}

/** The power of ten, written 10^n with a real superscript. */
export function powerOfTen(log10m: number): string {
  const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const n = Math.round(log10m);
  const digits = String(Math.abs(n))
    .split('')
    .map(d => sup[+d])
    .join('');
  return `10${n < 0 ? '⁻' : ''}${digits}`;
}

/** How long, in plain words. */
export function fmtDuration(seconds: number): string {
  if (!(seconds > 0)) return 'no time at all';
  const plural = (v: number, one: string, many = one + 's') => `${num(v)} ${v === 1 ? one : many}`;
  if (seconds < 1e-9) return 'less than a billionth of a second';
  if (seconds < 1e-6) return `${num(seconds * 1e9)} billionths of a second`;
  if (seconds < 1e-3) return `${num(seconds * 1e6)} millionths of a second`;
  if (seconds < 1) return `${num(seconds * 1e3)} thousandths of a second`;
  if (seconds < 90) return plural(Math.round(seconds * 10) / 10, 'second');
  if (seconds < 5400) return plural(Math.round(seconds / 60), 'minute');
  if (seconds < 172800) return plural(Math.round(seconds / 3600), 'hour');
  const days = seconds / 86400;
  if (days < 365.25 * 2) return plural(Math.round(days), 'day');
  const years = days / 365.25;
  if (years < 1e6) return plural(Math.round(years), 'year');
  if (years < 1e9) return `${num(years / 1e6)} million years`;
  if (years < AGE_OF_UNIVERSE_YEARS * 1.15) return `${num(years / 1e9)} billion years`;
  // beyond the age of the universe, say so: the number alone means nothing
  const r = years / AGE_OF_UNIVERSE_YEARS;
  return `${fmtTimes(r)} the age of the universe`;
}

/** Ways of getting about, in metres per second. */
export const SPEEDS = [
  { id: 'walk', label: 'Walking', v: 1.4 },
  { id: 'jet', label: 'A passenger jet', v: 250 },
  { id: 'voyager', label: 'Voyager 1, our fastest probe', v: 17_000 },
  { id: 'light', label: 'Light', v: C },
] as const;

export const travelSeconds = (m: number, v: number) => m / v;

/** "About 12 times", "about 3 million times": how many of a smaller size fit in a larger. */
export function fmtTimes(ratio: number): string {
  if (ratio < 1) return fmtTimes(1 / ratio).replace('times', 'times smaller');
  if (ratio < 1.15) return 'about the same size';
  if (ratio < 10) return `about ${num(Math.round(ratio * 10) / 10)} times`;
  const r = Math.round(ratio);
  if (ratio < 1e6)
    return `about ${(Math.round(r / 10 ** (String(r).length - 2)) * 10 ** (String(r).length - 2)).toLocaleString('en-US')} times`;
  const e = Math.floor(Math.log10(ratio)),
    lead = ratio / 10 ** e;
  const names: Record<number, string> = { 6: 'million', 9: 'billion', 12: 'trillion' };
  const g = e - (e % 3);
  const v = ratio / 10 ** g;
  void lead;
  return names[g]
    ? `about ${num(Math.round(v * 10) / 10)} ${names[g]} times`
    : `about ${powerOfTen(Math.round(Math.log10(ratio)))} times`;
}

/** The landmarks just under and just over a size, for "between a … and a …". */
export function neighbours(m: number): { below?: Landmark; above?: Landmark } {
  let below: Landmark | undefined, above: Landmark | undefined;
  for (const l of LANDMARKS) {
    if (l.m <= m && (!below || l.m > below.m)) below = l;
    if (l.m > m && (!above || l.m < above.m)) above = l;
  }
  return { below, above };
}

/** The landmark closest to a size on the log scale. */
export function nearest(m: number): Landmark {
  return LANDMARKS.reduce((best, l) => (Math.abs(Math.log10(l.m / m)) < Math.abs(Math.log10(best.m / m)) ? l : best));
}
