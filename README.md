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

Requires Python 3.9+ (standard library only) and a browser with WebGL2.

```
python server.py 8080
```

Open http://localhost:8080. Deep links: `#cosmos`, `#starmap`, `#solar`, `#earth`.
`/atlas2d.html` is the original Canvas-2D version.

The server fetches and caches public data under `cache/` on first use (the first
load takes a minute). CelesTrak only allows one download per group every two
hours; the server keeps serving the last good copy if it is rate-limited.

three.js and satellite.js load from jsDelivr / cdnjs; planet textures are in
`assets/tex/` (from the three.js examples, MIT).

## Controls

Use the "Jump to a moment in time" menu for historic and future events (solar system and Earth views).
Drag to orbit, wheel to zoom, click to select, double-click to enter a body.
`Esc` / `Backspace` goes up a level, `Space` pauses, `/` searches. The slider
at the bottom changes simulation speed (1x to 100,000,000x).

## Limits

Satellite positions use mean elements and are accurate to a few km, not
operational-grade. Galaxy positions and distances are schematic. Spacecraft
follow Horizons ephemerides over a window around the fetch date.
