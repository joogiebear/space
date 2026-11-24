# Cosmos Atlas

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
npm run build          # type-checks, then bundles the front end into dist/
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

## Controls

Drag to orbit, wheel to zoom, click to select, double-click to enter a body.
`Esc` / `Backspace` goes up a level, `Space` pauses, `/` searches. The slider
at the bottom changes simulation speed (1x to 100,000,000x). The "Jump to a
moment in time" menu (solar system and Earth views) jumps to historic events.

## Project layout

```
index.html              Vite entry: the fixed DOM the UI binds to
src/
  main.ts               Wires the UI, input, loop and first scene
  types.ts              Scene, Body, Layer, Preset: the contracts scenes implement
  lib/                  Pure helpers: math, Julian dates, orbital mechanics, colour, formatting
  engine/               Renderer, camera, picking, labels, input, clock, scene manager, render loop
  ui/                   One file per panel: info, layers, objects, search, time, presets, tooltip
  data/api.ts           Typed client for /api/*
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
follow Horizons ephemerides over a window around the fetch date. TypeScript runs
in non-strict mode for now; the shared contracts in `types.ts` are typed, and
scene internals are still loosely typed.
