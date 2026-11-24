/**
 * Eclipses 2025-2034 from NASA GSFC (Fred Espenak's catalogues, eclipse.gsfc.nasa.gov). Predicting an eclipse from a
 * simplified lunar theory can miss a marginal one, so the table is used as published. Times are Terrestrial Dynamical
 * Time as NASA gives them; `eclipseUt` converts to UT with the delta-T (about 75 to 81 s over these years).
 *
 * Solar: [date, time TD, type, magnitude, where the partial phase is visible, path of the central line (or '')]
 * Lunar: [date, time TD, type, umbral magnitude, where it is visible]
 */
export type SolarRow = [string, string, string, number, string, string];
export type LunarRow = [string, string, string, number, string];

export const SOLAR_ECLIPSES: SolarRow[] = [
  ['2025-03-29', '10:48:36', 'Partial', 0.938, 'NW Africa, Europe, N Russia', ''],
  ['2025-09-21', '19:43:04', 'Partial', 0.855, 'S Pacific, New Zealand, Antarctica', ''],
  ['2026-02-17', '12:13:05', 'Annular', 0.963, 'S Argentina and Chile, S Africa, Antarctica', 'Antarctica'],
  ['2026-08-12', '17:47:05', 'Total', 1.039, 'N North America, W Africa, Europe', 'Arctic, Greenland, Iceland, Spain'],
  ['2027-02-06', '16:00:47', 'Annular', 0.928, 'S America, Antarctica, W and S Africa', 'Chile, Argentina, Atlantic'],
  [
    '2027-08-02',
    '10:07:49',
    'Total',
    1.079,
    'Africa, Europe, Middle East, W and S Asia',
    'Morocco, Spain, Algeria, Libya, Egypt, Saudi Arabia, Yemen, Somalia',
  ],
  [
    '2028-01-26',
    '15:08:58',
    'Annular',
    0.921,
    'E North America, Central and S America, W Europe, NW Africa',
    'Ecuador, Peru, Brazil, Suriname, Spain, Portugal',
  ],
  ['2028-07-22', '02:56:39', 'Total', 1.056, 'SE Asia, East Indies, Australia, New Zealand', 'Australia, New Zealand'],
  ['2029-01-14', '17:13:47', 'Partial', 0.871, 'North and Central America', ''],
  ['2029-06-12', '04:06:13', 'Partial', 0.458, 'Arctic, Scandinavia, Alaska, N Asia, N Canada', ''],
  ['2029-07-11', '15:37:18', 'Partial', 0.23, 'S Chile, S Argentina', ''],
  ['2029-12-05', '15:03:57', 'Partial', 0.891, 'S Argentina, S Chile, Antarctica', ''],
  [
    '2030-06-01',
    '06:29:13',
    'Annular',
    0.944,
    'Europe, N Africa, Middle East, Asia, Arctic, Alaska',
    'Algeria, Tunisia, Greece, Turkey, Russia, N China, Japan',
  ],
  [
    '2030-11-25',
    '06:51:37',
    'Total',
    1.047,
    'S Africa, S Indian Ocean, East Indies, Australia, Antarctica',
    'Botswana, South Africa, Australia',
  ],
  [
    '2031-05-21',
    '07:16:04',
    'Annular',
    0.959,
    'Africa, S Asia, East Indies, Australia',
    'Angola, Congo, Zambia, Tanzania, S India, Malaysia, Indonesia',
  ],
  ['2031-11-14', '21:07:30', 'Hybrid', 1.011, 'Pacific, S USA, Central America, NW S America', 'Pacific, Panama'],
  ['2032-05-09', '13:26:42', 'Annular', 0.996, 'S S America, S Africa', 'S Atlantic'],
  ['2032-11-03', '05:34:12', 'Partial', 0.855, 'Asia', ''],
  ['2033-03-30', '18:02:35', 'Total', 1.046, 'North America', 'E Russia, Alaska'],
  ['2033-09-23', '13:54:31', 'Partial', 0.689, 'S S America, Antarctica', ''],
  [
    '2034-03-20',
    '10:18:45',
    'Total',
    1.046,
    'Africa, Europe, W Asia',
    'Nigeria, Cameroon, Chad, Sudan, Egypt, Saudi Arabia, Iran, Afghanistan, Pakistan, India, China',
  ],
  [
    '2034-09-12',
    '16:19:27',
    'Annular',
    0.974,
    'Central America, S America',
    'Chile, Bolivia, Argentina, Paraguay, Brazil',
  ],
];

