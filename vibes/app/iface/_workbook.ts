//// Workbook frontend client ////
import type { YieldResult, EffectResult } from "./_util.js";

const BASE = ""; // same origin: express serves both the frontend and the api

// -- datashapes -- //
type TaskStage = "todo" | "in-progress" | "done" | "cancelled" | "tabled"

type Task = {
    id: number,
    text: string,
    list: string,      // list name, e.g. "staging" or "2026-07-07"
    stage: TaskStage,
    priority: number,  // 0 none, 1 lo, 2 md, 3 hi
    transient: boolean,
    project: string,   // project name label; "" = none
    notes: string,
    remind_at: string, // "YYYY-MM-DDTHH:MM" local time; "" = no reminder
}

type WorkbookData = {
    tasks: Array<Task>,
    next_id: number,
}

// -- interface -- //
interface _interface {
    create_task(args: {text: string, list: string, transient: boolean, remind_at: string}): Promise<EffectResult>;
    read_task(args: {id: number}): Promise<YieldResult<Task>>;
    set_text(args: {id: number, text: string}): Promise<EffectResult>;
    set_stage(args: {id: number, stage: TaskStage}): Promise<EffectResult>;
    set_priority(args: {id: number, priority: number}): Promise<EffectResult>;
    set_transient(args: {id: number, transient: boolean}): Promise<EffectResult>;
    set_project(args: {id: number, project: string}): Promise<EffectResult>;
    set_notes(args: {id: number, notes: string}): Promise<EffectResult>;
    set_reminder(args: {id: number, remind_at: string}): Promise<EffectResult>;
    delete_task(args: {id: number}): Promise<EffectResult>;
    move_task(args: {id: number, list: string, index: number}): Promise<EffectResult>;
    get_list(args: {name: string}): Promise<YieldResult<Array<Task>>>;
    list_names(args: null): Promise<YieldResult<Array<string>>>;
    due_reminders(args: {now: string}): Promise<YieldResult<Array<Task>>>;
    project_tasks(args: {project: string}): Promise<YieldResult<Array<Task>>>;
}

export const Workbook: _interface = {

    // MUT
    async create_task(args: {text: string, list: string, transient: boolean, remind_at: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "create_task", args }),
        });
        return await res.json();
    },

    async set_text(args: {id: number, text: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_text", args }),
        });
        return await res.json();
    },

    async set_stage(args: {id: number, stage: TaskStage}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_stage", args }),
        });
        return await res.json();
    },

    async set_priority(args: {id: number, priority: number}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_priority", args }),
        });
        return await res.json();
    },

    async set_transient(args: {id: number, transient: boolean}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_transient", args }),
        });
        return await res.json();
    },

    async set_project(args: {id: number, project: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_project", args }),
        });
        return await res.json();
    },

    async set_notes(args: {id: number, notes: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_notes", args }),
        });
        return await res.json();
    },

    async set_reminder(args: {id: number, remind_at: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_reminder", args }),
        });
        return await res.json();
    },

    async delete_task(args: {id: number}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "delete_task", args }),
        });
        return await res.json();
    },

    async move_task(args: {id: number, list: string, index: number}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/workbook/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "move_task", args }),
        });
        return await res.json();
    },

    // YLD
    async read_task(args: {id: number}): Promise<YieldResult<Task>> {
        const res = await fetch(`${BASE}/workbook/yld?fn=read_task&args=${encodeURIComponent(JSON.stringify(args))}`);
        return await res.json();
    },

    async get_list(args: {name: string}): Promise<YieldResult<Array<Task>>> {
        const res = await fetch(`${BASE}/workbook/yld?fn=get_list&args=${encodeURIComponent(JSON.stringify(args))}`);
        return await res.json();
    },

    async list_names(args: null): Promise<YieldResult<Array<string>>> {
        const res = await fetch(`${BASE}/workbook/yld?fn=list_names`);
        return await res.json();
    },

    async due_reminders(args: {now: string}): Promise<YieldResult<Array<Task>>> {
        const res = await fetch(`${BASE}/workbook/yld?fn=due_reminders&args=${encodeURIComponent(JSON.stringify(args))}`);
        return await res.json();
    },

    async project_tasks(args: {project: string}): Promise<YieldResult<Array<Task>>> {
        const res = await fetch(`${BASE}/workbook/yld?fn=project_tasks&args=${encodeURIComponent(JSON.stringify(args))}`);
        return await res.json();
    },

}
