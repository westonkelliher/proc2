# proc2 vibes — grim-built workbook

Personal task/project workbook, built entirely with the grim_ide baby-canon
pipeline. Specs are the source of truth; generated/ and app/ are build
products — never hand-edit them, fix the spec and rebuild.

## Run
```sh
vibes/app/start.sh        # bundles, serves http://localhost:4117, opens chrome
```
Data persists in `vibes/app/data/*.json` (written through by the server after
every ok mut; loaded via import_state on boot).

## Rebuild
```sh
cd ~/dev/proc2
python3 vibes/tooling/pregen/pregen.py vibes/specs/workbook.ts   # + projects.ts
GRIM_MODEL=fable python3 vibes/tooling/implement/implement.py vibes/specs/workbook.ts
python3 vibes/tooling/prefrontend/prefrontend.py vibes/specs/frontend.md
GRIM_MODEL=fable python3 vibes/tooling/frontend/frontend.py vibes/specs/frontend.md
cd vibes/app && npx tsx ../checks/ritual.ts   # module smoke checks
```

## Layout
- `specs/` — workbook.ts + projects.ts (baby-canon module specs), frontend.md
- `tooling/` — pipeline copied from grim_ide, small proc2 adaptations (NOTE.md)
- `generated/` — per-step build products (pregen / implement / prefrontend / frontend)
- `app/` — the runnable app (express server :4117, React frontend, data/)
- `checks/ritual.ts` — ritual-style proto invocation checks over the modules

Theme: all colors in `app/theme.ts`, OKLAB-optimized (constant-lightness/chroma
accent set; surface lightness ramp) — palette pinned in specs/frontend.md.
