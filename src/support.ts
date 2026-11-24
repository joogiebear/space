/**
 * Can this browser run the 3D view? three.js needs WebGL 2. Checked before the engine is loaded, because the
 * renderer is created when the engine module is imported and throws if there is no usable context.
 */
export type SupportResult =
  | { ok: true }
  | {
      ok: false;
      /** `no-webgl2`: the browser has no WebGL 2 at all. `no-context`: it has, but would not give us one. */
      reason: 'no-webgl2' | 'no-context';
    };

export function webglSupport(
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): SupportResult {
  if (typeof WebGL2RenderingContext === 'undefined') return { ok: false, reason: 'no-webgl2' };
  try {
    const gl = createCanvas().getContext('webgl2');
    if (!gl) return { ok: false, reason: 'no-context' };
    // hand the context back to the browser straight away; the renderer makes its own
    (gl as WebGL2RenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'no-context' };
  }
}