export const LUNAR_ECLIPSES: LunarRow[] = [
  ['2025-03-14', '06:59:56', 'Total', 1.178, 'Pacific, Americas, W Europe, W Africa'],
  ['2025-09-07', '18:12:58', 'Total', 1.362, 'Europe, Africa, Asia, Australia'],
  ['2026-03-03', '11:34:52', 'Total', 1.151, 'E Asia, Australia, Pacific, Americas'],
  ['2026-08-28', '04:14:04', 'Partial', 0.93, 'E Pacific, Americas, Europe, Africa'],
  ['2027-02-20', '23:14:06', 'Penumbral', -0.057, 'Americas, Europe, Africa, Asia'],
  ['2027-07-18', '16:04:09', 'Penumbral', -1.068, 'E Africa, Asia, Australia, Pacific'],
  ['2027-08-17', '07:14:59', 'Penumbral', -0.525, 'Pacific, Americas'],
  ['2028-01-12', '04:14:13', 'Partial', 0.066, 'Americas, Europe, Africa'],
  ['2028-07-06', '18:20:57', 'Partial', 0.389, 'Europe, Africa, Asia, Australia'],
  ['2028-12-31', '16:53:15', 'Total', 1.246, 'Europe, Africa, Asia, Australia, Pacific'],
  ['2029-06-26', '03:23:22', 'Total', 1.844, 'Americas, Europe, Africa, Middle East'],
  ['2029-12-20', '22:43:12', 'Total', 1.117, 'Americas, Europe, Africa, Asia'],
  ['2030-06-15', '18:34:34', 'Partial', 0.502, 'Europe, Africa, Asia, Australia'],
  ['2030-12-09', '22:28:51', 'Penumbral', -0.163, 'Americas, Europe, Africa, Asia'],
  ['2031-05-07', '03:52:02', 'Penumbral', -0.09, 'Americas, Europe, Africa'],
  ['2031-06-05', '11:45:17', 'Penumbral', -0.82, 'East Indies, Australia, Pacific'],
  ['2031-10-30', '07:46:45', 'Penumbral', -0.32, 'Americas'],
  ['2032-04-25', '15:14:51', 'Total', 1.191, 'E Africa, Asia, Australia, Pacific'],
  ['2032-10-18', '19:03:40', 'Total', 1.103, 'Africa, Europe, Asia, Australia'],
  ['2033-04-14', '19:13:51', 'Total', 1.094, 'Europe, Africa, Asia, Australia'],
  ['2033-10-08', '10:56:23', 'Total', 1.35, 'Asia, Australia, Pacific, Americas'],
  ['2034-04-03', '19:06:59', 'Penumbral', -0.227, 'Europe, Africa, Asia, Australia'],
  ['2034-09-28', '02:47:37', 'Partial', 0.014, 'Americas, Europe, Africa'],
];

/** Julian date (UT) of an eclipse row's greatest eclipse. */
export const eclipseUt = (date: string, timeTd: string) => {
  const year = +date.slice(0, 4),
    deltaT = 75 + (year - 2025) * 0.6; // seconds; NASA's catalogue gives 75 s in 2025 rising to 81 s in 2034
  return Date.parse(`${date}T${timeTd}Z`) / 86400000 + 2440587.5 - deltaT / 86400;
};
