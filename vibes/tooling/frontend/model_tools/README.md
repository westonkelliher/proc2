# model_tools — frontend build agent ONLY

Not general-purpose tools. All file tools are whitelisted to GRIM_FRONT_FILES
(frontend.tsx, theme.ts) inside GRIM_FRONT_DIR — nothing else is readable or
writable. Typecheck runs tsc in GRIM_TSC_DIR; Submit/BuildErrors end the build.
