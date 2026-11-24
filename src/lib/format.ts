/** Number formatting for info panels. */
export const fmtNum = (v: number | null | undefined, d = 1) =>
  v == null
    ? '—'
    : v >= 1e6
      ? (v / 1e6).toFixed(2) + ' M'
      : v >= 1e4
        ? Math.round(v).toLocaleString()
        : (+v.toFixed(d)).toString();
