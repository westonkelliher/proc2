#!/usr/bin/env bash
# iface_gen.sh — thin wrapper around iface_gen.py (the "iface" prefrontend substep).
set -euo pipefail
exec python3 "$(dirname "$0")/iface_gen.py" "$@"
