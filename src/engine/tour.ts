import type { ViewState } from '@/lib/view';
import { goLive } from './clock';
import { emitter } from './events';
import { chain, goScene, isBusy, sceneEntered } from './sceneManager';
import { applyView } from './share';
import { App } from './state';

/** One stop on a tour: where to look, and what to say about it. */
export interface TourStep {
  view: ViewState;
  title: string;
  text: string;
  /** Return to the real clock on arrival (the view's `t` is ignored when set). */
  live?: boolean;
  /** Milliseconds to stay before moving on by itself; defaults to reading time for the text. */
  hold?: number;
}
export interface Tour {
  id: string;
  title: string;
  blurb: string;
  steps: TourStep[];
}

export interface TourStatus {
  id: string;
  tourTitle: string;
  index: number;
  count: number;
  title: string;
  text: string;
  auto: boolean;
}
/** The running tour's status, or null when it ends. The UI subscribes. */
export const tourChanged = emitter<[TourStatus | null]>();

/** How long to read a step: a base plus time per character, so long captions stay up longer. */
export const readingMs = (text: string) => Math.min(20000, 5000 + text.length * 55);

let tour: Tour | null = null,
  index = 0,
  auto = true,
  timer: ReturnType<typeof setTimeout> | undefined,
  token = 0,
  expected = '',
  waiting = false;

export const tourActive = () => tour !== null;

function publish() {
  if (!tour) return tourChanged.emit(null);
  const s = tour.steps[index];
  tourChanged.emit({
    id: tour.id,
    tourTitle: tour.title,
    index,
    count: tour.steps.length,
    title: s.title,
    text: s.text,
    auto,
  });
}

function schedule() {
  clearTimeout(timer);
  if (!tour || !auto) return;
  const s = tour.steps[index];
  timer = setTimeout(next, s.hold ?? readingMs(s.text));
}

async function go(n: number) {
  if (!tour) return;
  const mine = ++token;
  clearTimeout(timer);
  index = n;
  const step = tour.steps[n];
  expected = step.view.scene;
  publish();
  if (App.scene?.id !== expected) {
    // a scene change already in flight would refuse ours: let it land first (and do not mistake it for the user leaving)
    waiting = true;
    for (let waited = 0; isBusy() && waited < 5000; waited += 100) await new Promise(r => setTimeout(r, 100));
    waiting = false;
    if (mine !== token || !tour) return;
    const here = App.scene?.id;
    if (here !== expected) {
      await goScene(expected, { deeper: here ? chain(expected).length > chain(here).length : true });
      if (mine !== token || !tour) return;
      if (App.scene?.id !== expected) return stopTour(); // the scene change was refused or went elsewhere
    }
  }
  if (step.live) goLive();
  const view = step.live ? { ...step.view, t: undefined, r: undefined, paused: undefined } : step.view;
  applyView(view, { glide: true });
  schedule();
}

export function startTour(t: Tour) {
  if (!t.steps.length) return;
  tour = t;
  auto = true;
  go(0);
}

export function stopTour() {
  if (!tour) return;
  tour = null;
  waiting = false;
  token++;
  clearTimeout(timer);
  publish();
}

export function next() {
  if (!tour) return;
  if (index >= tour.steps.length - 1) return stopTour();
  go(index + 1);
}
export function prev() {
  if (tour && index > 0) go(index - 1);
}
export function toggleAuto() {
  auto = !auto;
  publish();
  schedule();
}

/** Leaving the tour's scene by any other route (a tab, a breadcrumb, a double-click) ends the tour. */
sceneEntered.on(sc => {
  if (tour && !waiting && sc.id !== expected) stopTour();
});
