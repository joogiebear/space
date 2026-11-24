import { createApp, nextTick, type App as VueApp } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isoToJD } from '@/lib';
import type { AstroEvent } from '@/lib/events';

vi.mock('@/data/api', () => ({
  fetchLaunches: async () => ({ fetched: '', launches: [] }),
  fetchComets: async () => ({ comets: [] }),
}));
const showView = vi.fn(async (_v: unknown) => true);
vi.mock('@/engine/navigate', () => ({ showView: (v: unknown) => showView(v) }));

import { eventsUi, resetEventsForTests } from '../eventsStore';
import EventsPanel from './EventsPanel.vue';

let app: VueApp, host: HTMLElement;
const ev = (id: string, iso: string, extra: Partial<AstroEvent> = {}): AstroEvent => ({
  id,
  kind: 'eclipse',
  jd: isoToJD(iso),
  title: 'Event ' + id,
  detail: 'Detail ' + id,
  view: { scene: 'earth', sel: 'moon', t: iso },
  ...extra,
});

beforeEach(async () => {
  resetEventsForTests();
  showView.mockClear();
  document.body.innerHTML = '<div id="host"></div>';
  host = document.getElementById('host')!;
  app = createApp(EventsPanel);
  app.mount(host);
});
afterEach(() => app.unmount());

const open = async (events: AstroEvent[]) => {
  eventsUi.open = true;
  eventsUi.events = events;
  eventsUi.busy = false;
  await nextTick();
};

describe('EventsPanel', () => {
  it('is absent until opened, then a labelled dialog', async () => {
    expect(host.querySelector('#events')).toBeNull();
    await open([]);
    const d = host.querySelector('#events')!;
    expect(d.getAttribute('role')).toBe('dialog');
    expect(d.getAttribute('aria-label')).toBe('Astronomy calendar');
  });

  it('groups events under month headings, in order', async () => {
    await open([ev('a', '2026-12-03T10:00:00Z'), ev('b', '2026-12-20T10:00:00Z'), ev('c', '2027-01-04T10:00:00Z')]);
    const heads = [...host.querySelectorAll('h3')].map(h => h.textContent);
    expect(heads).toHaveLength(2);
    expect(host.querySelectorAll('li')).toHaveLength(3);
    expect(host.querySelector('li')!.textContent).toContain('Event a');
  });

  it('an event with a view is a button that opens it; one without is plain text', async () => {
    await open([ev('a', '2026-12-03T10:00:00Z'), ev('l', '2026-12-04T10:00:00Z', { kind: 'launch', view: undefined })]);
    const rows = host.querySelectorAll('.ev');
    expect(rows[0].tagName).toBe('BUTTON');
    expect(rows[1].tagName).toBe('DIV');
    (rows[0] as HTMLElement).click();
    await nextTick();
    expect(showView).toHaveBeenCalledTimes(1);
    expect(eventsUi.open).toBe(false); // it closes so the view is visible
    (rows[1] as HTMLElement).click();
    expect(showView).toHaveBeenCalledTimes(1);
  });

  it('every kind has a checkbox, and unticking one changes the setting', async () => {
    await open([]);
    const boxes = [...host.querySelectorAll<HTMLInputElement>('.chips input')];
    expect(boxes).toHaveLength(8);
    expect(boxes.filter(b => b.checked)).toHaveLength(7); // moon and planet pairings start off
    boxes[0].checked = false;
    boxes[0].dispatchEvent(new Event('change'));
    expect(eventsUi.kinds.eclipse).toBe(false);
  });

  it('says so while it is working, and when there is nothing to show', async () => {
    await open([]);
    expect(host.textContent).toContain('Nothing in this range');
    eventsUi.busy = true;
    await nextTick();
    expect(host.querySelector('[role="status"]')!.textContent).toContain('Working out the dates');
    expect(host.textContent).not.toContain('Nothing in this range');
  });

  it('shows a note when launches are unavailable', async () => {
    await open([ev('a', '2026-12-03T10:00:00Z')]);
    eventsUi.launchNote = 'Launch times are not available right now.';
    await nextTick();
    expect(host.textContent).toContain('Launch times are not available');
  });

  it('the Close button closes it', async () => {
    await open([]);
    (host.querySelector('.x') as HTMLElement).click();
    await nextTick();
    expect(host.querySelector('#events')).toBeNull();
  });

  it('shows the time in UTC on hover', async () => {
    await open([ev('a', '2026-12-03T10:00:00Z')]);
    expect(host.querySelector('.ev')!.getAttribute('title')).toBe('2026-12-03 10:00 UTC');
  });
});
