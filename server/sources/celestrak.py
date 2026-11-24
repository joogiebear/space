"""Satellite and debris orbital elements (TLE) from CelesTrak."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


CATS = ['Space stations', 'Active satellites', 'Starlink', 'OneWeb', 'Navigation (GNSS)', 'Debris', 'Rocket bodies']


def classify(n):
    u = n.upper()
    if u.startswith('STARLINK'): return 2
    if u.startswith('ONEWEB'): return 3
    if any(k in u for k in ('GPS ', 'NAVSTAR', 'GLONASS', 'GALILEO', 'BEIDOU', 'BDS-')): return 4
    return 1


def group_tle(g):
    """TLE text for one CelesTrak group. CelesTrak allows one download per group per 2 hours
    (403 otherwise), so every group is kept on disk and the last copy is reused when blocked."""
    d = os.path.join(CACHE, 'tle'); os.makedirs(d, exist_ok=True)
    path = os.path.join(d, g.replace(':', '_').replace('/', '_') + '.txt')
    fresh = os.path.exists(path) and time.time() - os.path.getmtime(path) < 2 * HOUR + 300
    if not fresh:
        q = ('NAME=' + g[5:]) if g.startswith('NAME:') else ('GROUP=' + g)
        for attempt in range(3):
            try:
                txt = fetch('https://celestrak.org/NORAD/elements/gp.php?%s&FORMAT=tle' % q).decode('latin-1')
                if txt.lstrip().startswith(('No GP data', 'Invalid')):
                    raise ValueError(txt[:60])
                with open(path, 'w', encoding='latin-1') as f:
                    f.write(txt)
                return txt
            except Exception as e:
                log('celestrak', g, 'attempt', attempt + 1, 'failed', repr(e))
                if getattr(e, 'code', 0) in (403, 404):  # rate-limited or no such group: retrying is pointless
                    break
                time.sleep(15 * (attempt + 1))
    if os.path.exists(path):
        with open(path, encoding='latin-1') as f:
            return f.read()
    return None


def build_sats():
    plan = [('stations', 0), ('active', None), ('cosmos-2251-debris', 5), ('iridium-33-debris', 5),
            ('fengyun-1c-debris', 5), ('cosmos-1408-debris', 5), ('NAME:R/B', 6)]
    seen, out, missing = set(), [], []
    for g, cat in plan:
        txt = group_tle(g)
        if txt is None:
            missing.append(g)
            continue
        lines = [l.rstrip() for l in txt.splitlines() if l.strip()]
        added = 0
        for i in range(0, len(lines) - 2, 3):
            n, l1, l2 = lines[i], lines[i + 1], lines[i + 2]
            if not (l1.startswith('1 ') and l2.startswith('2 ')):
                continue
            try:
                nid = int(l1[2:7])
            except ValueError:
                continue
            if nid in seen:
                continue
            seen.add(nid)
            c = cat if cat is not None else classify(n)
            if c == 5 and 'R/B' in n:
                c = 6
            out.append([n.strip(), l1, l2, c])
            added += 1
        log('celestrak', g, added)
        time.sleep(1.0)
    if not out:
        raise RuntimeError('no satellite data available yet (CelesTrak rate limit)')
    note = ''
    if missing:
        log('celestrak missing groups', missing)
        note = ' (partial: %s unavailable, retrying every 5 min)' % ', '.join(missing)
        short_lived.add('sats.json')
    else:
        short_lived.discard('sats.json')
    return json.dumps({'cats': CATS, 'fetched': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()) + note, 'sats': out},
                      separators=(',', ':')).encode()
