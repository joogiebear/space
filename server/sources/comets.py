"""Comets that are near perihelion and bright enough to matter, from the JPL Small-Body Database."""
import datetime, json

from ..common import fetch

UNIX_JD = 2440587.5
# looking back two months catches a comet still at its best; the calendar looks up to three years ahead
BEFORE, AFTER = 60, 3 * 366


def now_jd() -> float:
    return datetime.datetime.now(datetime.timezone.utc).timestamp() / 86400 + UNIX_JD


def reduce_comets(payload: dict, jd: float) -> bytes:
    """[name, q, e, i, node, argPeri, tp (JD), M1, K1] for each comet with a magnitude and a perihelion near now. Pure, so it is tested.

    Only elliptical orbits (e < 1): the front end solves Kepler's equation, which does not hold for open orbits.
    """
    f = payload.get('fields', [])
    col = {name: f.index(name) for name in ('full_name', 'q', 'e', 'i', 'om', 'w', 'tp', 'M1', 'K1') if name in f}
    rows = []
    for r in payload.get('data', []):
        try:
            name = r[col['full_name']].strip()
            q, e, i, om, w, tp = (float(r[col[k]]) for k in ('q', 'e', 'i', 'om', 'w', 'tp'))
            m1 = float(r[col['M1']])
        except (KeyError, TypeError, ValueError, AttributeError):
            continue
        try:
            k1 = float(r[col['K1']])
        except (KeyError, TypeError, ValueError):
            k1 = 10.0  # the usual assumption when a comet has no measured slope
        if not (0 < e < 1 and q > 0 and jd - BEFORE <= tp <= jd + AFTER):
            continue
        rows.append([name, round(q, 5), round(e, 6), round(i, 4), round(om, 4), round(w, 4), round(tp, 4), m1, k1])
    rows.sort(key=lambda x: x[6])
    return json.dumps({'comets': rows}, separators=(',', ':')).encode()


def build_comets() -> bytes:
    payload = json.loads(fetch('https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,e,i,om,w,q,tp,M1,K1&sb-kind=c', 600).decode('utf-8'))
    return reduce_comets(payload, now_jd())
