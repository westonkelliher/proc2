import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { _module as Projects } from "./modules/_projects.js";
import { _module as Workbook } from "./modules/_workbook.js";

const app = express();
app.use(express.json());

// frontend: index.html + esbuild bundle (see start.sh)
app.get("/", (_req, res) => res.sendFile("index.html", { root: import.meta.dirname }));
app.use(express.static(`${import.meta.dirname}/dist`));

// -- persistence: Projects <-> data/projects.json (@persist) -- //
const __file_Projects = path.join(import.meta.dirname, "data/projects.json");
if (fs.existsSync(__file_Projects)) {
    const r = Projects.import_state({ data: JSON.parse(fs.readFileSync(__file_Projects, "utf-8")) });
    if ("err" in r) console.error(`Projects: failed to load ${__file_Projects}: ${r.err}`);
}
function __persist_Projects() {
    const r = Projects.export_state(null);
    if ("err" in r) { console.error(`Projects: export_state failed: ${r.err}`); return; }
    fs.mkdirSync(path.dirname(__file_Projects), { recursive: true });
    fs.writeFileSync(__file_Projects, JSON.stringify(r.ok, null, 2));
}

// -- persistence: Workbook <-> data/workbook.json (@persist) -- //
const __file_Workbook = path.join(import.meta.dirname, "data/workbook.json");
if (fs.existsSync(__file_Workbook)) {
    const r = Workbook.import_state({ data: JSON.parse(fs.readFileSync(__file_Workbook, "utf-8")) });
    if ("err" in r) console.error(`Workbook: failed to load ${__file_Workbook}: ${r.err}`);
}
function __persist_Workbook() {
    const r = Workbook.export_state(null);
    if ("err" in r) { console.error(`Workbook: export_state failed: ${r.err}`); return; }
    fs.mkdirSync(path.dirname(__file_Workbook), { recursive: true });
    fs.writeFileSync(__file_Workbook, JSON.stringify(r.ok, null, 2));
}

// GET /projects/yld?fn=read_project
app.get("/projects/yld", (req, res) => {
    const { fn } = req.query ?? {};
    const args = req.query.args ? JSON.parse(String(req.query.args)) : null;
    switch (fn) {
        case "read_project": return res.json(Projects.read_project(args));
        case "list_projects": return res.json(Projects.list_projects(null));
        default: return res.status(404).json({ err: `unknown projects yld: ${fn}` });
    }
});

// POST /projects/mut  { "fn": "create_project", "args": {"name": "hi"} }
app.post("/projects/mut", (req, res) => {
    const { fn, args = null } = req.body ?? {};
    switch (fn) {
        case "create_project": { const r = Projects.create_project(args); if ("ok" in r) __persist_Projects(); return res.json(r); }
        case "set_description": { const r = Projects.set_description(args); if ("ok" in r) __persist_Projects(); return res.json(r); }
        case "set_notes": { const r = Projects.set_notes(args); if ("ok" in r) __persist_Projects(); return res.json(r); }
        case "delete_project": { const r = Projects.delete_project(args); if ("ok" in r) __persist_Projects(); return res.json(r); }
        default: return res.status(404).json({ err: `unknown projects mut: ${fn}` });
    }
});

// GET /workbook/yld?fn=read_task
app.get("/workbook/yld", (req, res) => {
    const { fn } = req.query ?? {};
    const args = req.query.args ? JSON.parse(String(req.query.args)) : null;
    switch (fn) {
        case "read_task": return res.json(Workbook.read_task(args));
        case "get_list": return res.json(Workbook.get_list(args));
        case "list_names": return res.json(Workbook.list_names(null));
        case "due_reminders": return res.json(Workbook.due_reminders(args));
        case "project_tasks": return res.json(Workbook.project_tasks(args));
        default: return res.status(404).json({ err: `unknown workbook yld: ${fn}` });
    }
});

// POST /workbook/mut  { "fn": "create_task", "args": {"text": "hi", "list": "hi", "transient": true, "remind_at": "hi"} }
app.post("/workbook/mut", (req, res) => {
    const { fn, args = null } = req.body ?? {};
    switch (fn) {
        case "create_task": { const r = Workbook.create_task(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_text": { const r = Workbook.set_text(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_stage": { const r = Workbook.set_stage(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_priority": { const r = Workbook.set_priority(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_transient": { const r = Workbook.set_transient(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_project": { const r = Workbook.set_project(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_notes": { const r = Workbook.set_notes(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "set_reminder": { const r = Workbook.set_reminder(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "delete_task": { const r = Workbook.delete_task(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        case "move_task": { const r = Workbook.move_task(args); if ("ok" in r) __persist_Workbook(); return res.json(r); }
        default: return res.status(404).json({ err: `unknown workbook mut: ${fn}` });
    }
});

const port = Number(process.env.PORT) || 4117;
app.listen(port, () => console.log(`listening on http://localhost:${port}`));
