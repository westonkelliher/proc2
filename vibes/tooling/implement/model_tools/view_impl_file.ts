import * as fs from "fs";

// Returns the current contents of the implementation file.
export default function viewFile(): string {
  const file = process.env.GRIM_IMPL_FILE;
  if (!file) throw new Error("GRIM_IMPL_FILE not set");
  return fs.readFileSync(file, "utf8");
}
