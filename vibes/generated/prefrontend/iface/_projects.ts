//// Projects frontend client ////
import type { YieldResult, EffectResult } from "./_util.js";

const BASE = ""; // same origin: express serves both the frontend and the api

// -- datashapes -- //
type Project = {
    name: string,
    description: string,
    notes: string,
}

type ProjectsData = {
    projects: Array<Project>,
}

// -- interface -- //
interface _interface {
    create_project(args: {name: string}): Promise<EffectResult>;
    read_project(args: {name: string}): Promise<YieldResult<Project>>;
    list_projects(args: null): Promise<YieldResult<Array<string>>>;
    set_description(args: {name: string, description: string}): Promise<EffectResult>;
    set_notes(args: {name: string, notes: string}): Promise<EffectResult>;
    delete_project(args: {name: string}): Promise<EffectResult>;
}

export const Projects: _interface = {

    // MUT
    async create_project(args: {name: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/projects/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "create_project", args }),
        });
        return await res.json();
    },

    async set_description(args: {name: string, description: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/projects/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_description", args }),
        });
        return await res.json();
    },

    async set_notes(args: {name: string, notes: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/projects/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "set_notes", args }),
        });
        return await res.json();
    },

    async delete_project(args: {name: string}): Promise<EffectResult> {
        const res = await fetch(`${BASE}/projects/mut`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fn: "delete_project", args }),
        });
        return await res.json();
    },

    // YLD
    async read_project(args: {name: string}): Promise<YieldResult<Project>> {
        const res = await fetch(`${BASE}/projects/yld?fn=read_project&args=${encodeURIComponent(JSON.stringify(args))}`);
        return await res.json();
    },

    async list_projects(args: null): Promise<YieldResult<Array<string>>> {
        const res = await fetch(`${BASE}/projects/yld?fn=list_projects`);
        return await res.json();
    },

}
