import { createApp, nextTick, type App as VueApp } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { requestLocation } from '../dialogs';
import { locationRequest } from '../store';
import LocationDialog from './LocationDialog.vue';

let app: VueApp, host: HTMLElement, opener: HTMLButtonElement;

beforeEach(async () => {
  document.body.innerHTML = '<button id="opener">Set my location</button><div id="host"></div>';
  opener = document.getElementById('opener') as HTMLButtonElement;
  host = document.getElementById('host')!;
  app = createApp(LocationDialog);
  app.mount(host);
  opener.focus();
});
afterEach(() => {
  app.unmount();
  locationRequest.value = null;
});

const key = (target: Element, k: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const dialog = () => host.querySelector('[role="dialog"]') as HTMLElement | null;
const input = () => host.querySelector('input') as HTMLInputElement;
const buttons = () => [...host.querySelectorAll('button')];
/** Open the dialog. Returns the still-pending answer inside an object, so awaiting this does not wait for the user. */
const open = async (current: { lat: number; lon: number } | null = null) => {
  const answer = requestLocation(current);
  await nextTick();
  await nextTick();
  return { answer };
};

describe('LocationDialog accessibility', () => {
  it('is absent until requested, then an announced modal dialog with a name and description', async () => {
    expect(dialog()).toBeNull();
    await open();
    const d = dialog()!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(host.querySelector(`#${d.getAttribute('aria-labelledby')}`)!.textContent).toBe('Your location');
    expect(host.querySelector(`#${d.getAttribute('aria-describedby')}`)!.textContent).toMatch(/never sent anywhere/);
    expect(input().getAttribute('aria-label')).toBe('Latitude and longitude');
  });

  it('moves focus into the field, pre-filled with the current location', async () => {
    await open({ lat: 51.5, lon: -0.12 });
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe('51.5, -0.12');
  });

  it('keeps Tab inside the dialog in both directions', async () => {
    await open();
    const [geo, , save] = [buttons()[0], buttons()[1], buttons()[2]];
    // forward from the last control wraps to the first
    save.focus();
    key(save, 'Tab');
    expect(document.activeElement).toBe(input());
    // backward from the first control wraps to the last
    input().focus();
    key(input(), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(save);
    // an ordinary Tab in the middle is left to the browser
    geo.focus();
    const middle = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    geo.dispatchEvent(middle);
    expect(middle.defaultPrevented).toBe(false);
  });

  it('Escape cancels and hands focus back to the button that opened it', async () => {
    const { answer } = await open();
    key(input(), 'Escape');
    await expect(answer).resolves.toBeNull();
    await nextTick();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('Enter in the field saves a valid location and closes', async () => {
    const { answer } = await open();
    input().value = '40.7, -74';
    input().dispatchEvent(new Event('input'));
    key(input(), 'Enter');
    await expect(answer).resolves.toEqual({ lat: 40.7, lon: -74 });
    await nextTick();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('an invalid entry stays open and the problem is announced (role=alert)', async () => {
    await open();
    input().value = '95, 10';
    input().dispatchEvent(new Event('input'));
    key(input(), 'Enter');
    await nextTick();
    expect(dialog()).not.toBeNull();
    const alert = host.querySelector('[role="alert"]')!;
    expect(alert.textContent).toMatch(/latitude, longitude/);
    expect(input().getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('keystrokes inside the dialog do not reach the map shortcuts on window', async () => {
    await open();
    let leaked = false;
    const spy = () => (leaked = true);
    window.addEventListener('keydown', spy);
    key(input(), ' ');
    key(input(), 'a');
    window.removeEventListener('keydown', spy);
    expect(leaked).toBe(false);
  });
});
