/**
 * Real photographs of the galaxies, shown in the Local Universe view from a distance and handed over to the generated
 * stars as you fly in. Credits are in public/assets/galaxies/CREDITS.md. Nobody has photographed the Milky Way from
 * outside, so it shows NASA's artist's concept of what we think it looks like, labelled as an illustration. The
 * Cartwheel (no clean public image was found) has none.
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
  /** An artist's impression rather than a photograph; the info panel says so. */
  illustration?: boolean;
}

export const PHOTOS: Record<string, GalaxyPhoto> = {
  milkyway: {
    file: 'milkyway.jpg',
    size: 2.4,
    illustration: true,
    credit: "Artist's concept based on Spitzer data, NASA/JPL-Caltech/R. Hurt (SSC) (public domain)",
  },
  andromeda: {
    file: 'andromeda.jpg',
    size: 2.4,
    credit: 'GALEX ultraviolet, NASA/JPL-Caltech (public domain)',
  },
  triangulum: {
    file: 'triangulum.jpg',
    size: 3.3,
    credit: 'VLT Survey Telescope, ESO (CC BY 4.0)',
  },
  lmc: {
    file: 'lmc.jpg',
    size: 2.2,
    // the Spitzer picture comes with a frame and a caption: show only the picture
    crop: [0.031, 0.071, 0.938, 0.75],
    credit: 'Spitzer infrared, NASA/JPL-Caltech/M. Meixner (STScI) and the SAGE Legacy Team (public domain)',
  },
  smc: {
    file: 'smc.jpg',
    size: 2.6,
    credit: 'CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever; processing T. Rector et al. (CC BY 4.0)',
  },
  whirlpool: {
    file: 'whirlpool.jpg',
    size: 2.4,
    credit: 'Hubble, NASA and ESA (public domain)',
  },
  sombrero: {
    file: 'sombrero.jpg',
    size: 2.0,
    credit: 'Hubble, NASA/ESA and the Hubble Heritage Team (STScI/AURA) (public domain)',
  },
  pinwheel: {
    file: 'pinwheel.jpg',
    size: 2.2,
    credit: 'Hubble and ground-based images, ESA and NASA (CC BY 4.0)',
  },
  centaurusa: {
    file: 'centaurusa.jpg',
    size: 2.2,
    credit: 'Hubble, NASA (public domain): a close-up of the dust lane',
  },
  m87: {
    file: 'm87.jpg',
    size: 2.8,
    credit: 'Hubble, ESA (CC BY 4.0)',
  },
  bodes: {
    file: 'bodes.jpg',
    size: 2.6,
    credit: 'Hubble, NASA, ESA and the Hubble Heritage Team (STScI/AURA) (public domain)',
  },
};

/** Opacity of the photograph for a camera this many galaxy radii away: gone when you are close, full from afar. */
export function photoFade(distanceInRadii: number, near = 4.5, far = 11): number {
  const t = Math.min(1, Math.max(0, (distanceInRadii - near) / (far - near)));
  return t * t * (3 - 2 * t);
}
