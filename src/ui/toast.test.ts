import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestLocation } from './dialogs';
import { locationRequest, ui } from './store';
import { hideToast, toast, toastIsError } from './toast';

describe('toast', () => {
  beforeEach(() => { vi.useFakeTimers(); hideToast(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows a message with an optional sub-line', () => {
    toast('Loading', 'first visit');
    expect(ui.toast).toEqual({ visible: true, msg: 'Loading', sub: 'first visit' });
  });

  it('stays until hidden when no delay is given', () => {
    toast('Hold');
    vi.advanceTimersByTime(60_000);
    expect(ui.toast.visible).toBe(true);
    hideToast();
    expect(ui.toast.visible).toBe(false);
  });

  it('hides itself after the delay', () => {
    toast('Bye', '', 1000);
    vi.advanceTimersByTime(999); expect(ui.toast.visible).toBe(true);
    vi.advanceTimersByTime(2); expect(ui.toast.visible).toBe(false);
  });

  it("a newer toast cancels the older one's timer", () => {
    toast('first', '', 1000);
    vi.advanceTimersByTime(500);
    toast('second', '', 5000);
    vi.advanceTimersByTime(1000);
    expect(ui.toast.visible).toBe(true);
    expect(ui.toast.msg).toBe('second');
  });

  it('recognises the load-failure toast', () => {
    toast('Loading Star Map…');
    expect(toastIsError()).toBe(false);
    toast('Some data failed to load', 'oops');
    expect(toastIsError()).toBe(true);
    hideToast();
    expect(toastIsError()).toBe(false);
  });
});

describe('requestLocation', () => {
  it('opens the dialog with the current value and resolves with the answer', async () => {
    const current = { lat: 51.5, lon: -0.12 };
    const answer = requestLocation(current);
    expect(locationRequest.value?.current).toEqual(current);
    locationRequest.value!.resolve({ lat: 1, lon: 2 });
    await expect(answer).resolves.toEqual({ lat: 1, lon: 2 });
    expect(locationRequest.value).toBeNull();
  });

  it('resolves null when cancelled and closes the dialog', async () => {
    const answer = requestLocation(null);
    locationRequest.value!.resolve(null);
    await expect(answer).resolves.toBeNull();
    expect(locationRequest.value).toBeNull();
  });
});
