import * as satellite from 'satellite.js';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/engine/gl', async () => (await import('@/test/glMock')).glMock());
const fetchSatellites = vi.fn();
vi.mock('@/data/api', () => ({ fetchSatellites: () => fetchSatellites() }));

import { App } from '@/engine';
import { findPass } from '../earth/passes';
import { createSkySatellites } from './satellites';

// A real ISS element set (epoch 2020-07-12 21:16 UTC), as in the pass tests
const TLE1 = '1 25544U 98067A   20194.88612269 -.00002218  00000-0 -31515-4 0  9992';
const TLE2 = '2 25544  51.6461 221.2784 0001413  89.1723 280.4612 15.49507896236008';
const EPOCH_JD = Date.UTC(2020, 6, 12, 21, 16) / 864e5 + 2440587.5;
const LOC = { lat: 51.5, lon: -0.12 };
const catalogue = {
  cats: ['Space stations', 'Active satellites'],
  fetched: '2020-07-12 21:16:00 UTC',
  sats: [
    ['ISS (ZARYA)', TLE1, TLE2, 0],
    ['PROGRESS-MS 14', TLE1, TLE2, 0],
    ['SOME CUBESAT', TLE1, TLE2, 1],
  ],
};
let jd = EPOCH_JD,
  sunAlt = -20,
  enabled = true;
const sun = new THREE.Vector3(-1, 0, 0); // behind Earth from the ISS's point of view: it is dark, so only altitude is checked
const make = () =>
  createSkySatellites({
    R: 300,
    loc: () => LOC,
    jd: () => jd,
    sunDir: () => sun,
    sunAlt: () => sunAlt,
    enabled: () => enabled,
    fmt: j => 'T' + j.toFixed(2),
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date((EPOCH_JD - 2440587.5) * 864e5));
  jd = EPOCH_JD;
  sunAlt = -20;
  enabled = true;
  App.sel = null;
  fetchSatellites.mockReset().mockResolvedValue(catalogue);
});
afterEach(() => vi.useRealTimers());

