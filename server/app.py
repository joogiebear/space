"""HTTP app: the JSON/binary data API plus the built front end (dist/)."""
import gzip, json, os, urllib.parse
from http.server import SimpleHTTPRequestHandler

from .common import CACHE, HOUR, ROOT, cached, log, status
from .sources.celestrak import build_sats
from .sources.comets import build_comets
from .sources.constellations import build_constellations
from .sources.exoplanets import build_exo
from .sources.horizons import build_craft
from .sources.launches import build_launches
from .sources.smallbodies import build_sbdb
from .sources.stars import build_stars

DIST = os.path.join(ROOT, 'dist')

API = {
    '/api/constellations': ('constellations.json', 90 * 24 * HOUR, build_constellations, 'application/json'),
    # CelesTrak republishes every 2 h. Keep this below the 3 h refresh schedule: at exactly 3 h a run can land a few
    # minutes inside the TTL and reuse the old file, leaving the live data up to ~6 h old.
    '/api/sats': ('sats.json', 2 * HOUR, build_sats, 'application/json'),
    '/api/stars.bin': ('stars.bin', 90 * 24 * HOUR, build_stars, 'application/octet-stream'),
    '/api/exo': ('exo.json', 3 * 24 * HOUR, build_exo, 'application/json'),
    '/api/sbdb': ('sbdb.json', 3 * 24 * HOUR, build_sbdb, 'application/json'),
    '/api/craft': ('craft.json', 12 * HOUR, build_craft, 'application/json'),
    # the free tier allows 15 requests an hour; a launch date can move, so refresh it often enough to be useful
    '/api/launches': ('launches.json', 2 * HOUR, build_launches, 'application/json'),
    '/api/comets': ('comets.json', 24 * HOUR, build_comets, 'application/json'),
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=DIST, **k)

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
        if not os.path.isdir(DIST):
            return self.send_bytes(b'Front end not built. Run "npm run build", or use "npm run dev" for development.', 'text/plain')
        super().do_GET()


def prewarm():
    for p in ('/api/craft', '/api/launches', '/api/comets', '/api/sbdb', '/api/exo', '/api/stars.bin', '/api/sats', '/api/constellations'):
        name, ttl, builder, _ = API[p]
        try:
            cached(name, ttl, builder)
        except Exception as e:
            log('prewarm failed', p, repr(e)[:100])
