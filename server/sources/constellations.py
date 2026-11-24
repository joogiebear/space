"""Constellation figures (Stellarium modern sky culture)."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


# Pinned to a commit so an upstream schema change cannot break the build; bump deliberately.
STELLARIUM_COMMIT = '3863ab071ae08737c00832bfdd00c40279ad055a'
URL = 'https://raw.githubusercontent.com/Stellarium/stellarium/%s/skycultures/modern/index.json' % STELLARIUM_COMMIT


def build_constellations():
    d = json.loads(fetch(URL, 60))
    out = []
    for c in d['constellations']:
        cn = c.get('common_name', {})
        out.append([c['id'].split()[-1], cn.get('native') or c['id'].split()[-1], cn.get('english') or '', c['lines']])
    log('constellations', len(out))
    return json.dumps(out, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
