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
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: replaces the entire module state with a deep copy of data; setup proto behind server persistence */
    /* .details: copies so that no later caller-side mutation of data can reach module state */

    export_state(args: null): YieldResult<ProjectsData> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: a deep copy of the entire module state, suitable to pass back into import_state */
    /* .details: the copy shares no structure with module state — later effects must not alter an exported snapshot */

    create_project(args: {name: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: appends a new project with empty description and notes */
    /* .errors: name is empty, or a project with that name already exists */

    read_project(args: {name: string}): YieldResult<Project> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: the project with that name */
    /* .errors: no project has that name */

    list_projects(args: null): YieldResult<Array<string>> {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .yield: all project names, in creation order */

    set_description(args: {name: string, description: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the project's description */
    /* .errors: no project has that name */

    set_notes(args: {name: string, notes: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: sets the project's notes */
    /* .errors: no project has that name */

    delete_project(args: {name: string}): EffectResult {
        // TODO: implement
        return { err: "not implemented" };
    },
    /* .effect: removes the project; tasks labeled with the name are left as they are */
    /* .errors: no project has that name */

}
