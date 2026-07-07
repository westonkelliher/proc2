//// Projects Implementation ////
import type { YieldResult, EffectResult } from "./_util.js";

// -- datashapes -- //
type Project = {
    name: string,
    description: string,
    notes: string,
}

type ProjectsData = {
    projects: Array<Project>,
}

// -- state -- //
var projects: Array<Project> = [];

// -- helpers -- //
function copyProject(p: Project): Project {
    return { name: p.name, description: p.description, notes: p.notes };
}

function findProject(name: string): Project | undefined {
    return projects.find(p => p.name === name);
}

// -- interface -- //
interface _interface {
    import_state(args: {data: ProjectsData}): EffectResult;
    export_state(args: null): YieldResult<ProjectsData>;
    create_project(args: {name: string}): EffectResult;
    read_project(args: {name: string}): YieldResult<Project>;
    list_projects(args: null): YieldResult<Array<string>>;
    set_description(args: {name: string, description: string}): EffectResult;
    set_notes(args: {name: string, notes: string}): EffectResult;
    delete_project(args: {name: string}): EffectResult;
}

export const _module: _interface = {

    import_state(args: {data: ProjectsData}): EffectResult {
        projects = args.data.projects.map(copyProject);
        return { ok: true };
    },
    /* .effect: replaces the entire module state with a deep copy of data; setup proto behind server persistence */
    /* .details: copies so that no later caller-side mutation of data can reach module state */

    export_state(args: null): YieldResult<ProjectsData> {
        return { ok: { projects: projects.map(copyProject) } };
    },
    /* .yield: a deep copy of the entire module state, suitable to pass back into import_state */
    /* .details: the copy shares no structure with module state — later effects must not alter an exported snapshot */

    create_project(args: {name: string}): EffectResult {
        if (args.name === "") return { err: "project name is empty" };
        if (findProject(args.name) !== undefined) {
            return { err: `project already exists: ${args.name}` };
        }
        projects.push({ name: args.name, description: "", notes: "" });
        return { ok: true };
    },
    /* .effect: appends a new project with empty description and notes */
    /* .errors: name is empty, or a project with that name already exists */

    read_project(args: {name: string}): YieldResult<Project> {
        const p = findProject(args.name);
        if (p === undefined) return { err: `no such project: ${args.name}` };
        return { ok: copyProject(p) };
    },
    /* .yield: the project with that name */
    /* .errors: no project has that name */

    list_projects(args: null): YieldResult<Array<string>> {
        return { ok: projects.map(p => p.name) };
    },
    /* .yield: all project names, in creation order */

    set_description(args: {name: string, description: string}): EffectResult {
        const p = findProject(args.name);
        if (p === undefined) return { err: `no such project: ${args.name}` };
        p.description = args.description;
        return { ok: true };
    },
    /* .effect: sets the project's description */
    /* .errors: no project has that name */

    set_notes(args: {name: string, notes: string}): EffectResult {
        const p = findProject(args.name);
        if (p === undefined) return { err: `no such project: ${args.name}` };
        p.notes = args.notes;
        return { ok: true };
    },
    /* .effect: sets the project's notes */
    /* .errors: no project has that name */

    delete_project(args: {name: string}): EffectResult {
        const idx = projects.findIndex(p => p.name === args.name);
        if (idx === -1) return { err: `no such project: ${args.name}` };
        projects.splice(idx, 1);
        return { ok: true };
    },
    /* .effect: removes the project; tasks labeled with the name are left as they are */
    /* .errors: no project has that name */

}
