import * as fs from "fs";

// Terminal tool: finalizes the implementation file (edited in place via Edit)
// by touching GRIM_DONE_FILE so the wrapper knows the build completed.
export default function submit(): string {
  const impl = process.env.GRIM_IMPL_FILE;
  if (!impl) throw new Error("GRIM_IMPL_FILE not set");
  const src = fs.readFileSync(impl, "utf8");
  if (src.includes("TODO: implement")) {
    throw new Error(
      "the implementation file still contains 'TODO: implement' stubs — finish them (or report BuildErrors) before submitting"
    );
  }
  const done = process.env.GRIM_DONE_FILE;
  if (!done) throw new Error("GRIM_DONE_FILE not set");
  fs.writeFileSync(done, "");
  return "Submission accepted. The build is complete; no further edits may be made.";
}
