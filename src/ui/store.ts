import { reactive, shallowRef } from 'vue';
import type { Body, Layer, Preset } from '@/types';
import type { Loc } from '@/scenes/earth/location';

/**
 * Reactive state the Vue panels render. The engine never reads it: ui/bridge.ts copies engine events into it,
 * and components call engine functions (select, goScene, setRate...) directly.
 */
export const ui = reactive({
  sceneId: '',
  title: '',
  timeLabel: 'Date',
  /** Scene ids from the root down to the current one (breadcrumb). */
  path: [] as string[],
  /** Bumped on every scene change so panels can reset local state (search box...). */
  sceneSerial: 0,
  selId: null as string | null,
  info: {
    title: '',
    sub: '',
    text: '',
    rows: [] as string[][],
    actionLabel: null as string | null,
    enterLabel: null as string | null,
  },
  rate: 1,
  /** Speed slider position, 0-100 (log scale). */
  sliderPos: 30,
  paused: false,
  dateText: '',
  tip: { visible: false, text: '', x: 0, y: 0 },
  toast: { visible: false, msg: '', sub: '' },
  /** Text for the screen-reader live region (see announce()). */
  announce: '',
});

// Scene objects hold three.js data: keep them out of Vue's deep proxying.
export const sceneBodies = shallowRef<Body[]>([]);
export const sceneLayers = shallowRef<Layer[]>([]);
export const scenePresets = shallowRef<Preset[]>([]);

/** An open "set your location" dialog, resolved with the new location or null. */
export interface LocationRequest {
  current: Loc | null;
  resolve: (loc: Loc | null) => void;
}
export const locationRequest = shallowRef<LocationRequest | null>(null);
