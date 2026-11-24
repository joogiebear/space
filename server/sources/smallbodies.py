"""Asteroids and comets from the JPL Small-Body Database."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


def sbdb(params):
    return json.loads(fetch('https://ssd-api.jpl.nasa.gov/sbdb_query.api?' + params, 600))


def build_sbdb():
    F = 'full_name,a,e,i,om,w,ma,epoch,H,neo,pha'
    belt = sbdb('fields=%s&sb-kind=a&sb-cdata=%s' % (F, urllib.parse.quote('{"AND":["H|RG|0|14.5"]}')))
    neo = sbdb('fields=%s&sb-kind=a&sb-group=neo' % F)
    seen, ast = set(), []
    for src in (neo, belt):
        for r in src['data']:
            name = r[0].strip()
            if name in seen:
                continue
            try:
                a, e, i, om, w, ma, ep = (float(x) for x in r[1:8])
            except (TypeError, ValueError):
                continue
            if not (0 < a < 1000 and 0 <= e < 0.99):
                continue
            H = float(r[8]) if r[8] else 0
            flag = 2 if r[10] == 'Y' else 1 if r[9] == 'Y' else 0
            seen.add(name)
            ast.append([name, round(a, 5), round(e, 5), round(i, 4), round(om, 4), round(w, 4), round(ma, 4), ep, round(H, 2), flag])
    com = []
    try:
        c = sbdb('fields=full_name,e,i,om,w,q,tp&sb-kind=c')
        for r in c['data']:
            try:
                e, i, om, w, q, tp = (float(x) for x in r[1:7])
            except (TypeError, ValueError):
                continue
            if not (0 < e < 0.995 and q > 0):
                continue
            com.append([r[0].strip(), round(q / (1 - e), 4), round(e, 5), round(i, 4), round(om, 4), round(w, 4), 0, tp, 0, 3])
    except Exception as ex:
        log('comets failed', repr(ex))
    log('sbdb asteroids', len(ast), 'comets', len(com))
    return json.dumps({'ast': ast, 'com': com}, separators=(',', ':')).encode()
