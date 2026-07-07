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
function findProjectIndex(name: string): number {
    return projects.findIndex(p => p.name === name);
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
        projects = args.data.projects;
        return { ok: true };
    },
    /* .effect: replaces the entire module state with data; setup proto behind server persistence */

    export_state(args: null): YieldResult<ProjectsData> {
        return { ok: { projects: projects } };
    },
    /* .yield: the entire module state, suitable to pass back into import_state */

    create_project(args: {name: string}): EffectResult {
        if (args.name === "") return { err: "project name is empty" };
        if (findProjectIndex(args.name) !== -1) return { err: "a project with that name already exists: " + args.name };
        projects.push({ name: args.name, description: "", notes: "" });
        return { ok: true };
    },
    /* .effect: appends a new project with empty description and notes */
    /* .errors: name is empty, or a project with that name already exists */

    read_project(args: {name: string}): YieldResult<Project> {
        const i = findProjectIndex(args.name);
        if (i === -1) return { err: "no project has that name: " + args.name };
        return { ok: projects[i] };
    },
    /* .yield: the project with that name */
    /* .errors: no project has that name */

    list_projects(args: null): YieldResult<Array<string>> {
        return { ok: projects.map(p => p.name) };
    },
    /* .yield: all project names, in creation order */

    set_description(args: {name: string, description: string}): EffectResult {
        const i = findProjectIndex(args.name);
        if (i === -1) return { err: "no project has that name: " + args.name };
        projects[i].description = args.description;
        return { ok: true };
    },
    /* .effect: sets the project's description */
    /* .errors: no project has that name */

    set_notes(args: {name: string, notes: string}): EffectResult {
        const i = findProjectIndex(args.name);
        if (i === -1) return { err: "no project has that name: " + args.name };
        projects[i].notes = args.notes;
        return { ok: true };
    },
    /* .effect: sets the project's notes */
    /* .errors: no project has that name */

    delete_project(args: {name: string}): EffectResult {
        const i = findProjectIndex(args.name);
        if (i === -1) return { err: "no project has that name: " + args.name };
        projects.splice(i, 1);
        return { ok: true };
    },
    /* .effect: removes the project; tasks labeled with the name are left as they are */
    /* .errors: no project has that name */

}
