#!/usr/bin/env python3
"""front_spec.py — shared parser for baby-canon frontend specs (frontend.md).

Parsed shape (see examples/baby-canon/specs/frontend.md):
  # Title
  @description: one line
  ## Layout
  @module Name spec.ts        (one per backend module the frontend uses)
  ## :ComponentName
  @protos Name{a, b} Other{c} (protos that component may call)
  - free-text bullets         (matter to the frontend agent, not to codegen)

Module specs are parsed with the pregen step's parser so proto signatures are
normalized identically (args objects, EffectResult / YieldResult<T>).

exposed_protos() returns, per module, the union of all @protos across
components, in spec order — that is what the server and iface steps expose.
"""
import sys
from dataclasses import dataclass, field
from pathlib import Path
import re

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pregen"))
import pregen  # noqa: E402

TITLE_RE = re.compile(r"^#\s+(?!#)(.+?)\s*$", re.M)
DESC_RE = re.compile(r"^@description:\s*(.*?)\s*$", re.M)
COMPONENT_RE = re.compile(r"^##\s+:(\w+)\s*$", re.M)
MODULE_RE = re.compile(r"^@module\s+(\w+)\s+(\S+)\s*$", re.M)
PERSIST_RE = re.compile(r"^@persist\s+(\w+)\s+(\S+)\s*$", re.M)
PROTOS_LINE_RE = re.compile(r"^@protos\s+(.*)$", re.M)
PROTO_GROUP_RE = re.compile(r"(\w+)\s*\{([^}]*)\}")


@dataclass
class Component:
    name: str
    protos: list = field(default_factory=list)  # [(ModuleName, [proto names])]


@dataclass
class FrontSpec:
    path: Path = None
    title: str = ""
    description: str = ""
    modules: list = field(default_factory=list)  # [(Name, rel spec path)]
    persists: list = field(default_factory=list)  # [(Name, file path rel to app/)]
    components: list = field(default_factory=list)


def parse_front_spec(path: Path, errors: list) -> FrontSpec:
    text = path.read_text()
    front = FrontSpec(path=path)
    err = lambda msg: errors.append(f"{path.name}: {msg}")

    if m := TITLE_RE.search(text):
        front.title = m.group(1)
    else:
        err("missing `# Title` heading")
    if m := DESC_RE.search(text):
        front.description = m.group(1)
    else:
        err("missing `@description:` line")

    front.modules = MODULE_RE.findall(text)
    seen = set()
    for name, _ in front.modules:
        if name in seen:
            err(f"duplicate @module {name}")
        seen.add(name)

    front.persists = PERSIST_RE.findall(text)
    pseen = set()
    for name, _ in front.persists:
        if name in pseen:
            err(f"duplicate @persist {name}")
        pseen.add(name)

    # split component sections: everything from `## :Name` to the next `##`
    pieces = COMPONENT_RE.split(text)  # [pre, name1, body1, ...]
    for cname, body in zip(pieces[1::2], pieces[2::2]):
        comp = Component(cname)
        for line in PROTOS_LINE_RE.findall(body):
            groups = PROTO_GROUP_RE.findall(line)
            if not groups:
                err(f":{cname}: unparseable @protos line: @protos {line.strip()}")
            for mod, names in groups:
                comp.protos.append((mod, [n.strip() for n in names.split(",") if n.strip()]))
        front.components.append(comp)
    if not front.components:
        err("no `## :Component` sections found")
    return front


def load_modules(front: FrontSpec, errors: list) -> dict:
    """@module lines -> {Name: (snake, pregen.Spec)}; snake is the spec file stem."""
    mods = {}
    for name, rel in front.modules:
        spec_path = (front.path.parent / rel).resolve()
        if not spec_path.is_file():
            errors.append(f"{front.path.name}: @module {name}: spec not found: {spec_path}")
            continue
        spec = pregen.parse_spec(spec_path, errors)
        if spec.name != name:
            errors.append(
                f"{front.path.name}: @module {name} does not match module name "
                f"{spec.name} in {spec_path.name}"
            )
        mods[name] = (Path(rel).stem, spec)
    return mods


def exposed_protos(front: FrontSpec, mods: dict, errors: list) -> dict:
    """{ModuleName: [Proto]} — union of all component @protos, in spec order."""
    wanted = {name: set() for name in mods}
    for comp in front.components:
        for mod, names in comp.protos:
            if mod not in mods:
                errors.append(f"{front.path.name}: :{comp.name}: @protos {mod}: not a declared @module")
                continue
            known = {p.name for p in mods[mod][1].protos}
            for n in names:
                if n not in known:
                    errors.append(f"{front.path.name}: :{comp.name}: @protos {mod}.{n}: no such proto")
                else:
                    wanted[mod].add(n)
    return {
        name: [p for p in spec.protos if p.name in wanted[name]]
        for name, (_, spec) in mods.items()
    }


def validate_persists(front: FrontSpec, mods: dict, errors: list):
    """@persist Name path — Name must be a declared @module whose spec has an
    export_state yield and an import_state effect (the persistence pair the
    generated server calls; see server_gen.py)."""
    for name, _ in front.persists:
        if name not in mods:
            errors.append(f"{front.path.name}: @persist {name}: not a declared @module")
            continue
        protos = {p.name: p for p in mods[name][1].protos}
        exp, imp = protos.get("export_state"), protos.get("import_state")
        if not exp or exp.kind != "yield":
            errors.append(f"{front.path.name}: @persist {name}: module needs an export_state yield proto")
        if not imp or imp.kind != "effect":
            errors.append(f"{front.path.name}: @persist {name}: module needs an import_state effect proto")
        elif not re.match(r"\{\s*data\s*:", imp.args):
            errors.append(
                f"{front.path.name}: @persist {name}: import_state must take a single 'data' arg "
                f"(the server calls import_state({{data: <parsed file>}})), got args {imp.args}"
            )


# _util.ts staged into app/ carries the full ambient set (Option, Map, result
# types, helpers), single-sourced from tooling/always_available_types.ts
UTIL_TS = pregen.UTIL_TS


def project_root(spec: Path) -> Path:
    """specs/ dir sits next to generated/ and app/; a bare spec treats its dir as root."""
    return spec.parent.parent if spec.parent.name == "specs" else spec.parent


def load_or_die(spec_arg: str):
    """CLI helper: parse frontend spec + modules + exposure, exit 1 on any error."""
    path = Path(spec_arg).resolve()
    if not path.is_file():
        sys.exit(f"frontend spec not found: {path}")
    errors: list = []
    front = parse_front_spec(path, errors)
    mods = load_modules(front, errors)
    exposed = exposed_protos(front, mods, errors)
    validate_persists(front, mods, errors)
    if errors:
        print("PREFRONTEND FAILED — spec errors:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)
    return front, mods, exposed
