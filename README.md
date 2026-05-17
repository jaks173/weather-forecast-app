# Weather Forecast App

7-day civil weather forecast for European cities using the free [7Timer!](https://www.7timer.info/) API.

**Live demo:** https://jaks173.github.io/weather-forecast-app/

## Run locally

You must serve the folder over HTTP (opening `index.html` directly will not load `city_coordinates.json`).

```bash
cd workspace/weather-forecast-app
./run.sh
# or: python3 -m http.server 8000
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

## API

No API key required. Endpoint pattern:

```
https://www.7timer.info/bin/api.pl?lon={longitude}&lat={latitude}&product=civillight&output=json
```
