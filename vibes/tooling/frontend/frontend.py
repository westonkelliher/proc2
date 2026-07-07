#!/usr/bin/env python3
"""frontend.py — the "frontend" build step: frontend.md -> frontend.tsx + theme.ts.

Usage: frontend.py <frontend.md>

Baby-canon flow (see examples/baby-canon):
  - The prefrontend step has already scaffolded <root>/app/: package.json
    (with node_modules installed), tsconfig.json, index.html, start.sh,
    server.ts, iface/ clients, and the staged backend modules.
  - This step seeds app/frontend.tsx and app/theme.ts with TODO stubs and
    runs a model (via run-model, tools in model_tools/, system prompt in
    prompt.md) that writes/edits those two files in place. The model has a
    Typecheck tool (tsc over app/) and must pass it to Submit. On an invalid
    spec it reports BuildErrors instead.
  - On success the two files are copied to <root>/generated/frontend/.

Outputs:
  <root>/app/frontend.tsx, <root>/app/theme.ts        the working frontend
  <root>/generated/frontend/{frontend.tsx,theme.ts}   copies for review
  <root>/generated/frontend/_errors_frontend.json     build errors (invalid spec)

Env overrides: GRIM_MODEL (sonnet), GRIM_EFFORT (xhigh),
GRIM_MAX_TOKENS (64000), GRIM_MAX_TURNS (60).
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR.parent / "prefrontend"))
import front_spec  # noqa: E402

FRONT_FILES = ["frontend.tsx", "theme.ts"]
STUBS = {
    "frontend.tsx": "//// frontend ////\n// TODO: implement\n",
    "theme.ts": "//// theme ////\n// TODO: implement\n",
}


def main() -> int:
    ap = argparse.ArgumentParser(description="frontend build step: frontend.md -> frontend.tsx + theme.ts")
    ap.add_argument("spec", help="frontend spec, e.g. specs/frontend.md")
    args = ap.parse_args()

    spec = Path(args.spec).resolve()
    if not spec.is_file():
        sys.exit(f"frontend spec not found: {spec}")
    root = front_spec.project_root(spec)
    app = root / "app"
    gen = root / "generated" / "frontend"
    errors = gen / "_errors_frontend.json"
    done_marker = gen / ".submitted"

    for f in ("package.json", "tsconfig.json", "index.html"):
        if not (app / f).is_file():
            sys.exit(f"{app / f} missing — run the prefrontend step first")
    if not (app / "node_modules").is_dir():
        sys.exit(f"{app}/node_modules missing — run the prefrontend step (npm install) first")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        keyfile = Path.home() / ".keys/.anthropic"
        if keyfile.is_file():
            os.environ["ANTHROPIC_API_KEY"] = keyfile.read_text().strip()

    # seed the working copies the model edits in place
    gen.mkdir(parents=True, exist_ok=True)
    for name in FRONT_FILES:
        (app / name).write_text(STUBS[name])
    errors.unlink(missing_ok=True)
    done_marker.unlink(missing_ok=True)

    #### ---- build the first message ---- ####

    sections = [f"=== FRONTEND SPEC: {spec.name} ===\n{spec.read_text()}"]
    for iface in sorted((app / "iface").glob("_*.ts")):
        sections.append(f"=== IFACE CLIENT: iface/{iface.name} ===\n{iface.read_text()}")
    sections.append(f"=== INDEX.HTML ===\n{(app / 'index.html').read_text()}")
    for name in FRONT_FILES:
        sections.append(
            f"=== FRONTEND FILE: {name} (current contents — write this) ===\n{(app / name).read_text()}"
        )
    prompt = "The build inputs follow.\n\n" + "\n".join(sections) + "\nBegin the build."

    #### ---- run the model ---- ####

    env = os.environ.copy()
    env["GRIM_FRONT_DIR"] = str(app)
    env["GRIM_FRONT_FILES"] = ",".join(FRONT_FILES)
    env["GRIM_TSC_DIR"] = str(app)
    env["GRIM_ERRORS_FILE"] = str(errors)
    env["GRIM_DONE_FILE"] = str(done_marker)

    rc = subprocess.call(
        [
            "run-model",
            "--model", os.environ.get("GRIM_MODEL", "sonnet"),
            "--thinking",
            "--effort", os.environ.get("GRIM_EFFORT", "xhigh"),
            "--max-tokens", os.environ.get("GRIM_MAX_TOKENS", "64000"),
            "--max-turns", os.environ.get("GRIM_MAX_TURNS", "60"),
            "--tools", str(SCRIPT_DIR / "model_tools"),
            "--system", (SCRIPT_DIR / "prompt.md").read_text(),
            "--prompt", prompt,
        ],
        env=env,
    )

    if errors.is_file():
        for name in FRONT_FILES:  # half-edited stubs are not build products
            (app / name).unlink(missing_ok=True)
        print(f"BUILD FAILED — spec errors in {errors}:", file=sys.stderr)
        print(errors.read_text(), file=sys.stderr)
        return 1
    if done_marker.is_file():
        done_marker.unlink()
        for name in FRONT_FILES:
            shutil.copyfile(app / name, gen / name)
        print(f"Build succeeded -> {gen} (working copies in {app})")
        return 0
    print(f"Build ended without a submission (run-model exit {rc})", file=sys.stderr)
    return rc or 1


if __name__ == "__main__":
    sys.exit(main())
