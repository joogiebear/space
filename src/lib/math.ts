/** Small numeric helpers shared by every scene. */
export const TAU = Math.PI * 2, D2R = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Seeded PRNG (mulberry32) so procedural galaxies are identical on every load. */
export function rng(a: number): () => number { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
export const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * 1.2;
export const mixc = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
