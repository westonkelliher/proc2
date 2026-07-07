//// Workbook Implementation ////
import type { YieldResult, EffectResult } from "./_util.js";

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

// -- state -- //
var tasks: Array<Task> = [];
var next_id: number = 1;

// -- helpers -- //
function findTask(id: number): Task | undefined {
    return tasks.find(t => t.id === id);
}

function copyTask(t: Task): Task {
    return { ...t };
}

// -- interface -- //
interface _interface {
    import_state(args: {data: WorkbookData}): EffectResult;
    export_state(args: null): YieldResult<WorkbookData>;
    create_task(args: {text: string, list: string, transient: boolean, remind_at: string}): EffectResult;
    read_task(args: {id: number}): YieldResult<Task>;
    set_text(args: {id: number, text: string}): EffectResult;
    set_stage(args: {id: number, stage: TaskStage}): EffectResult;
    set_priority(args: {id: number, priority: number}): EffectResult;
    set_transient(args: {id: number, transient: boolean}): EffectResult;
    set_project(args: {id: number, project: string}): EffectResult;
    set_notes(args: {id: number, notes: string}): EffectResult;
    set_reminder(args: {id: number, remind_at: string}): EffectResult;
    delete_task(args: {id: number}): EffectResult;
    move_task(args: {id: number, list: string, index: number}): EffectResult;
    get_list(args: {name: string}): YieldResult<Array<Task>>;
    list_names(args: null): YieldResult<Array<string>>;
    due_reminders(args: {now: string}): YieldResult<Array<Task>>;
    project_tasks(args: {project: string}): YieldResult<Array<Task>>;
}

export const _module: _interface = {

    import_state(args: {data: WorkbookData}): EffectResult {
        tasks = args.data.tasks.map(copyTask);
        next_id = args.data.next_id;
        return { ok: true };
    },
    /* .effect: replaces the entire module state (tasks and next_id) with data; setup proto behind server persistence */

    export_state(args: null): YieldResult<WorkbookData> {
        return { ok: { tasks: tasks.map(copyTask), next_id: next_id } };
    },
    /* .yield: the entire module state, suitable to pass back into import_state */

    create_task(args: {text: string, list: string, transient: boolean, remind_at: string}): EffectResult {
        const task: Task = {
            id: next_id,
            text: args.text,
            list: args.list,
            stage: "todo",
            priority: 0,
            transient: args.transient,
            project: "",
            notes: "",
            remind_at: args.remind_at,
        };
        next_id = next_id + 1;
        // append to the end of the named list: insert after the last task of
        // that list, or at the end of storage when the list has no tasks yet
        let insertAt = tasks.length;
        for (let i = tasks.length - 1; i >= 0; i--) {
            if (tasks[i].list === args.list) { insertAt = i + 1; break; }
        }
        tasks.splice(insertAt, 0, task);
        return { ok: true };
    },
    /* .effect: appends a new task to the end of the named list, assigning it id next_id and incrementing next_id; the new task has stage "todo", priority 0, empty project and notes */
    /* .details: remind_at is "" for no reminder, else a "YYYY-MM-DDTHH:MM" local-time string */

    read_task(args: {id: number}): YieldResult<Task> {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        return { ok: copyTask(task) };
    },
    /* .yield: the task with that id */
    /* .errors: no task has that id */

    set_text(args: {id: number, text: string}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        task.text = args.text;
        return { ok: true };
    },
    /* .effect: sets the task's text */
    /* .errors: no task has that id */

    set_stage(args: {id: number, stage: TaskStage}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        task.stage = args.stage;
        return { ok: true };
    },
    /* .effect: sets the task's stage */
    /* .errors: no task has that id */

    set_priority(args: {id: number, priority: number}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        if (!Number.isInteger(args.priority) || args.priority < 0 || args.priority > 3) {
            return { err: "priority must be an integer 0 through 3" };
        }
        task.priority = args.priority;
        return { ok: true };
    },
    /* .effect: sets the task's priority */
    /* .errors: no task has that id, or priority is not an integer 0 through 3 */

    set_transient(args: {id: number, transient: boolean}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        task.transient = args.transient;
        return { ok: true };
    },
    /* .effect: sets the task's transient flag */
    /* .errors: no task has that id */

    set_project(args: {id: number, project: string}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        task.project = args.project;
        return { ok: true };
    },
    /* .effect: sets the task's project label ("" clears it) */
    /* .errors: no task has that id */

    set_notes(args: {id: number, notes: string}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        task.notes = args.notes;
        return { ok: true };
    },
    /* .effect: sets the task's notes */
    /* .errors: no task has that id */

    set_reminder(args: {id: number, remind_at: string}): EffectResult {
        const task = findTask(args.id);
        if (task === undefined) return { err: "no task has id " + args.id };
        task.remind_at = args.remind_at;
        return { ok: true };
    },
    /* .effect: sets the task's remind_at ("" clears it) */
    /* .details: also how the UI defers a due reminder — it just sets a later remind_at */
    /* .errors: no task has that id */

    delete_task(args: {id: number}): EffectResult {
        const idx = tasks.findIndex(t => t.id === args.id);
        if (idx === -1) return { err: "no task has id " + args.id };
        tasks.splice(idx, 1);
        return { ok: true };
    },
    /* .effect: removes the task entirely */
    /* .errors: no task has that id */

    move_task(args: {id: number, list: string, index: number}): EffectResult {
        const idx = tasks.findIndex(t => t.id === args.id);
        if (idx === -1) return { err: "no task has id " + args.id };
        const [task] = tasks.splice(idx, 1);
        task.list = args.list;
        // find the global position where the task becomes the index-th task
        // of the named list; past the end means after the list's last task
        let insertAt = tasks.length;
        let seen = 0;
        let lastOfList = -1;
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].list === args.list) {
                if (seen === args.index) { insertAt = i; break; }
                seen++;
                lastOfList = i;
            }
        }
        if (insertAt === tasks.length && lastOfList !== -1 && args.index >= seen) {
            insertAt = lastOfList + 1;
        }
        tasks.splice(insertAt, 0, task);
        return { ok: true };
    },
    /* .effect: removes the task from where it is and reinserts it so it becomes the index-th task (0-based) of the named list; index past the end means last; the relative order of all other tasks is unchanged */
    /* .errors: no task has that id */

    get_list(args: {name: string}): YieldResult<Array<Task>> {
        return { ok: tasks.filter(t => t.list === args.name).map(copyTask) };
    },
    /* .yield: the tasks whose list is name, in stored order; [] when no task names the list */

    list_names(args: null): YieldResult<Array<string>> {
        const names: Array<string> = [];
        for (const t of tasks) {
            if (!names.includes(t.list)) names.push(t.list);
        }
        return { ok: names };
    },
    /* .yield: distinct list names that currently have at least one task, in first-appearance order */

    due_reminders(args: {now: string}): YieldResult<Array<Task>> {
        const due = tasks
            .filter(t => t.remind_at !== ""
                && t.remind_at <= args.now
                && (t.stage === "todo" || t.stage === "in-progress"))
            .map(copyTask);
        due.sort((a, b) => a.remind_at < b.remind_at ? -1 : a.remind_at > b.remind_at ? 1 : 0);
        return { ok: due };
    },
    /* .yield: tasks with remind_at nonempty and at or before now (plain string compare), whose stage is "todo" or "in-progress", sorted by remind_at ascending */

    project_tasks(args: {project: string}): YieldResult<Array<Task>> {
        return { ok: tasks.filter(t => t.project === args.project).map(copyTask) };
    },
    /* .yield: tasks whose project label equals project exactly, in stored order */

}
