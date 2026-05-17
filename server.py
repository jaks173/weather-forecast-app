#!/usr/bin/env python3
"""Static server + weather/AQ proxies and global city snapshot."""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = os.path.dirname(os.path.abspath(__file__))
CITIES_PATH = Path(ROOT) / "data" / "world_cities.json"
TIMER_BASE = "https://www.7timer.info/bin/api.pl"
OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality"

_snapshot_cache: dict = {"ts": 0.0, "cities": []}
CACHE_TTL_SEC = 600


def _fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _load_cities() -> list:
    return json.loads(CITIES_PATH.read_text(encoding="utf-8"))


def _snapshot_one(city: dict) -> dict:
    lat, lon = city["latitude"], city["longitude"]
    meteo_url = (
        f"{OPEN_METEO}?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
        "weather_code,wind_speed_10m"
        "&timezone=auto"
    )
    aq_url = (
        f"{OPEN_METEO_AQ}?latitude={lat}&longitude={lon}"
        "&current=us_aqi,pm2_5,pm10,european_aqi"
        "&timezone=auto"
    )
    row = {
        "city": city["city"],
        "country": city.get("country", ""),
        "region": city.get("region", ""),
        "latitude": lat,
        "longitude": lon,
        "temperature": None,
        "feels_like": None,
        "humidity": None,
        "wind": None,
        "weather_code": None,
        "us_aqi": None,
        "pm2_5": None,
        "pm10": None,
        "european_aqi": None,
    }
    try:
        meteo = _fetch_json(meteo_url)
        cur = meteo.get("current") or {}
        row["temperature"] = cur.get("temperature_2m")
        row["feels_like"] = cur.get("apparent_temperature")
        row["humidity"] = cur.get("relative_humidity_2m")
        row["wind"] = cur.get("wind_speed_10m")
        row["weather_code"] = cur.get("weather_code")
    except Exception:
        pass
    try:
        aq = _fetch_json(aq_url)
        aq_cur = aq.get("current") or {}
        row["us_aqi"] = aq_cur.get("us_aqi")
        row["pm2_5"] = aq_cur.get("pm2_5")
        row["pm10"] = aq_cur.get("pm10")
        row["european_aqi"] = aq_cur.get("european_aqi")
    except Exception:
        pass
    return row


def get_world_snapshot() -> list:
    now = time.time()
    if _snapshot_cache["cities"] and now - _snapshot_cache["ts"] < CACHE_TTL_SEC:
        return _snapshot_cache["cities"]

    cities = _load_cities()
    rows = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(_snapshot_one, c): c for c in cities}
        for fut in as_completed(futures):
            rows.append(fut.result())

    _snapshot_cache["ts"] = now
    _snapshot_cache["cities"] = rows
    return rows


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/world-snapshot"):
            self._world_snapshot()
            return
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

    def _world_snapshot(self):
        try:
            rows = get_world_snapshot()
            self._send_json(200, {"cities": rows, "cached": True})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

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
            self._send_json(200, _fetch_json(url))
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
            "weather_code,wind_speed_10m"
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max"
            "&timezone=auto&forecast_days=7"
        )
        aq_url = (
            f"{OPEN_METEO_AQ}?latitude={urllib.parse.quote(lat)}"
            f"&longitude={urllib.parse.quote(lon)}"
            "&current=us_aqi,pm2_5,pm10,european_aqi&timezone=auto"
        )

        out = {"timer": None, "meteo": None, "air_quality": None, "errors": []}
        for key, url in (("timer", timer_url), ("meteo", meteo_url), ("air_quality", aq_url)):
            try:
                out[key] = _fetch_json(url)
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
