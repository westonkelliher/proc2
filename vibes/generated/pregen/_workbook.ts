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
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: replaces the entire module state (tasks and next_id) with a deep copy of data; setup proto behind server persistence */
    /* .details: copies so that no later caller-side mutation of data can reach module state */

    export_state(args: null): YieldResult<WorkbookData> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: a deep copy of the entire module state, suitable to pass back into import_state */
    /* .details: the copy shares no structure with module state — later effects must not alter an exported snapshot */

    create_task(args: {text: string, list: string, transient: boolean, remind_at: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: appends a new task to the end of the named list, assigning it id next_id and incrementing next_id; the new task has stage "todo", priority 0, empty project and notes */
    /* .details: remind_at is "" for no reminder, else a "YYYY-MM-DDTHH:MM" local-time string */

    read_task(args: {id: number}): YieldResult<Task> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: the task with that id */
    /* .errors: no task has that id */

    set_text(args: {id: number, text: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's text */
    /* .errors: no task has that id */

    set_stage(args: {id: number, stage: TaskStage}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's stage */
    /* .errors: no task has that id */

    set_priority(args: {id: number, priority: number}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's priority */
    /* .errors: no task has that id, or priority is not an integer 0 through 3 */

    set_transient(args: {id: number, transient: boolean}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's transient flag */
    /* .errors: no task has that id */

    set_project(args: {id: number, project: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's project label ("" clears it) */
    /* .errors: no task has that id */

    set_notes(args: {id: number, notes: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's notes */
    /* .errors: no task has that id */

    set_reminder(args: {id: number, remind_at: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the task's remind_at ("" clears it) */
    /* .details: also how the UI defers a due reminder — it just sets a later remind_at */
    /* .errors: no task has that id */

    delete_task(args: {id: number}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: removes the task entirely */
    /* .errors: no task has that id */

    move_task(args: {id: number, list: string, index: number}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: removes the task from where it is and reinserts it so it becomes the index-th task (0-based) of the named list; index past the end means last; the relative order of all other tasks is unchanged */
    /* .errors: no task has that id */

    get_list(args: {name: string}): YieldResult<Array<Task>> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: the tasks whose list is name, in stored order; [] when no task names the list */

    list_names(args: null): YieldResult<Array<string>> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: distinct list names that currently have at least one task, in first-appearance order */

    due_reminders(args: {now: string}): YieldResult<Array<Task>> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: tasks with remind_at nonempty and at or before now (plain string compare), whose stage is "todo" or "in-progress", sorted by remind_at ascending */

    project_tasks(args: {project: string}): YieldResult<Array<Task>> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: tasks whose project label equals project exactly, in stored order */

}
