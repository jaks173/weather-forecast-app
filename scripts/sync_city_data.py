#!/usr/bin/env python3
"""Copy data/world_cities.json to city_coordinates.json for the dropdown."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "data" / "world_cities.json"
dst = ROOT / "city_coordinates.json"
shutil.copy2(src, dst)
print(f"Synced {len(json.loads(dst.read_text()))} cities to city_coordinates.json")
