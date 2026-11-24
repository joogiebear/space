import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBody, makeScene } from '@/test/fakeScene';

vi.mock('@/engine/gl', async () => (await import('@/test/glMock')).glMock());

import { pauseChanged, setPaused, setRate, togglePause } from '@/engine/clock';
import { dragStarted, hoverChanged } from '@/engine/input';
import { slowTick } from '@/engine/loop';
import { sceneEntered } from '@/engine/sceneManager';
import { deselect, select } from '@/engine/selection';
import { App, cam, sim } from '@/engine/state';
import { initBridge, refreshInfo } from './bridge';
import { sceneBodies, sceneLayers, scenePresets, ui } from './store';

beforeAll(() => initBridge());

beforeEach(() => {
  ui.sheet = 'none';
  App.scene = makeScene();
  App.sel = null;
  App.hover = null;
  App.path = ['test'];
  sim.paused = false;
  sim.jd = 2460000.5;
  ui.tip.visible = false;
  ui.sliderPos = 30;
  ui.rate = 1;
  ui.paused = false;
  refreshInfo(null);
});

describe('refreshInfo', () => {
  it('shows the scene intro when nothing is selected', () => {
    expect(ui.selId).toBeNull();
    expect(ui.info).toMatchObject({
      title: 'Test Scene',
      sub: '',
      text: 'Intro text',
      rows: [['Objects', '3']],
      actionLabel: null,
      enterLabel: null,
    });
  });

  it('shows a body from its static info', () => {
    refreshInfo(makeBody('moon'));
    expect(ui.selId).toBe('moon');
    expect(ui.info).toMatchObject({ title: 'MOON', sub: 'sub moon', text: 'text moon', rows: [['k', 'v']] });
  });

  it('prefers getInfo() over info, so live values show', () => {
    refreshInfo(makeBody('x', { getInfo: () => ({ sub: 'live', text: '', rows: [['Altitude', '400 km']] }) }));
    expect(ui.info.sub).toBe('live');
    expect(ui.info.rows).toEqual([['Altitude', '400 km']]);
  });

  it('falls back to empty text for a body with no info', () => {
    const b = makeBody('bare');
    delete b.info;
    refreshInfo(b);
    expect(ui.info).toMatchObject({ title: 'BARE', sub: '', text: '', rows: [] });
  });

  it('labels the enter button, defaulting to "Enter"', () => {
    refreshInfo(makeBody('a', { enter: 'solar' }));
    expect(ui.info.enterLabel).toBe('Enter ›');
    refreshInfo(makeBody('a', { enter: 'solar', enterLabel: 'Fly inside' }));
    expect(ui.info.enterLabel).toBe('Fly inside ›');
    refreshInfo(makeBody('a', { enter: null }));
    expect(ui.info.enterLabel).toBeNull();
  });

  it('resolves an action label given as a string or a function', () => {
    refreshInfo(makeBody('a', { action: { label: 'Do it', run: () => {} } }));
    expect(ui.info.actionLabel).toBe('Do it');
    let n = 0;
    refreshInfo(makeBody('a', { action: { label: () => 'Count ' + ++n, run: () => {} } }));
    expect(ui.info.actionLabel).toBe('Count 1');
  });

  it('copies rows so later mutation of the source does not leak into the store', () => {
    const rows = [['a', '1']];
    refreshInfo(makeBody('a', { info: { rows } }));
    rows[0][1] = 'changed';
    expect(ui.info.rows[0][1]).toBe('1');
  });
});

