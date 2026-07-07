#!/usr/bin/env python3
"""implement.py — the "implement" build step: fill in a pregen'd module stub.

Usage: implement.py <spec.ts> [--pregen path] [-o out.ts]

Baby-canon flow (see examples/baby-canon):
  - <spec.ts> is a baby-canon spec in <root>/specs/ (.description, datashapes,
    state, child_modules, protos; proto signatures may be shorthand).
  - The pregen step has already produced <root>/generated/pregen/_<name>.ts:
    imports (_util.js types, ./_<child>.js modules), datashapes, state, the
    normalized _interface, and a _module object with one TODO stub per proto
    (each carrying its spec comments). It also produced _util.ts (the ambient
    set) and a pregen stub per child alongside.
  - The spec is not shown to the model — the pregen stub is a superset of it.
    Children are shown as their pregen stubs, not their specs.
  - This step copies the pregen to <root>/generated/implement/_<name>.ts and
    runs a model (via run-model, tools in model_tools/, system prompt in
    prompt.md) that edits that file in place to fill in the TODO stubs, then
    Submits. On an invalid spec it reports BuildErrors instead.

Outputs:
  <root>/generated/implement/_<name>.ts             the implemented module
  <root>/generated/implement/_errors_<name>.json    build errors (invalid spec)

Env overrides: GRIM_MODEL (sonnet), GRIM_EFFORT (xhigh),
GRIM_MAX_TOKENS (64000), GRIM_MAX_TURNS (40).
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


def child_specs(spec_text: str, spec_dir: Path) -> list[tuple[str, Path]]:
    """/* @child UpDown up_down.ts */ lines -> [(UpDown, <spec_dir>/up_down.ts)]"""
    return [
        (m.group(1), (spec_dir / m.group(2)).resolve())
        for m in re.finditer(r"@child\s+(\w+)\s+([^\s*]+)", spec_text)
    ]


def project_root(spec: Path) -> Path:
    """specs/ dir sits next to generated/; a bare spec treats its dir as root."""
    return spec.parent.parent if spec.parent.name == "specs" else spec.parent


def main() -> int:
    ap = argparse.ArgumentParser(
        description="implement build step: pregen stub -> implemented module"
    )
    ap.add_argument("spec", help="baby-canon spec file, e.g. specs/bump.ts")
    ap.add_argument("--pregen", help="pregen file (default <root>/generated/pregen/_<name>.ts)")
    ap.add_argument("-o", "--output", help="output file (default <root>/generated/implement/_<name>.ts)")
    args = ap.parse_args()

    spec = Path(args.spec).resolve()
    if not spec.is_file():
        sys.exit(f"spec not found: {spec}")
    name = spec.stem
    root = project_root(spec)
    pregen = Path(args.pregen).resolve() if args.pregen else root / "generated" / "pregen" / f"_{name}.ts"
    if not pregen.is_file():
        sys.exit(f"pregen not found: {pregen} (run the pregen step first)")
    out = Path(args.output).resolve() if args.output else root / "generated" / "implement" / f"_{name}.ts"
    errors = out.parent / f"_errors_{name}.json"
    done_marker = Path(f"{out}.submitted")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        keyfile = Path.home() / ".keys/.anthropic"
        if keyfile.is_file():
            os.environ["ANTHROPIC_API_KEY"] = keyfile.read_text().strip()

    spec_text = spec.read_text()

    # working copy the model edits in place
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(pregen, out)
    errors.unlink(missing_ok=True)
    done_marker.unlink(missing_ok=True)

    #### ---- build the first message ---- ####

    # The pregen'd stub (shown as IMPLEMENTATION FILE below) already carries
    # every proto's spec comments, so the spec itself is redundant and omitted.
    # Children are shown as their pregen stubs (interface + datashapes +
    # comments) — the file this module actually imports.
    sections = []
    for cname, cpath in child_specs(spec_text, spec.parent):
        cpregen = pregen.parent / f"_{cpath.stem}.ts"
        if not cpregen.is_file():
            sys.exit(f"child pregen not found: {cpregen} (from @child {cname} in {spec.name}; pregen it first)")
        sections.append(f"=== CHILD MODULE: {cpregen.name} (module {cname}) ===\n{cpregen.read_text()}")
    util = pregen.parent / "_util.ts"
    if util.is_file():
        sections.append(f"=== ALWAYS-AVAILABLE (_util.ts) ===\n{util.read_text()}")
    sections.append(
        f"=== IMPLEMENTATION FILE: {out.name} (current contents — edit this) ===\n{out.read_text()}"
    )
    prompt = "The build inputs follow.\n\n" + "\n".join(sections) + "\nBegin the build."

    #### ---- run the model ---- ####

    env = os.environ.copy()
    env["GRIM_IMPL_FILE"] = str(out)
    env["GRIM_ERRORS_FILE"] = str(errors)
    env["GRIM_DONE_FILE"] = str(done_marker)

    rc = subprocess.call(
        [
            "run-model",
            "--model", os.environ.get("GRIM_MODEL", "sonnet"),
            "--thinking",
            "--effort", os.environ.get("GRIM_EFFORT", "high"),
            "--max-tokens", os.environ.get("GRIM_MAX_TOKENS", "64000"),
            "--max-turns", os.environ.get("GRIM_MAX_TURNS", "40"),
            "--tools", str(SCRIPT_DIR / "model_tools"),
            "--system", (SCRIPT_DIR / "prompt.md").read_text(),
            "--prompt", prompt,
        ],
        env=env,
    )

    if errors.is_file():
        out.unlink(missing_ok=True)  # half-edited stub is not a build product
        print(f"BUILD FAILED — spec errors in {errors}:", file=sys.stderr)
        print(errors.read_text(), file=sys.stderr)
        return 1
    if done_marker.is_file():
        done_marker.unlink()
        print(f"Build succeeded -> {out}")
        return 0
    print(f"Build ended without a submission (run-model exit {rc})", file=sys.stderr)
    return rc or 1


if __name__ == "__main__":
    sys.exit(main())
