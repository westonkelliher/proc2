import * as fs from "fs";
import * as path from "path";

type BuildError = { reason: string; spec_location: string };

// Terminal tool: records spec build errors to GRIM_ERRORS_FILE.
export default function buildErrors(input: { errors: BuildError[] }): string {
  const out = process.env.GRIM_ERRORS_FILE;
  if (!out) throw new Error("GRIM_ERRORS_FILE not set");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(input.errors, null, 2) + "\n");
  return "Build errors reported. The build has ended; no further edits may be made.";
}
