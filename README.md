# Weather Forecast App

7-day forecast, **live conditions**, and **air quality (AQI)** for European cities.

| Source | Data |
|--------|------|
| [Open-Meteo](https://open-meteo.com/) | Current temp, humidity, wind, US/EU AQI, PM2.5/PM10 (no API key, CORS-friendly) |
| [7Timer!](http://www.7timer.info/) | 7-day civil outlook icons |

**Live demo:** https://jaks173.github.io/weather-forecast-app/

## Run locally

You must serve the folder over HTTP (opening `index.html` directly will not load `city_coordinates.json`).

```bash
cd workspace/weather-forecast-app
./run.sh
# uses server.py (static files + /api/weather proxy to avoid browser CORS)
```

Open http://localhost:8000, pick a city, and click **Get Weather**.

## Project layout

| Path | Purpose |
|------|---------|
| `index.html` | Page structure |
| `js/main.js` | City dropdown, API fetch, forecast cards |
| `css/master.css` | Styles |
| `city_coordinates.csv` | Source city list (edit this) |
| `city_coordinates.json` | Generated from CSV for the app |
| `images/` | Weather condition icons |

Regenerate JSON after editing the CSV:

```bash
python3 -c "
import csv, json
rows = []
with open('city_coordinates.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        rows.append({k: (row[k] or '').strip() for k in ('latitude','longitude','city','country')})
json.dump(rows, open('city_coordinates.json','w'), indent=2, ensure_ascii=False)
"
```

## Deploy (GitHub Pages)

Push to `main` on [jaks173/weather-forecast-app](https://github.com/jaks173/weather-forecast-app). Pages serves from the repo root.

## API (via `server.py` proxy)

Local server exposes `/api/bundle?lat=&lon=` (7Timer + Open-Meteo + air quality).  
On GitHub Pages, Open-Meteo is called directly; 7Timer uses a CORS fallback.

No API keys required (sources from [public-apis](https://github.com/public-apis/public-apis): Open-Meteo, 7Timer!, OpenAQ-style data via Open-Meteo air-quality API).
