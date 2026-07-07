import * as fs from "fs";
import { resolveFrontFile, allowedFiles } from "./_front_files.js";
import { runTsc } from "./_tsc.js";

// Terminal tool: finalizes the frontend files (edited in place) by touching
// GRIM_DONE_FILE so the wrapper knows the build completed. Gated on the TODO
// stubs being gone and the typecheck passing.
export default function submit(): string {
  for (const name of allowedFiles()) {
    const src = fs.readFileSync(resolveFrontFile(name), "utf8");
    if (src.includes("TODO: implement")) {
      throw new Error(
        `${name} still contains 'TODO: implement' stubs — finish them (or report BuildErrors) before submitting`
      );
    }
  }
  const { ok, output } = runTsc();
  if (!ok) {
    throw new Error(`the typecheck fails — fix these errors before submitting:\n${output}`);
  }
  const done = process.env.GRIM_DONE_FILE;
  if (!done) throw new Error("GRIM_DONE_FILE not set");
  fs.writeFileSync(done, "");
  return "Submission accepted. The build is complete; no further edits may be made.";
}
