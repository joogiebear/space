import type * as THREE from 'three';

/** Rows shown in the info panel: [label, value]. */
export type InfoRows = string[][];

export interface Info {
  sub?: string;
  text?: string;
  rows?: InfoRows;
}

/** A button an object can add to the info panel (e.g. "Set my location"). */
export interface BodyAction {
  label: string | (() => string);
  run: () => unknown;
}

/** Anything the user can select: a planet, a star, a satellite, a galaxy... */
export interface Body {
  id: string;
  label: string;
  getPos(out: THREE.Vector3): THREE.Vector3;
  info?: Info;
  /** Computed on demand; re-read every 500 ms while `live`. */
  getInfo?(): Info;
  live?: boolean;
  /** Apparent radius in scene units, used for click targets and camera limits. */
  radNow?: number;
  focusD?: number;
  minD?: number;
  /** Scene id to open on double-click / "Enter". */
  enter?: string | null;
  enterLabel?: string;
  action?: BodyAction | null;
  noLabel?: boolean;
  labelCls?: string;
  /** CSS colour the screen washes into when diving into this body. */
  diveColor?: string;
  parentBody?: Body;
  moons?: Body[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch: scenes attach their own fields
  [extra: string]: any;
}

/** A checkbox in the Layers panel. */
export interface Layer {
  id: string;
  label: string;
  color?: string;
  count?: number;
  on: boolean;
  apply(on: boolean): void;
}

/** A "Jump to a moment in time" entry. `date` is UTC ISO. */
export interface Preset {
  label: string;
  date: string;
  /** Simulation speed (sim seconds per real second); defaults to the scene's. */
  rate?: number;
  /** Body id to select, or a search query whose first hit is selected. */
  focus?: string;
  query?: string;
  note?: string;
}

export interface SearchResult {
  label: string;
  sub?: string;
  make(): Body | null;
}

export type EmitLabel = (text: string, pos: THREE.Vector3, cls?: string, dx?: number) => void;

/** One navigable view (cosmos, star map, solar system, Earth orbit...). */
export interface Scene {
  id?: string;
  title: string;
  group: THREE.Group;
  bodies?: Body[];
  layers?: Layer[];
  presets?: Preset[];
  minD: number;
  maxD: number;
  /** Zooming out past this distance (and pushing on) goes up a level. Defaults to maxD. */
  exitD?: number;
  initD: number;
  /** Simulation speed on entry; omit to leave the clock alone. */
  rate?: number;
  /** Follow the real clock on entry. */
  live?: boolean;
  timeLabel?: string;
  extent?: number;
  /** false hides the background star sky. */
  sky?: boolean;
  intro?: string;
  introRows?: InfoRows;
  loaded?: boolean;
  center(out: THREE.Vector3): THREE.Vector3;
  update(dt: number): void;
  load?(status: (message: string) => void): Promise<void>;
  enter?(): void;
  leave?(): void;
  onSelect?(b: Body | null): void;
  isHidden?(b: Body): boolean;
  pickCustom?(mx: number, my: number, click: boolean): Body | null;
  extraLabels?(emit: EmitLabel): void;
  search?(q: string): SearchResult[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate escape hatch: scenes attach their own fields
  [extra: string]: any;
}

/** A scene that is on screen: the manager has assigned its id. */
export type ActiveScene = Scene & { id: string };
