import { reactive } from 'vue';
import { fetchComets, fetchLaunches, type CometRow, type LaunchRow } from '@/data/api';
import { showView } from '@/engine/navigate';
import {
  KIND_LABEL,
  bestViewingMoment,
  cometEvents,
  computeEvents,
  launchEvents,
  type AstroEvent,
  type EventKind,
} from '@/lib/events';
import { nowJD } from '@/lib';
import { loadLocation } from '@/scenes/earth/location';
import { announce } from './announce';
import { toast } from './toast';

export const KINDS = Object.keys(KIND_LABEL) as EventKind[];
/** Moon-and-planet pairings happen every month or so for each planet: off until asked for, so they do not bury the rest. */
export const DEFAULT_KINDS: Record<EventKind, boolean> = {
  eclipse: true,
  moon: true,
  season: true,
  meteor: true,
  comet: true,
  planet: true,
  moonplanet: false,
  launch: true,
};
export const MONTH_CHOICES = [3, 12, 36];
const GREENWICH = { lat: 51.4769, lon: -0.0005 };

export const eventsUi = reactive({
  open: false,
  months: 12,
  kinds: { ...DEFAULT_KINDS } as Record<EventKind, boolean>,
  /** Kinds still being worked out (the heavy ones run in turn so the page stays responsive). */
  busy: false,
  events: [] as AstroEvent[],
  /** '' when launches loaded or were not asked for; otherwise why there are none */
  launchNote: '',
});

const cache = new Map<string, AstroEvent[]>();
let launches: { at: number; rows: LaunchRow[]; ok: boolean } | null = null,
  comets: CometRow[] | null = null,
  token = 0;
const LAUNCH_TTL_MS = 30 * 60 * 1000;
const idle = () => new Promise<void>(r => setTimeout(r, 0));

/** The window shown: from a few hours ago (an event under way is still news) to `months` ahead. */
const range = () => {
  const from = nowJD() - 0.25;
  return [from, from + eventsUi.months * 30.44] as const;
};

/** Work out the events for the current settings. Re-entrant: a newer call supersedes an older one. */
export async function refreshEvents() {
  const mine = ++token,
    [from, to] = range();
  eventsUi.busy = true;
  const parts: AstroEvent[][] = [];
  for (const kind of KINDS) {
    if (!eventsUi.kinds[kind]) continue;
    let list: AstroEvent[];
    if (kind === 'launch') {
      if (!launches || Date.now() - launches.at > LAUNCH_TTL_MS) {
        const data = await fetchLaunches();
        launches = { at: Date.now(), rows: data.launches, ok: data.launches.length > 0 };
      }
      if (mine !== token) return;
      eventsUi.launchNote = launches.ok ? '' : 'Launch times are not available right now.';
      list = launchEvents(launches.rows, from, to);
    } else if (kind === 'comet') {
      comets ??= (await fetchComets()).comets;
      if (mine !== token) return;
      list = cometEvents(comets, from, to);
    } else {
      const key = `${kind}|${eventsUi.months}`;
      if (!cache.has(key)) {
        await idle(); // let the page paint between the heavy kinds
        if (mine !== token) return;
        cache.set(key, computeEvents(from, to, new Set([kind])));
      }
      list = cache.get(key)!;
    }
    parts.push(list);
  }
  if (!eventsUi.kinds.launch) eventsUi.launchNote = '';
  if (mine !== token) return;
  eventsUi.events = parts.flat().sort((a, b) => a.jd - b.jd);
  eventsUi.busy = false;
}

export function openEvents() {
  eventsUi.open = true;
  announce('Astronomy calendar');
  refreshEvents();
}
export function closeEvents() {
  eventsUi.open = false;
}
export const toggleEvents = () => (eventsUi.open ? closeEvents() : openEvents());

export function setKind(kind: EventKind, on: boolean) {
  eventsUi.kinds[kind] = on;
  refreshEvents();
}
export function setMonths(months: number) {
  eventsUi.months = months;
  refreshEvents();
}

/** Show an event in the atlas. Sky events move to the best moment that night at the user's saved location. */
export async function showEvent(ev: AstroEvent) {
  if (!ev.view) return;
  let view = ev.view;
  if (ev.sky) {
    const loc = loadLocation() ?? GREENWICH,
      jd = bestViewingMoment(ev.jd, loc.lat, loc.lon, ev.focus);
    view = { ...view, t: new Date((jd - 2440587.5) * 864e5).toISOString() };
  }
  closeEvents();
  if (await showView(view))
    toast(
      ev.title,
      ev.sky ? 'Shown from your location, at the best time to look.' : 'Shown at the time it happens.',
      5000,
    );
}

/** For tests: forget everything cached. */
export function resetEventsForTests() {
  cache.clear();
  launches = null;
  comets = null;
  token++;
  eventsUi.open = false;
  eventsUi.months = 12;
  eventsUi.kinds = { ...DEFAULT_KINDS };
  eventsUi.events = [];
  eventsUi.busy = false;
  eventsUi.launchNote = '';
}
