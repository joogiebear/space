import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBody, makeScene } from '@/test/fakeScene';

vi.mock('@/engine/gl', async () => (await import('@/test/glMock')).glMock());
// Scene changes are a separate concern: record the calls instead of running a real transition.
vi.mock('@/engine/sceneManager', () => ({
  goUp: vi.fn(),
  openScene: vi.fn(),
  parentOf: () => null,
  isBusy: () => false,
  sceneTitle: (id: string) => id,
  goScene: vi.fn(),
  chain: (id: string) => [id],
  sceneEntered: { on() {}, emit() {} },
}));

import { openScene, goUp } from '@/engine/sceneManager';
import { App, cam, sim } from '@/engine/state';
import { HELP, handleKey, ownsKeys } from './shortcuts';
import { registerSearchInput } from './searchFocus';
import { ui } from './store';

/** Dispatch-free: build the event, run the handler, and report whether it called preventDefault. */
function press(key: string, opts: KeyboardEventInit = {}, target: Element = document.body) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  Object.defineProperty(e, 'target', { value: target });
  const handled = handleKey(e);
  return { handled, prevented: e.defaultPrevented };
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  App.scene = makeScene();
  App.sel = null;
  Object.assign(cam, { yaw: 0, pitch: 0, want: 10, dist: 10 });
  Object.assign(sim, { paused: false });
  App.interact = 0;
  ui.toast.visible = false;
});

describe('Escape and Backspace: back out one step', () => {
  it('deselects when something is selected, without leaving the scene', () => {
    App.sel = makeBody('a');
    expect(press('Escape').handled).toBe(true);
    expect(App.sel).toBeNull();
    expect(goUp).not.toHaveBeenCalled();
  });

  it('goes up a level when nothing is selected', () => {
    press('Escape');
    expect(goUp).toHaveBeenCalledOnce();
    press('Backspace');
    expect(goUp).toHaveBeenCalledTimes(2);
  });

  it('Escape works even from inside a text field (it is the way out), Backspace does not (it deletes text)', () => {
    const input = document.body.appendChild(document.createElement('input'));
    press('Escape', {}, input);
    expect(goUp).toHaveBeenCalledOnce();
    expect(press('Backspace', {}, input).handled).toBe(false);
    expect(goUp).toHaveBeenCalledOnce();
  });
});

describe('keys that belong to focused controls are left alone', () => {
  it.each([
    ['button', 'button'],
    ['input', 'input'],
    ['select', 'select'],
    ['textarea', 'textarea'],
    ['summary', 'summary'],
  ])('Space on a focused %s is not stolen', tag => {
    const el = document.body.appendChild(document.createElement(tag));
    const r = press(' ', {}, el);
    expect(r).toEqual({ handled: false, prevented: false });
    expect(sim.paused).toBe(false);
  });

  it('arrow keys still move a slider', () => {
    const slider = document.body.appendChild(document.createElement('input'));
    slider.type = 'range';
    expect(press('ArrowRight', {}, slider).handled).toBe(false);
    expect(cam.yaw).toBe(0);
  });

  it('Enter on a link or button is not turned into "go inside"', () => {
    App.sel = makeBody('a', { enter: 'solar' });
    const a = document.body.appendChild(document.createElement('a'));
    a.href = '#x';
    expect(press('Enter', {}, a).handled).toBe(false);
    expect(openScene).not.toHaveBeenCalled();
  });

  it('nothing fires from inside a dialog, even on a non-form element', () => {
    const dlg = document.body.appendChild(document.createElement('div'));
    dlg.setAttribute('role', 'dialog');
    const p = dlg.appendChild(document.createElement('p'));
    expect(press(' ', {}, p).handled).toBe(false);
    expect(ownsKeys(p)).toBe(true);
    expect(ownsKeys(document.body)).toBe(false);
    expect(ownsKeys(null)).toBe(false);
  });

  it('modifier combinations (Ctrl+F, Cmd+L, Alt+Left) are never hijacked', () => {
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      expect(press('Escape', mod).handled).toBe(false);
      expect(press('/', mod).handled).toBe(false);
      expect(press('ArrowLeft', mod).handled).toBe(false);
    }
    expect(goUp).not.toHaveBeenCalled();
  });
});

describe('map controls (focus on the map or nowhere)', () => {
  it('Space pauses and resumes, and stops the page scrolling', () => {
    expect(press(' ')).toEqual({ handled: true, prevented: true });
    expect(sim.paused).toBe(true);
    press(' ');
    expect(sim.paused).toBe(false);
  });

  it('arrow keys orbit the camera and count as user input (so auto-orbit pauses)', () => {
    press('ArrowRight');
    expect(cam.yaw).toBeCloseTo(0.12);
    press('ArrowLeft');
    press('ArrowLeft');
    expect(cam.yaw).toBeCloseTo(-0.12);
    press('ArrowUp');
    expect(cam.pitch).toBeCloseTo(0.1);
    press('ArrowDown');
    press('ArrowDown');
    expect(cam.pitch).toBeCloseTo(-0.1);
    expect(App.interact).toBeGreaterThan(0);
  });

  it('pitch is clamped so the view cannot flip over the pole', () => {
    for (let i = 0; i < 40; i++) press('ArrowUp');
    expect(cam.pitch).toBe(1.5);
    for (let i = 0; i < 80; i++) press('ArrowDown');
    expect(cam.pitch).toBe(-1.5);
  });

  it('plus and minus zoom in and out, within the scene limits', () => {
    press('+');
    expect(cam.want).toBeCloseTo(8.5);
    press('=');
    expect(cam.want).toBeCloseTo(7.225);
    press('-');
    press('_');
    expect(cam.want).toBeCloseTo(10);
    for (let i = 0; i < 60; i++) press('-');
    expect(cam.want).toBe(100); // scene maxD
  });

  it('Enter goes inside the selected object, but only if it has somewhere to go', () => {
    App.sel = makeBody('a');
    expect(press('Enter').handled).toBe(false);
    expect(openScene).not.toHaveBeenCalled();
    App.sel = makeBody('b', { enter: 'gal:andromeda' });
    expect(press('Enter')).toEqual({ handled: true, prevented: true });
    expect(openScene).toHaveBeenCalledWith('gal:andromeda');
  });

  it('"/" jumps to the search box', () => {
    const input = document.createElement('input');
    document.body.append(input);
    registerSearchInput(input);
    expect(press('/').prevented).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('"?" lists the controls', () => {
    press('?');
    expect(ui.toast.visible).toBe(true);
    expect(ui.toast.sub).toBe(HELP);
  });

  it('ignores keys it does not own', () => {
    expect(press('q').handled).toBe(false);
    expect(press('F5').handled).toBe(false);
  });
});
