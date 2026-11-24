/** Orbital mechanics: Kepler solver, JPL planet elements (1800-2050). */
import { TAU, D2R } from './math';
import { J2000 } from './time';

export const AU_KM = 149597870.7, RE_KM = 6371.0;
export const PC_LY = 3.26156;

export function solveKepler(M: number, e: number) {
  M = ((M % TAU) + TAU) % TAU;
  let E = e > .8 ? Math.PI : M;
  for (let i = 0; i < 14; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}
/** orbital elements (radians) -> ecliptic/orbit-frame xyz */
export function orbitPos(a: number, e: number, I: number, Om: number, w: number, M: number, o: number[]) {
  const E = solveKepler(M, e), xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
  o[0] = (cw * cO - sw * sO * cI) * xv + (-sw * cO - cw * sO * cI) * yv;
  o[1] = (cw * sO + sw * cO * cI) * xv + (-sw * sO + cw * cO * cI) * yv;
  o[2] = sw * sI * xv + cw * sI * yv;
  return o;
}

// JPL approximate Keplerian elements (1800-2050): a,da, e,de, I,dI, L,dL, varpi,dvarpi, Omega,dOmega (per century)
export const PEL: Record<string, number[]> = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
  mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
  pluto: [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
};
export function planetEl(id: string, jd: number) {
  const T = (jd - J2000) / 36525, p = PEL[id];
  const Om = (p[10] + p[11] * T) * D2R, wb = (p[8] + p[9] * T) * D2R;
  return { a: p[0] + p[1] * T, e: p[2] + p[3] * T, I: (p[4] + p[5] * T) * D2R, Om, w: wb - Om, M: (((p[6] + p[7] * T) - (p[8] + p[9] * T)) % 360) * D2R };
}
/** heliocentric ecliptic J2000, AU */
export function planetEcl(id: string, jd: number, o: number[]) { const q = planetEl(id, jd); return orbitPos(q.a, q.e, q.I, q.Om, q.w, q.M, o) }
