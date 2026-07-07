#!/usr/bin/env bash
# server_gen.sh — thin wrapper around server_gen.py (the "server" prefrontend substep).
set -euo pipefail
exec python3 "$(dirname "$0")/server_gen.py" "$@"
