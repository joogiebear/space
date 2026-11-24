import * as THREE from 'three';
import { clamp } from '@/lib';
import { tickClock } from './clock';
import { emitter } from './events';
import { U, camera, renderer, skyCam, skyPts, skyScene, world } from './gl';
import { emitLabel, labelsBegin, labelsEnd } from './labels';
import { isBusy } from './sceneManager';
import { App, cam, opts } from './state';

/** Fires every ~500 ms: the UI refreshes live info and the date readout. */
export const slowTick = emitter();

const tgt = new THREE.Vector3(),
  bp = new THREE.Vector3();
let lastSel: unknown = undefined,
  last = performance.now(),
  infoT = 0;

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const sc = App.scene;
  if (!sc || (isBusy() && !sc.group.parent)) return;
  tickClock(dt);
  sc.update(dt);

  // camera follows the selection (or the scene centre) and glides between targets
  if (App.sel) App.sel.getPos(tgt);
  else sc.center(tgt);
  if (lastSel !== App.sel) {
    cam.off.copy(cam.t).sub(tgt);
    lastSel = App.sel;
  }
  cam.off.multiplyScalar(Math.exp(-dt * 6));
  cam.t.copy(tgt).add(cam.off);
  if (!cam.free) {
    const lo = (App.sel && App.sel.minD) || sc.minD;
    cam.want = clamp(cam.want, lo, sc.maxD);
  }
  cam.dist *= Math.pow(cam.want / cam.dist, 1 - Math.exp(-dt * cam.ease));
  if (opts.autoOrbit && !App.dragging && now - App.interact > 2500) cam.yaw += dt * 0.04;
  const cp = Math.cos(cam.pitch);
  camera.position.set(
    cam.t.x + cam.dist * cp * Math.sin(cam.yaw),
    cam.t.y + cam.dist * Math.sin(cam.pitch),
    cam.t.z + cam.dist * cp * Math.cos(cam.yaw),
  );
  camera.lookAt(cam.t);
  camera.near = Math.max(cam.dist * 0.0015, 1e-9);
  camera.far = cam.dist * 3000 + (sc.extent || 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  skyCam.quaternion.copy(camera.quaternion);

  labelsBegin();
  if (opts.labels || App.sel) {
    for (const b of sc.bodies || []) {
      if ((sc.isHidden && sc.isHidden(b)) || b.noLabel) continue;
      const isSel = App.sel === b,
        isHov = App.hover === b;
      if (!opts.labels && !isSel && !isHov) continue;
      b.getPos(bp);
      emitLabel(
        b.label,
        bp,
        (isSel ? 'sel ' : '') + (isHov ? 'hov ' : '') + (b.labelCls || ''),
        Math.max(8, b.radNow ? Math.min(60, (b.radNow * U.uF.value) / camera.position.distanceTo(bp)) : 8) + 6,
      );
    }
    if (opts.labels) sc.extraLabels?.(emitLabel);
  }
  labelsEnd();

  if (now - infoT > 500) {
    infoT = now;
    slowTick.emit();
  }
  if (renderer.getContext().isContextLost()) return;
  renderer.clear();
  if (skyPts.visible) renderer.render(skyScene, skyCam);
  renderer.clearDepth();
  renderer.render(world, camera);
}

export function startLoop() {
  requestAnimationFrame(frame);
}
