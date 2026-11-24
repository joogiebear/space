"""Confirmed exoplanets from the NASA Exoplanet Archive."""
import csv, gzip, io, json, os, struct, time, urllib.parse
from array import array

from ..common import CACHE, HOUR, fetch, log, short_lived


def build_exo():
    q = ('select pl_name,hostname,sy_dist,ra,dec,pl_orbsmax,pl_rade,pl_bmasse,disc_year,discoverymethod,pl_eqt,'
         'sy_pnum,st_spectype,st_teff from pscomppars')
    url = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=' + urllib.parse.quote(q) + '&format=csv'
    txt = fetch(url, 300).decode('utf-8')

    def num(s):
        try:
            return round(float(s), 5) if s != '' else None
        except ValueError:
            return None
    rows = []
    for r in csv.DictReader(io.StringIO(txt)):
        rows.append([r['pl_name'], r['hostname'], num(r['sy_dist']), num(r['ra']), num(r['dec']), num(r['pl_orbsmax']),
                     num(r['pl_rade']), num(r['pl_bmasse']), num(r['disc_year']), r['discoverymethod'],
                     num(r['pl_eqt']), num(r['sy_pnum']), r['st_spectype'], num(r['st_teff'])])
    return json.dumps(rows, separators=(',', ':')).encode()
