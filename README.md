# Cosmos Atlas

[![CI](https://github.com/joogiebear/space/actions/workflows/ci.yml/badge.svg)](https://github.com/joogiebear/space/actions/workflows/ci.yml)

**[Live demo: joogiebear.github.io/space](https://joogiebear.github.io/space/)**

An animated WebGL atlas of the universe, from the local galaxy group down to the
satellites and debris orbiting Earth. Real data, drawn on the GPU.

| View | What it shows | Data |
| --- | --- | --- |
| Local Universe / Galaxies | Famous galaxies; fly inside the Milky Way | Procedural, schematic |
| Star map | ~109k real stars, 88 constellation figures, optional exoplanet host layer | HYG v4.0, Stellarium, NASA Exoplanet Archive |
| Solar system | Planets at their real positions, moons, ~96k asteroids, comets, spacecraft | JPL elements, SBDB, Horizons |
| Earth orbit | ~20k tracked satellites, stations, debris, rocket bodies; ISS follow, ground track and next-pass prediction for any selected satellite | CelesTrak (SGP4 / Kepler + J2 on the GPU) |

## Run

Requires Node 20+ and Python 3.9+ (standard library only).

```
npm install
npm run build          # type-checks (vue-tsc), then bundles the front end into dist/
python -m server 8080  # serves dist/ and the data API at http://localhost:8080
```

For development, run the data server and Vite side by side; Vite proxies `/api`
to the Python server and hot-reloads the front end at http://localhost:5173:

```
npm run api
npm run dev
```

Deep links: `#cosmos`, `#starmap`, `#solar`, `#earth`, `#gal:andromeda`.
`/atlas2d.html` is the original Canvas-2D version.

The server fetches and caches public data under `cache/` on first use (the first
load takes a minute). CelesTrak only allows one download per group every two
hours; the server keeps each group on disk and serves the last good copy if it
is rate-limited.

## Hosting

The live demo runs on GitHub Pages, which is free but static, so the Python server cannot run there.
Instead `.github/workflows/pages.yml` runs it once per deployment:

1. build the front end with `VITE_STATIC_DATA=1` (the data client reads `data/*.json` instead of `/api/*`)
   and `VITE_BASE=/space/` (the site lives under a sub-path),
2. run `python -m server.export dist/data`, which fetches every source with the same code and cache as
   the live server and writes the payloads as plain files,
3. deploy `dist/` to Pages.

It runs on every push to `main` and every 3 hours (CelesTrak refreshes every 2), and keeps `cache/` between
runs so a source that refuses the runner falls back to its last good copy. GitHub pauses scheduled workflows
after 60 days without repository activity; re-enable it from the Actions tab if that happens.

To host it elsewhere, run the two commands above with a different `VITE_BASE`, or deploy the Python server.

## Tests

```
npm test            # Vitest, one run (jsdom, no WebGL needed)
npm run test:watch
```

Covered: pass prediction (`scenes/earth/passes.test.ts`: checked against satellite.js and
hand-built sun geometry for the visibility rules), the reactive store and its engine bridge
(`ui/bridge.test.ts`), toasts and the location dialog (`ui/toast.test.ts`), the simulation
clock (`engine/clock.test.ts`), and the date, orbit and colour helpers (`lib/lib.test.ts`).
Tests that touch the engine mock `engine/gl.ts` (see `src/test/glMock.ts`) since jsdom has no WebGL.

## Controls

Drag to orbit, wheel to zoom, click to select. Zoom in on a galaxy, the Sun, or Earth and keep going to fly inside
(or double-click it).
`Esc` / `Backspace` goes up a level, `Space` pauses, `/` searches. The slider
at the bottom changes simulation speed (1x to 100,000,000x). The "Jump to a
moment in time" menu (solar system and Earth views) jumps to historic events.

## Project layout

```
index.html              Vite entry: the canvas, label layer and the #app mount point
src/
  main.ts               Wires the UI, input, loop and first scene
  types.ts              Scene, Body, Layer, Preset: the contracts scenes implement
  lib/                  Pure helpers: math, Julian dates, orbital mechanics, colour, formatting
  engine/               Renderer, camera, picking, labels, input, clock, scene manager, render loop
  ui/                   Vue 3 panels: App.vue and components/ (TopBar, SearchBox, SidePanel, InfoPanel, TimePanel, ...)
                        store.ts holds the reactive state; bridge.ts copies engine events into it
  data/api.ts           Typed client for /api/*
  test/                 Test setup, a WebGL mock and fake scenes (tests sit next to the code they cover)
  scenes/               One folder per view; each registers itself
    galaxies/ starmap/ solar/ earth/   index.ts + shaders, data, presets as needed
  styles/               CSS split by area
public/                 Static files: planet textures, atlas2d.html
server/                 Python data server
  common.py             Paths, fetch, disk cache with stale fallback
  sources/              One module per upstream: celestrak, stars, exoplanets, smallbodies, horizons, constellations
  app.py                Routes and static serving
```

To add a view: create `src/scenes/<name>/index.ts` that builds a `Scene` and calls
`register(id, title, factory)`, import it in `src/scenes/index.ts`, and (if it
belongs in the navigation) add it to `PARENT` and `TABS` in `engine/sceneManager.ts`.

## Limits

Satellite positions use mean elements and are accurate to a few km, not
operational-grade. Galaxy positions and distances are schematic. Spacecraft
follow Horizons ephemerides over a window around the fetch date. The project
type-checks under TypeScript `strict`.

## Data and credits

Nothing below is bundled except the four planet textures; everything else is fetched by the
server at run time and cached locally.

- Satellite and debris orbital elements: [CelesTrak](https://celestrak.org) (Dr. T.S. Kelso)
- Stars: the [HYG database](https://github.com/astronexus/HYG-Database) (David Nash), CC BY-SA 4.0
- Exoplanets: [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu)
- Asteroids, comets and spacecraft tracks: [JPL Small-Body Database and Horizons](https://ssd.jpl.nasa.gov)
- Planet positions: JPL approximate Keplerian elements (1800-2050)
- Constellation figures: Stellarium's "modern" sky culture
- Satellite propagation: [satellite.js](https://github.com/shashwatak/satellite-js); rendering: [three.js](https://threejs.org)
- Planet textures in `public/assets/tex/` come from the three.js examples; see that repository for their terms.

The data sources have their own terms of use. This project is not affiliated with any of them.

## License

The code is [MIT](LICENSE) licensed. That covers this repository's source only: the data fetched at
run time and the planet textures keep their own terms (see above).
