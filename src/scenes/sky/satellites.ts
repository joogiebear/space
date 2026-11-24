import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { App, Markers } from '@/engine';
import { compass16, nowJD } from '@/lib';
import { fetchSatellites, type SatCatalogue } from '@/data/api';
import type { Body, EmitLabel, Info, InfoRows, SearchResult } from '@/types';
import type { Loc } from '../earth/location';
import { PassPredictor, passTrack, satLook, type Look } from '../earth/passes';

/** What the satellite layer needs to know about the sky it is drawn into. */
export interface SatDeps {
  /** Radius of the sphere the dots are drawn on. */
  R: number;
  loc(): Loc;
  jd(): number;
  /** Unit direction to the Sun in the Earth scene's axes (x, z, -y of the equatorial frame). */
  sunDir(): THREE.Vector3;
  /** The Sun's altitude in degrees at the observer. */
  sunAlt(): number;
  enabled(): boolean;
  /** Time to show a pass time in. */
  fmt(jd: number): string;
}

export interface SatBody extends Body {
  satIdx: number;
  altAz(): { alt: number; az: number };
}

/** Orbital elements are only good for a few weeks around the catalogue date. */
const VALID_DAYS = 30;
const MAX_ARC_STEP = 10;
/** Visiting vehicles dock at the same spot as their station and would stack their labels on it: name only the stations. */
const LABELLED = new Set(['ISS (ZARYA)', 'CSS (TIANHE)']);

/**
 * Satellites in Sky Tonight: the space stations are always drawn, any satellite can be found by search, and the one
 * selected shows the path it will draw across your sky on its next pass over you.
 */
