import { createApp, nextTick, type App as VueApp } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerSearchInput } from '../searchFocus';
import { ui } from '../store';
import MobileBar from './MobileBar.vue';

let app: VueApp, host: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  host = document.getElementById('host')!;
  ui.sheet = 'none';
  app = createApp(MobileBar);
  app.mount(host);
});
afterEach(() => app.unmount());

const buttons = () => [...host.querySelectorAll('button')];
const byName = (name: string) => buttons().find(b => b.textContent!.trim() === name)!;

describe('MobileBar', () => {
  it('is a labelled navigation with one button per panel, all collapsed at first', () => {
    expect(host.querySelector('nav')!.getAttribute('aria-label')).toBe('Panels');
    expect(buttons().map(b => b.textContent!.trim())).toEqual(['Info', 'Layers', 'Time', 'Search']);
    expect(buttons().every(b => b.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('each button points at the panel it opens', () => {
    expect(buttons().map(b => b.getAttribute('aria-controls'))).toEqual(['info', 'side', 'ctl', 'search']);
  });

  it('opens a sheet, and pressing the same button again closes it', async () => {
    byName('Time').click();
    await nextTick();
    expect(ui.sheet).toBe('time');
    expect(byName('Time').getAttribute('aria-expanded')).toBe('true');
    expect(byName('Time').classList.contains('on')).toBe(true);
    byName('Time').click();
    await nextTick();
    expect(ui.sheet).toBe('none');
    expect(byName('Time').getAttribute('aria-expanded')).toBe('false');
  });

  it('only one sheet is open at a time', async () => {
    byName('Layers').click();
    byName('Info').click();
    await nextTick();
    expect(ui.sheet).toBe('info');
    expect(
      buttons()
        .filter(b => b.getAttribute('aria-expanded') === 'true')
        .map(b => b.textContent!.trim()),
    ).toEqual(['Info']);
  });

  it('opening Search puts the cursor in the search field, ready to type', async () => {
    const input = document.createElement('input');
    document.body.append(input);
    registerSearchInput(input);
    byName('Search').click();
    await nextTick();
    await nextTick();
    expect(ui.sheet).toBe('search');
    expect(document.activeElement).toBe(input);
  });
});
