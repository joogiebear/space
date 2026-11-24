import * as THREE from 'three';
import type { ActiveScene, Body } from '@/types';

/** A minimal scene + bodies for tests that exercise the store and engine events. */
export function makeBody(id: string, extra: Partial<Body> = {}): Body {
  return { id, label: id.toUpperCase(), getPos: v => v.set(0, 0, 0), info: { sub: 'sub ' + id, text: 'text ' + id, rows: [['k', 'v']] }, ...extra };
}

export function makeScene(extra: Partial<ActiveScene> = {}): ActiveScene {
  return {
    id: 'test', title: 'Test Scene', group: new THREE.Group(), minD: 1, maxD: 100, initD: 10,
    intro: 'Intro text', introRows: [['Objects', '3']],
    center: v => v.set(0, 0, 0), update() {},
    bodies: [makeBody('a'), makeBody('b')],
    ...extra,
  };
}
