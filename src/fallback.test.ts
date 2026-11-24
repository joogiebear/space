import { beforeEach, describe, expect, it } from 'vitest';
import { LITE_URL, showFallback } from './fallback';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"><p>old content</p></div>';
  root = document.getElementById('app')!;
});

describe('showFallback', () => {
  it('replaces whatever was on the page with an announced explanation', () => {
    showFallback(root, 'no-context');
    expect(root.textContent).not.toContain('old content');
    const card = root.querySelector('main')!;
    expect(card.getAttribute('role')).toBe('alert'); // read out by screen readers immediately
    expect(card.querySelector('h1')!.textContent).toMatch(/can.t show the 3D view/);
  });

  it('gives a different reason and different advice for each failure', () => {
    const text = (r: Parameters<typeof showFallback>[1]) => {
      showFallback(root, r);
      return root.textContent!;
    };
    expect(text('no-webgl2')).toMatch(/does not support WebGL 2/);
    expect(text('no-webgl2')).toMatch(/Update your browser/);
    expect(text('no-context')).toMatch(/graphics acceleration/);
    expect(text('no-context')).toMatch(/drivers/);
    expect(text('startup-error')).toMatch(/failed to start/);
  });

  it('links to the WebGL-free 2D version and to the project', () => {
    showFallback(root, 'no-webgl2');
    const links = [...root.querySelectorAll('a')];
    expect(links.map(a => a.textContent)).toEqual(['Open the simplified 2D version', 'About this project']);
    expect(links[0].getAttribute('href')).toBe(LITE_URL());
    expect(LITE_URL()).toMatch(/atlas2d\.html$/);
    expect(links[1].getAttribute('href')).toBe('https://github.com/joogiebear/space');
    expect(links[1].rel).toBe('noopener');
  });

  it('shows technical details only when there is something to show', () => {
    showFallback(root, 'startup-error');
    expect(root.querySelector('details')).toBeNull();
    showFallback(root, 'startup-error', new Error('shader failed to compile'));
    expect(root.querySelector('details pre')!.textContent).toBe('shader failed to compile');
    showFallback(root, 'startup-error', 'plain string');
    expect(root.querySelector('details pre')!.textContent).toBe('plain string');
  });

  it('treats error text as text, never as markup', () => {
    showFallback(root, 'startup-error', new Error('<img src=x onerror=alert(1)>'));
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('pre')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
