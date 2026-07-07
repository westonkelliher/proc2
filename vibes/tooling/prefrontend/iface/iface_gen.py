#!/usr/bin/env python3
"""iface_gen.py — the "iface" prefrontend substep: frontend.md -> frontend client modules.

Usage: iface_gen.py <frontend.md> [-o outdir]

Deterministic codegen, no model. For each @module the frontend spec uses it
produces iface/_<stem>.ts: a typed client object (same name as the module)
whose methods mirror the module's exposed protos but return Promises, calling
the server routes that server_gen.py produces (POST /<module>/mut for effect
protos, GET /<module>/yld?fn=... for yield protos). Also writes _util.ts
(the full ambient set) alongside.

Only the protos named in @protos lines (union across components) are exposed.

Output default: <root>/generated/prefrontend/iface/
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import front_spec  # noqa: E402
import pregen  # noqa: E402  (on sys.path via front_spec)


def mut_lines(snake: str, p) -> list:
    return [
        f"    async {p.name}(args: {p.args}): Promise<{p.ret}> {{",
        f"        const res = await fetch(`${{BASE}}/{snake}/mut`, {{",
        '            method: "POST",',
        '            headers: { "content-type": "application/json" },',
        f'            body: JSON.stringify({{ fn: "{p.name}", args }}),',
        "        });",
        "        return await res.json();",
        "    },",
    ]


def yld_lines(snake: str, p) -> list:
    url = f"`${{BASE}}/{snake}/yld?fn={p.name}`"
    if p.args != "null":
        url = f"`${{BASE}}/{snake}/yld?fn={p.name}&args=${{encodeURIComponent(JSON.stringify(args))}}`"
    return [
        f"    async {p.name}(args: {p.args}): Promise<{p.ret}> {{",
        f"        const res = await fetch({url});",
        "        return await res.json();",
        "    },",
    ]


def generate(name: str, snake: str, spec, protos) -> str:
    parts = [
        f"//// {name} frontend client ////",
        'import type { YieldResult, EffectResult } from "./_util.js";',
        "",
        'const BASE = ""; // same origin: express serves both the frontend and the api',
        "",
    ]
    if spec.datashapes:
        parts += ["// -- datashapes -- //", spec.datashapes, ""]

    parts += ["// -- interface -- //", "interface _interface {"]
    parts += [f"    {p.name}(args: {p.args}): Promise<{p.ret}>;" for p in protos]
    parts += ["}", ""]

    parts.append(f"export const {name}: _interface = {{")
    muts = [p for p in protos if p.kind == "effect"]
    ylds = [p for p in protos if p.kind == "yield"]
    if muts:
        parts += ["", "    // MUT"]
        parts += [line for i, p in enumerate(muts) for line in ([""] if i else []) + mut_lines(snake, p)]
    if ylds:
        parts += ["", "    // YLD"]
        parts += [line for i, p in enumerate(ylds) for line in ([""] if i else []) + yld_lines(snake, p)]
    parts += ["", "}"]
    return pregen.ambient_import("\n".join(parts) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser(description="iface prefrontend substep: frontend.md -> frontend client modules")
    ap.add_argument("spec", help="frontend spec, e.g. specs/frontend.md")
    ap.add_argument("-o", "--outdir", help="output dir (default <root>/generated/prefrontend/iface)")
    args = ap.parse_args()

    front, mods, exposed = front_spec.load_or_die(args.spec)
    root = front_spec.project_root(front.path)
    outdir = Path(args.outdir).resolve() if args.outdir else root / "generated" / "prefrontend" / "iface"
    outdir.mkdir(parents=True, exist_ok=True)

    (outdir / "_util.ts").write_text(front_spec.UTIL_TS)
    for name, (snake, spec) in mods.items():
        out = outdir / f"_{snake}.ts"
        out.write_text(generate(name, snake, spec, exposed[name]))
        print(f"Iface gen -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
