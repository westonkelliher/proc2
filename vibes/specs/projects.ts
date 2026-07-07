/**** Projects ****/
/* .description: the projects the workbook's tasks can carry as labels. A project is a name plus freeform description and notes; task<->project linkage is by name label on the task side (Workbook), so deleting a project never touches tasks. */

/*** datashapes ***/
type Project = {
    name: string,
    description: string,
    notes: string,
}

type ProjectsData = {
    projects: Array<Project>,
}

/*** state ***/
var projects: Array<Project> = [];

/*** protos ***/
interface _interface {

    // -- persistence (called by the server layer, see @persist) -- //

    import_state(data: ProjectsData);
    /* .effect: replaces the entire module state with data; setup proto behind server persistence */

    export_state(): ProjectsData;
    /* .yield: the entire module state, suitable to pass back into import_state */

    // -- project crud -- //

    create_project(name: string);
    /* .effect: appends a new project with empty description and notes */
    /* .errors: name is empty, or a project with that name already exists */

    read_project(name: string): Project;
    /* .yield: the project with that name */
    /* .errors: no project has that name */

    list_projects(): Array<string>;
    /* .yield: all project names, in creation order */

    set_description(name: string, description: string);
    /* .effect: sets the project's description */
    /* .errors: no project has that name */

    set_notes(name: string, notes: string);
    /* .effect: sets the project's notes */
    /* .errors: no project has that name */

    delete_project(name: string);
    /* .effect: removes the project; tasks labeled with the name are left as they are */
    /* .errors: no project has that name */

}
