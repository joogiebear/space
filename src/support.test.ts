import { afterEach, describe, expect, it, vi } from 'vitest';
import { webglSupport } from './support';

/** A canvas whose getContext('webgl2') returns whatever the test needs. */
const canvasWith = (getContext: (id: string) => unknown) =>
  (() => ({ getContext })) as unknown as () => HTMLCanvasElement;

describe('webglSupport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports no WebGL 2 when the browser does not define it at all', () => {
    // jsdom (like an old browser) has no WebGL2RenderingContext
    expect(webglSupport(canvasWith(() => ({})))).toEqual({ ok: false, reason: 'no-webgl2' });
  });

  describe('in a browser that has WebGL 2', () => {
    const withWebGL2 = () => vi.stubGlobal('WebGL2RenderingContext', class {});

    it('is ok when a context can be created, and frees the probe context straight away', () => {
      withWebGL2();
      const loseContext = vi.fn();
      const gl = { getExtension: (n: string) => (n === 'WEBGL_lose_context' ? { loseContext } : null) };
      const getContext = vi.fn(() => gl);
      expect(webglSupport(canvasWith(getContext))).toEqual({ ok: true });
      expect(getContext).toHaveBeenCalledWith('webgl2');
      expect(loseContext).toHaveBeenCalledOnce();
    });

    it('is still ok when the lose-context extension is missing', () => {
      withWebGL2();
      expect(webglSupport(canvasWith(() => ({ getExtension: () => null })))).toEqual({ ok: true });
    });

    it('reports no-context when the browser refuses to create one (acceleration off, blocklisted GPU)', () => {
      withWebGL2();
      expect(webglSupport(canvasWith(() => null))).toEqual({ ok: false, reason: 'no-context' });
    });

    it('reports no-context when creating the context throws', () => {
      withWebGL2();
      expect(
        webglSupport(
          canvasWith(() => {
            throw new Error('GPU process crashed');
          }),
        ),
      ).toEqual({ ok: false, reason: 'no-context' });
    });
  });
});
