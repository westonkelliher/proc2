#!/usr/bin/env bash
# prefrontend.sh — thin wrapper around prefrontend.py (the "prefrontend" build step).
set -euo pipefail
exec python3 "$(dirname "$0")/prefrontend.py" "$@"
