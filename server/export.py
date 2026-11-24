"""Export every API payload as a static file, for hosting without a Python server.

    python -m server.export dist/data

Runs the same builders as the live server (with the same disk cache and stale-copy fallback), then copies the
results to the output folder under the names the front end expects (see STATIC_FILES in src/data/api.ts).

Exit status: 0 when every file exists (a stale copy counts), 1 when a required one is missing. Satellite data is
optional: CelesTrak rate-limits by IP and can refuse a shared CI runner, in which case the site keeps working
and the Earth view says the data is not available yet.
"""
import os, shutil, sys

from .app import API
from .common import CACHE, cached, log

# cache file written by each builder; (file in the output folder is the same name)
OPTIONAL = {'sats.json', 'launches.json', 'comets.json'}
EXTRA = ['stars_names.json']  # written as a side effect of the stars builder


def main(out: str) -> int:
    os.makedirs(out, exist_ok=True)
    missing = []
    for route, (name, ttl, builder, _ctype) in API.items():
        try:
            cached(name, ttl, builder)
        except Exception as e:  # cached() already fell back to a stale file if one existed
            log('export', route, 'failed:', repr(e)[:120])
            pass
    for name in [spec[0] for spec in API.values()] + EXTRA:
        src = os.path.join(CACHE, name)
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(out, name))
            log('export', name, os.path.getsize(src), 'bytes')
        else:
            missing.append(name)
    required = [n for n in missing if n not in OPTIONAL]
    if missing:
        log('export missing:', missing, '(optional)' if not required else '(REQUIRED FILES MISSING)')
    return 1 if required else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'dist/data'))
