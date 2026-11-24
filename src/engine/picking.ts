import * as THREE from 'three';
import type { Body } from '@/types';
import { U, camera } from './gl';
import { App, scene } from './state';

const pv = new THREE.Vector3(),
  sp = { x: 0, y: 0, z: 0 },
  bp = new THREE.Vector3();

/** Project a world point to screen pixels; returns false when it is behind or beyond the camera. */
export function screenOf(v: THREE.Vector3, out: { x: number; y: number; z: number }) {
  pv.copy(v).project(camera);
  out.x = (pv.x * 0.5 + 0.5) * App.W;
  out.y = (-pv.y * 0.5 + 0.5) * App.H;
  out.z = pv.z;
  return pv.z > -1 && pv.z < 1;
}

/** The body under a screen point: listed bodies first, then the scene's own picker (millions of points). */
export function pickAt(mx: number, my: number, click: boolean, minPx = 12): Body | null {
  const sc = scene();
  let best: Body | null = null,
    bz = 1e9;
  for (const b of sc.bodies || []) {
    if (sc.isHidden && sc.isHidden(b)) continue;
    b.getPos(bp);
    if (!screenOf(bp, sp)) continue;
    const rpx = Math.max(b.radNow ? (b.radNow * U.uF.value) / camera.position.distanceTo(bp) : 0, minPx);
    if (Math.hypot(sp.x - mx, sp.y - my) <= rpx && sp.z < bz) {
      best = b;
      bz = sp.z;
    }
  }
  return best || (sc.pickCustom ? sc.pickCustom(mx, my, click) : null);
}
