import type * as THREE from 'three';

/** Discovery-method colours and legend order for exoplanet hosts. */
export const METHOD: Record<string, number[]> = { 'Transit': [.3, .85, 1], 'Radial Velocity': [1, .65, .25], 'Imaging': [.45, 1, .5], 'Microlensing': [1, .4, .9] };
export const METHOD_LIST: [string, string][] = [['Transit', '#4cd9ff'], ['Radial Velocity', '#ffa640'], ['Imaging', '#73ff80'], ['Microlensing', '#ff66e6'], ['Other', '#ffffff']];

/** Equatorial (x, y, z) -> scene axes: y is up, ecliptic-style handedness. */
export const eqToThree = (x: number, y: number, z: number, o: THREE.Vector3) => o.set(x, z, -y);
