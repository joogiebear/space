/** Julian-date helpers. The simulation clock is a Julian date (days). */
export const J2000 = 2451545.0;
export const nowJD = () => Date.now() / 86400000 + 2440587.5;
export const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 864e5);
/** Julian date -> "YYYY-MM-DD HH:MM:SS UTC" */
export const fmtDate = (jd: number) => jdToDate(jd).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
/** Parse an ISO date (UTC) to a Julian date. */
export const isoToJD = (iso: string) => Date.parse(iso) / 864e5 + 2440587.5;
