import { bvColor } from '@/lib';
import { apparentMag } from '@/lib/sky';
import { fetchConstellations, fetchStarNames, fetchStarsBinary, type ConstellationRecord, type NamedStar } from './api';

/**
 * The naked-eye sky from the HYG catalogue: unit directions (J2000 equatorial), apparent magnitude and colour for every
 * star at or brighter than `limit`. Sky Tonight uses this; the Star Map keeps its own 3D copy.
 */
export interface StarSky {
  n: number;
  /** x, y, z unit vectors, J2000 equatorial */
  dir: Float32Array;
  mag: Float32Array;
  /** r, g, b */
  color: Float32Array;
  hip: Int32Array;
  /** B-V colour index */
  ci: Float32Array;
  /** distance, parsecs */
  dist: Float32Array;
  /** named stars by index into the arrays above */
  named: Map<number, NamedStar>;
  /** Hipparcos id -> index */
  byHip: Map<number, number>;
  constellations: ConstellationRecord[];
}

let cached: Promise<StarSky> | null = null;

/** Parse the binary star file: uint32 N, N x float32 [x, y, z (parsecs), absMag, B-V], N x int32 Hipparcos id. */
export function parseStars(
  bin: ArrayBuffer,
  names: NamedStar[],
  constellations: ConstellationRecord[],
  limit = 6.8,
): StarSky {
  const total = new DataView(bin).getUint32(0, true),
    f = new Float32Array(bin, 4, total * 5),
    hipAll = new Int32Array(bin.slice(4 + total * 20, 4 + total * 24));
  const keep: number[] = [],
    magAll = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const d = Math.hypot(f[i * 5], f[i * 5 + 1], f[i * 5 + 2]);
    if (d < 1e-3) continue; // the Sun is the first row: it is drawn separately
    magAll[i] = apparentMag(f[i * 5 + 3], d);
    if (magAll[i] <= limit) keep.push(i);
  }
  const n = keep.length,
    out: StarSky = {
      n,
      dir: new Float32Array(n * 3),
      mag: new Float32Array(n),
      color: new Float32Array(n * 3),
      hip: new Int32Array(n),
      ci: new Float32Array(n),
      dist: new Float32Array(n),
      named: new Map(),
      byHip: new Map(),
      constellations,
    };
  const indexOfSource = new Map<number, number>();
  keep.forEach((src, k) => {
    const x = f[src * 5],
      y = f[src * 5 + 1],
      z = f[src * 5 + 2],
      d = Math.hypot(x, y, z);
    out.dir.set([x / d, y / d, z / d], k * 3);
    out.mag[k] = magAll[src];
    out.ci[k] = f[src * 5 + 4];
    out.dist[k] = d;
    out.hip[k] = hipAll[src];
    bvColor(f[src * 5 + 4], out.color, k * 3);
    if (hipAll[src] > 0 && !out.byHip.has(hipAll[src])) out.byHip.set(hipAll[src], k);
    indexOfSource.set(src, k);
  });
  for (const nm of names) {
    const k = indexOfSource.get(nm[0]);
    if (k !== undefined) out.named.set(k, nm);
  }
  return out;
}

export function loadStarSky(): Promise<StarSky> {
  cached ??= Promise.all([fetchStarsBinary(), fetchStarNames(), fetchConstellations()])
    .then(([bin, names, cons]) => parseStars(bin, names, cons))
    .catch(e => {
      cached = null; // let the next visit retry
      throw e;
    });
  return cached;
}
