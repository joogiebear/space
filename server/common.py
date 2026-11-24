"""Shared server plumbing: paths, logging, HTTP fetch, and the disk cache with stale fallback."""
import os, threading, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
