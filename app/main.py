import os
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

STAGES = ["todo", "in-progress", "done", "cancelled", "tabled"]
PRIORITIES = ["none", "lo", "md", "hi"]

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
templates.env.globals["STAGES"] = STAGES
templates.env.globals["PRIORITIES"] = PRIORITIES


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.conn = await psycopg.AsyncConnection.connect(DATABASE_URL, autocommit=True)
    yield
    await app.state.conn.close()


app = FastAPI(lifespan=lifespan)


async def fetch_lists(conn):
    async with conn.cursor() as cur:
        await cur.execute("select id, name from lists order by name")
        return [{"id": r[0], "name": r[1]} for r in await cur.fetchall()]


async def get_list(conn, name: str):
    async with conn.cursor() as cur:
        await cur.execute("select id, name from lists where name = %s", (name,))
        r = await cur.fetchone()
        if not r:
            raise HTTPException(404, f"list '{name}' not found")
        return {"id": r[0], "name": r[1]}


async def fetch_tasks(conn, list_id: int):
    async with conn.cursor() as cur:
        await cur.execute(
            """select id, description, stage, priority, project, notes, position
               from tasks where list_id = %s order by position, id""",
            (list_id,),
        )
        return [
            {
                "id": r[0], "description": r[1], "stage": r[2], "priority": r[3],
                "project": r[4], "notes": r[5], "position": r[6],
            }
            for r in await cur.fetchall()
        ]


async def get_task(conn, task_id: int):
    async with conn.cursor() as cur:
        await cur.execute(
            """select id, list_id, description, stage, priority, project, notes, position
               from tasks where id = %s""",
            (task_id,),
        )
        r = await cur.fetchone()
        if not r:
            raise HTTPException(404, "task not found")
        return {
            "id": r[0], "list_id": r[1], "description": r[2], "stage": r[3],
            "priority": r[4], "project": r[5], "notes": r[6], "position": r[7],
        }


async def render_tasks(request: Request, list_name: str):
    conn = app.state.conn
    lst = await get_list(conn, list_name)
    tasks = await fetch_tasks(conn, lst["id"])
    lists = await fetch_lists(conn)
    return templates.TemplateResponse(
        request, "_tasks.html",
        {"tasks": tasks, "current_list": lst, "lists": lists},
    )


@app.get("/")
async def index(request: Request, list: str = "default"):
    conn = app.state.conn
    lst = await get_list(conn, list)
    tasks = await fetch_tasks(conn, lst["id"])
    lists = await fetch_lists(conn)
    return templates.TemplateResponse(
        request, "index.html",
        {"tasks": tasks, "current_list": lst, "lists": lists},
    )


# ---- lists ----

@app.post("/lists")
async def new_list(name: str = Form(...)):
    async with app.state.conn.cursor() as cur:
        await cur.execute("insert into lists (name) values (%s) on conflict do nothing", (name.strip(),))
    return RedirectResponse(f"/?list={name.strip()}", status_code=303)


@app.post("/lists/{name}/delete")
async def delete_list(name: str):
    if name == "default":
        raise HTTPException(400, "cannot delete default list")
    async with app.state.conn.cursor() as cur:
        await cur.execute("delete from lists where name = %s", (name,))
    return RedirectResponse("/?list=default", status_code=303)


# ---- tasks ----

@app.post("/tasks")
async def new_task(
    request: Request,
    description: str = Form(...),
    list: str = Form("default"),
    priority: str = Form("none"),
    project: str = Form(""),
):
    conn = app.state.conn
    lst = await get_list(conn, list)
    async with conn.cursor() as cur:
        await cur.execute("select coalesce(max(position), -1) + 1 from tasks where list_id = %s", (lst["id"],))
        pos = (await cur.fetchone())[0]
        await cur.execute(
            """insert into tasks (list_id, description, priority, project, position)
               values (%s, %s, %s, %s, %s)""",
            (lst["id"], description, priority, project, pos),
        )
    return await render_tasks(request, list)


