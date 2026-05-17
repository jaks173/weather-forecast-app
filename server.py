#!/usr/bin/env python3
"""Static file server with a same-origin proxy for the 7Timer weather API (avoids CORS)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
TIMER_BASE = "https://www.7timer.info/bin/api.pl"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/weather?"):
            self._proxy_weather()
            return
        super().do_GET()

    def _proxy_weather(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        lon = (params.get("lon") or [""])[0]
        lat = (params.get("lat") or [""])[0]
        if not lon or not lat:
            self._send_json(400, {"error": "lon and lat are required"})
            return
        url = (
            f"{TIMER_BASE}?lon={urllib.parse.quote(lon)}"
            f"&lat={urllib.parse.quote(lat)}"
            "&product=civillight&output=json"
        )
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                body = resp.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.URLError as exc:
            self._send_json(502, {"error": str(exc)})

    def _send_json(self, code: int, payload: dict):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)


def main():
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving {ROOT} at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