describe('selection events', () => {
  it('select() updates the panel and notifies the scene', () => {
    const onSelect = vi.fn();
    App.scene = makeScene({ onSelect });
    const b = makeBody('b', { focusD: 3 });
    select(b);
    expect(App.sel).toBe(b);
    expect(ui.selId).toBe('b');
    expect(ui.info.title).toBe('B');
    expect(cam.want).toBe(3);
    expect(onSelect).toHaveBeenCalledWith(b);
  });

  it('deselect() returns to the scene intro and view distance', () => {
    const onSelect = vi.fn();
    App.scene = makeScene({ onSelect });
    select(makeBody('b'));
    deselect();
    expect(App.sel).toBeNull();
    expect(ui.selId).toBeNull();
    expect(ui.info.title).toBe('Test Scene');
    expect(cam.want).toBe(10);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('deselect() with nothing selected does nothing', () => {
    const onSelect = vi.fn();
    App.scene = makeScene({ onSelect });
    deselect();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('sceneEntered', () => {
  it('copies scene metadata, lists and the breadcrumb into the store', () => {
    const layer = { id: 'l', label: 'L', on: true, apply() {} },
      preset = { label: 'P', date: '2020-01-01T00:00Z' };
    const sc = makeScene({
      id: 'earth',
      title: 'Earth Orbit',
      timeLabel: 'Simulated date',
      layers: [layer],
      presets: [preset],
    });
    App.scene = sc;
    App.path = ['cosmos', 'solar', 'earth'];
    const before = ui.sceneSerial;
    sceneEntered.emit(sc);
    expect(ui).toMatchObject({
      sceneId: 'earth',
      title: 'Earth Orbit',
      timeLabel: 'Simulated date',
      path: ['cosmos', 'solar', 'earth'],
    });
    expect(ui.sceneSerial).toBe(before + 1);
    expect(sceneBodies.value).toBe(sc.bodies);
    expect(sceneLayers.value).toEqual([layer]);
    expect(scenePresets.value).toEqual([preset]);
    expect(ui.info.title).toBe('Earth Orbit');
  });

  it('defaults the time label and tolerates scenes without bodies, layers or presets', () => {
    const sc = makeScene({ id: 'x', bodies: undefined });
    App.scene = sc;
    sceneEntered.emit(sc);
    expect(ui.timeLabel).toBe('Date');
    expect(sceneBodies.value).toEqual([]);
    expect(sceneLayers.value).toEqual([]);
    expect(scenePresets.value).toEqual([]);
  });

  it('does not alias the engine path array', () => {
    const sc = makeScene();
    App.scene = sc;
    App.path = ['a', 'b'];
    sceneEntered.emit(sc);
    App.path.push('c');
    expect(ui.path).toEqual(['a', 'b']);
  });
});

describe('time controls state', () => {
  it('maps the speed to a log slider position (1x..1e8x -> 0..100)', () => {
    setRate(1);
    expect(ui.sliderPos).toBe(0);
    setRate(1e8);
    expect(ui.sliderPos).toBeCloseTo(100, 6);
    setRate(10000);
    expect(ui.sliderPos).toBeCloseTo(50, 6);
    expect(ui.rate).toBe(10000);
  });

  it('clamps speeds below 1x to the left end', () => {
    setRate(0.25);
    expect(ui.sliderPos).toBe(0);
    expect(ui.rate).toBe(0.25);
  });

  it('leaves the slider alone when the change came from the slider itself', () => {
    ui.sliderPos = 42;
    setRate(1000, true);
    expect(ui.rate).toBe(1000);
    expect(ui.sliderPos).toBe(42);
  });

  it('mirrors pause state', () => {
    setPaused(true);
    expect(ui.paused).toBe(true);
    togglePause();
    expect(ui.paused).toBe(false);
    pauseChanged.emit(true);
    expect(ui.paused).toBe(true);
  });
});

describe('hover tooltip', () => {
  it('shows the label offset from the pointer, and hides when nothing is hovered', () => {
    hoverChanged.emit(makeBody('a'), 100, 200);
    expect(ui.tip).toEqual({ visible: true, text: 'A', x: 114, y: 212 });
    hoverChanged.emit(null, 0, 0);
    expect(ui.tip.visible).toBe(false);
  });

  it('hides while dragging', () => {
    hoverChanged.emit(makeBody('a'), 1, 1);
    dragStarted.emit();
    expect(ui.tip.visible).toBe(false);
  });
});

describe('slow tick', () => {
  it('re-reads info for a live selection', () => {
    let alt = 400;
    const b = makeBody('iss', { live: true, getInfo: () => ({ rows: [['Altitude', alt + ' km']] }) });
    select(b);
    alt = 415;
    slowTick.emit();
    expect(ui.info.rows).toEqual([['Altitude', '415 km']]);
  });

  it('does not re-read info for a static selection', () => {
    const getInfo = vi.fn(() => ({ rows: [] }));
    select(makeBody('s', { getInfo }));
    getInfo.mockClear();
    slowTick.emit();
    expect(getInfo).not.toHaveBeenCalled();
  });

  it('shows a date-only readout, or the full timestamp when the scene has a time label', () => {
    sim.jd = 2460000.5; // 2023-02-25 00:00 UTC
    slowTick.emit();
    expect(ui.dateText).toBe('2023-02-25');
    App.scene = makeScene({ timeLabel: 'Simulated date' });
    slowTick.emit();
    expect(ui.dateText).toBe('2023-02-25 00:00:00 UTC');
  });
});

describe('phone sheets', () => {
  it('opens the details sheet when something is selected', () => {
    select(makeBody('a'));
    expect(ui.sheet).toBe('info');
  });

  it('does not pop the sheet open when a zoom merely homes in on something (quiet select)', () => {
    select(makeBody('a'), true);
    expect(ui.sheet).toBe('none');
  });

  it('switches from another sheet to the details of what was just picked', () => {
    ui.sheet = 'side'; // picked from the Layers/Objects list
    select(makeBody('a'));
    expect(ui.sheet).toBe('info');
  });

  it('closes the details sheet when the selection is cleared', () => {
    select(makeBody('a'));
    deselect();
    expect(ui.sheet).toBe('none');
  });

  it('leaves a different open sheet alone when the selection is cleared', () => {
    select(makeBody('a'));
    ui.sheet = 'time'; // the user moved on to the time controls
    deselect();
    expect(ui.sheet).toBe('time');
  });

  it('closes every sheet on a view change, so the new view is not covered', () => {
    ui.sheet = 'side';
    const sc = makeScene({ id: 'next' });
    App.scene = sc;
    sceneEntered.emit(sc);
    expect(ui.sheet).toBe('none');
  });
});
