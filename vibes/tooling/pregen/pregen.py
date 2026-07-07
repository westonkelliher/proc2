#!/usr/bin/env python3
"""pregen.py — the "pregen" build step: baby-canon spec -> _pregen_<name>.ts stub.

Usage: pregen.py <spec.ts> [-o out.ts]

Deterministic codegen, no model. From the spec it produces the pregen'd
implementation file that the implement step copies and edits:
  - header + imports (util result types; one sibling singleton import per
    @child)
  - datashapes and state sections, copied verbatim
  - generated dispatch types and _mut_*/_yld_* functions per @expose
  - the normalized _interface (args objects, Result return types)
  - export const _module with a TODO stub per proto, spec comments attached

Normalization: `incr();` -> `incr(args: null): EffectResult;`,
`getr(): Boop;` -> `getr(args: null): YieldResult<Boop>;`,
`set_msg(msg: string);` -> `set_msg(args: {msg: string}): EffectResult;`.
Already-normalized signatures pass through. `// ...` comments are dropped.

Strict parsing: every proto needs exactly one of .effect / .yield, matching
its signature kind; @child names must match the child spec's header; all
errors are reported at once, exit 1.

Output default: <root>/generated/pregen/_<name>.ts (root = the dir holding
specs/ when the spec lives in one, else the spec's own dir)
"""
import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

HEADER_RE = re.compile(r"/\*{4}\s*(\w+)\s*\*{4}/")
SECTION_RE = re.compile(r"/\*{3}\s*(\w+)\s*\*{3}/")
SIG_RE = re.compile(r"^(\w+)\s*\((.*)\)\s*(?::\s*(.*?))?\s*;$")
TAG_RE = re.compile(r"^/\*\s*\.(\w+):\s*(.*?)\s*\*/$")
EXPOSE_RE = re.compile(r"^/\*\s*@expose\s+(\w+)\.(\*|\{[\w\s,]*\})\s*\*/$")
CHILD_RE = re.compile(r"@child\s+(\w+)\s+([^\s*]+)")


@dataclass
class Proto:
    name: str
    args: str  # normalized args type, e.g. "null" or "{msg: string}"
    ret: str  # "EffectResult" or "YieldResult<T>"
    kind: str  # "effect" | "yield"
    tags: list = field(default_factory=list)  # (tag, text) in spec order


@dataclass
class Spec:
    name: str = ""  # module name from the /**** Name ****/ header
    description: str = ""  # module-level .description, emitted as a file comment
    datashapes: str = ""
    state: str = ""
    children: list = field(default_factory=list)  # (Name, rel_path)
    protos: list = field(default_factory=list)
    exposes: list = field(default_factory=list)  # (ChildName, "*" | [proto names])


def clean_block(text: str) -> str:
    """Verbatim section body minus full-line // comments and edge blank lines."""
    lines = [l for l in text.splitlines() if not l.strip().startswith("//")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines)


def make_proto(name: str, params: str, ret: str) -> Proto:
    params = params.strip()
    if not params:
        args = "null"
    elif re.match(r"^args\s*:", params):
        args = params.split(":", 1)[1].strip()
    else:
        args = "{" + params + "}"
    ret = (ret or "").strip()
    if not ret or ret == "EffectResult":
        kind, rett = "effect", "EffectResult"
    elif ret.startswith("YieldResult"):
        kind, rett = "yield", ret
    else:
        kind, rett = "yield", f"YieldResult<{ret}>"
    return Proto(name, args, rett, kind)


