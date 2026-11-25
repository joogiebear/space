/**
 * Real photographs of the galaxies, shown in the Local Universe view from a distance and handed over to the generated
 * stars as you fly in. Credits are in public/assets/galaxies/CREDITS.md. Nobody has photographed the Milky Way from
 * outside, so it shows NASA's artist's concept of what we think it looks like, labelled as an illustration.
 */
export interface GalaxyPhoto {
  /** File in assets/galaxies */
  file: string;
  /** How wide the picture is drawn, in galaxy radii: the picture is larger than the galaxy it frames. */
  size: number;
  /** Part of the picture to show, as fractions of its width and height from the top left: [x, y, width, height]. */
  crop?: [number, number, number, number];
  /** The credit shown in the galaxy's info */
  credit: string;
  /** How tilted the galaxy really is in the picture, degrees: 0 face-on, 90 edge-on. Used to turn it face-on. */
  inclination?: number;
  /** Angle of the galaxy's long axis on the page, degrees counter-clockwise from the right; 0 when it is round. */
  angle?: number;
  /** An artist's impression rather than a photograph; the info panel says so. */
  illustration?: boolean;
}

export const PHOTOS: Record<string, GalaxyPhoto> = {
  milkyway: {
    inclination: 0,
    angle: 0,
    file: 'milkyway.jpg',
    size: 2.4,
    illustration: true,
    credit: "Artist's concept based on Spitzer data, NASA/JPL-Caltech/R. Hurt (SSC) (public domain)",
  },
  andromeda: {
    inclination: 77,
    angle: -52,
    file: 'andromeda.jpg',
    size: 2.4,
    credit: 'GALEX ultraviolet, NASA/JPL-Caltech (public domain)',
  },
  triangulum: {
    inclination: 56,
    angle: -63,
    file: 'triangulum.jpg',
    size: 3.3,
    credit: 'VLT Survey Telescope, ESO (CC BY 4.0)',
  },
  lmc: {
    inclination: 35,
    angle: 0,
    file: 'lmc.jpg',
    size: 2.2,
    // the Spitzer picture comes with a frame and a caption: show only the picture
    crop: [0.031, 0.071, 0.938, 0.75],
    credit: 'Spitzer infrared, NASA/JPL-Caltech/M. Meixner (STScI) and the SAGE Legacy Team (public domain)',
  },
  smc: {
    inclination: 0,
    angle: 0,
    file: 'smc.jpg',
    size: 2.6,
    credit: 'CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever; processing T. Rector et al. (CC BY 4.0)',
  },
  whirlpool: {
    inclination: 20,
    angle: 0,
    file: 'whirlpool.jpg',
    size: 2.4,
    credit: 'Hubble, NASA and ESA (public domain)',
  },
  sombrero: {
    inclination: 84,
    angle: 0,
    file: 'sombrero.jpg',
    size: 2.0,
    credit: 'Hubble, NASA/ESA and the Hubble Heritage Team (STScI/AURA) (public domain)',
  },
  pinwheel: {
    inclination: 18,
    angle: 0,
    file: 'pinwheel.jpg',
    size: 2.2,
    credit: 'Hubble and ground-based images, ESA and NASA (CC BY 4.0)',
  },
  centaurusa: {
    inclination: 0,
    angle: 0,
    file: 'centaurusa.jpg',
    size: 2.2,
    credit: 'Hubble, NASA (public domain): a close-up of the dust lane',
  },
  cartwheel: {
    inclination: 30,
    angle: 80,
    file: 'cartwheel.jpg',
    size: 2.6,
    // the Webb picture has the ring off to one side, among its neighbours: frame the ring
    crop: [0.344, 0.201, 0.583, 0.633],
    credit: 'James Webb Space Telescope, NIRCam and MIRI, NASA, ESA, CSA and STScI (public domain)',
  },
  m87: {
    inclination: 0,
    angle: 0,
    file: 'm87.jpg',
    size: 2.8,
    credit: 'Hubble, ESA (CC BY 4.0)',
  },
  bodes: {
    inclination: 59,
    angle: 0,
    file: 'bodes.jpg',
    size: 2.6,
    credit: 'Hubble, NASA, ESA and the Hubble Heritage Team (STScI/AURA) (public domain)',
  },
  m32: {
    inclination: 0,
    angle: 0,
    file: 'm32.jpg',
    size: 2.6,
    // a Hubble close-up with the core in the lower right: frame the core
    crop: [0.58, 0.47, 0.42, 0.432],
    credit: 'Hubble, NASA and ESA (public domain): a close-up of the core',
  },
  fornax: {
    inclination: 0,
    angle: 0,
    file: 'fornax.jpg',
    size: 2.8,
    crop: [0.12, 0.12, 0.76, 0.76],
    credit: 'ESO and the Digitized Sky Survey 2 (CC BY 4.0)',
  },
  ngc6822: {
    inclination: 0,
    angle: 0,
    file: 'ngc6822.jpg',
    size: 2.8,
    crop: [0.1, 0.1, 0.8, 0.88],
    credit: 'ESO, MPG/ESO 2.2-metre telescope (CC BY 4.0)',
  },
};

/** Opacity of the photograph for a camera this many galaxy radii away: gone when you are close, full from afar. */
export function photoFade(distanceInRadii: number, near = 4.5, far = 11): number {
  const t = Math.min(1, Math.max(0, (distanceInRadii - near) / (far - near)));
  return t * t * (3 - 2 * t);
}
