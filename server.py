#!/usr/bin/env python3
"""Cosmos Atlas server: serves the site and proxies/caches public space data.

Sources (all public, fetched server-side and cached in ./cache):
  CelesTrak   - satellite / debris orbital elements (TLE)
  HYG v4      - ~120k star catalogue (astronexus on GitHub)
  NASA Exoplanet Archive - confirmed exoplanets
  JPL SBDB    - asteroid + comet orbital elements
  JPL Horizons - spacecraft positions
Run:  python server.py [port]
"""
import csv, gzip, io, json, os, struct, sys, threading, time, urllib.parse, urllib.request
from array import array
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(ROOT, 'cache')
os.makedirs(CACHE, exist_ok=True)
UA = 'CosmosAtlas/1.0 (personal visualisation)'
HOUR = 3600
locks = {}
status = {}
fail_at = {}
short_lived = set()  # cache files holding partial data: re-check after 5 minutes


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def fetch(url, timeout=180):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=timeout).read()


def cached(name, ttl, builder):
    path = os.path.join(CACHE, name)
    lock = locks.setdefault(name, threading.Lock())
    with lock:
        if os.path.exists(path) and time.time() - os.path.getmtime(path) < ttl:
            with open(path, 'rb') as f:
                return f.read()
        if time.time() - fail_at.get(name, 0) < 900 and not os.path.exists(path):
            raise RuntimeError('recent build failure, cooling down: ' + status.get(name, ''))
        status[name] = 'building'
        log('building', name)
        try:
            data = builder()
        except Exception as e:  # serve stale cache if we have one
            log('build failed', name, repr(e))
            status[name] = 'failed: ' + repr(e)
            fail_at[name] = time.time()
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    return f.read()
            raise
        with open(path, 'wb') as f:
            f.write(data)
        if name in short_lived:
            t = time.time() - ttl + 300
            os.utime(path, (t, t))
        status[name] = 'ready'
        log('built', name, len(data), 'bytes')
        return data


# ---------------------------------------------------------------- satellites
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


# --------------------------------------------------------------------- stars
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


# --------------------------------------------------------------- exoplanets
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


# --------------------------------------------------------- small bodies (JPL)
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


# ---------------------------------------------------------- spacecraft (JPL)
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


# ---------------------------------------------------------- constellations
def build_constellations():
    d = json.loads(fetch('https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/modern/index.json', 60))
    out = []
    for c in d['constellations']:
        cn = c.get('common_name', {})
        out.append([c['id'].split()[-1], cn.get('native') or c['id'].split()[-1], cn.get('english') or '', c['lines']])
    log('constellations', len(out))
    return json.dumps(out, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


API = {
    '/api/constellations': ('constellations.json', 90 * 24 * HOUR, build_constellations, 'application/json'),
    '/api/sats': ('sats.json', 3 * HOUR, build_sats, 'application/json'),
    '/api/stars.bin': ('stars.bin', 90 * 24 * HOUR, build_stars, 'application/octet-stream'),
    '/api/exo': ('exo.json', 3 * 24 * HOUR, build_exo, 'application/json'),
    '/api/sbdb': ('sbdb.json', 3 * 24 * HOUR, build_sbdb, 'application/json'),
    '/api/craft': ('craft.json', 12 * HOUR, build_craft, 'application/json'),
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        if '/api/' in str(args[0] if args else ''):
            log(self.address_string(), fmt % args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def send_bytes(self, data, ctype):
        gz = 'gzip' in self.headers.get('Accept-Encoding', '') and len(data) > 2000
        if gz:
            data = gzip.compress(data, 5)
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        if gz:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/api/status':
            return self.send_bytes(json.dumps(status).encode(), 'application/json')
        if path == '/api/stars.json':
            cached('stars.bin', *API['/api/stars.bin'][1:3])
            with open(os.path.join(CACHE, 'stars_names.json'), 'rb') as f:
                return self.send_bytes(f.read(), 'application/json')
        if path in API:
            name, ttl, builder, ctype = API[path]
            try:
                return self.send_bytes(cached(name, ttl, builder), ctype)
            except Exception as e:
                self.send_error(502, 'upstream failed: %r' % e)
                return
        if path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        if path.startswith('/cache') or path.endswith('.py'):
            self.send_error(404)
            return
        super().do_GET()


def prewarm():
    for p in ('/api/craft', '/api/sbdb', '/api/exo', '/api/stars.bin', '/api/sats', '/api/constellations'):
        name, ttl, builder, _ = API[p]
        try:
            cached(name, ttl, builder)
        except Exception as e:
            log('prewarm failed', p, repr(e)[:100])


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    threading.Thread(target=prewarm, daemon=True).start()
    log('Cosmos Atlas on http://0.0.0.0:%d' % port)
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
