"""Upcoming rocket launches from The Space Devs' Launch Library 2 (free tier: 15 requests an hour, no key)."""
import datetime, json

from ..common import fetch

URL = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?mode=list&limit=40&ordering=net'


def reduce_launches(payload: dict, now: str) -> bytes:
    """[net (UTC ISO), rocket and payload, provider, site, status] for each launch, soonest first. Pure, so it is tested."""
    rows = []
    for r in payload.get('results', []):
        net = r.get('net')
        if not net or not r.get('name'):
            continue
        rows.append([
            net,
            r['name'],
            r.get('lsp_name') or '',
            r.get('location') or r.get('pad') or '',
            (r.get('status') or {}).get('abbrev') or '',
        ])
    rows.sort(key=lambda x: x[0])
    return json.dumps({'fetched': now, 'launches': rows}, separators=(',', ':')).encode()


def build_launches() -> bytes:
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    return reduce_launches(json.loads(fetch(URL, 60).decode('utf-8')), now)
