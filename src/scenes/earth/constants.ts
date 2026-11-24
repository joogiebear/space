import * as THREE from 'three';
import { D2R, J2000 } from '@/lib';

/** Obliquity of the ecliptic, Earth's gravitational parameter (km^3/s^2), J2 and equatorial radius (km). */
export const EPS = 23.4393 * D2R, MU = 398600.4418, J2 = 1.08262668e-3, REQ = 6378.137;
/** Category colours (stations, active, Starlink, OneWeb, GNSS, debris, rocket bodies). */
export const CAT_COL: number[][] = [[1, .9, .3], [.5, .85, 1], [.62, .7, 1], [.55, 1, .65], [1, .62, .28], [1, .33, .3], [.9, .5, 1]];
export const CAT_HEX = (c: number[]) => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
/** Ecliptic xyz -> scene axes in the equatorial frame (y up). */
export const eclToEqThree = (x: number, y: number, z: number, o: THREE.Vector3) => { const ye = y * Math.cos(EPS) - z * Math.sin(EPS), ze = y * Math.sin(EPS) + z * Math.cos(EPS); return o.set(x, ze, -ye) };
/** Greenwich mean sidereal time (radians) for a Julian date: how far the globe has turned. */
export const gmst = (jd: number) => (((280.46061837 + 360.98564736629 * (jd - J2000)) % 360) + 360) % 360 * D2R;
