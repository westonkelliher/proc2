import * as fs from "fs";
import { resolveFrontFile } from "./_front_files.js";

// Exact, unique string replacement on one of the frontend files.
export default function edit(input: { file: string; old_string: string; new_string: string }): string {
  const file = resolveFrontFile(input.file);
  if (input.old_string === input.new_string) {
    throw new Error("old_string and new_string are identical");
  }
  const src = fs.readFileSync(file, "utf8");
  const parts = src.split(input.old_string);
  if (parts.length === 1) throw new Error(`old_string not found in ${input.file}`);
  if (parts.length > 2) {
    throw new Error(
      `old_string matches ${parts.length - 1} times — include more context to make it unique`
    );
  }
  fs.writeFileSync(file, parts.join(input.new_string));
  return "Edit applied.";
}
