"""Constellation figures (Stellarium modern sky culture)."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


def build_constellations():
    d = json.loads(fetch('https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/modern/index.json', 60))
    out = []
    for c in d['constellations']:
        cn = c.get('common_name', {})
        out.append([c['id'].split()[-1], cn.get('native') or c['id'].split()[-1], cn.get('english') or '', c['lines']])
    log('constellations', len(out))
    return json.dumps(out, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
