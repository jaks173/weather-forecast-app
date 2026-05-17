#!/usr/bin/env python3
"""Static server + API proxies (7Timer forecast, Open-Meteo current weather & air quality)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
TIMER_BASE = "https://www.7timer.info/bin/api.pl"
OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/bundle?"):
            self._proxy_bundle()
            return
        if self.path.startswith("/api/weather?"):
            self._proxy_timer()
            return
        super().do_GET()

    def _read_params(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        lon = (params.get("lon") or [""])[0]
        lat = (params.get("lat") or [""])[0]
        return lat, lon

    def _fetch_url(self, url: str) -> dict:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _proxy_timer(self):
        lat, lon = self._read_params()
        if not lat or not lon:
            self._send_json(400, {"error": "lon and lat are required"})
            return
        url = (
            f"{TIMER_BASE}?lon={urllib.parse.quote(lon)}"
            f"&lat={urllib.parse.quote(lat)}"
            "&product=civillight&output=json"
        )
        try:
            data = self._fetch_url(url)
            self._send_json(200, data)
        except (urllib.error.URLError, json.JSONDecodeError) as exc:
            self._send_json(502, {"error": str(exc)})

    def _proxy_bundle(self):
        lat, lon = self._read_params()
        if not lat or not lon:
            self._send_json(400, {"error": "lon and lat are required"})
            return

        timer_url = (
            f"{TIMER_BASE}?lon={urllib.parse.quote(lon)}"
            f"&lat={urllib.parse.quote(lat)}"
            "&product=civillight&output=json"
        )
        meteo_url = (
            f"{OPEN_METEO}?latitude={urllib.parse.quote(lat)}"
            f"&longitude={urllib.parse.quote(lon)}"
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
            "weather_code,wind_speed_10m,wind_direction_10m"
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
            "precipitation_sum,wind_speed_10m_max"
            "&timezone=auto&forecast_days=7"
        )
        aq_url = (
            f"{OPEN_METEO_AQ}?latitude={urllib.parse.quote(lat)}"
            f"&longitude={urllib.parse.quote(lon)}"
            "&current=us_aqi,pm2_5,pm10,european_aqi"
            "&timezone=auto"
        )

        out = {"timer": None, "meteo": None, "air_quality": None, "errors": []}
        for key, url in (("timer", timer_url), ("meteo", meteo_url), ("air_quality", aq_url)):
            try:
                out[key] = self._fetch_url(url)
            except Exception as exc:
                out["errors"].append(f"{key}: {exc}")

        self._send_json(200, out)

    def _send_json(self, code: int, payload):
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
