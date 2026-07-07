#!/usr/bin/env python3
"""server_gen.py — the "server" prefrontend substep: frontend.md -> server.ts.

Usage: server_gen.py <frontend.md> [-o out.ts]

Deterministic codegen, no model. Produces the express server that serves the
frontend (index.html + esbuild bundle) and exposes each backend module the
frontend spec uses:
  GET  /<module>/yld?fn=<proto>   for its exposed yield protos
  POST /<module>/mut              {"fn": ..., "args": ...} for its effect protos

Only the protos named in @protos lines (union across components) get routes.

proc2 adaptation: `@persist Name file` lines in frontend.md make the server
load Name.import_state({data}) from the file on boot and write through
Name.export_state after every ok mut (see front_spec.validate_persists).
Modules are emitted in alphabetical order of their spec file stem; module
implementations are imported from ./modules/_<stem>.js.

Output default: <root>/generated/prefrontend/server/server.ts
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import front_spec  # noqa: E402


def example_args(args_type: str) -> str:
    """'{seed: number}' -> '{"seed": 7}' — an example value for a route comment."""
    if args_type == "null":
        return "null"
    fills = {"number": 7, "string": "hi", "boolean": True}
    fields = {
        k: fills.get(t, None)
        for k, t in re.findall(r"(\w+)\s*:\s*([\w<>\[\]]+)", args_type)
    }
    return json.dumps(fields)


def generate(front, mods, exposed) -> str:
    ordered = sorted(((n, s, spec) for n, (s, spec) in mods.items()), key=lambda t: t[1])
    persisted = dict(front.persists)  # {ModuleName: file path rel to app/}

    lines = ['import express from "express";']
    if persisted:
        lines += ['import * as fs from "node:fs";', 'import * as path from "node:path";']
    lines += [f'import {{ _module as {n} }} from "./modules/_{s}.js";' for n, s, _ in ordered]
    lines += [
        "",
        "const app = express();",
        "app.use(express.json());",
        "",
        "// frontend: index.html + esbuild bundle (see start.sh)",
        'app.get("/", (_req, res) => res.sendFile("index.html", { root: import.meta.dirname }));',
        "app.use(express.static(`${import.meta.dirname}/dist`));",
    ]

    # persistence (@persist Name file): import_state on boot when the file
    # exists; after every ok mut the module's export_state is written through
    for name, _, _ in ordered:
        if name not in persisted:
            continue
        lines += [
            "",
            f"// -- persistence: {name} <-> {persisted[name]} (@persist) -- //",
            f'const __file_{name} = path.join(import.meta.dirname, "{persisted[name]}");',
            f"if (fs.existsSync(__file_{name})) {{",
            f'    const r = {name}.import_state({{ data: JSON.parse(fs.readFileSync(__file_{name}, "utf-8")) }});',
            f'    if ("err" in r) console.error(`{name}: failed to load ${{__file_{name}}}: ${{r.err}}`);',
            "}",
            f"function __persist_{name}() {{",
            f"    const r = {name}.export_state(null);",
            f'    if ("err" in r) {{ console.error(`{name}: export_state failed: ${{r.err}}`); return; }}',
            f"    fs.mkdirSync(path.dirname(__file_{name}), {{ recursive: true }});",
            f"    fs.writeFileSync(__file_{name}, JSON.stringify(r.ok, null, 2));",
            "}",
        ]

    for name, snake, _ in ordered:
        ylds = [p for p in exposed[name] if p.kind == "yield"]
        muts = [p for p in exposed[name] if p.kind == "effect"]
        if ylds:
            lines += [
                "",
                f"// GET /{snake}/yld?fn={ylds[0].name}",
                f'app.get("/{snake}/yld", (req, res) => {{',
                "    const { fn } = req.query ?? {};",
            ]
            if any(p.args != "null" for p in ylds):
                lines.append(
                    "    const args = req.query.args ? JSON.parse(String(req.query.args)) : null;"
                )
            lines.append("    switch (fn) {")
            for p in ylds:
                arg = "null" if p.args == "null" else "args"
                lines.append(f'        case "{p.name}": return res.json({name}.{p.name}({arg}));')
            lines += [
                f"        default: return res.status(404).json({{ err: `unknown {snake} yld: ${{fn}}` }});",
                "    }",
                "});",
            ]
        if muts:
            lines += [
                "",
                f'// POST /{snake}/mut  {{ "fn": "{muts[0].name}", "args": {example_args(muts[0].args)} }}',
                f'app.post("/{snake}/mut", (req, res) => {{',
                "    const { fn, args = null } = req.body ?? {};",
                "    switch (fn) {",
            ]
            for p in muts:
                arg = "null" if p.args == "null" else "args"
                if name in persisted:
                    lines.append(
                        f'        case "{p.name}": {{ const r = {name}.{p.name}({arg}); '
                        f'if ("ok" in r) __persist_{name}(); return res.json(r); }}'
                    )
                else:
                    lines.append(f'        case "{p.name}": return res.json({name}.{p.name}({arg}));')
            lines += [
                f"        default: return res.status(404).json({{ err: `unknown {snake} mut: ${{fn}}` }});",
                "    }",
                "});",
            ]

    lines += [
        "",
        "const port = Number(process.env.PORT) || 4117;",
        "app.listen(port, () => console.log(`listening on http://localhost:${port}`));",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="server prefrontend substep: frontend.md -> server.ts")
    ap.add_argument("spec", help="frontend spec, e.g. specs/frontend.md")
    ap.add_argument("-o", "--output", help="output file (default <root>/generated/prefrontend/server/server.ts)")
    args = ap.parse_args()

    front, mods, exposed = front_spec.load_or_die(args.spec)
    root = front_spec.project_root(front.path)
    out = (
        Path(args.output).resolve()
        if args.output
        else root / "generated" / "prefrontend" / "server" / "server.ts"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(generate(front, mods, exposed))
    print(f"Server gen -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
