#!/usr/bin/env python3
"""prefrontend.py — the "prefrontend" build step: frontend.md -> app scaffolding.

Usage: prefrontend.py <frontend.md> [--skip-npm]

Deterministic, no model. Produces everything the frontend agent step needs
except frontend.tsx/theme.ts themselves:
  - package.json (name/description from the spec; dep versions resolved by
    `npm install`, which also yields package-lock.json and node_modules so
    the frontend agent's typecheck works)
  - tsconfig.json, index.html (title from the spec), start.sh
  - server/server.ts   via the "server" substep  (server/server_gen.sh)
  - iface/_*.ts        via the "iface" substep   (iface/iface_gen.sh)

Everything is generated into <root>/generated/prefrontend/ and copied into
<root>/app/ (flattened: server.ts at app root, iface/ as a subdir). The
implemented backend modules (<root>/generated/implement/_<name>.ts) and
_util.ts are also staged into app/ so server.ts's imports resolve.

Env overrides: GRIM_NPM (npm).
"""
import argparse
import shutil
import subprocess
import sys
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import front_spec  # noqa: E402

TSCONFIG = """\
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "lib": ["ES2022", "DOM"],
        "strict": true,
        "noEmit": true
    }
}
"""

INDEX_HTML = """\
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title}</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/app.js"></script>
</body>
</html>
"""

START_SH = """\
#!/usr/bin/env bash
# start.sh — bundle frontend, launch server (:4117), open browser
set -e
cd "$(dirname "$0")"
mkdir -p logs

# kill any existing instance (by port, so we never double-launch)
fuser -k 4117/tcp 2>/dev/null || true
sleep 0.3

npx esbuild frontend.tsx --bundle --outfile=dist/app.js > logs/esbuild.log 2>&1

npx tsx server.ts > logs/server.log 2>&1 &

# wait for server before opening the page
for i in $(seq 1 50); do
    curl -sf -o /dev/null http://localhost:4117/ && break
    sleep 0.2
done

google-chrome http://localhost:4117 >/dev/null 2>&1 &
echo "running on :4117 (logs in logs/)"
"""

PACKAGE_JSON = """\
{{
    "name": "{name}",
    "description": "{description}",
    "type": "module",
    "private": true
}}
"""

DEPS = ["express", "react", "react-dom", "tsx", "esbuild"]
DEV_DEPS = ["typescript", "@types/express", "@types/react", "@types/react-dom", "@types/node"]


def copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    shutil.copymode(src, dst)


def main() -> int:
    ap = argparse.ArgumentParser(description="prefrontend build step: frontend.md -> app scaffolding")
    ap.add_argument("spec", help="frontend spec, e.g. specs/frontend.md")
    ap.add_argument("--skip-npm", action="store_true", help="skip npm install (versions left unresolved)")
    args = ap.parse_args()

    front, mods, exposed = front_spec.load_or_die(args.spec)
    root = front_spec.project_root(front.path)
    gen = root / "generated" / "prefrontend"
    app = root / "app"
    gen.mkdir(parents=True, exist_ok=True)

    #### ---- deterministic top-level artifacts ---- ####

    (gen / "tsconfig.json").write_text(TSCONFIG)
    (gen / "index.html").write_text(INDEX_HTML.format(title=front.title))
    (gen / "start.sh").write_text(START_SH)
    (gen / "start.sh").chmod(0o755)
    (gen / "package.json").write_text(
        PACKAGE_JSON.format(name=front.title.lower().replace(" ", "-"), description=front.description)
    )

    #### ---- substeps (each has its own tooling) ---- ####

    for sub in ("server/server_gen.sh", "iface/iface_gen.sh"):
        rc = subprocess.call(["bash", str(SCRIPT_DIR / sub), str(front.path)])
        if rc:
            print(f"PREFRONTEND FAILED — substep {sub} exited {rc}", file=sys.stderr)
            return rc

    #### ---- copy into app/ ---- ####

    app.mkdir(parents=True, exist_ok=True)
    for f in ("package.json", "tsconfig.json", "index.html", "start.sh"):
        copy(gen / f, app / f)
    copy(gen / "server" / "server.ts", app / "server.ts")
    for f in sorted((gen / "iface").glob("_*.ts")):
        copy(f, app / "iface" / f.name)

    # stage the implemented backend so server.ts's imports resolve
    (app / "modules").mkdir(exist_ok=True)
    (app / "modules" / "_util.ts").write_text(front_spec.UTIL_TS)
    for name, (snake, _) in mods.items():
        impl = root / "generated" / "implement" / f"_{snake}.ts"
        if impl.is_file():
            copy(impl, app / "modules" / f"_{snake}.ts")
        else:
            print(f"warning: {impl} missing (implement step not run?) — app/modules/_{snake}.ts not staged")

    #### ---- npm resolves versions ---- ####

    if not args.skip_npm:
        npm = os.environ.get("GRIM_NPM", "npm")
        for extra, pkgs in ((["--save"], DEPS), (["--save-dev"], DEV_DEPS)):
            rc = subprocess.call([npm, "install", *extra, *pkgs], cwd=app)
            if rc:
                print(f"PREFRONTEND FAILED — npm install exited {rc}", file=sys.stderr)
                return rc
        copy(app / "package.json", gen / "package.json")
        if (app / "package-lock.json").is_file():
            copy(app / "package-lock.json", gen / "package-lock.json")

    print(f"Prefrontend -> {gen} (copied into {app})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