def parse_spec(path: Path, errors: list) -> Spec:
    text = path.read_text()
    spec = Spec()
    err = lambda msg: errors.append(f"{path.name}: {msg}")

    m = HEADER_RE.search(text)
    if m:
        spec.name = m.group(1)
    else:
        err("missing /**** ModuleName ****/ header")

    pieces = SECTION_RE.split(text)  # [pre, name1, body1, name2, body2, ...]
    sections = dict(zip(pieces[1::2], pieces[2::2]))
    d = re.search(r"/\*\s*\.description:\s*(.*?)\s*\*/", pieces[0], re.S)
    if d:
        spec.description = " ".join(d.group(1).split())
    for s in pieces[1::2]:
        if s not in ("datashapes", "state", "child_modules", "protos"):
            err(f"unknown section: /*** {s} ***/")

    spec.datashapes = clean_block(sections.get("datashapes", ""))
    spec.state = clean_block(sections.get("state", ""))
    spec.children = CHILD_RE.findall(sections.get("child_modules", ""))

    body = sections.get("protos", "")
    m = re.search(r"interface\s+_interface\s*\{(.*)\}", body, re.S)
    if not m:
        err("protos section has no `interface _interface { ... }`")
        return spec
    cur = None
    for line in m.group(1).splitlines():
        s = line.strip()
        if not s or s.startswith("//"):
            continue
        if e := EXPOSE_RE.match(s):
            sel = e.group(2)
            names = "*" if sel == "*" else [n.strip() for n in sel[1:-1].split(",") if n.strip()]
            spec.exposes.append((e.group(1), names))
            cur = None
            continue
        if t := TAG_RE.match(s):
            if cur is None:
                err(f"spec comment with no preceding proto: {s}")
            else:
                cur.tags.append((t.group(1), t.group(2)))
            continue
        if g := SIG_RE.match(s):
            cur = make_proto(*g.groups())
            spec.protos.append(cur)
            continue
        err(f"unparseable line in protos section: {s}")

    for p in spec.protos:
        kinds = [t for t, _ in p.tags if t in ("effect", "yield")]
        if len(kinds) != 1:
            err(f"proto {p.name}: needs exactly one of .effect / .yield (has {kinds or 'none'})")
        elif kinds[0] != p.kind:
            err(f"proto {p.name}: .{kinds[0]} comment contradicts its {p.kind} signature")
    return spec


#### ---- generation ---- ####

# _util.ts is the ambient set verbatim (Option, Map, result types, helpers)
UTIL_TS = (Path(__file__).resolve().parent.parent / "always_available_types.ts").read_text()

# ambient types beyond the two always-imported result types; the ./_util.js
# import is widened to whichever of these the generated body references
AMBIENT_EXTRAS = ("Option", "Map")


def ambient_import(body: str) -> str:
    extras = [t for t in AMBIENT_EXTRAS if re.search(rf"\b{t}<", body)]
    if not extras:
        return body
    return body.replace(
        'import type { YieldResult, EffectResult } from "./_util.js";',
        f'import type {{ YieldResult, EffectResult, {", ".join(extras)} }} from "./_util.js";',
        1,
    )


def fn_type_lines(tname: str, protos: list) -> list:
    lines = [f"type {tname} ="]
    lines += [f'    | {{ func: "{p.name}", args: {p.args} }}' for p in protos]
    return lines


def dispatcher_lines(fn: str, tname: str, rett: str, child: str, protos: list) -> list:
    lines = [f"    {fn}(call: {tname}): {rett} {{"]
    for member in ("func", "args"):
        lines += [
            f'        if (! ("{member}" in call)) {{',
            f"            return {{ err: `No '{member}' member in {fn} call: ${{call}}` }}",
            "        }",
        ]
    lines.append("        switch (call.func) {")
    for p in protos:
        lines += [
            f"            case '{p.name}':",
            f"                return {child}.{p.name}(call.args)",
        ]
    lines += [
        "            // default:",
        f"            //     return {{ err: `No such function ${{call.func}} in {child}` }}",
        "        }",
        "    },",
    ]
    return lines


