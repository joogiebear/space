import type { Preset } from '@/types';

/** Moments for the Earth-orbit "Jump to a moment in time" menu (dates UTC). Satellite dots hide when far from today. */
export const EARTH_PRESETS: Preset[] = [
    { label: 'Apollo 11 lands on the Moon (1969-07-20)', date: '1969-07-20T20:17Z', focus: 'moon', rate: 60, note: 'Earth and Moon as they were. Satellite dots are hidden: their orbital data only covers weeks around today.' },
    { label: 'Total solar eclipse, USA (2024-04-08)', date: '2024-04-08T17:30Z', focus: 'moon', rate: 60, note: 'The Moon crosses the Sun line near 18:17 UTC. Satellite dots are hidden for dates this far from today.' },
    { label: 'Total solar eclipse, Spain (2026-08-12)', date: '2026-08-12T17:00Z', focus: 'moon', rate: 60, note: 'Greatest eclipse near 17:46 UTC. Satellite dots are hidden for dates this far from today.' },
    { label: 'December solstice (2026-12-21)', date: '2026-12-21T14:50Z', focus: 'earth', rate: 60, note: 'The northern hemisphere is tilted farthest from the Sun: watch the terminator.' },
    { label: 'March equinox (2027-03-20)', date: '2027-03-20T20:25Z', focus: 'earth', rate: 60, note: 'Day and night are equal everywhere.' },
    { label: 'Longest eclipse this century (2027-08-02)', date: '2027-08-02T09:30Z', focus: 'moon', rate: 60, note: 'Totality lasts over 6 minutes near 10:07 UTC. Satellite dots are hidden for dates this far from today.' },
];
