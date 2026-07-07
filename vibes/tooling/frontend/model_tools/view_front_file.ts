import * as fs from "fs";
import { resolveFrontFile } from "./_front_files.js";

// Returns the current contents of one of the frontend files.
export default function viewFile(input: { file: string }): string {
  return fs.readFileSync(resolveFrontFile(input.file), "utf8");
}
