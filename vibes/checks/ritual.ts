// checks/ritual.ts — ritual-style smoke check of the implemented modules.
// Run after prefrontend has staged app/ (needs app/node_modules for tsx):
//   cd vibes/app && npx tsx ../checks/ritual.ts
import { _module as Workbook } from "../app/modules/_workbook.js";
import { _module as Projects } from "../app/modules/_projects.js";

let failures = 0;
function check(what: string, cond: boolean) {
    if (!cond) failures++;
    console.log(`${cond ? "ok " : "FAIL"} ${what}`);
}
function oks<T>(r: { ok: T } | { err: string }, what: string): T {
    if ("err" in r) { failures++; console.log(`FAIL ${what}: ${r.err}`); return undefined as T; }
    return r.ok;
}

//// -- workbook: capture + lists -- ////
check("create in staging", "ok" in Workbook.create_task({ text: "wash car", list: "staging", transient: true, remind_at: "2026-07-08T10:30" }));
check("create in today", "ok" in Workbook.create_task({ text: "write specs", list: "2026-07-07", transient: false, remind_at: "" }));
check("create in today 2", "ok" in Workbook.create_task({ text: "review build", list: "2026-07-07", transient: false, remind_at: "" }));

const staging = oks(Workbook.get_list({ name: "staging" }), "get_list staging");
check("staging has 1 task", staging?.length === 1 && staging[0].text === "wash car" && staging[0].id === 1);
check("new task defaults", staging?.[0].stage === "todo" && staging[0].priority === 0 && staging[0].project === "" && staging[0].transient === true);

const today = oks(Workbook.get_list({ name: "2026-07-07" }), "get_list today");
check("today ordered", today?.map(t => t.text).join(",") === "write specs,review build");
check("empty list yields []", oks(Workbook.get_list({ name: "nope" }), "get_list nope")?.length === 0);
check("list_names", JSON.stringify(oks(Workbook.list_names(null), "list_names")) === JSON.stringify(["staging", "2026-07-07"]));

//// -- setters + errors -- ////
check("set_stage", "ok" in Workbook.set_stage({ id: 2, stage: "done" }));
check("set_priority", "ok" in Workbook.set_priority({ id: 3, priority: 3 }));
check("set_priority range err", "err" in Workbook.set_priority({ id: 3, priority: 7 }));
check("set_project", "ok" in Workbook.set_project({ id: 3, project: "proc2" }));
check("set_notes", "ok" in Workbook.set_notes({ id: 3, notes: "n" }));
check("missing id errs", "err" in Workbook.set_text({ id: 99, text: "x" }));
const t3 = oks(Workbook.read_task({ id: 3 }), "read_task");
check("read_task reflects edits", t3?.priority === 3 && t3.project === "proc2" && t3.notes === "n");

//// -- move + ordering -- ////
check("move to front of today", "ok" in Workbook.move_task({ id: 3, list: "2026-07-07", index: 0 }));
check("move reordered", oks(Workbook.get_list({ name: "2026-07-07" }), "after move")?.map(t => t.id).join(",") === "3,2");
check("move across lists clamps", "ok" in Workbook.move_task({ id: 1, list: "2026-07-07", index: 9999 }));
check("cross-move appended", oks(Workbook.get_list({ name: "2026-07-07" }), "after cross-move")?.map(t => t.id).join(",") === "3,2,1");
check("staging now empty", oks(Workbook.get_list({ name: "staging" }), "staging empty")?.length === 0);

//// -- reminders -- ////
check("reminder later not due", oks(Workbook.due_reminders({ now: "2026-07-08T10:00" }), "due early")?.length === 0);
const due = oks(Workbook.due_reminders({ now: "2026-07-08T10:30" }), "due at time");
check("reminder due at time", due?.length === 1 && due[0].id === 1);
check("done stages not due", (Workbook.set_stage({ id: 1, stage: "done" }), oks(Workbook.due_reminders({ now: "2026-07-09T00:00" }), "due done")?.length === 0));
check("defer via set_reminder", "ok" in Workbook.set_reminder({ id: 1, remind_at: "2026-07-09T09:00" }));

//// -- persistence roundtrip -- ////
const snap = oks(Workbook.export_state(null), "export_state");
check("delete_task", "ok" in Workbook.delete_task({ id: 2 }));
check("delete gone", "err" in Workbook.read_task({ id: 2 }));
check("import_state restores", "ok" in Workbook.import_state({ data: snap! }) && "ok" in Workbook.read_task({ id: 2 }));
check("next_id preserved", (Workbook.create_task({ text: "post-import", list: "staging", transient: false, remind_at: "" }), oks(Workbook.get_list({ name: "staging" }), "post-import")?.[0]?.id === 4));

//// -- projects -- ////
check("create_project", "ok" in Projects.create_project({ name: "proc2" }));
check("dup project errs", "err" in Projects.create_project({ name: "proc2" }));
check("empty name errs", "err" in Projects.create_project({ name: "" }));
check("list_projects", JSON.stringify(oks(Projects.list_projects(null), "list_projects")) === JSON.stringify(["proc2"]));
check("set_description", "ok" in Projects.set_description({ name: "proc2", description: "workbook" }));
check("read_project", oks(Projects.read_project({ name: "proc2" }), "read_project")?.description === "workbook");
check("project_tasks by label", oks(Workbook.project_tasks({ project: "proc2" }), "project_tasks")?.map(t => t.id).join(",") === "3");
const psnap = oks(Projects.export_state(null), "projects export");
check("delete_project", "ok" in Projects.delete_project({ name: "proc2" }));
check("delete leaves task labels", oks(Workbook.project_tasks({ project: "proc2" }), "labels intact")?.length === 1);
check("projects import restores", "ok" in Projects.import_state({ data: psnap! }) && "ok" in Projects.read_project({ name: "proc2" }));

console.log(failures ? `\n${failures} FAILURES` : "\nall checks passed");
process.exit(failures ? 1 : 0);
