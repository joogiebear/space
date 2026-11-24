import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isoToJD } from '@/lib';
import type { AstroEvent } from '@/lib/events';

const fetchLaunches = vi.fn(),
  fetchComets = vi.fn();
vi.mock('@/data/api', () => ({ fetchLaunches: () => fetchLaunches(), fetchComets: () => fetchComets() }));
const showView = vi.fn();
vi.mock('@/engine/navigate', () => ({ showView: (v: unknown) => showView(v) }));

import {
  DEFAULT_KINDS,
  closeEvents,
  eventsUi,
  openEvents,
  refreshEvents,
  resetEventsForTests,
  setKind,
  setMonths,
  showEvent,
} from './eventsStore';

const NOW = '2026-11-24T12:00:00Z';
const launch = (name: string, days: number): [string, string, string, string, string] => [
  new Date(Date.parse(NOW) + days * 864e5).toISOString(),
  name,
  'SpaceX',
  'Cape Canaveral',
  'Go',
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date(NOW));
  resetEventsForTests();
  fetchLaunches
    .mockReset()
    .mockResolvedValue({ fetched: 'x', launches: [launch('Falcon 9 | Test', 3), launch('Far', 400)] });
  // a bright comet at perihelion in the window, and a faint one
  fetchComets.mockReset().mockResolvedValue({
    comets: [
      ['C/2026 T1 (Test)', 0.7, 0.99, 100, 50, 60, isoToJD('2027-02-01T00:00:00Z'), 5, 10],
      ['C/2026 F1 (Faint)', 0.7, 0.99, 100, 50, 60, isoToJD('2027-02-01T00:00:00Z'), 18, 10],
    ],
  });
  showView.mockReset().mockResolvedValue(true);
});
afterEach(() => vi.useRealTimers());

const settle = async () => {
  await vi.advanceTimersByTimeAsync(50);
  for (let i = 0; i < 20 && eventsUi.busy; i++) await vi.advanceTimersByTimeAsync(50);
};

describe('events store', () => {
  it('works out a year of events, soonest first, with the moon-and-planet pairings left out by default', async () => {
    openEvents();
    await settle();
    expect(eventsUi.open).toBe(true);
    expect(eventsUi.busy).toBe(false);
    const e = eventsUi.events;
    expect(e.length).toBeGreaterThan(40);
    for (let i = 1; i < e.length; i++) expect(e[i].jd).toBeGreaterThanOrEqual(e[i - 1].jd);
    expect(e.some(x => x.kind === 'moonplanet')).toBe(false);
    for (const k of ['moon', 'season', 'meteor', 'comet', 'eclipse', 'planet', 'launch'] as const)
      expect(
        e.some(x => x.kind === k),
        k,
      ).toBe(true);
    expect(e[0].jd).toBeGreaterThanOrEqual(isoToJD(NOW) - 0.25);
    expect(e.at(-1)!.jd).toBeLessThanOrEqual(isoToJD(NOW) + 12 * 30.44 + 0.01);
  });

  it('includes launches inside the window and leaves out the far-off ones', async () => {
    openEvents();
    await settle();
    expect(eventsUi.events.filter(x => x.kind === 'launch').map(x => x.title)).toEqual(['Falcon 9 | Test']);
  });

  it('lists a comet that should be bright, and leaves out a faint one', async () => {
    openEvents();
    await settle();
    expect(eventsUi.events.filter(x => x.kind === 'comet').map(x => x.title)).toEqual([
      'Comet C/2026 T1 (Test) at perihelion',
    ]);
  });

  it('turning a kind off removes it, and turning one on adds it', async () => {
    openEvents();
    await settle();
    setKind('meteor', false);
    await settle();
    expect(eventsUi.events.some(x => x.kind === 'meteor')).toBe(false);
    setKind('moonplanet', true);
    await settle();
    expect(eventsUi.events.some(x => x.kind === 'moonplanet')).toBe(true);
  });

  it('a longer range finds more, a shorter one fewer', async () => {
    openEvents();
    await settle();
    const year = eventsUi.events.length;
    setMonths(3);
    await settle();
    expect(eventsUi.events.length).toBeLessThan(year);
    setMonths(36);
    await settle();
    expect(eventsUi.events.length).toBeGreaterThan(year);
  });

  it('asks for launches once while they are fresh, and says so when there are none', async () => {
    openEvents();
    await settle();
    await refreshEvents();
    await settle();
    expect(fetchLaunches).toHaveBeenCalledTimes(1);
    resetEventsForTests();
    fetchLaunches.mockResolvedValue({ fetched: '', launches: [] });
    openEvents();
    await settle();
    expect(eventsUi.launchNote).toMatch(/not available/);
    expect(eventsUi.events.some(x => x.kind === 'eclipse')).toBe(true); // the rest still works
  });

  it('a newer request replaces an older one still in progress', async () => {
    const first = refreshEvents();
    setKind('eclipse', false);
    await settle();
    await first; // the superseded run ends quietly without overwriting the newer result
    expect(eventsUi.events.some(x => x.kind === 'eclipse')).toBe(false);
  });

  it('defaults match what the chips show', () => {
    expect(eventsUi.kinds).toEqual(DEFAULT_KINDS);
  });
});

describe('opening an event', () => {
  const base: AstroEvent = {
    id: 'x',
    kind: 'planet',
    jd: isoToJD('2026-08-12T12:00:00Z'),
    title: 'Jupiter at opposition',
    detail: '',
    view: { scene: 'sky', sel: 'jupiter', t: '2026-08-12T12:00:00.000Z' },
    sky: true,
    focus: 'jupiter',
  };

  it('moves a sky event to a time of night, and shows it', async () => {
    eventsUi.open = true;
    await showEvent(base);
    expect(eventsUi.open).toBe(false);
    const v = showView.mock.calls[0][0] as { scene: string; sel: string; t: string };
    expect(v).toMatchObject({ scene: 'sky', sel: 'jupiter' });
    expect(v.t).not.toBe('2026-08-12T12:00:00.000Z'); // noon is daylight: it was moved
    const shift = Math.abs(Date.parse(v.t) - Date.parse('2026-08-12T12:00:00.000Z'));
    expect(shift).toBeLessThanOrEqual(12 * 3600 * 1000);
  });

  it('leaves the time of a non-sky event exactly as it is', async () => {
    const eclipse: AstroEvent = { ...base, kind: 'eclipse', sky: false, view: { scene: 'earth', sel: 'moon', t: 'T' } };
    await showEvent(eclipse);
    expect(showView).toHaveBeenCalledWith({ scene: 'earth', sel: 'moon', t: 'T' });
  });

  it('does nothing for an event with nowhere to go (a launch)', async () => {
    await showEvent({ ...base, kind: 'launch', view: undefined });
    expect(showView).not.toHaveBeenCalled();
  });

  it('closing leaves the computed list alone', async () => {
    openEvents();
    await settle();
    const n = eventsUi.events.length;
    closeEvents();
    expect(eventsUi.open).toBe(false);
    expect(eventsUi.events).toHaveLength(n);
  });
});
