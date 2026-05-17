#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Open http://127.0.0.1:${PORT:-8000} in your browser"
python3 server.py
