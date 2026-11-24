import * as THREE from 'three';
import { nowJD } from '@/lib';
import type { ActiveScene, Body } from '@/types';

/** The simulation clock. `jd` is a Julian date; `rate` is sim-seconds per real second. */
export const sim = { jd: nowJD(), rate: 1, paused: false, live: true, gt: 0 };

/** Orbit camera. `want` is the eased target distance; `off` decays so focus changes glide. */
export const cam = { yaw: .6, pitch: .5, dist: 10, want: 10, t: new THREE.Vector3(), off: new THREE.Vector3() };

/** Shared app state: the active scene and the current selection/hover. */
export const App = {
  scene: null as ActiveScene | null,
  sel: null as Body | null,
  hover: null as Body | null,
  path: [] as string[],
  /** performance.now() of the last user camera input (pauses auto-orbit). */
  interact: 0,
  dragging: false,
  W: 1,
  H: 1,
};

/** Toggles bound to checkboxes in the time panel. */
export const opts = { labels: true, autoOrbit: true };

/** The active scene. Throws before the first scene opens (never the case once the app is running). */
export function scene(): ActiveScene {
  if (!App.scene) throw new Error('No active scene');
  return App.scene;
}
