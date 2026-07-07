#!/usr/bin/env bash
# implement.sh — thin wrapper around implement.py (the "implement" build step).
set -euo pipefail
exec python3 "$(dirname "$0")/implement.py" "$@"
