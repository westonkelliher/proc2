import { runTsc } from "./_tsc.js";

// Runs tsc over the app dir; returns errors or a clean bill of health.
export default function typecheck(): string {
  const { ok, output } = runTsc();
  return ok ? "Typecheck passed — no errors." : `Typecheck FAILED:\n${output}`;
}
