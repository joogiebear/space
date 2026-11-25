import { deviceHints, wantsLightMilkyWay } from '@/scenes/sky/quality';

/** What the overlay says, as lines. Pure so it can be tested. */
export function diagLines(i: {
  gpu: string;
  fps: number;
  worst: number;
  viewport: string;
  dpr: number;
  coarse: boolean;
  cores?: number;
  memoryGb?: number;
  light: boolean;
}): string[] {
  return [
    `${i.fps.toFixed(0)} fps (worst frame ${i.worst.toFixed(0)} ms)`,
    `GPU ${i.gpu}`,
    `${i.viewport} @ ${i.dpr}x`,
    `touch ${i.coarse ? 'yes' : 'no'} · ${i.cores ?? '?'} cores · ${i.memoryGb ?? '?'} GB`,
    `Milky Way starts on the ${i.light ? 'light' : 'full'} shader`,
  ];
}

/** Add `?diag` to the address to see frame rate and device facts on screen: for testing on a real phone. */
export async function initDiag() {
  if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('diag')) return;
  const { renderer } = await import('@/engine/gl'),
    gl = renderer.getContext(),
    ext = gl.getExtension('WEBGL_debug_renderer_info'),
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
    hints = deviceHints(),
    el = document.createElement('pre');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;left:6px;top:64px;z-index:99;margin:0;padding:6px 8px;font:11px/1.35 monospace;color:#9f9;background:#000a;border-radius:6px;pointer-events:none;white-space:pre-wrap;max-width:90vw';
  document.body.appendChild(el);
  let last = performance.now(),
    frames = 0,
    since = last,
    worst = 0;
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    worst = Math.max(worst, now - last);
    last = now;
    frames++;
    if (now - since < 1000) return;
    el.textContent = diagLines({
      gpu,
      fps: (frames * 1000) / (now - since),
      worst,
      viewport: `${innerWidth}×${innerHeight}`,
      dpr: devicePixelRatio,
      coarse: hints.coarsePointer,
      cores: hints.cores,
      memoryGb: hints.memoryGb,
      light: wantsLightMilkyWay(hints),
    }).join('\n');
    frames = 0;
    worst = 0;
    since = now;
  };
  requestAnimationFrame(tick);
}
