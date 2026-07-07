#!/usr/bin/env bash
# pregen.sh — thin wrapper around pregen.py (the "pregen" build step).
set -euo pipefail
exec python3 "$(dirname "$0")/pregen.py" "$@"
