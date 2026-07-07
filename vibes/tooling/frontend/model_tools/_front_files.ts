import * as path from "path";

// Shared helper (no .json sibling, so not itself a tool): resolves one of the
// allowed frontend files (GRIM_FRONT_FILES) inside GRIM_FRONT_DIR.
export function resolveFrontFile(file: string): string {
  const dir = process.env.GRIM_FRONT_DIR;
  if (!dir) throw new Error("GRIM_FRONT_DIR not set");
  const allowed = (process.env.GRIM_FRONT_FILES ?? "").split(",").filter(Boolean);
  if (!allowed.includes(file)) {
    throw new Error(`'${file}' is not an editable frontend file (allowed: ${allowed.join(", ")})`);
  }
  return path.join(dir, file);
}

export function allowedFiles(): string[] {
  return (process.env.GRIM_FRONT_FILES ?? "").split(",").filter(Boolean);
}