export function createSkySatellites(d: SatDeps) {
  const group = new THREE.Group();
  let cat: SatCatalogue | null = null,
    failed = false,
    markers: Markers | null = null,
    stations: number[] = [];
  const recs = new Map<number, satellite.SatRec | null>(),
    bodies = new Map<number, SatBody>(),
    looks = new Map<number, { key: string; look: Look | null }>(),
    predictor = new PassPredictor(),
    issPredictor = new PassPredictor();
  let arc: { key: string; line: THREE.Line; track: ReturnType<typeof passTrack>; ongoing: boolean } | null = null;
  const tmp = new THREE.Vector3();

  const usable = () => cat !== null && Math.abs(d.jd() - nowJD()) <= VALID_DAYS;
  const recOf = (i: number) => {
    if (!recs.has(i)) recs.set(i, cat ? satellite.twoline2satrec(cat.sats[i][1], cat.sats[i][2]) : null);
    return recs.get(i) ?? null;
  };
  /** Where satellite `i` is now, cached for the current time and location (several callers ask every frame). */
  function lookOf(i: number): Look | null {
    const loc = d.loc(),
      key = `${d.jd()}|${loc.lat}|${loc.lon}`,
      c = looks.get(i);
    if (c && c.key === key) return c.look;
    const rec = recOf(i),
      look = rec ? satLook(rec, d.jd(), loc, d.sunDir()) : null;
    looks.set(i, { key, look });
    return look;
  }
  const world = (look: Look, out: THREE.Vector3, r = d.R * 0.97) => {
    const az = (look.az * Math.PI) / 180,
      el = (look.el * Math.PI) / 180;
    return out.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, -Math.cos(az) * Math.cos(el) * r);
  };

  const visibility = (look: Look) =>
    look.el <= 0
      ? 'below the horizon'
      : !look.sunlit
        ? "in Earth's shadow: not visible"
        : d.sunAlt() > -6
          ? 'sunlit, but the sky is too bright'
          : 'sunlit against a dark sky: visible';

  function body(i: number): SatBody {
    let b = bodies.get(i);
    if (b) return b;
    const s = cat!.sats[i];
    b = {
      id: 'sat' + s[1].slice(2, 7).trim(),
      label: s[0],
      satIdx: i,
      live: true,
      riseAlt: 0,
      get noLabel() {
        return !d.enabled() || !(LABELLED.has(s[0]) || App.sel === b);
      },
      altAz() {
        const l = usable() ? lookOf(i) : null;
        return l ? { alt: l.el, az: l.az } : { alt: -90, az: 0 };
      },
      getPos(v: THREE.Vector3) {
        const l = lookOf(i);
        return l ? world(l, v) : v.set(0, -d.R, 0);
      },
      getInfo(): Info {
        const rec = recOf(i),
          l = lookOf(i),
          rows: InfoRows = [
            ['Category', cat!.cats[s[3]]],
            ['NORAD ID', s[1].slice(2, 7).trim()],
          ];
        if (!usable()) {
          rows.push(['Position', 'orbit data only covers weeks around today']);
        } else if (l) {
          rows.push(
            ['Altitude', `${l.el.toFixed(1)}° ${l.el > 0 ? 'above' : 'below'} the horizon`],
            ['Direction', `${compass16(l.az)} (${l.az.toFixed(0)}° from north)`],
            ['Range', `${Math.round(l.range).toLocaleString()} km`],
            ['Now', visibility(l)],
          );
          rows.push(...predictor.rows(i, rec, d.loc(), d.jd(), d.sunDir()));
        } else rows.push(['Position', 'orbit data has decayed']);
        return {
          sub: 'Satellite · ' + cat!.cats[s[3]],
          text: 'Drawn at its real position for your location. When it is selected, the green line is its next pass over you.',
          rows,
        };
      },
    } as SatBody;
    bodies.set(i, b);
    return b;
  }

  function buildArc(i: number) {
    const rec = recOf(i),
      pass = predictor.result(i, d.loc());
    if (!rec || !pass) return clearArc();
    const key = `${i}|${d.loc().lat}|${d.loc().lon}|${pass.rise}`;
    if (arc?.key === key) return;
    clearArc();
    const track = passTrack(rec, pass, d.loc(), d.sunDir(), MAX_ARC_STEP);
    if (track.length < 2) return;
    const pts = track.map(t => world(t, new THREE.Vector3(), d.R * 0.96));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: 0x7fe0a0,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
        depthWrite: false,
      }),
    );
    line.renderOrder = 6;
    group.add(line);
    arc = { key, line, track, ongoing: pass.ongoing };
  }
  function clearArc() {
    if (!arc) return;
    group.remove(arc.line);
    arc.line.geometry.dispose();
    arc = null;
  }

  return {
    group,
    get ready() {
      return cat !== null;
    },
    /** Download the catalogue; the sky works without it. */
    async load() {
      try {
        cat = await fetchSatellites();
        stations = cat.sats.flatMap((s, i) => (s[3] === 0 ? [i] : []));
        markers = new Markers(stations.length + 1);
        group.add(markers.points);
      } catch {
        failed = true;
      }
    },
    /** The space stations, as selectable bodies for the Objects list. */
    stationBodies: () => stations.map(body),
    reset() {
      predictor.reset();
      issPredictor.reset();
      looks.clear();
      clearArc();
    },
    /** Place the dots for this frame and keep the selected satellite's arc up to date. */
    update(sel: Body | null) {
      if (!markers) return;
      const on = d.enabled() && usable();
      const dot = (slot: number, i: number, selected: boolean) => {
        const l = on ? lookOf(i) : null;
        if (!l || l.el <= 0) return markers!.hide(slot);
        world(l, tmp);
        const seen = l.sunlit && d.sunAlt() < -6;
        if (seen) markers!.set(slot, tmp.x, tmp.y, tmp.z, [1, 0.92, 0.55], selected ? 14 : 12);
        else if (l.sunlit) markers!.set(slot, tmp.x, tmp.y, tmp.z, [0.8, 0.85, 1], 7);
        else markers!.set(slot, tmp.x, tmp.y, tmp.z, [0.35, 0.45, 0.7], 5);
      };
      stations.forEach((i, k) => dot(k, i, (sel as SatBody | null)?.satIdx === i));
      const extra = sel && (sel as SatBody).satIdx !== undefined && !stations.includes((sel as SatBody).satIdx);
      if (extra) dot(stations.length, (sel as SatBody).satIdx, true);
      else markers.hide(stations.length);
      const si = (sel as SatBody | null)?.satIdx;
      if (si !== undefined && on) {
        predictor.rows(si, recOf(si), d.loc(), d.jd(), d.sunDir()); // starts the search if it has not run
        buildArc(si);
      } else clearArc();
      if (arc) arc.line.visible = d.enabled();
    },
    extraLabels(emit: EmitLabel) {
      if (!arc || !d.enabled()) return;
      const t = arc.track,
        first = t[0],
        last = t[t.length - 1],
        peak = t.reduce((a, b) => (b.el > a.el ? b : a));
      // a pass already under way starts where the satellite is now, which its own label already marks
      if (!arc.ongoing)
        emit(`rises ${compass16(first.az)} ${d.fmt(first.jd)}`, world(first, tmp, d.R * 0.96), 'dim', 6);
      emit(`max ${peak.el.toFixed(0)}°`, world(peak, tmp, d.R * 0.96), 'dim', 6);
      emit(`sets ${compass16(last.az)} ${d.fmt(last.jd)}`, world(last, tmp, d.R * 0.96), 'dim', 6);
    },
    search(q: string): SearchResult[] {
      if (!cat) return [];
      const out: SearchResult[] = [];
      for (let i = 0; i < cat.sats.length && out.length < 14; i++)
        if (cat.sats[i][0].toLowerCase().includes(q))
          out.push({ label: cat.sats[i][0], sub: cat.cats[cat.sats[i][3]], make: () => body(i) });
      return out;
    },
    /** Rows for the summary shown when nothing is selected: when the ISS next crosses your sky. */
    summary(): InfoRows {
      if (failed) return [['Satellites', 'data unavailable right now']];
      if (!cat) return [['Satellites', '…']];
      if (!usable()) return [['Satellites', 'hidden: orbit data covers weeks around today']];
      const iss = stations.find(i => cat!.sats[i][0] === 'ISS (ZARYA)');
      if (iss === undefined) return [['Satellites', `${stations.length} space stations`]];
      const r = issPredictor.rows(iss, recOf(iss), d.loc(), d.jd(), d.sunDir());
      const out: InfoRows = [['ISS next pass', r[0]?.[1] ?? '…']];
      if (r[1]) out.push(['ISS pass', r[1][1] + (r[2] ? ' · ' + r[2][1] : '')]);
      return out;
    },
  };
}
