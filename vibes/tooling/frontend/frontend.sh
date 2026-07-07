#!/usr/bin/env bash
# frontend.sh — thin wrapper around frontend.py (the "frontend" build step).
set -euo pipefail
exec python3 "$(dirname "$0")/frontend.py" "$@"
