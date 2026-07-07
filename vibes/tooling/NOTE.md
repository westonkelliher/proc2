# tooling — copied from grim_ide

Copied 2026-07-07 from `~/dev/grim_ide/vibes/tooling/` (pregen, implement,
prefrontend, frontend, always_available_types.ts). grim_ide stays untouched;
proc2 adaptations live only in this copy:

- `prefrontend/front_spec.py` — parses + validates `@persist Name file` lines
- `prefrontend/server/server_gen.py` — @persist: server import_states the file
  on boot and writes through export_state after every ok mut
- `prefrontend/prefrontend.py` + server_gen — port 3000 → 4117