describe('sky satellites', () => {
  it('lists the space stations and nothing else as objects', async () => {
    const s = make();
    await s.load();
    expect(s.stationBodies().map(b => b.label)).toEqual(['ISS (ZARYA)', 'PROGRESS-MS 14']);
  });

  it('every satellite can be found by search, and the result makes a body', async () => {
    const s = make();
    await s.load();
    const hits = s.search('cube');
    expect(hits.map(h => h.label)).toEqual(['SOME CUBESAT']);
    expect(hits[0].sub).toBe('Active satellites');
    expect(hits[0].make()!.label).toBe('SOME CUBESAT');
    expect(s.search('zzz')).toEqual([]);
  });

  it('the same satellite is always the same body, so selection and sharing stay stable', async () => {
    const s = make();
    await s.load();
    expect(s.search('iss')[0].make()).toBe(s.stationBodies()[0]);
    expect(s.stationBodies()[0].id).toBe('sat25544');
  });

  it('reports its altitude and direction, and puts the dot on the sky sphere', async () => {
    const s = make();
    await s.load();
    const b = s.stationBodies()[0];
    const { alt, az } = b.altAz();
    expect(alt).toBeGreaterThan(-90);
    expect(alt).toBeLessThanOrEqual(90);
    expect(az).toBeGreaterThanOrEqual(0);
    expect(az).toBeLessThan(360);
    const v = b.getPos(new THREE.Vector3());
    expect(v.length()).toBeCloseTo(300 * 0.97, 6);
    expect(Math.asin(v.y / v.length()) * (180 / Math.PI)).toBeCloseTo(alt, 4); // height of the dot = altitude
  });

  it('info shows what and where it is and whether it can be seen now', async () => {
    const s = make();
    await s.load();
    const rows = Object.fromEntries(s.stationBodies()[0].getInfo!().rows!.map(r => [r[0], r[1]]));
    expect(rows['Category']).toBe('Space stations');
    expect(rows['NORAD ID']).toBe('25544');
    expect(rows['Altitude']).toMatch(/° (above|below) the horizon/);
    expect(rows['Now']).toBeTruthy();
    expect(rows['Next pass over you']).toBe('calculating…');
  });

  it('only the stations themselves are named; a docked vehicle is named when selected', async () => {
    const s = make();
    await s.load();
    const [iss, progress] = s.stationBodies();
    expect(iss.noLabel).toBe(false);
    expect(progress.noLabel).toBe(true);
    App.sel = progress;
    expect(progress.noLabel).toBe(false);
    enabled = false;
    expect(iss.noLabel).toBe(true); // the layer is off
  });

  it('draws the selected satellite’s next pass as a line once the search finishes', async () => {
    const s = make();
    await s.load();
    const iss = s.stationBodies()[0];
    App.sel = iss;
    s.update(iss);
    expect(s.group.children.some(c => c instanceof THREE.Line)).toBe(false); // still searching
    await vi.advanceTimersByTimeAsync(0);
    s.update(iss);
    const line = s.group.children.find(c => c instanceof THREE.Line) as THREE.Line;
    expect(line).toBeTruthy();
    const pos = line.geometry.getAttribute('position');
    expect(pos.count).toBeGreaterThan(10);
    // every point of the arc is on the sky sphere, above the horizon (a pass is above it by definition)
    for (let i = 0; i < pos.count; i++) expect(pos.getY(i)).toBeGreaterThanOrEqual(-300 * 0.96 * 0.1);
    // deselecting removes it
    App.sel = null;
    s.update(null);
    expect(s.group.children.some(c => c instanceof THREE.Line)).toBe(false);
  });

  const labelsAt = async (at: number) => {
    const s = make();
    await s.load();
    const iss = s.stationBodies()[0];
    jd = at;
    s.update(iss);
    await vi.advanceTimersByTimeAsync(0);
    s.update(iss);
    const labels: string[] = [];
    s.extraLabels((t: string) => labels.push(t));
    return labels;
  };

  it('labels where an upcoming pass rises, peaks and sets', async () => {
    const pass = findPass(satellite.twoline2satrec(TLE1, TLE2), EPOCH_JD, LOC, sun)!;
    const labels = await labelsAt(pass.rise - 0.02); // the pass has not started yet
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatch(/^rises [NESW]+ T/);
    expect(labels[1]).toMatch(/^max \d+°$/);
    expect(labels[2]).toMatch(/^sets [NESW]+ T/);
  });

  it('does not label the start of a pass that is already under way', async () => {
    const pass = findPass(satellite.twoline2satrec(TLE1, TLE2), EPOCH_JD, LOC, sun)!;
    const labels = await labelsAt((pass.rise + pass.set) / 2);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toMatch(/^max \d+°$/);
    expect(labels[1]).toMatch(/^sets /);
  });

  it('hides everything when the orbit data is far from the simulated date', async () => {
    const s = make();
    await s.load();
    jd = EPOCH_JD + 365;
    vi.setSystemTime(new Date((EPOCH_JD - 2440587.5) * 864e5)); // "today" stays at the catalogue date
    const rows = Object.fromEntries(s.stationBodies()[0].getInfo!().rows!.map(r => [r[0], r[1]]));
    expect(rows['Position']).toMatch(/weeks around today/);
    expect(s.summary()).toEqual([['Satellites', 'hidden: orbit data covers weeks around today']]);
  });

  it('survives the catalogue being unavailable', async () => {
    fetchSatellites.mockRejectedValue(new Error('offline'));
    const s = make();
    await s.load();
    expect(s.ready).toBe(false);
    expect(s.stationBodies()).toEqual([]);
    expect(s.search('iss')).toEqual([]);
    expect(s.summary()).toEqual([['Satellites', 'data unavailable right now']]);
    expect(() => s.update(null)).not.toThrow();
  });

  it('the summary announces the ISS’s next pass', async () => {
    const s = make();
    await s.load();
    expect(s.summary()[0]).toEqual(['ISS next pass', 'calculating…']);
    await vi.advanceTimersByTimeAsync(0);
    const rows = s.summary();
    expect(rows[0][0]).toBe('ISS next pass');
    expect(rows[0][1]).not.toBe('calculating…');
    expect(rows[1][0]).toBe('ISS pass');
  });
});
