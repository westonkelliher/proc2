import * as fs from "fs";
import { resolveFrontFile } from "./_front_files.js";

// Whole-file write to one of the allowed frontend files.
export default function writeFile(input: { file: string; content: string }): string {
  fs.writeFileSync(resolveFrontFile(input.file), input.content);
  return `Wrote ${input.file}.`;
}
