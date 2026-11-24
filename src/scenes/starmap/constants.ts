import type * as THREE from 'three';

/** Discovery-method colours and legend order for exoplanet hosts. */
export const METHOD: Record<string, number[]> = {
  Transit: [0.3, 0.85, 1],
  'Radial Velocity': [1, 0.65, 0.25],
  Imaging: [0.45, 1, 0.5],
  Microlensing: [1, 0.4, 0.9],
};
export const METHOD_LIST: [string, string][] = [
  ['Transit', '#4cd9ff'],
  ['Radial Velocity', '#ffa640'],
  ['Imaging', '#73ff80'],
  ['Microlensing', '#ff66e6'],
  ['Other', '#ffffff'],
];

/** Equatorial (x, y, z) -> scene axes: y is up, ecliptic-style handedness. */
export const eqToThree = (x: number, y: number, z: number, o: THREE.Vector3) => o.set(x, z, -y);
