/** Client for the data API. Every response shape is described here, once.
 *
 *  Two ways to serve it: the Python server answers `/api/*` live, or (static hosting, VITE_STATIC_DATA=1) the same
 *  payloads are pre-built into `data/*.json` files next to the site by `python -m server.export`. */

const STATIC_DATA = import.meta.env.VITE_STATIC_DATA === '1';

/** API route -> exported file name (matches server/export.py). */
export const STATIC_FILES: Record<string, string> = {
  '/api/sats': 'sats.json',
  '/api/sbdb': 'sbdb.json',
  '/api/craft': 'craft.json',
  '/api/exo': 'exo.json',
  '/api/constellations': 'constellations.json',
  '/api/stars.bin': 'stars.bin',
  '/api/stars.json': 'stars_names.json',
};

/** Where to fetch an API route from, given the hosting mode and the site's base path. */
export function endpoint(route: string, staticData = STATIC_DATA, base = import.meta.env.BASE_URL): string {
  if (!staticData) return route;
  const file = STATIC_FILES[route];
  if (!file) throw new Error('Unknown data route ' + route);
  return `${base}data/${file}`;
}

/** [name, TLE line 1, TLE line 2, category index] */
export type SatRecord = [string, string, string, number];
export interface SatCatalogue {
  cats: string[];
  fetched: string;
  sats: SatRecord[];
}

/** [hygIndex, name, constellation, spectral type, distance pc, apparent magnitude] */
export type NamedStar = [number, string, string, string, number, number];
/** NASA Exoplanet Archive row: [planet, host, distance pc, ra, dec, AU, radius, ?, year, method, ?, ?, spectral type] */
export type ExoRow = [
  string,
  string,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  unknown,
  number | string | null,
  string,
  unknown,
  unknown,
  string | null,
];

/** [id, name, english name, lines of Hipparcos ids] */
export type ConstellationRecord = [string, string, string, number[][]];

/** [name, a, e, i, node, argPeri, meanAnomaly, epochJD, H, kind] where kind 0 belt, 1 NEO, 2 PHA, 3 comet. */
export type SmallBodyRow = [string, number, number, number, number, number, number, number, number, number];
export interface SmallBodies {
  ast: SmallBodyRow[];
  com: SmallBodyRow[];
}

/** Spacecraft track: [JD, x, y, z] in AU, heliocentric ecliptic. */
export interface CraftTrack {
  name: string;
  id: string;
  track: number[][];
}
export interface CraftData {
  when: string;
  craft: CraftTrack[];
}

async function get(path: string): Promise<Response> {
  const url = endpoint(path),
    r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status} ${r.statusText}`);
  return r;
}
const json = async <T>(path: string) => (await get(path)).json() as Promise<T>;

export const fetchSatellites = () =>
  json<SatCatalogue>('/api/sats').catch(() => {
    throw new Error(
      'Satellite data is not available yet (CelesTrak limits downloads to one per group every 2 hours, so a refresh can lag). Try again in a few minutes.',
    );
  });
export const fetchSmallBodies = () => json<SmallBodies>('/api/sbdb');
/** Optional: the solar system still works without spacecraft. */
export const fetchSpacecraft = () => json<CraftData>('/api/craft').catch((): CraftData => ({ when: '', craft: [] }));
/** Binary: uint32 N, then N x float32 [x, y, z, absMag, B-V], then N x int32 Hipparcos id. */
export const fetchStarsBinary = async () => (await get('/api/stars.bin')).arrayBuffer();
export const fetchStarNames = () => json<NamedStar[]>('/api/stars.json');
export const fetchExoplanets = () => json<ExoRow[]>('/api/exo').catch((): ExoRow[] => []);
export const fetchConstellations = () =>
  json<ConstellationRecord[]>('/api/constellations').catch((): ConstellationRecord[] => []);
