"""Run with:  python -m server [port]"""
import sys, threading
from http.server import ThreadingHTTPServer

from .app import Handler, prewarm
from .common import log

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
threading.Thread(target=prewarm, daemon=True).start()
log('Cosmos Atlas on http://0.0.0.0:%d' % port)
ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
