"""HYG v4.0 star catalogue, packed as a binary for the browser."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


HYG = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v40.csv.gz'


def build_stars():
    txt = gzip.decompress(fetch(HYG, 300)).decode('utf-8')
    pos, hips, names, n = array('f'), array('i'), [], 0
    for r in csv.DictReader(io.StringIO(txt)):
        try:
            d = float(r['dist'])
            if r['id'] == '0' or d <= 0 or d >= 99999:
                continue
            x, y, z, am = float(r['x']), float(r['y']), float(r['z']), float(r['absmag'])
        except (ValueError, KeyError):
            continue
        ci = float(r['ci']) if r.get('ci') else 0.6
        pos.extend((x, y, z, am, ci))
        hip = int(r['hip']) if r.get('hip') else 0
        hips.append(hip)
        proper, bf = r.get('proper', ''), r.get('bf', '').strip()
        try:
            mag = float(r['mag'])
        except ValueError:
            mag = 99
        if proper or (bf and mag < 4.5):
            names.append([n, proper or bf, r.get('con', ''), r.get('spect', ''), round(d, 3), round(mag, 2), hip])
        n += 1
    with open(os.path.join(CACHE, 'stars_names.json'), 'w') as f:
        json.dump(names, f, separators=(',', ':'))
    return struct.pack('<I', n) + pos.tobytes() + hips.tobytes()
