# proc2 vibes — build progress

Fresh grim_ide (baby-canon) build. Everything LLM-made lives in vibes/ only.

## Pipeline
specs/ → tooling/pregen → tooling/implement (run-model, GRIM_MODEL=fable) →
tooling/prefrontend (deterministic; @persist adaptation) → tooling/frontend
(run-model, fable). Root = vibes/, so outputs land in vibes/generated/ and
vibes/app/. App port: 4117.

## State
- [x] tooling copied from grim_ide + adapted (see tooling/NOTE.md)
- [x] specs: workbook.ts (17 protos), projects.ts (8), frontend.md
- [ ] pregen both modules
- [ ] implement both modules (fable) + smoke-check via checks/
- [ ] prefrontend (npm install into app/)
- [ ] frontend build (fable)
- [ ] run app on :4117, verify flows + persistence across restart

## Notes
- persistence: modules stay pure/deterministic; the generated server
  import_states data/*.json on boot and writes through export_state after
  every ok mut (`@persist` lines in frontend.md — proc2 tooling adaptation)
- never edit generated/ or app/ outputs by hand; fix specs and rebuild
- MODEL POLICY: all model runs use fable (GRIM_MODEL=fable), never opus/sonnet
