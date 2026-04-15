import os
from contextlib import asynccontextmanager
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request
from fastapi.templating import Jinja2Templates

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.conn = await psycopg.AsyncConnection.connect(DATABASE_URL, autocommit=True)
    yield
    await app.state.conn.close()


app = FastAPI(lifespan=lifespan)


async def fetch_tasks(conn):
    async with conn.cursor() as cur:
        await cur.execute("select id, title, description from tasks order by id desc")
        rows = await cur.fetchall()
        return [{"id": r[0], "title": r[1], "description": r[2]} for r in rows]


@app.get("/")
async def index(request: Request):
    tasks = await fetch_tasks(app.state.conn)
    return templates.TemplateResponse(request, "index.html", {"tasks": tasks})


@app.post("/tasks")
async def create_task(request: Request, title: str = Form(...), description: str = Form("")):
    async with app.state.conn.cursor() as cur:
        await cur.execute(
            "insert into tasks (title, description) values (%s, %s)",
            (title, description),
        )
    tasks = await fetch_tasks(app.state.conn)
    return templates.TemplateResponse(request, "_tasks.html", {"tasks": tasks})
