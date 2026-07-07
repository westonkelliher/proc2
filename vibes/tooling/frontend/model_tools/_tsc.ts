import { spawnSync } from "child_process";

// Shared helper (no .json sibling, so not itself a tool): tsc --noEmit in
// GRIM_TSC_DIR using the app's own typescript install.
export function runTsc(): { ok: boolean; output: string } {
  const cwd = process.env.GRIM_TSC_DIR;
  if (!cwd) throw new Error("GRIM_TSC_DIR not set");
  const res = spawnSync("npx", ["tsc", "--noEmit"], {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
  });
  if (res.error) throw res.error;
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
  return { ok: res.status === 0, output };
}