@app.post("/tasks/{task_id}/edit")
async def edit_task(
    request: Request,
    task_id: int,
    description: str = Form(...),
    priority: str = Form("none"),
    project: str = Form(""),
):
    t = await get_task(app.state.conn, task_id)
    async with app.state.conn.cursor() as cur:
        await cur.execute(
            """update tasks set description = %s, priority = %s, project = %s, updated_at = now()
               where id = %s""",
            (description, priority, project, task_id),
        )
    async with app.state.conn.cursor() as cur:
        await cur.execute("select name from lists where id = %s", (t["list_id"],))
        name = (await cur.fetchone())[0]
    return await render_tasks(request, name)


@app.get("/tasks/{task_id}/edit")
async def edit_task_form(request: Request, task_id: int):
    t = await get_task(app.state.conn, task_id)
    return templates.TemplateResponse(request, "_task_edit.html", {"t": t})


@app.get("/tasks/{task_id}/row")
async def task_row(request: Request, task_id: int):
    t = await get_task(app.state.conn, task_id)
    return templates.TemplateResponse(request, "_task.html", {"t": t})


@app.post("/tasks/{task_id}/stage")
async def update_stage(request: Request, task_id: int, stage: str = Form(...)):
    if stage not in STAGES:
        raise HTTPException(400, "bad stage")
    t = await get_task(app.state.conn, task_id)
    async with app.state.conn.cursor() as cur:
        await cur.execute("update tasks set stage = %s, updated_at = now() where id = %s", (stage, task_id))
        await cur.execute("select name from lists where id = %s", (t["list_id"],))
        name = (await cur.fetchone())[0]
    return await render_tasks(request, name)


@app.post("/tasks/{task_id}/move")
async def move_task(request: Request, task_id: int, list: str = Form(...)):
    conn = app.state.conn
    t = await get_task(conn, task_id)
    dest = await get_list(conn, list)
    async with conn.cursor() as cur:
        await cur.execute("select name from lists where id = %s", (t["list_id"],))
        from_name = (await cur.fetchone())[0]
        await cur.execute("select coalesce(max(position), -1) + 1 from tasks where list_id = %s", (dest["id"],))
        pos = (await cur.fetchone())[0]
        await cur.execute(
            "update tasks set list_id = %s, position = %s, updated_at = now() where id = %s",
            (dest["id"], pos, task_id),
        )
    return await render_tasks(request, from_name)


@app.post("/tasks/{task_id}/arrange")
async def arrange_task(request: Request, task_id: int, direction: str = Form(...)):
    if direction not in ("up", "down"):
        raise HTTPException(400, "bad direction")
    conn = app.state.conn
    t = await get_task(conn, task_id)
    async with conn.cursor() as cur:
        op = "<" if direction == "up" else ">"
        order = "desc" if direction == "up" else "asc"
        await cur.execute(
            f"""select id, position from tasks
                where list_id = %s and position {op} %s
                order by position {order} limit 1""",
            (t["list_id"], t["position"]),
        )
        neighbor = await cur.fetchone()
        if neighbor:
            n_id, n_pos = neighbor
            await cur.execute("update tasks set position = %s where id = %s", (n_pos, task_id))
            await cur.execute("update tasks set position = %s where id = %s", (t["position"], n_id))
        await cur.execute("select name from lists where id = %s", (t["list_id"],))
        name = (await cur.fetchone())[0]
    return await render_tasks(request, name)


@app.get("/tasks/{task_id}/notes")
async def view_notes(request: Request, task_id: int):
    t = await get_task(app.state.conn, task_id)
    async with app.state.conn.cursor() as cur:
        await cur.execute("select name from lists where id = %s", (t["list_id"],))
        list_name = (await cur.fetchone())[0]
    return templates.TemplateResponse(
        request, "notes.html", {"t": t, "list_name": list_name},
    )


@app.post("/tasks/{task_id}/notes")
async def save_notes(task_id: int, notes: str = Form("")):
    async with app.state.conn.cursor() as cur:
        await cur.execute(
            "update tasks set notes = %s, updated_at = now() where id = %s",
            (notes, task_id),
        )
        await cur.execute(
            "select l.name from tasks t join lists l on l.id = t.list_id where t.id = %s",
            (task_id,),
        )
        name = (await cur.fetchone())[0]
    return RedirectResponse(f"/?list={name}", status_code=303)
