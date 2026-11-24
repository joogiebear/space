/** The viewer's location for pass prediction. It lives only in this browser's localStorage. */
export interface Loc { lat: number; lon: number }

const KEY = 'atlas.loc';

export function loadLocation(): Loc | null {
  try { return JSON.parse(localStorage.getItem(KEY) as string); } catch { return null; }
}

export function saveLocation(loc: Loc) {
  try { localStorage.setItem(KEY, JSON.stringify(loc)); } catch { /* storage blocked */ }
}

const NUM = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/;

/** In-page dialog (prompt() is blocked in embedded browsers). Resolves to the new location, or null if cancelled. */
export function askLocation(current: Loc | null): Promise<Loc | null> {
  return new Promise(done => {
    const ov = document.createElement('div'); ov.className = 'modal';
    ov.innerHTML = '<div class="panel box"><h3>Your location</h3><p>Enter latitude, longitude (south and west are negative), or use your browser\'s location. It stays in this browser and is never sent anywhere.</p>' +
      '<input type="text" placeholder="51.5, -0.12" autocomplete="off" spellcheck="false"><div class="err"></div>' +
      '<div class="btns"><button data-a="geo">Use browser location</button><span></span><button data-a="cancel">Cancel</button><button data-a="ok" class="pri">Save</button></div></div>';
    const inp = ov.querySelector('input')!, err = ov.querySelector('.err')!;
    inp.value = current ? current.lat + ', ' + current.lon : '';
    const close = (loc: Loc | null) => { ov.remove(); done(loc); };
    const save = () => {
      const m = inp.value.match(NUM);
      if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) { err.textContent = 'Use the form "latitude, longitude", for example 51.5, -0.12'; return; }
      close({ lat: +m[1], lon: +m[2] });
    };
    ov.addEventListener('click', e => {
      const t = e.target as HTMLElement, a = t.dataset && t.dataset.a;
      if (t === ov || a === 'cancel') close(null);
      else if (a === 'ok') save();
      else if (a === 'geo') {
        err.textContent = 'Asking your browser…';
        if (!navigator.geolocation) { err.textContent = 'This browser has no location support. Enter coordinates instead.'; return; }
        navigator.geolocation.getCurrentPosition(
          p => close({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
          () => { err.textContent = 'Location unavailable (it needs HTTPS or localhost and your permission). Enter coordinates instead.'; },
          { timeout: 10000 });
      }
    });
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') save(); if (e.key === 'Escape') close(null); });
    document.body.append(ov); inp.focus(); inp.select();
  });
}
