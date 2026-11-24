"""Spacecraft position tracks from JPL Horizons."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


CRAFT = [('Voyager 1', '-31'), ('Voyager 2', '-32'), ('New Horizons', '-98'), ('Parker Solar Probe', '-96'),
         ('James Webb Space Telescope', '-170'), ('Juno', '-61'), ('Lucy', '-49'), ('Psyche', '-255'),
         ('Europa Clipper', '-159'), ('BepiColombo', '-121'), ('Solar Orbiter', '-144'),
         ('Mars Reconnaissance Orbiter', '-74'), ('Hera', '-91'), ('JUICE', '-28')]


def build_craft():
    now = time.time()
    t0 = time.strftime('%Y-%m-%d %H:%M', time.gmtime(now - 60 * 86400))
    t1 = time.strftime('%Y-%m-%d %H:%M', time.gmtime(now + 300 * 86400))
    out = []
    for name, cid in CRAFT:
        q = {'format': 'json', 'COMMAND': "'%s'" % cid, 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'", 'EPHEM_TYPE': "'VECTORS'",
             'CENTER': "'500@10'", 'START_TIME': "'%s'" % t0, 'STOP_TIME': "'%s'" % t1, 'STEP_SIZE': "'2d'",
             'VEC_TABLE': "'1'", 'OUT_UNITS': "'AU-D'", 'CSV_FORMAT': "'YES'"}
        try:
            res = None
            for days_ahead in (300, 120, 30, 3):
                q['STOP_TIME'] = "'%s'" % time.strftime('%Y-%m-%d %H:%M', time.gmtime(now + days_ahead * 86400))
                res = json.loads(fetch('https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q), 60))['result']
                if '$$SOE' in res:
                    break
            track = []
            for ln in res.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
                f = ln.split(',')
                track.append([float(f[0]), round(float(f[2]), 6), round(float(f[3]), 6), round(float(f[4]), 6)])
            out.append({'name': name, 'id': cid, 'track': track})
        except Exception as e:
            log('horizons', name, 'skipped', repr(e)[:80])
        time.sleep(0.4)
    return json.dumps({'when': time.strftime('%Y-%m-%d %H:%M', time.gmtime(now)) + ' UTC', 'craft': out}, separators=(',', ':')).encode()
