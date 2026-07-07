/**** Workbook ****/
/* .description: tasks organized into named lists — date lists like "2026-07-07" plus standing lists like "staging". The core of the proc2 personal workbook. Lists are implicit: a list exists exactly while a task names it. Deterministic: "now" always enters as a proto arg. */

/*** datashapes ***/
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

/*** state ***/
var tasks: Array<Task> = [];
var next_id: number = 1;

/*** protos ***/
interface _interface {

    // -- persistence (called by the server layer, see @persist) -- //

    import_state(data: WorkbookData);
    /* .effect: replaces the entire module state (tasks and next_id) with data; setup proto behind server persistence */

    export_state(): WorkbookData;
    /* .yield: the entire module state, suitable to pass back into import_state */

    // -- task crud -- //

    create_task(text: string, list: string, transient: boolean, remind_at: string);
    /* .effect: appends a new task to the end of the named list, assigning it id next_id and incrementing next_id; the new task has stage "todo", priority 0, empty project and notes */
    /* .details: remind_at is "" for no reminder, else a "YYYY-MM-DDTHH:MM" local-time string */

    read_task(id: number): Task;
    /* .yield: the task with that id */
    /* .errors: no task has that id */

    set_text(id: number, text: string);
    /* .effect: sets the task's text */
    /* .errors: no task has that id */

    set_stage(id: number, stage: TaskStage);
    /* .effect: sets the task's stage */
    /* .errors: no task has that id */

    set_priority(id: number, priority: number);
    /* .effect: sets the task's priority */
    /* .errors: no task has that id, or priority is not an integer 0 through 3 */

    set_transient(id: number, transient: boolean);
    /* .effect: sets the task's transient flag */
    /* .errors: no task has that id */

    set_project(id: number, project: string);
    /* .effect: sets the task's project label ("" clears it) */
    /* .errors: no task has that id */

    set_notes(id: number, notes: string);
    /* .effect: sets the task's notes */
    /* .errors: no task has that id */

    set_reminder(id: number, remind_at: string);
    /* .effect: sets the task's remind_at ("" clears it) */
    /* .details: also how the UI defers a due reminder — it just sets a later remind_at */
    /* .errors: no task has that id */

    delete_task(id: number);
    /* .effect: removes the task entirely */
    /* .errors: no task has that id */

    move_task(id: number, list: string, index: number);
    /* .effect: removes the task from where it is and reinserts it so it becomes the index-th task (0-based) of the named list; index past the end means last; the relative order of all other tasks is unchanged */
    /* .errors: no task has that id */

    // -- querying -- //

    get_list(name: string): Array<Task>;
    /* .yield: the tasks whose list is name, in stored order; [] when no task names the list */

    list_names(): Array<string>;
    /* .yield: distinct list names that currently have at least one task, in first-appearance order */

    due_reminders(now: string): Array<Task>;
    /* .yield: tasks with remind_at nonempty and at or before now (plain string compare), whose stage is "todo" or "in-progress", sorted by remind_at ascending */

    project_tasks(project: string): Array<Task>;
    /* .yield: tasks whose project label equals project exactly, in stored order */

}