def generate(spec: Spec, child_specs: dict) -> str:
    parts = [f"//// {spec.name} Implementation ////"]
    parts.append(
        'import type { YieldResult, EffectResult } from "./_util.js";'
    )
    # children are siblings of this output wherever it lands: pregen writes the
    # whole project into one dir, and prefrontend stages modules flat
    for cname, crel in spec.children:
        parts.append(f'import {{ _module as {cname} }} from "./_{Path(crel).stem}.js";')
    parts.append("")

    if spec.datashapes:
        parts += ["// -- datashapes -- //", spec.datashapes, ""]
    if spec.state:
        parts += ["// -- state -- //", spec.state, ""]

    # dispatch types and functions per @expose (empty kinds omitted)
    dispatch_iface, dispatch_impl, gen_types = [], [], []
    for cname, sel in spec.exposes:
        child = child_specs[cname]
        chosen = child.protos if sel == "*" else [p for p in child.protos if p.name in sel]
        snake = next(Path(crel).stem for n, crel in spec.children if n == cname)
        for kind, prefix, tprefix, rett in (
            ("effect", "_mut_", "FnMut_", "EffectResult"),
            ("yield", "_yld_", "FnYld_", "YieldResult<unknown>"),
        ):
            protos = [p for p in chosen if p.kind == kind]
            if not protos:
                continue
            fn, tname = f"{prefix}{snake}", f"{tprefix}{cname}"
            gen_types += fn_type_lines(tname, protos)
            dispatch_iface.append(f"    {fn}(call: {tname}): {rett};")
            dispatch_impl += [""] + dispatcher_lines(fn, tname, rett, cname, protos)
    if gen_types:
        parts += ["// -- generated types -- //", *gen_types, ""]

    parts += ["// -- interface -- //", "interface _interface {"]
    parts += [f"    {p.name}(args: {p.args}): {p.ret};" for p in spec.protos]
    parts += [*dispatch_iface, "}", ""]

    parts.append("export const _module: _interface = {")
    for p in spec.protos:
        parts += [
            "",
            f"    {p.name}(args: {p.args}): {p.ret} {{",
            "        // TODO: implement",
            '        return { err: "not implemented" };',
            "    },",
        ]
        parts += [f"    /* .{tag}: {text} */" for tag, text in p.tags]
    parts += [*dispatch_impl, "", "}"]
    return ambient_import("\n".join(parts) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser(description="pregen build step: spec -> pregen'd module stub")
    ap.add_argument("spec", help="baby-canon spec file, e.g. bump.ts")
    ap.add_argument("-o", "--output", help="output file (default <root>/generated/pregen/_<name>.ts)")
    args = ap.parse_args()

    spec_path = Path(args.spec).resolve()
    if not spec_path.is_file():
        sys.exit(f"spec not found: {spec_path}")

    errors: list = []
    spec = parse_spec(spec_path, errors)

    child_specs = {}
    for cname, crel in spec.children:
        cpath = (spec_path.parent / crel).resolve()
        if not cpath.is_file():
            errors.append(f"{spec_path.name}: child spec not found: {cpath} (from @child {cname})")
            continue
        child = parse_spec(cpath, errors)
        if child.name != cname:
            errors.append(
                f"{spec_path.name}: @child {cname} does not match module name "
                f"{child.name} in {cpath.name}"
            )
        child_specs[cname] = child
    for cname, sel in spec.exposes:
        if cname not in child_specs:
            errors.append(f"{spec_path.name}: @expose {cname} is not a declared @child")
        elif sel != "*":
            known = {p.name for p in child_specs[cname].protos}
            errors += [
                f"{spec_path.name}: @expose {cname}.{n}: no such proto in {cname}"
                for n in sel
                if n not in known
            ]

    if errors:
        print("PREGEN FAILED — spec errors:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1

    name = spec_path.stem
    root = spec_path.parent.parent if spec_path.parent.name == "specs" else spec_path.parent
    out = Path(args.output).resolve() if args.output else root / "generated" / "pregen" / f"_{name}.ts"
    out.parent.mkdir(parents=True, exist_ok=True)
    (out.parent / "_util.ts").write_text(UTIL_TS)
    out.write_text(generate(spec, child_specs))
    print(f"Pregen -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
